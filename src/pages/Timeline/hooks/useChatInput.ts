// src/timeline/hooks/useChatInput.ts
import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type {
  ChatType,
  ApiChatCreateRequest,
  Task,
  TaskDefinition,
} from "../timelineTypes";

type AddChatParams = {
  text: string;
  type: ChatType;
  taskName?: string;
  systemKind?: ApiChatCreateRequest["systemKind"];
};

type LastEndedTask = { name: string; date: string };

interface UseChatInputOptions {
  taskDefs: TaskDefinition[];
  isTodaySelected: boolean;
  runningTasks: Task[];
  activeTaskName?: string;
  setActiveTaskName: (name?: string) => void;
  currentDate: string;
  findTask: (name: string) => Task | undefined;
  startTask: (name: string, now: Date) => void;
  endTask: (name: string, now: Date) => void;
  addChat: (params: AddChatParams) => Promise<void>;
  setLastEndedTask: (task: LastEndedTask | null) => void;
}

export function useChatInput({
  taskDefs,
  isTodaySelected,
  runningTasks,
  activeTaskName,
  setActiveTaskName,
  currentDate,
  findTask,
  startTask,
  endTask,
  addChat,
  setLastEndedTask,
}: UseChatInputOptions) {
  const [input, setInput] = useState("");
  const [hashtagPrefix, setHashtagPrefix] = useState<"#" | "##">("#");
  const [hashtagQuery, setHashtagQuery] = useState<string | null>(null);
  const [hashtagStart, setHashtagStart] = useState<number | null>(null);
  const [hashtagSelectedIndex, setHashtagSelectedIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  /** 해시태그 자동완성 후보 */
  const hashtagSuggestions = useMemo(
    () =>
      hashtagQuery !== null
        ? taskDefs.filter((d) =>
            d.name.toLowerCase().includes(hashtagQuery.toLowerCase())
          )
        : [],
    [hashtagQuery, taskDefs]
  );

  /** 입력 & 해시태그 처리 */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const caret = e.target.selectionStart ?? value.length;

    setInput(value);

    let hashIndex = -1;
    for (let i = caret - 1; i >= 0; i--) {
      const ch = value[i];
      if (ch === "#") {
        hashIndex = i;
        break;
      }
      if (ch === " " || ch === "\n" || ch === "\t") {
        break;
      }
    }

    if (hashIndex >= 0) {
      // hashIndex 기준으로 "연속된 #" 묶음의 시작 위치 찾기
      let runStart = hashIndex;
      while (runStart > 0 && value[runStart - 1] === "#") {
        runStart--;
      }
      const runLength = hashIndex - runStart + 1; // 연속된 # 개수

      // 1개면 "#", 2개 이상이면 "##"
      const prefix: "#" | "##" = runLength >= 2 ? "##" : "#";
      const prefixLen = prefix === "##" ? 2 : 1;

      setHashtagPrefix(prefix);
      setHashtagStart(runStart);

      const query = value.slice(runStart + prefixLen, caret);
      setHashtagQuery(query);
      setHashtagSelectedIndex(0);
    } else {
      setHashtagStart(null);
      setHashtagQuery(null);
      setHashtagPrefix("#");
    }

    // textarea 자동 높이 조절
    if (textareaRef.current) {
      const ta = textareaRef.current;
      ta.style.height = "auto";
      const lineHeight = 20;
      const maxHeight = lineHeight * 10;
      const newHeight = Math.min(ta.scrollHeight, maxHeight);
      ta.style.height = `${newHeight}px`;
    }
  };

  const handleSelectHashtag = (name: string) => {
    if (hashtagStart === null) return;

    const caret = input.length;
    const before = input.slice(0, hashtagStart);
    const after = input.slice(caret);

    const newText = `${before}${hashtagPrefix}${name}${after}`;

    setInput(newText);
    setHashtagQuery(null);
    setHashtagStart(null);
    setHashtagSelectedIndex(0);
  };

  /** 제출 로직 */
  const handleSubmit = async () => {
    const raw = input;
    const trimmed = raw.trim();
    if (!trimmed) return;

    // 과거 날짜에는 새 채팅/명령 입력 불가
    if (!isTodaySelected) {
      alert("이전 날짜에는 새 채팅을 추가할 수 없습니다.");
      setInput("");
      return;
    }

    const now = new Date();

    // ##task : 종료 + 자동 문서 상태 저장
    if (trimmed.startsWith("##")) {
      const name = trimmed.slice(2).trim();
      setInput("");
      if (!name) return;

      const existing = findTask(name);

      if (existing) {
        endTask(name, now);
      }

      await addChat({
        type: "SYSTEM",
        text: `${name} task를 종료합니다.`,
        taskName: name,
        systemKind: "TASK_END",
      });

      setLastEndedTask({
        name,
        date: currentDate,
      });

      return;
    }

    // #task : 시작 / 활성 task 설정
    if (trimmed.startsWith("#")) {
      const name = trimmed.slice(1).trim();
      setInput("");
      if (!name) return;

      const alreadyRunning = runningTasks.find((t) => t.name === name);

      if (!alreadyRunning) {
        startTask(name, now);
        await addChat({
          type: "SYSTEM",
          text: `${name} task를 시작합니다.`,
          taskName: name,
          systemKind: "TASK_START",
        });
      } else {
        await addChat({
          type: "SYSTEM",
          text: `${name} task는 이미 진행 중입니다. 현재 입력 task로 설정합니다.`,
          taskName: name,
          systemKind: "INFO",
        });
      }

      setActiveTaskName(name);
      return;
    }

    // 일반 유저 채팅
    setInput("");
    await addChat({
      type: "USER",
      text: raw,
      taskName: activeTaskName,
    });
  };

  /** 키 입력 처리 */
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+/ : 활성 task 순환
    if (e.ctrlKey && e.key === "/") {
      e.preventDefault();
      if (runningTasks.length === 0) return;
      if (!activeTaskName) {
        setActiveTaskName(runningTasks[0].name);
        return;
      }
      const idx = runningTasks.findIndex((t) => t.name === activeTaskName);
      const next = runningTasks[(idx + 1) % runningTasks.length];
      setActiveTaskName(next.name);
      return;
    }

    // 해시태그 자동완성 이동/선택
    if (hashtagSuggestions.length > 0 && hashtagQuery !== null) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHashtagSelectedIndex(
          (prev) => (prev + 1) % hashtagSuggestions.length
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHashtagSelectedIndex(
          (prev) =>
            (prev - 1 + hashtagSuggestions.length) %
            hashtagSuggestions.length
        );
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const selected = hashtagSuggestions[hashtagSelectedIndex];
        if (selected) {
          handleSelectHashtag(selected.name);
        }
        return;
      }
    }

    // Enter(단일) → 전송
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return {
    // 상태
    input,
    hashtagPrefix,
    hashtagQuery,
    hashtagSelectedIndex,
    hashtagSuggestions,

    // ref
    textareaRef,

    // 액션
    setInput,            // 필요하면 버튼 등에서 직접 사용할 때
    handleInputChange,
    handleSelectHashtag,
    handleKeyDown,
    handleSubmit,        // 나중에 "보내기" 버튼에 연결할 수 있음
  };
}
