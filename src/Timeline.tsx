import React, { useState, useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import {
    FaHome,
    FaPlus,
    FaClock,
    FaChevronLeft,
    FaChevronRight,
    FaCheck,
} from "react-icons/fa";

type ChatType = "user" | "system";
type SystemKind = "taskStart" | "taskEnd" | "info";

type ChatEntry = {
    id: number;
    time: string;
    text: string;
    type: ChatType;
    taskName?: string;
    systemKind?: SystemKind;
};

type TaskStatus = "running" | "paused" | "finished";

type TaskSegment = {
    start: Date;
    end?: Date;
};

type Task = {
    name: string;
    color: string;
    status: TaskStatus;
    segments: TaskSegment[];
};

type TaskDefinition = {
    name: string;
    color: string;
};

// 0시 ~ 24시
const DAY_START_HOUR = 0;
const DAY_END_HOUR = 24;
const HOURS = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR },
    (_, i) => DAY_START_HOUR + i
);

// 색 팔레트 (30개 정도)
const COLOR_POOL = [
    "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
    "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
    "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
    "#ec4899", "#f43f5e", "#fb7185", "#f97373", "#facc15",
    "#4ade80", "#34d399", "#2dd4bf", "#38bdf8", "#60a5fa",
    "#818cf8", "#a5b4fc", "#f9a8d4", "#fbbf24", "#22c55e",
];

function pickColorForTask(
    taskName: string,
    taskDefs: TaskDefinition[],
    existingTasks: Task[]
): string {
    const def = taskDefs.find((d) => d.name === taskName);
    if (def) return def.color;

    const used = new Set<string>([
        ...taskDefs.map((d) => d.color),
        ...existingTasks.map((t) => t.color),
    ]);

    const candidates = COLOR_POOL.filter((c) => !used.has(c));
    if (candidates.length === 0) {
        return COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)];
    }
    return candidates[Math.floor(Math.random() * COLOR_POOL.length)];
}

