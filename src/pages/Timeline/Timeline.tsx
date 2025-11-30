// src/timeline/TimelinePage.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";

import type {
    ChatEntry,
    Task,
    TaskDefinition,
    ChatType,
    ApiTimelineResponse,
    ApiChatEntry,
    ApiChatCreateRequest,
    ApiChatUpdateRequest,
} from "./timelineTypes";

import {
    API_BASE,
    pickColorForTask,
    formatTime,
    getTodayDateString,
    COLOR_POOL,
} from "./timelineUtils";

import { ChatPanel, TimelineHeader, TimelinePanel, MonthlyPlanner, TaskCategoryModal } from "./components/form";

export default function TimelinePage() {
    /** ----- 상태 ----- */
    const [entries, setEntries] = useState<ChatEntry[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [input, setInput] = useState("");

    const [hashtagPrefix, setHashtagPrefix] = useState<"#" | "##">("#");

    const [currentDate, setCurrentDate] = useState<string>(() =>
        getTodayDateString()
    );

    const [taskDefs, setTaskDefs] = useState<TaskDefinition[]>([]);

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

    /** ----- 해시태그 자동완성 후보 ----- */
    const hashtagSuggestions =
        hashtagQuery !== null
            ? taskDefs.filter((d) =>
                d.name.toLowerCase().includes(hashtagQuery.toLowerCase())
            )
            : [];

    // 기존 state들 옆에 추가
    const [lastEndedTask, setLastEndedTask] = useState<{
        name: string;
        date: string;
    } | null>(null);

    useEffect(() => {
        // 날짜 바뀌면 마지막 종료 task 표시 리셋
        setLastEndedTask(null);
    }, [currentDate]);


    /** ----- 초기 TaskDefinition 로드 ----- */
    useEffect(() => {
        const fetchTaskDefs = async () => {
            try {
                const res = await fetch(`${API_BASE}/task-definitions`, {
                    credentials: "include",
                });

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
                    `${API_BASE}?date=${encodeURIComponent(currentDate)}`,
                    {
                        credentials: "include",
                    }
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

    /** ----- 헬퍼 함수들 ----- */

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
        systemKind?: ApiChatCreateRequest["systemKind"];
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
                credentials: "include",
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
                credentials: "include",
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
                credentials: "include",
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

        // === 여기부터 해시태그 탐색 부분 교체 ===
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

            // 우리가 쓸 prefix: 1개면 "#", 2개 이상이면 "##"로 고정
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
            setHashtagPrefix("#"); // 기본값으로 복원
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

        // ✅ 여기에서 "#"/"##" 구분해서 사용
        const newText = `${before}${hashtagPrefix}${name}${after}`;

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

            // 로컬에 있으면 타임라인 segment 닫기
            if (existing) {
                endTask(name, now);
            }

            // ✅ 종료 시스템 메시지는 항상 남기기 (existing 없어도)
            await addChat({
                type: "SYSTEM",
                text: `${name} task를 종료합니다.`,
                taskName: name,
                systemKind: "TASK_END",
            });

            // ✅ 리다이렉트 대신 state에 저장만
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

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        // Ctrl+/ : 활성 task 순환
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
                    credentials: "include",
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

    /** ----- 렌더 ----- */
    return (
        <div className="h-screen flex flex-col bg-slate-950 text-slate-50">
            {/* 상단 헤더 */}
            <TimelineHeader
                currentDate={currentDate}
                onOpenTaskModal={() => setShowTaskModal(true)}
                showTimeline={showTimeline}
                toggleTimeline={() => setShowTimeline((prev) => !prev)}
            />

            {/* 전체 바디: 왼쪽 채팅, 오른쪽 (위: 캘린더, 아래: 타임라인) */}
            <div className="flex-1 flex" ref={containerRef}>
                {/* 왼쪽: 채팅 영역 */}
                <div
                    className="flex flex-col"
                    style={{ width: `${chatWidthPct}%` }}
                >
                    {/* ✅ 마지막 종료된 task 알림 + 버튼 */}
                    {lastEndedTask && lastEndedTask.date === currentDate && (
                        <div className="px-3 py-2 border-b border-slate-800 bg-slate-900 flex items-center justify-between text-xs">
                            <span className="text-slate-200">
                                <span className="font-semibold">
                                    {lastEndedTask.name}
                                </span>
                                &nbsp;task가 종료되었습니다.
                            </span>
                            <button
                                className="px-2 py-1 rounded-full bg-sky-600 hover:bg-sky-500 text-[11px] text-slate-50"
                                onClick={() => {
                                    const url = `/docs?task=${encodeURIComponent(
                                        lastEndedTask.name
                                    )}&date=${encodeURIComponent(lastEndedTask.date)}`;
                                    window.location.href = url;
                                }}
                            >
                                정리된 문서 보기
                            </button>
                        </div>
                    )}
                    <ChatPanel
                        entries={entries}
                        getTaskColor={getTaskColor}
                        input={input}
                        onChangeInput={handleInputChange}
                        onKeyDown={handleKeyDown}
                        textareaRef={textareaRef}
                        isTodaySelected={isTodaySelected}
                        activeTaskName={activeTaskName}
                        runningTaskNames={runningTasks.map((t) => t.name)}
                        hashtagSuggestions={hashtagSuggestions}
                        hashtagQuery={hashtagQuery}
                        hashtagSelectedIndex={hashtagSelectedIndex}
                        onSelectHashtag={handleSelectHashtag}
                        onEditEntry={handleEditEntry}
                        onDeleteEntry={handleDeleteEntry}
                        currentDate={currentDate}
                        hashtagPrefix={hashtagPrefix}
                    />
                </div>

                {/* 오른쪽: 위 캘린더 + 아래 타임라인 패널 */}
                {showTimeline && (
                    <>
                        {/* 리사이즈 핸들 */}
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
                            {/* 아래쪽: 타임라인 패널 */}
                            <div className="flex-1">
                                <TimelinePanel tasks={tasks} currentDate={currentDate} />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Task 카테고리 모달 */}
            <TaskCategoryModal
                isOpen={showTaskModal}
                onClose={() => setShowTaskModal(false)}
                taskDefs={taskDefs}
                newTaskName={newTaskName}
                onChangeTaskName={setNewTaskName}
                newTaskColor={newTaskColor}
                onSelectColor={setNewTaskColor}
                onSave={handleAddTaskDef}
            />
        </div>
    );
}
