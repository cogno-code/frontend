// src/timeline/hooks/useTimelineData.ts
import { useEffect, useMemo, useState } from "react";
import {
  apiFetchTimeline,
  apiCreateChat,
  apiUpdateChat,
  apiDeleteChat,
} from "../timelineApi";
import type {
  ChatEntry,
  Task,
  TaskDefinition,
  ChatType,
  ApiTimelineResponse,
} from "../timelineTypes";
import {
  formatTime,
  getTodayDateString,
  pickColorForTask,
} from "../timelineUtils";
import type { ApiChatCreateRequest } from "../timelineTypes";

interface LastEndedTask {
  name: string;
  date: string;
}

interface AddChatParams {
  text: string;
  type: ChatType;
  taskName?: string;
  systemKind?: ApiChatCreateRequest["systemKind"];
}

export function useTimelineData(taskDefs: TaskDefinition[]) {
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentDate, setCurrentDate] = useState<string>(() =>
    getTodayDateString()
  );
  const [activeTaskName, setActiveTaskName] = useState<string | undefined>(
    undefined
  );

  const [lastEndedTask, setLastEndedTask] = useState<LastEndedTask | null>(
    null
  );

  /** 날짜 바뀌면 마지막 종료 task 표시 리셋 */
  useEffect(() => {
    setLastEndedTask(null);
  }, [currentDate]);

  /** 선택된 날짜의 타임라인 로드 */
  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const data: ApiTimelineResponse = await apiFetchTimeline(currentDate);

        const loadedTasks: Task[] = data.tasks.map((t) => ({
          name: t.name,
          color: t.color,
          status: t.status,
          segments: t.segments.map((s) => ({
            start: new Date(s.startTime),
            end: s.endTime ? new Date(s.endTime) : undefined,
          })),
        }));

        const loadedEntries: ChatEntry[] = data.entries.map((e) => {
          const created = new Date(e.createdAt);
          return {
            id: e.id,
            createdAt: created,
            time: formatTime(created),
            text: e.text,
            type: e.type,
            taskName: e.taskName ?? undefined,
            systemKind: e.systemKind ?? undefined,
          };
        });

        setTasks(loadedTasks);
        setEntries(loadedEntries);

        const running = loadedTasks.filter((t) => t.status === "RUNNING");
        setActiveTaskName(running[0]?.name);
      } catch (e) {
        console.error("Failed to load timeline", e);
      }
    };

    fetchTimeline();
  }, [currentDate]);

  /** RUNNING 상태 변화 감시 */
  useEffect(() => {
    const running = tasks.filter((t) => t.status === "RUNNING");
    if (running.length === 0) {
      setActiveTaskName(undefined);
      return;
    }
    if (
      !activeTaskName ||
      !running.some((t) => t.name === activeTaskName)
    ) {
      setActiveTaskName(running[0]?.name);
    }
  }, [tasks, activeTaskName]);

  const runningTasks = useMemo(
    () => tasks.filter((t) => t.status === "RUNNING"),
    [tasks]
  );

  const isTodaySelected = useMemo(
    () => currentDate === getTodayDateString(),
    [currentDate]
  );

  /** 헬퍼들 */

  const findTask = (name: string) => tasks.find((t) => t.name === name);

  const startTask = (name: string, now: Date) => {
    setTasks((prev) => {
      const existing = prev.find((t) => t.name === name);
      if (existing) {
        return prev.map((t) =>
          t.name === name
            ? {
                ...t,
                status: "RUNNING",
                segments: [...t.segments, { start: now }],
              }
            : t
        );
      } else {
        const color = pickColorForTask(name, taskDefs, prev);
        return [
          ...prev,
          {
            name,
            color,
            status: "RUNNING",
            segments: [{ start: now }],
          },
        ];
      }
    });
  };

  const endTask = (name: string, now: Date) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.name !== name) return t;
        const segs = [...t.segments];
        const last = segs[segs.length - 1];
        if (last && !last.end) {
          segs[segs.length - 1] = { ...last, end: now };
        }
        return { ...t, status: "FINISHED", segments: segs };
      })
    );
  };

  /** 한 줄씩 채팅 저장 */
  const addChat = async (entry: AddChatParams) => {
    const payload: ApiChatCreateRequest = {
      date: currentDate,
      text: entry.text,
      type: entry.type,
      taskName: entry.taskName ?? null,
      systemKind: entry.systemKind ?? null,
    };

    try {
      const saved = await apiCreateChat(payload);
      const created = new Date(saved.createdAt);

      setEntries((prev) => [
        ...prev,
        {
          id: saved.id,
          createdAt: created,
          time: formatTime(created),
          text: saved.text,
          type: saved.type,
          taskName: saved.taskName ?? undefined,
          systemKind: saved.systemKind ?? undefined,
        },
      ]);
    } catch (e) {
      console.error("Error saving chat line", e);
      alert("채팅 저장 중 오류가 발생했습니다.");
    }
  };

  /** 채팅 수정: 텍스트만 받아서 수정 */
  const updateChat = async (id: number, newText: string) => {
    try {
      const updated = await apiUpdateChat(id, { text: newText });
      const created = new Date(updated.createdAt);

      setEntries((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                text: updated.text,
                createdAt: created,
                time: formatTime(created),
              }
            : e
        )
      );
    } catch (e) {
      console.error("Error updating chat", e);
      alert("채팅 수정 중 오류가 발생했습니다.");
    }
  };

  /** 채팅 삭제 */
  const deleteChat = async (id: number) => {
    try {
      await apiDeleteChat(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (e) {
      console.error("Error deleting chat", e);
      alert("채팅 삭제 중 오류가 발생했습니다.");
    }
  };

  const getTaskColor = (taskName?: string) => {
    if (!taskName) return undefined;
    const t = tasks.find((task) => task.name === taskName);
    return t?.color;
  };

  return {
    // 상태
    entries,
    tasks,
    currentDate,
    activeTaskName,
    runningTasks,
    lastEndedTask,
    isTodaySelected,

    // 상태 setter
    setCurrentDate,
    setActiveTaskName,
    setLastEndedTask,

    // 로직
    findTask,
    startTask,
    endTask,
    addChat,
    updateChat,
    deleteChat,
    getTaskColor,
  };
}