function formatTime(d: Date) {
    return d.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function totalMinutes(date: Date) {
    return date.getHours() * 60 + date.getMinutes();
}

/* ----------------- 타임라인 패널 ----------------- */

function TimelinePanel({ tasks }: { tasks: Task[] }) {
    const now = new Date();
    const minTotal = DAY_START_HOUR * 60;
    const maxTotal = DAY_END_HOUR * 60;

    const hourBars: Record<
        number,
        { color: string; startPct: number; widthPct: number }[]
    > = {};
    HOURS.forEach((h) => {
        hourBars[h] = [];
    });

    tasks.forEach((task) => {
        task.segments.forEach((seg) => {
            let startTotal = totalMinutes(seg.start);
            let endTotal = totalMinutes(seg.end ?? now);

            if (endTotal <= minTotal || startTotal >= maxTotal) return;

            startTotal = Math.max(startTotal, minTotal);
            endTotal = Math.min(endTotal, maxTotal);

            for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
                const hourStart = h * 60;
                const hourEnd = (h + 1) * 60;

                const segStart = Math.max(startTotal, hourStart);
                const segEnd = Math.min(endTotal, hourEnd);
                if (segEnd <= segStart) continue;

                const withinStartMin = segStart - hourStart;
                const withinEndMin = segEnd - hourStart;

                const startPct = (withinStartMin / 60) * 100;
                const widthPct = ((withinEndMin - withinStartMin) / 60) * 100;

                hourBars[h].push({
                    color: task.color,
                    startPct,
                    widthPct,
                });
            }
        });
    });

    return (
        <div className="h-full w-full bg-slate-950 border-l border-slate-800">
            <div className="h-full flex">
                {/* 시간 숫자 */}
                <div className="w-10 text-[11px] text-slate-400 flex flex-col justify-between py-4 pr-1">
                    {HOURS.map((h) => (
                        <div
                            key={h}
                            className="flex-1 flex items-start justify-end leading-none"
                        >
                            <span>{h}</span>
                        </div>
                    ))}
                </div>

                {/* 시간 줄 */}
                <div className="flex-1 flex flex-col py-4 pr-4">
                    {HOURS.map((h, i) => {
                        const bars = hourBars[h];
                        return (
                            <div
                                key={h}
                                className={`relative flex-1 border-t border-slate-800/70 ${
                                    i === HOURS.length - 1
                                        ? "border-b border-slate-800/70"
                                        : ""
                                }`}
                            >
                                {bars.map((bar, idx) => (
                                    <div
                                        key={idx}
                                        className="absolute rounded-full opacity-90"
                                        style={{
                                            left: `${bar.startPct}%`,
                                            width: `${bar.widthPct}%`,
                                            top: `${30 + idx * 12}%`, // 위아래 스택
                                            height: "3px", // 가는 선
                                            backgroundColor: bar.color,
                                        }}
                                    />
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/* ----------------- 메인 페이지 ----------------- */

export default function TimelinePage() {
    const [entries, setEntries] = useState<ChatEntry[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [input, setInput] = useState("");
    const [idCounter, setIdCounter] = useState(1);

    const [taskDefs, setTaskDefs] = useState<TaskDefinition[]>([
        { name: "미적분", color: COLOR_POOL[0] },
        { name: "영어", color: COLOR_POOL[1] },
    ]);

    const [showTaskModal, setShowTaskModal] = useState(false);
    const [newTaskName, setNewTaskName] = useState("");
    const [newTaskColor, setNewTaskColor] = useState<string | null>(null);

    // 현재 입력 대상 task (Ctrl+/ 로 순환)
    const [activeTaskName, setActiveTaskName] = useState<string | undefined>(
        undefined
    );

    // 해시태그 자동완성
    const [hashtagQuery, setHashtagQuery] = useState<string | null>(null);
    const [hashtagStart, setHashtagStart] = useState<number | null>(null);
    const [hashtagSelectedIndex, setHashtagSelectedIndex] = useState(0);

    // 타임라인 열고/닫기 + 리사이즈
    const [showTimeline, setShowTimeline] = useState(true);
    const [timelineWidthPct, setTimelineWidthPct] = useState(40); // 0~100
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // textarea 자동 높이
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const runningTasks = tasks.filter((t) => t.status === "running");

    useEffect(() => {
        if (runningTasks.length === 0) {
            setActiveTaskName(undefined);
            return;
        }
        if (!activeTaskName || !runningTasks.some((t) => t.name === activeTaskName)) {
            setActiveTaskName(runningTasks[0]?.name);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tasks]);

    // 리사이즈 핸들
    useEffect(() => {
        if (!isResizing) return;

        const handleMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const totalWidth = rect.width;
            const timelineWidth = totalWidth - x;
            let pct = (timelineWidth / totalWidth) * 100;
            pct = Math.max(20, Math.min(70, pct)); // 20%~70% 사이
            setTimelineWidthPct(pct);
        };

        const handleUp = () => setIsResizing(false);

        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleUp);
        return () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleUp);
        };
    }, [isResizing]);

    const findTask = (name: string) => tasks.find((t) => t.name === name);

    const startTask = (name: string, now: Date) => {
        setTasks((prev) => {
            const existing = prev.find((t) => t.name === name);
            if (existing) {
                return prev.map((t) =>
                    t.name === name
                        ? {
                              ...t,
                              status: "running",
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
                        status: "running",
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
                return { ...t, status: "finished", segments: segs };
            })
        );
    };

    const addChat = (entry: Omit<ChatEntry, "id" | "time">) => {
        const now = new Date();
        const newEntry: ChatEntry = {
            id: idCounter,
            time: formatTime(now),
            ...entry,
        };
        setEntries((prev) => [...prev, newEntry]);
        setIdCounter((prev) => prev + 1);
    };

    /* ---------- 입력 & 해시태그 ---------- */

    const handleInputChange = (
        e: React.ChangeEvent<HTMLTextAreaElement>
    ) => {
        const value = e.target.value;
        const caret = e.target.selectionStart ?? value.length;

        setInput(value);

        // 해시태그 감지
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
            const query = value.slice(hashIndex + 1, caret);
            setHashtagStart(hashIndex);
            setHashtagQuery(query);
            setHashtagSelectedIndex(0);
        } else {
            setHashtagStart(null);
            setHashtagQuery(null);
        }

        // textarea 자동 높이 (최대 10줄 정도)
        if (textareaRef.current) {
            const ta = textareaRef.current;
            ta.style.height = "auto";
            const lineHeight = 20; // 대략 20px 라고 가정
            const maxHeight = lineHeight * 10;
            const newHeight = Math.min(ta.scrollHeight, maxHeight);
            ta.style.height = `${newHeight}px`;
        }
    };

    const hashtagSuggestions =
        hashtagQuery !== null
            ? taskDefs.filter((d) =>
                  d.name.toLowerCase().includes(hashtagQuery.toLowerCase())
              )
            : [];

    const handleSelectHashtag = (name: string) => {
        if (hashtagStart === null) return;

        const caret = input.length;
        const before = input.slice(0, hashtagStart);
        const after = input.slice(caret);

        const newText = `${before}#${name}${after}`;

        setInput(newText);
        setHashtagQuery(null);
        setHashtagStart(null);
        setHashtagSelectedIndex(0);
    };

    /* ---------- 제출 / 키 이벤트 ---------- */

    const handleSubmit = () => {
        const raw = input;
        const trimmed = raw.trim();
        if (!trimmed) return;

        const now = new Date();

        // ##topic : 종료
        if (trimmed.startsWith("##")) {
            const name = trimmed.slice(2).trim();
            if (!name) {
                setInput("");
                return;
            }
            const existing = findTask(name);
            if (existing) {
                endTask(name, now);
                addChat({
                    type: "system",
                    text: `${name} task를 종료합니다.`,
                    taskName: name,
                    systemKind: "taskEnd",
                });
            } else {
                addChat({
                    type: "system",
                    text: `${name} task는 존재하지 않습니다.`,
                    systemKind: "info",
                });
            }
            setInput("");
            return;
        }

        // #topic : 시작/등록 + 현재 입력 task로 설정
        if (trimmed.startsWith("#")) {
            const name = trimmed.slice(1).trim();
            if (!name) {
                setInput("");
                return;
            }

            const alreadyRunning = runningTasks.find((t) => t.name === name);

            if (!alreadyRunning) {
                // 새로 시작
                startTask(name, now);
                addChat({
                    type: "system",
                    text: `${name} task를 시작합니다.`,
                    taskName: name,
                    systemKind: "taskStart",
                });
            } else {
                // 이미 진행 중이면, 현재 입력 task만 바꿔줌
                addChat({
                    type: "system",
                    text: `${name} task는 이미 진행 중입니다. 현재 입력 task로 설정합니다.`,
                    taskName: name,
                    systemKind: "info",
                });
            }

            // 직후 채팅의 기본 task를 이 이름으로
            setActiveTaskName(name);
            setInput("");
            return;
        }

        // 일반 메시지: 현재 activeTaskName 기준
        addChat({
            type: "user",
            text: raw,
            taskName: activeTaskName,
        });

        setInput("");
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        // Ctrl + / : task 전환 (등록된 running task들 사이를 순환)
        if (e.ctrlKey && e.key === "/") {
            e.preventDefault();
            const running = tasks.filter((t) => t.status === "running");
            if (running.length === 0) return;
            if (!activeTaskName) {
                setActiveTaskName(running[0].name);
                return;
            }
            const idx = running.findIndex((t) => t.name === activeTaskName);
            const next = running[(idx + 1) % running.length];
            setActiveTaskName(next.name);
            return;
        }

        // 해시태그 자동완성 네비게이션
        if (hashtagSuggestions.length > 0 && hashtagQuery !== null) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setHashtagSelectedIndex((prev) =>
                    (prev + 1) % hashtagSuggestions.length
                );
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setHashtagSelectedIndex((prev) =>
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

        // Enter → 전송, Shift+Enter는 줄바꿈
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const getTaskColor = (taskName?: string) => {
        if (!taskName) return undefined;
        const t = tasks.find((task) => task.name === taskName);
        return t?.color;
    };

    /* ---- task 카테고리 등록 모달 ---- */

    const availableColors = COLOR_POOL.filter(
        (c) => !taskDefs.some((d) => d.color === c)
    );

    const handleAddTaskDef = () => {
        const name = newTaskName.trim();
        if (!name) return;
        if (taskDefs.some((d) => d.name === name)) return;

        const color =
            newTaskColor ??
            (availableColors.length > 0
                ? availableColors[0]
                : COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)]);

        setTaskDefs((prev) => [...prev, { name, color }]);
        setNewTaskName("");
        setNewTaskColor(null);
        setShowTaskModal(false);
    };

    const chatWidthPct = showTimeline ? 100 - timelineWidthPct : 100;

    return (
        <div className="h-screen flex flex-col bg-slate-950 text-slate-50">
            {/* 전체 헤더 */}
            <header className="border-b border-slate-800 px-4 py-2 flex items-center justify-between bg-slate-950/95">
                <div className="flex items-center gap-2">
                    <button
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-xs"
                        onClick={() => {
                            // 프로젝트에 맞게 바꿔 쓰면 됨 (React Router면 navigate 사용)
                            window.location.href = "/";
                        }}
                    >
                        <FaHome className="text-slate-300" />
                        <span>/Home</span>
                    </button>
                    <span className="text-sm font-semibold ml-2">Timeline</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                    <button
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800"
                        onClick={() => setShowTaskModal(true)}
                    >
                        <FaPlus />
                        <span>카테고리 추가</span>
                    </button>
                    <button
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800"
                        onClick={() => setShowTimeline((prev) => !prev)}
                    >
                        <FaClock />
                        <span>{showTimeline ? "타임라인 숨기기" : "타임라인 보기"}</span>
                        {showTimeline ? (
                            <FaChevronRight className="text-[10px]" />
                        ) : (
                            <FaChevronLeft className="text-[10px]" />
                        )}
                    </button>
                </div>
            </header>

            {/* 본문: 채팅 + 타임라인 */}
            <div className="flex flex-1" ref={containerRef}>
                {/* 채팅 영역 */}
                <div
                    className="flex flex-col"
                    style={{ width: `${chatWidthPct}%` }}
                >
                    <main className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                        {entries.length === 0 && (
                            <div className="h-full flex items-center justify-center text-sm text-slate-500 text-center px-6">
                                예: <code className="text-sky-300">#미적분</code> 입력 후 공부
                                내용을 적으면 오른쪽 타임라인에 선이 그려집니다.
                            </div>
                        )}

                        {entries.map((entry) => {
                            const isSystem = entry.type === "system";
                            const color = getTaskColor(entry.taskName);

                            // task 시작 카드
                            if (isSystem && entry.systemKind === "taskStart") {
                                return (
                                    <div
                                        key={entry.id}
                                        className="flex items-start gap-3 text-sm"
                                    >
                                        <div className="w-14 text-right text-[11px] text-slate-500 pt-1">
                                            {entry.time}
                                        </div>
                                        <div className="flex-1">
                                            <div className="inline-flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2">
                                                <div
                                                    className="w-4 h-4 rounded-full"
                                                    style={{ backgroundColor: color ?? "#22c55e" }}
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] uppercase tracking-wide text-emerald-400">
                                                        TASK START
                                                    </span>
                                                    <span className="text-sm">
                                                        {entry.taskName} task를 시작합니다.
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            // task 종료 카드
                            if (isSystem && entry.systemKind === "taskEnd") {
                                return (
                                    <div
                                        key={entry.id}
                                        className="flex items-start gap-3 text-sm"
                                    >
                                        <div className="w-14 text-right text-[11px] text-slate-500 pt-1">
                                            {entry.time}
                                        </div>
                                        <div className="flex-1">
                                            <div className="inline-flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2">
                                                <div className="relative w-4 h-4">
                                                    {/* 기존 색 동그라미 — TASK START 아이콘과 동일한 모양 유지 */}
                                                    <div
                                                        className="absolute inset-0 rounded-full"
                                                        style={{ backgroundColor: color ?? "#64748b" }}
                                                    />

                                                    {/* 체크 표시 — 위에 중첩 */}
                                                    <FaCheck
                                                        className="absolute inset-0 m-auto text-white text-[8px]"
                                                    />
                                                </div>

                                                <div className="flex flex-col">
                                                    <span className="text-[11px] uppercase tracking-wide text-slate-400">
                                                        TASK END
                                                    </span>
                                                    <span className="text-sm">
                                                        {entry.taskName} task를 종료합니다.
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            // 일반 / 기타 시스템
                            return (
                                <div
                                    key={entry.id}
                                    className="flex items-start gap-3 text-sm"
                                >
                                    <div className="w-14 text-right text-[11px] text-slate-500 pt-1">
                                        {entry.time}
                                    </div>

                                    <div className="flex-1">
                                        <div
                                            className={`inline-flex max-w-[90%] rounded-2xl px-3 py-2 whitespace-pre-wrap break-words ${
                                                isSystem
                                                    ? "text-slate-200 text-xs"
                                                    : "text-slate-50"
                                            }`}
                                            style={
                                                color && !isSystem
                                                    ? { backgroundColor: color }
                                                    : isSystem
                                                    ? { backgroundColor: "#1f2933" }
                                                    : undefined
                                            }
                                        >
                                            {entry.text}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </main>

                    {/* 입력 영역 */}
                    <footer className="border-t border-slate-800 px-4 py-3">
                        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2 flex flex-col gap-2">
                            <textarea
                                ref={textareaRef}
                                className="w-full bg-transparent text-sm outline-none resize-none min-h-[40px] placeholder:text-slate-500"
                                placeholder="#미적분 (시작/등록), ##미적분 (종료) · Enter: 전송 / Shift+Enter: 줄바꿈 · Ctrl+/: task 전환"
                                value={input}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                            />

                            {/* 해시태그 자동완성 드롭다운 */}
                            {hashtagSuggestions.length > 0 && hashtagQuery !== null && (
                                <div className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 text-xs max-h-40 overflow-y-auto shadow-lg">
                                    {hashtagSuggestions.map((d, idx) => {
                                        const selected = idx === hashtagSelectedIndex;
                                        return (
                                            <button
                                                key={d.name}
                                                type="button"
                                                onClick={() => handleSelectHashtag(d.name)}
                                                className={`w-full text-left px-2 py-1 flex items-center gap-2 ${
                                                    selected ? "bg-slate-800" : "hover:bg-slate-800"
                                                }`}
                                            >
                                                <span
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: d.color }}
                                                />
                                                <span>#{d.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="flex justify-between text-[11px] text-slate-500">
                                <span>
                                    현재 입력 task:{" "}
                                    {activeTaskName ? (
                                        <span className="text-sky-300">{activeTaskName}</span>
                                    ) : (
                                        "없음"
                                    )}{" "}
                                    (Ctrl+/ 로 변경)
                                </span>
                                <span>
                                    진행 중:{" "}
                                    {runningTasks.length === 0
                                        ? "없음"
                                        : runningTasks.map((t) => t.name).join(", ")}
                                </span>
                            </div>
                        </div>
                    </footer>
                </div>

                {/* 리사이즈 핸들 + 타임라인 */}
                {showTimeline && (
                    <>
                        <div
                            className="w-1 cursor-col-resize bg-slate-800/80 hover:bg-slate-500"
                            onMouseDown={() => setIsResizing(true)}
                        />
                        <div
                            className="h-full"
                            style={{ width: `${timelineWidthPct}%` }}
                        >
                            <TimelinePanel tasks={tasks} />
                        </div>
                    </>
                )}
            </div>

            {/* task 카테고리 등록 모달 */}
            {showTaskModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold">Task 카테고리 등록</h2>
                            <button
                                className="text-slate-400 hover:text-slate-200"
                                onClick={() => setShowTaskModal(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-2 text-sm">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">
                                    이름
                                </label>
                                <input
                                    className="w-full rounded-md bg-slate-800 border border-slate-700 px-2 py-1 text-sm outline-none"
                                    value={newTaskName}
                                    onChange={(e) => setNewTaskName(e.target.value)}
                                    placeholder="예: 알고리즘, 논문읽기"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-slate-400 mb-1">
                                    색상 (팔레트에서 선택)
                                </label>
                                <div className="flex flex-wrap gap-1">
                                    {COLOR_POOL.map((c) => {
                                        const used = taskDefs.some((d) => d.color === c);
                                        const selected = newTaskColor === c;
                                        return (
                                            <button
                                                key={c}
                                                type="button"
                                                disabled={used}
                                                onClick={() => setNewTaskColor(c)}
                                                className={`w-6 h-6 rounded-full border ${
                                                    selected
                                                        ? "border-white scale-110"
                                                        : "border-slate-700"
                                                } ${
                                                    used
                                                        ? "opacity-30 cursor-not-allowed"
                                                        : "cursor-pointer"
                                                }`}
                                                style={{ backgroundColor: c }}
                                                title={c}
                                            />
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <div className="text-xs text-slate-400 mb-1">
                                    등록된 카테고리
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs">
                                    {taskDefs.map((d) => (
                                        <div
                                            key={d.name}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800 border border-slate-700"
                                        >
                                            <span
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: d.color }}
                                            />
                                            <span>{d.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 text-xs">
                            <button
                                className="px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700"
                                onClick={() => setShowTaskModal(false)}
                            >
                                취소
                            </button>
                            <button
                                className="px-3 py-1 rounded-full bg-sky-600 hover:bg-sky-500 text-slate-50"
                                onClick={handleAddTaskDef}
                            >
                                저장
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
