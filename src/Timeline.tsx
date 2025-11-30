import React, { useState, useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import {
    FaHome,
    FaPlus,
    FaClock,
    FaChevronLeft,
    FaChevronRight,
    FaCheck,
    FaTrash,
    FaPen,
} from "react-icons/fa";

/** ==== 타입 정의 ==== */

type ChatType = "USER" | "SYSTEM";
type SystemKind = "TASK_START" | "TASK_END" | "INFO" | undefined | null;
type TaskStatus = "RUNNING" | "FINISHED";

type ChatEntry = {
    id: number;
    time: string;
    createdAt: Date;
    text: string;
    type: ChatType;
    taskName?: string;
    systemKind?: SystemKind;
};

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

/** ==== 백엔드 DTO ==== */

type ApiTaskSegment = {
    id: number | null;
    startTime: string;
    endTime: string | null;
};

type ApiTask = {
    id: number | null;
    name: string;
    color: string;
    status: TaskStatus;
    date: string;
    segments: ApiTaskSegment[];
};

type ApiChatEntry = {
    id: number;
    createdAt: string;
    text: string;
    type: ChatType;
    taskName: string | null;
    systemKind: SystemKind;
};

type ApiTimelineResponse = {
    date: string;
    tasks: ApiTask[];
    entries: ApiChatEntry[];
};

type ApiChatCreateRequest = {
    date: string;
    text: string;
    type: ChatType;
    taskName: string | null;
    systemKind: SystemKind | null;
};

type ApiChatUpdateRequest = {
    text: string;
};

const API_BASE = "http://localhost:8080/api/timeline";

const DAY_START_HOUR = 0;
const DAY_END_HOUR = 24;
const HOURS = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR },
    (_, i) => DAY_START_HOUR + i
);

const COLOR_POOL = [
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#eab308",
    "#84cc16",
    "#22c55e",
    "#10b981",
    "#14b8a6",
    "#06b6d4",
    "#0ea5e9",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#a855f7",
    "#d946ef",
    "#ec4899",
    "#f43f5e",
    "#fb7185",
    "#f97373",
    "#facc15",
    "#4ade80",
    "#34d399",
    "#2dd4bf",
    "#38bdf8",
    "#60a5fa",
    "#818cf8",
    "#a5b4fc",
    "#f9a8d4",
    "#fbbf24",
    "#22c55e",
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

function getTodayDateString(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

/* ---------- 타임라인 패널 ---------- */

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
                                            top: `${30 + idx * 12}%`,
                                            height: "3px",
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

/* ---------- Monthly Planner (오른쪽 상단 작은 캘린더) ---------- */

type MonthlyPlannerProps = {
    currentDate: string;
    onDateChange: (date: string) => void;
};

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function MonthlyPlanner({ currentDate, onDateChange }: MonthlyPlannerProps) {
    const [visibleYear, setVisibleYear] = useState<number>(() => {
        const d = new Date(currentDate || getTodayDateString());
        return d.getFullYear();
    });
    const [visibleMonth, setVisibleMonth] = useState<number>(() => {
        const d = new Date(currentDate || getTodayDateString());
        return d.getMonth(); // 0~11
    });

    useEffect(() => {
        if (!currentDate) return;
        const d = new Date(currentDate);
        if (!isNaN(d.getTime())) {
            setVisibleYear(d.getFullYear());
            setVisibleMonth(d.getMonth());
        }
    }, [currentDate]);

    const firstDayOfMonth = new Date(visibleYear, visibleMonth, 1);
    const startWeekDay = firstDayOfMonth.getDay(); // 0(일)~6(토)
    const daysInMonth = new Date(visibleYear, visibleMonth + 1, 0).getDate();

    const cells: Date[] = [];
    const firstCellDate = new Date(
        visibleYear,
        visibleMonth,
        1 - startWeekDay
    );
    for (let i = 0; i < 42; i++) {
        const d = new Date(
            firstCellDate.getFullYear(),
            firstCellDate.getMonth(),
            firstCellDate.getDate() + i
        );
        cells.push(d);
    }

    const todayStr = getTodayDateString();

    const handleMoveMonth = (delta: number) => {
        const newMonth = visibleMonth + delta;
        const y = visibleYear + Math.floor(newMonth / 12);
        const m = ((newMonth % 12) + 12) % 12;
        setVisibleYear(y);
        setVisibleMonth(m);
    };

    const formatDateStr = (d: Date) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    return (
        <div className="border-b border-slate-800 bg-slate-950/95">
            <div className="px-3 py-2">
                {/* 상단 월 이동/헤더 */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                        <button
                            className="p-1 rounded-full hover:bg-slate-800 text-[11px]"
                            onClick={() => handleMoveMonth(-1)}
                        >
                            <FaChevronLeft />
                        </button>
                        <div className="text-xs font-semibold">
                            {visibleYear}년 {visibleMonth + 1}월
                        </div>
                        <button
                            className="p-1 rounded-full hover:bg-slate-800 text-[11px]"
                            onClick={() => handleMoveMonth(1)}
                        >
                            <FaChevronRight />
                        </button>
                    </div>
                    <button
                        className="px-2 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-[10px]"
                        onClick={() => onDateChange(getTodayDateString())}
                    >
                        오늘로 이동
                    </button>
                </div>

                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 text-[10px] text-center text-slate-400 mb-1">
                    {DAY_LABELS.map((d) => (
                        <div key={d} className="py-0.5">
                            {d}
                        </div>
                    ))}
                </div>

                {/* 날짜 그리드 */}
                <div className="grid grid-cols-7 text-[11px] gap-y-1">
                    {cells.map((d, idx) => {
                        const isCurrentMonth =
                            d.getMonth() === visibleMonth &&
                            d.getFullYear() === visibleYear;
                        const dateStr = formatDateStr(d);
                        const isToday = dateStr === todayStr;
                        const isSelected = dateStr === currentDate;

                        let textColor = "text-slate-300";
                        if (!isCurrentMonth) textColor = "text-slate-500";
                        if (d.getDay() === 0) textColor = "text-rose-400";
                        if (d.getDay() === 6) textColor = "text-sky-400";

                        return (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => onDateChange(dateStr)}
                                className={`h-6 flex items-center justify-center mx-auto w-6 rounded-full transition-colors ${
                                    isSelected
                                        ? "bg-sky-500 text-slate-50"
                                        : isToday
                                        ? "border border-sky-500/70"
                                        : "hover:bg-slate-800/70"
                                } ${textColor} ${
                                    !isCurrentMonth
                                        ? "opacity-60"
                                        : "opacity-100"
                                }`}
                            >
                                {d.getDate()}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/* ---------- 메인 페이지 ---------- */

export default function TimelinePage() {
    const [entries, setEntries] = useState<ChatEntry[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [input, setInput] = useState("");

    const [currentDate, setCurrentDate] = useState<string>(() =>
        getTodayDateString()
    );

    const [taskDefs, setTaskDefs] = useState<TaskDefinition[]>([
        { name: "미적분", color: COLOR_POOL[0] },
        { name: "영어", color: COLOR_POOL[1] },
    ]);

    const [showTaskModal, setShowTaskModal] = useState(false);
    const [newTaskName, setNewTaskName] = useState("");
    const [newTaskColor, setNewTaskColor] = useState<string | null>(null);

    const [activeTaskName, setActiveTaskName] = useState<string | undefined>(
        undefined
    );

    const [hashtagQuery, setHashtagQuery] = useState<string | null>(null);
    const [hashtagStart, setHashtagStart] = useState<number | null>(null);
    const [hashtagSelectedIndex, setHashtagSelectedIndex] = useState(0);

    const [showTimeline, setShowTimeline] = useState(true);
    const [timelineWidthPct, setTimelineWidthPct] = useState(40);
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const runningTasks = tasks.filter((t) => t.status === "RUNNING");
    const isTodaySelected = currentDate === getTodayDateString();

    /** ----- 초기 TaskDefinition 로드 ----- */
    useEffect(() => {
        const fetchTaskDefs = async () => {
            try {
                const res = await fetch(`${API_BASE}/task-definitions`);
                if (!res.ok) return;
                const data: { id: number; name: string; color: string }[] =
                    await res.json();
                if (data.length > 0) {
                    setTaskDefs(
                        data.map((d) => ({
                            name: d.name,
                            color: d.color,
                        }))
                    );
                }
            } catch (e) {
                console.error("Failed to load task definitions", e);
            }
        };
        fetchTaskDefs();
    }, []);

    /** ----- 선택된 날짜의 타임라인 로드 ----- */
    useEffect(() => {
        const fetchTimeline = async () => {
            try {
                const res = await fetch(
                    `${API_BASE}?date=${encodeURIComponent(currentDate)}`
                );
           

                 if (!res.ok) {
                    setEntries([]);
                    setTasks([]);
                    return;
                }

                const data: ApiTimelineResponse = await res.json();

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

                const running = loadedTasks.filter(
                    (t) => t.status === "RUNNING"
                );
                setActiveTaskName(running[0]?.name);
            } catch (e) {
                console.error("Failed to load timeline", e);
            }
        };

        fetchTimeline();
    }, [currentDate]);

    /** ----- RUNNING 상태 변화 감시 ----- */
    useEffect(() => {
        if (runningTasks.length === 0) {
            setActiveTaskName(undefined);
            return;
        }
        if (
            !activeTaskName ||
            !runningTasks.some((t) => t.name === activeTaskName)
        ) {
            setActiveTaskName(runningTasks[0]?.name);
        }
    }, [tasks]);

    /** ----- 리사이즈 핸들 ----- */
    useEffect(() => {
        if (!isResizing) return;

        const handleMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const totalWidth = rect.width;
            const timelineWidth = totalWidth - x;
            let pct = (timelineWidth / totalWidth) * 100;
            pct = Math.max(20, Math.min(70, pct));
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

    /** ----- 한 줄씩 채팅 저장 (서버 시간 기준) ----- */
    const addChat = async (entry: {
        text: string;
        type: ChatType;
        taskName?: string;
        systemKind?: SystemKind;
    }) => {
        const payload: ApiChatCreateRequest = {
            date: currentDate,
            text: entry.text,
            type: entry.type,
            taskName: entry.taskName ?? null,
            systemKind: entry.systemKind ?? null,
        };

        try {
            const res = await fetch(`${API_BASE}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                console.error("Failed to save chat line:", res.status);
                alert("채팅 저장 중 오류가 발생했습니다.");
                return;
            }

            const saved: ApiChatEntry = await res.json();
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

    /** ----- 채팅 수정 ----- */
    const handleEditEntry = async (entry: ChatEntry) => {
        const newText = window.prompt("채팅 내용 수정", entry.text);
        if (newText === null) return;
        if (!newText.trim()) {
            alert("내용이 비어 있습니다.");
            return;
        }

        const payload: ApiChatUpdateRequest = { text: newText };

        try {
            const res = await fetch(`${API_BASE}/chat/${entry.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                console.error("Failed to update chat:", res.status);
                alert("채팅 수정 중 오류가 발생했습니다.");
                return;
            }

            const updated: ApiChatEntry = await res.json();
            const created = new Date(updated.createdAt);

            setEntries((prev) =>
                prev.map((e) =>
                    e.id === entry.id
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

    /** ----- 채팅 삭제 ----- */
    const handleDeleteEntry = async (id: number) => {
        if (!window.confirm("이 채팅을 삭제할까요?")) return;

        try {
            const res = await fetch(`${API_BASE}/chat/${id}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                console.error("Failed to delete chat:", res.status);
                alert("채팅 삭제 중 오류가 발생했습니다.");
                return;
            }

            setEntries((prev) => prev.filter((e) => e.id !== id));
        } catch (e) {
            console.error("Error deleting chat", e);
            alert("채팅 삭제 중 오류가 발생했습니다.");
        }
    };

    /** ----- 입력 & 해시태그 ----- */

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
            const query = value.slice(hashIndex + 1, caret);
            setHashtagStart(hashIndex);
            setHashtagQuery(query);
            setHashtagSelectedIndex(0);
        } else {
            setHashtagStart(null);
            setHashtagQuery(null);
        }

        if (textareaRef.current) {
            const ta = textareaRef.current;
            ta.style.height = "auto";
            const lineHeight = 20;
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

    /** ----- 제출 / 키 이벤트 ----- */

    const handleSubmit = async () => {
        const raw = input;
        const trimmed = raw.trim();
        if (!trimmed) return;

        // ✅ 과거 날짜에는 새 채팅/명령 입력 불가
        if (!isTodaySelected) {
            alert("이전 날짜에는 새 채팅을 추가할 수 없습니다.");
            setInput("");
            return;
        }

        const now = new Date();

        // ##task : 종료 + 자동 문서 페이지 이동
        if (trimmed.startsWith("##")) {
            const name = trimmed.slice(2).trim();
            setInput("");
            if (!name) return;

            const existing = findTask(name);
            if (existing) {
                endTask(name, now);
                await addChat({
                    type: "SYSTEM",
                    text: `${name} task를 종료합니다.`,
                    taskName: name,
                    systemKind: "TASK_END",
                });

                // ✅ 자동저장된 문서 페이지로 이동 (추후 페이지 내용 구현)
                const docUrl = `/docs?task=${encodeURIComponent(
                    name
                )}&date=${encodeURIComponent(currentDate)}`;
                window.location.href = docUrl;
            } else {
                await addChat({
                    type: "SYSTEM",
                    text: `${name} task는 존재하지 않습니다.`,
                    systemKind: "INFO",
                });
            }
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

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.ctrlKey && e.key === "/") {
            e.preventDefault();
            const running = tasks.filter((t) => t.status === "RUNNING");
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

        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleSubmit();
        }
    };

    const getTaskColor = (taskName?: string) => {
        if (!taskName) return undefined;
        const t = tasks.find((task) => task.name === taskName);
        return t?.color;
    };

    /** ----- 카테고리 추가 ----- */

    const availableColors = COLOR_POOL.filter(
        (c) => !taskDefs.some((d) => d.color === c)
    );

    const handleAddTaskDef = async () => {
        const name = newTaskName.trim();
        if (!name) return;
        if (taskDefs.some((d) => d.name === name)) return;

        const color =
            newTaskColor ??
            (availableColors.length > 0
                ? availableColors[0]
                : COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)]);

        try {
            const params = new URLSearchParams();
            params.set("name", name);
            params.set("color", color);

            const res = await fetch(
                `${API_BASE}/task-definitions?${params.toString()}`,
                {
                    method: "POST",
                }
            );

            if (!res.ok) {
                console.error("Failed to create task definition:", res.status);
                alert("카테고리 저장에 실패했습니다.");
                return;
            }

            const saved: { id: number; name: string; color: string } =
                await res.json();

            setTaskDefs((prev) => [
                ...prev,
                { name: saved.name, color: saved.color },
            ]);
            setNewTaskName("");
            setNewTaskColor(null);
            setShowTaskModal(false);
        } catch (e) {
            console.error("Error creating task definition", e);
            alert("카테고리 저장 중 오류가 발생했습니다.");
        }
    };

    const chatWidthPct = showTimeline ? 100 - timelineWidthPct : 100;

    return (
        <div className="h-screen flex flex-col bg-slate-950 text-slate-50">
            <header className="border-b border-slate-800 px-4 py-2 flex items-center justify-between bg-slate-950/95">
                <div className="flex items-center gap-2">
                    <button
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-xs"
                        onClick={() => {
                            window.location.href = "/";
                        }}
                    >
                        <FaHome className="text-slate-300" />
                        <span>/Home</span>
                    </button>
                    <span className="text-sm font-semibold ml-2">
                        Timeline ({currentDate})
                    </span>
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
                        <span>
                            {showTimeline ? "타임라인 숨기기" : "타임라인 보기"}
                        </span>
                        {showTimeline ? (
                            <FaChevronRight className="text-[10px]" />
                        ) : (
                            <FaChevronLeft className="text-[10px]" />
                        )}
                    </button>
                </div>
            </header>

            {/* 전체 바디: 왼쪽 채팅, 오른쪽 (위: 캘린더, 아래: 타임라인) */}
            <div className="flex-1 flex" ref={containerRef}>
                {/* 왼쪽: 채팅 영역 */}
                <div
                    className="flex flex-col"
                    style={{ width: `${chatWidthPct}%` }}
                >
                    <main className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                        {entries.length === 0 && (
                            <div className="h-full flex items-center justify-center text-sm text-slate-500 text-center px-6">
                                예:{" "}
                                <code className="text-sky-300">#미적분</code>{" "}
                                입력 후 공부 내용을 적으면 오른쪽
                                타임라인에 선이 그려집니다.
                            </div>
                        )}

                        {entries.map((entry) => {
                            const isSystem = entry.type === "SYSTEM";
                            const color = getTaskColor(entry.taskName);

                            if (isSystem && entry.systemKind === "TASK_START") {
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
                                                    style={{
                                                        backgroundColor:
                                                            color ?? "#22c55e",
                                                    }}
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] uppercase tracking-wide text-emerald-400">
                                                        TASK START
                                                    </span>
                                                    <span className="text-sm">
                                                        {entry.taskName} task를
                                                        시작합니다.
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            if (isSystem && entry.systemKind === "TASK_END") {
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
                                                    <div
                                                        className="absolute inset-0 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                color ??
                                                                "#64748b",
                                                        }}
                                                    />
                                                    <FaCheck className="absolute inset-0 m-auto text-white text-[8px]" />
                                                </div>

                                                <div className="flex flex-col">
                                                    <span className="text-[11px] uppercase tracking-wide text-slate-400">
                                                        TASK END
                                                    </span>
                                                    <span className="text-sm">
                                                        {entry.taskName} task를
                                                        종료합니다.
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={entry.id}
                                    className="flex items-start gap-3 text-sm"
                                >
                                    <div className="w-14 text-right text-[11px] text-slate-500 pt-1">
                                        {entry.time}
                                    </div>

                                    <div className="flex-1 flex items-start gap-2">
                                        <div
                                            className={`inline-flex max-w-[90%] rounded-2xl px-3 py-2 whitespace-pre-wrap break-words ${
                                                isSystem
                                                    ? "text-slate-200 text-xs"
                                                    : "text-slate-50"
                                            }`}
                                            style={
                                                color && !isSystem
                                                    ? {
                                                          backgroundColor:
                                                              color,
                                                      }
                                                    : isSystem
                                                    ? {
                                                          backgroundColor:
                                                              "#1f2933",
                                                      }
                                                    : undefined
                                            }
                                        >
                                            {entry.text}
                                        </div>

                                        <div className="flex flex-col gap-1 mt-1">
                                            <button
                                                className="p-1 rounded-full hover:bg-slate-800 text-[10px] text-slate-400"
                                                title="수정"
                                                onClick={() =>
                                                    handleEditEntry(entry)
                                                }
                                            >
                                                <FaPen />
                                            </button>
                                            <button
                                                className="p-1 rounded-full hover:bg-slate-800 text-[10px] text-slate-400"
                                                title="삭제"
                                                onClick={() =>
                                                    handleDeleteEntry(entry.id)
                                                }
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </main>

                    <footer className="border-t border-slate-800 px-4 py-3">
                        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2 flex flex-col gap-2">
                            <textarea
                                ref={textareaRef}
                                className="w-full bg-transparent text-sm outline-none resize-none min-h-[40px] placeholder:text-slate-500 disabled:text-slate-500 disabled:cursor-not-allowed"
                                placeholder={
                                    isTodaySelected
                                        ? "#미적분 (시작/등록), ##미적분 (종료) · Enter: 전송 / Shift+Enter: 줄바꿈 · Ctrl+/: task 전환"
                                        : "이전 날짜에는 새 채팅을 추가할 수 없습니다."
                                }
                                value={input}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                disabled={!isTodaySelected}
                            />

                            {hashtagSuggestions.length > 0 &&
                                hashtagQuery !== null &&
                                isTodaySelected && (
                                    <div className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 text-xs max-h-40 overflow-y-auto shadow-lg">
                                        {hashtagSuggestions.map((d, idx) => {
                                            const selected =
                                                idx ===
                                                hashtagSelectedIndex;
                                            return (
                                                <button
                                                    key={d.name}
                                                    type="button"
                                                    onClick={() =>
                                                        handleSelectHashtag(
                                                            d.name
                                                        )
                                                    }
                                                    className={`w-full text-left px-2 py-1 flex items-center gap-2 ${
                                                        selected
                                                            ? "bg-slate-800"
                                                            : "hover:bg-slate-800"
                                                    }`}
                                                >
                                                    <span
                                                        className="w-3 h-3 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                d.color,
                                                        }}
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
                                        <span className="text-sky-300">
                                            {activeTaskName}
                                        </span>
                                    ) : (
                                        "없음"
                                    )}{" "}
                                    (Ctrl+/ 로 변경)
                                </span>
                                <span>
                                    진행 중:{" "}
                                    {runningTasks.length === 0
                                        ? "없음"
                                        : runningTasks
                                              .map((t) => t.name)
                                              .join(", ")}
                                </span>
                            </div>
                        </div>
                    </footer>
                </div>

                {/* 오른쪽: 위 캘린더 + 아래 타임라인 패널 */}
                {showTimeline && (
                    <>
                        <div
                            className="w-1 cursor-col-resize bg-slate-800/80 hover:bg-slate-500"
                            onMouseDown={() => setIsResizing(true)}
                        />
                        <div
                            className="h-full flex flex-col border-l border-slate-800"
                            style={{ width: `${timelineWidthPct}%` }}
                        >
                            {/* 위쪽: 작은 월간 플래너 */}
                            <div className="shrink-0">
                                <MonthlyPlanner
                                    currentDate={currentDate}
                                    onDateChange={setCurrentDate}
                                />
                            </div>
                            {/* 아래쪽: 기존 타임라인 패널 */}
                            <div className="flex-1">
                                <TimelinePanel tasks={tasks} />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {showTaskModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold">
                                Task 카테고리 등록
                            </h2>
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
                                    onChange={(e) =>
                                        setNewTaskName(e.target.value)
                                    }
                                    placeholder="예: 알고리즘, 논문읽기"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-slate-400 mb-1">
                                    색상 (팔레트에서 선택)
                                </label>
                                <div className="flex flex-wrap gap-1">
                                    {COLOR_POOL.map((c) => {
                                        const used = taskDefs.some(
                                            (d) => d.color === c
                                        );
                                        const selected = newTaskColor === c;
                                        return (
                                            <button
                                                key={c}
                                                type="button"
                                                disabled={used}
                                                onClick={() =>
                                                    setNewTaskColor(c)
                                                }
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
                                                style={{
                                                    backgroundColor: d.color,
                                                }}
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
