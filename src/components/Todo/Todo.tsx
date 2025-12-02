// src/components/Todo/Todo.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import axios from "axios";
import {
    FaCheck,
    FaChevronRight,
    FaCalendarAlt,
    FaTrash,
    FaGripVertical,
    FaPen,
    FaBan,
} from "react-icons/fa";
import {
    DragDropContext,
    Droppable,
    Draggable,
} from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";

// ─────────────────────
// 타입 정의
// ─────────────────────

type TodoStatus = "todo" | "done" | "migrated" | "scheduled" | "canceled";
type ServerTodoStatus =
    | "TODO"
    | "DONE"
    | "MIGRATED"
    | "SCHEDULED"
    | "CANCELED";

interface TodoItem {
    id: string;
    text: string;
    status: TodoStatus;
    order: number;
    taskDefinitionId: number | null; // 어떤 TaskDefinition에 속하는지
}

interface ServerTodoItem {
    id: number | null;
    text: string | null;
    status: ServerTodoStatus | null;
    order: number | null;
    taskDefinitionId: number | null;
}

interface TodoListResponse {
    date: string;
    items: ServerTodoItem[];
}

interface ServerTaskDefinition {
    id: number;
    name: string;
    color: string; // "#22c55e"
}

interface TaskType {
    id: string; // "none" 또는 TaskDefinition.id.toString()
    label: string;
    color: string;
    taskDefinitionId: number | null;
}

type TodoProps = {
    date: string; // "YYYY-MM-DD"
};

const API_BASE = import.meta.env.VITE_API_URL;

// ─────────────────────
// 상태 매핑
// ─────────────────────

function serverStatusToClient(
    status: ServerTodoStatus | null | undefined
): TodoStatus {
    switch (status) {
        case "DONE":
            return "done";
        case "MIGRATED":
            return "migrated";
        case "SCHEDULED":
            return "scheduled";
        case "CANCELED":
            return "canceled";
        case "TODO":
        default:
            return "todo";
    }
}

function clientStatusToServer(status: TodoStatus): ServerTodoStatus {
    switch (status) {
        case "done":
            return "DONE";
        case "migrated":
            return "MIGRATED";
        case "scheduled":
            return "SCHEDULED";
        case "canceled":
            return "CANCELED";
        case "todo":
        default:
            return "TODO";
    }
}

function createEmptyItem(index: number): TodoItem {
    return {
        id: `tmp-${Date.now()}-${index}`,
        text: "",
        status: "todo",
        order: index,
        taskDefinitionId: null, // 기본은 미분류
    };
}

// ─────────────────────
// 컴포넌트
// ─────────────────────

export default function Todo({ date }: TodoProps) {
    const [items, setItems] = useState<TodoItem[]>(
        Array.from({ length: 5 }, (_, i) => createEmptyItem(i))
    );
    const [editingId, setEditingId] = useState<string | null>(null);

    const [taskTypes, setTaskTypes] = useState<TaskType[]>([
        {
            id: "none",
            label: "Uncategorized",
            color: "#9ca3af",
            taskDefinitionId: null,
        },
    ]);

    const [loadingTodos, setLoadingTodos] = useState(false);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    // ── 1) TaskDefinition 불러오기 ──────────────────
    useEffect(() => {
        let cancelled = false;

        async function fetchTaskDefinitions() {
            setLoadingTasks(true);
            try {
                const res = await axios.get<ServerTaskDefinition[]>(
                    `${API_BASE}/api/timeline/task-definitions`,
                    { withCredentials: true }
                );

                if (cancelled) return;

                const defs = res.data ?? [];

                const defsTaskTypes: TaskType[] = defs.map((d) => ({
                    id: String(d.id),
                    label: d.name,
                    color: d.color,
                    taskDefinitionId: d.id,
                }));

                const newTaskTypes: TaskType[] = [
                    ...defsTaskTypes,
                    {
                        id: "none",
                        label: "Uncategorized",
                        color: "#9ca3af",
                        taskDefinitionId: null,
                    },
                ];

                setTaskTypes(newTaskTypes);

            } catch (e: any) {
                console.error("load task definitions failed", e);
                if (!cancelled) {
                    // 실패해도 최소 미분류만으론 동작 가능하니까 에러만 표시
                    setError(e?.message ?? "Failed to load task definitions");
                }
            } finally {
                if (!cancelled) {
                    setLoadingTasks(false);
                }
            }
        }

        fetchTaskDefinitions();
        return () => {
            cancelled = true;
        };
    }, []);

    // ── 2) Todo 불러오기 ───────────────────────────
    useEffect(() => {
        let cancelled = false;

        async function fetchTodos() {
            setLoadingTodos(true);
            setError(null);
            setSaveMessage(null);
            try {
                const res = await axios.get<TodoListResponse>(
                    `${API_BASE}/api/todo`,
                    {
                        params: { date },
                        withCredentials: true,
                    }
                );

                if (cancelled) return;

                const data = res.data;
                const loaded: TodoItem[] = (data.items ?? []).map((it, idx) => ({
                    id:
                        it.id !== null && it.id !== undefined
                            ? String(it.id)
                            : `tmp-${Date.now()}-${idx}`,
                    text: it.text ?? "",
                    status: serverStatusToClient(it.status),
                    order: it.order ?? idx,
                    taskDefinitionId: it.taskDefinitionId ?? null,
                }));

                const padded =
                    loaded.length >= 5
                        ? loaded
                        : [
                            ...loaded,
                            ...Array.from({ length: 5 - loaded.length }, (_, i) =>
                                createEmptyItem(loaded.length + i)
                            ),
                        ];

                setItems(padded);
            } catch (e: any) {
                console.error("load todos failed", e);
                if (!cancelled) {
                    setError(e?.response?.data ?? e?.message ?? "Failed to load todos");
                }
            } finally {
                if (!cancelled) {
                    setLoadingTodos(false);
                }
            }
        }

        fetchTodos();
        return () => {
            cancelled = true;
        };
    }, [date]);

    // ── 그룹핑: taskDefinitionId 기준 ─────────────────
    const grouped = useMemo(() => {
        const map: Record<string, TodoItem[]> = {};

        // 모든 taskTypes에 대해 그룹 초기화
        for (const tt of taskTypes) {
            map[tt.id] = [];
        }

        for (const it of items) {
            const key =
                it.taskDefinitionId === null ? "none" : String(it.taskDefinitionId);
            if (!map[key]) {
                map[key] = [];
            }
            map[key].push(it);
        }

        Object.keys(map).forEach((key) => {
            map[key].sort((a, b) => a.order - b.order);
        });

        return map;
    }, [items, taskTypes]);

    // ── 편집/상태/카테고리 변경 ──────────────────────

    const handleChangeText = (id: string, text: string) => {
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, text } : it)));
    };

    const finishEditing = () => {
        setEditingId(null);
    };

    const toggleEdit = (id: string) => {
        setEditingId((prev) => (prev === id ? null : id));
    };

    const toggleStatus = (id: string, target: TodoStatus) => {
        setItems((prev) =>
            prev.map((it) => {
                if (it.id !== id) return it;
                const nextStatus = it.status === target ? "todo" : target;
                return { ...it, status: nextStatus };
            })
        );
    };

    const deleteItem = (id: string) => {
        setItems((prev) => prev.filter((it) => it.id !== id));
        if (editingId === id) setEditingId(null);
    };

    // 드롭다운으로 taskDefinition 변경
    const changeTaskDefinition = (id: string, taskTypeId: string) => {
        setItems((prev) => {
            const newTaskDefinitionId =
                taskTypeId === "none" ? null : Number(taskTypeId);

            // 같은 그룹 내에서 마지막으로 이동 (order 재배치)
            const sameGroup = prev.filter(
                (it) => it.taskDefinitionId === newTaskDefinitionId && it.id !== id
            );

            const newOrder = sameGroup.length;

            return prev.map((it) =>
                it.id === id
                    ? { ...it, taskDefinitionId: newTaskDefinitionId, order: newOrder }
                    : it
            );
        });
    };

    const addItem = () => {
        setItems((prev) => [...prev, createEmptyItem(prev.length)]);
    };

    // 불렛저널 기호
    const getStatusBullet = (status: TodoStatus) => {
        switch (status) {
            case "todo":
                return "•";
            case "done":
                return "✕";
            case "migrated":
                return ">";
            case "scheduled":
                return "<";
            case "canceled":
                return "-";
            default:
                return "•";
        }
    };

    const getStatusClassName = (status: TodoStatus) => {
        switch (status) {
            case "todo":
                return "text-slate-100";
            case "done":
                return "text-emerald-300 line-through";
            case "migrated":
                return "text-indigo-300";
            case "scheduled":
                return "text-amber-300";
            case "canceled":
                return "text-slate-500 line-through";
            default:
                return "";
        }
    };

    // ── 드래그 & 드롭: 섹션 이동 시 taskDefinitionId까지 변경 ─────
    const onDragEnd = (result: DropResult) => {
        const { destination, source } = result;
        if (!destination) return;

        const sourceKey = source.droppableId;
        const destKey = destination.droppableId;

        if (sourceKey === destKey && source.index === destination.index) {
            return;
        }

        setItems((prev) => {
            // 그룹 다시 구성
            const groups: Record<string, TodoItem[]> = {};
            for (const tt of taskTypes) {
                groups[tt.id] = [];
            }
            for (const it of prev) {
                const key =
                    it.taskDefinitionId === null ? "none" : String(it.taskDefinitionId);
                if (!groups[key]) groups[key] = [];
                groups[key].push({ ...it });
            }

            Object.keys(groups).forEach((k) =>
                groups[k].sort((a, b) => a.order - b.order)
            );

            const sourceGroup = groups[sourceKey] ?? [];
            const destGroup = groups[destKey] ?? [];

            const [moved] = sourceGroup.splice(source.index, 1);
            if (!moved) return prev;

            // 목적지 그룹에 삽입하면서 taskDefinitionId도 변경
            const newTaskDefinitionId =
                destKey === "none" ? null : Number(destKey);

            const movedUpdated: TodoItem = {
                ...moved,
                taskDefinitionId: newTaskDefinitionId,
            };

            destGroup.splice(destination.index, 0, movedUpdated);

            // order 재정렬
            Object.keys(groups).forEach((k) => {
                groups[k] = groups[k].map((it, idx) => ({ ...it, order: idx }));
            });

            // 다시 플랫하게 합치기
            const flattened: TodoItem[] = [];
            // taskTypes 순서대로 붙여서 헤더 순서와 맞춤
            for (const tt of taskTypes) {
                flattened.push(...(groups[tt.id] ?? []));
            }

            return flattened;
        });
    };

    // ── 저장 ──────────────────────────────────────
    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSaveMessage(null);

        try {
            const nonEmpty = items.filter((it) => it.text.trim().length > 0);

            const payload = {
                date,
                items: nonEmpty.map((it) => ({
                    id: it.id.startsWith("tmp-") ? null : Number(it.id),
                    text: it.text,
                    status: clientStatusToServer(it.status),
                    taskDefinitionId: it.taskDefinitionId,
                    order: it.order,
                })),
            };

            const res = await axios.put<TodoListResponse>(
                `${API_BASE}/api/todo`,
                payload,
                {
                    withCredentials: true,
                }
            );

            const data = res.data;

            const loaded: TodoItem[] = (data.items ?? []).map((it, idx) => ({
                id:
                    it.id !== null && it.id !== undefined
                        ? String(it.id)
                        : `tmp-${Date.now()}-${idx}`,
                text: it.text ?? "",
                status: serverStatusToClient(it.status),
                order: it.order ?? idx,
                taskDefinitionId: it.taskDefinitionId ?? null,
            }));

            const padded =
                loaded.length >= 5
                    ? loaded
                    : [
                        ...loaded,
                        ...Array.from({ length: 5 - loaded.length }, (_, i) =>
                            createEmptyItem(loaded.length + i)
                        ),
                    ];

            setItems(padded);
            setSaveMessage("Saved!");
            setTimeout(() => setSaveMessage(null), 2000);
        } catch (e: any) {
            console.error("save todos failed", e);
            setError(e?.response?.data ?? e?.message ?? "Failed to save todos");
        } finally {
            setSaving(false);
        }
    };

    // ── 렌더 ──────────────────────────────────────
    return (
        <div className="w-full max-w-2xl mx-auto rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col">
                    <h2 className="text-lg font-semibold text-slate-100">
                        Cogno Bullet Journal · Todo
                    </h2>
                    <span className="text-xs text-slate-400">{date}</span>
                </div>
                <div className="flex items-center gap-2">
                    {(loadingTodos || loadingTasks) && (
                        <span className="text-xs text-slate-400">Loading…</span>
                    )}
                    {saveMessage && (
                        <span className="text-xs text-emerald-300">{saveMessage}</span>
                    )}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="text-xs px-3 py-1 rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                        type="button"
                        onClick={addItem}
                        className="text-xs px-2 py-1 rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800"
                    >
                        + Add item
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-2 text-xs text-rose-400 break-all">
                    {String(error)}
                </div>
            )}

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="space-y-4 mt-2">
                    {taskTypes.map((taskType) => {
                        const itemsInGroup = grouped[taskType.id] ?? [];
                        if (!itemsInGroup || itemsInGroup.length === 0) return null;

                        return (
                            <section key={taskType.id}>
                                {/* 섹션 헤더: 색 동그라미 + Task 이름 */}
                                <div className="flex items-center gap-2 mb-1">
                                    <span
                                        className="w-2.5 h-2.5 rounded-full"
                                        style={{ backgroundColor: taskType.color }}
                                    />
                                    <span className="text-sm font-medium text-slate-100">
                                        {taskType.label}
                                    </span>
                                </div>

                                <Droppable droppableId={taskType.id}>
                                    {(provided) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className="space-y-1 pl-4"
                                        >
                                            {itemsInGroup.map((item, index) => {
                                                const editing = editingId === item.id;
                                                const currentTaskTypeId =
                                                    item.taskDefinitionId === null
                                                        ? "none"
                                                        : String(item.taskDefinitionId);

                                                return (
                                                    <Draggable
                                                        key={item.id}
                                                        draggableId={item.id}
                                                        index={index}
                                                    >
                                                        {(dragProvided, snapshot) => (
                                                            <div
                                                                ref={dragProvided.innerRef}
                                                                {...dragProvided.draggableProps}
                                                                className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm transition-colors ${snapshot.isDragging
                                                                        ? "bg-slate-800/90"
                                                                        : "hover:bg-slate-800/60"
                                                                    }`}
                                                            >
                                                                {/* 드래그 핸들 */}
                                                                <div
                                                                    {...dragProvided.dragHandleProps}
                                                                    className="cursor-grab active:cursor-grabbing px-1 text-slate-500 flex items-center"
                                                                >
                                                                    <FaGripVertical className="w-3 h-3" />
                                                                </div>

                                                                {/* 불렛저널 기호 */}
                                                                <div className="w-4 flex items-center justify-center text-slate-300">
                                                                    {getStatusBullet(item.status)}
                                                                </div>

                                                                {/* 텍스트 + 연필 */}
                                                                <div className="flex-1 flex items-center gap-1">
                                                                    {editing ? (
                                                                        <input
                                                                            autoFocus
                                                                            className="w-full bg-transparent border-b border-slate-600 text-slate-100 outline-none text-sm"
                                                                            value={item.text}
                                                                            onChange={(e) =>
                                                                                handleChangeText(
                                                                                    item.id,
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === "Enter") {
                                                                                    finishEditing();
                                                                                }
                                                                            }}
                                                                            placeholder="Write your task…"
                                                                        />
                                                                    ) : (
                                                                        <span
                                                                            className={getStatusClassName(
                                                                                item.status
                                                                            )}
                                                                        >
                                                                            {item.text || (
                                                                                <span className="text-slate-500">
                                                                                    (empty)
                                                                                </span>
                                                                            )}
                                                                        </span>
                                                                    )}

                                                                    {/* 연필 아이콘: 제목 바로 옆 */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleEdit(item.id)}
                                                                        className="p-1 rounded hover:bg-slate-700 text-slate-400 ml-1"
                                                                        title="Edit"
                                                                    >
                                                                        <FaPen className="w-3 h-3" />
                                                                    </button>
                                                                </div>

                                                                {/* 편집 중일 때만 카테고리 선택 */}
                                                                {editing && (
                                                                    <div className="flex items-center gap-1">
                                                                        <select
                                                                            className="bg-slate-900 border border-slate-700 rounded-md text-xs text-slate-200 px-2 py-1"
                                                                            value={currentTaskTypeId}
                                                                            onChange={(e) =>
                                                                                changeTaskDefinition(
                                                                                    item.id,
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                        >
                                                                            {taskTypes.map((t) => (
                                                                                <option key={t.id} value={t.id}>
                                                                                    {t.label}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                )}

                                                                {/* 오른쪽 상태/삭제 아이콘들 */}
                                                                <div className="flex items-center gap-1 ml-1">
                                                                    {/* 완료 토글 */}
                                                                    <button
                                                                        type="button"
                                                                        title="Complete"
                                                                        onClick={() =>
                                                                            toggleStatus(item.id, "done")
                                                                        }
                                                                        className="p-1 rounded-md hover:bg-emerald-700/70"
                                                                    >
                                                                        <FaCheck className="w-3 h-3 text-emerald-300" />
                                                                    </button>

                                                                    {/* 이동한 일 */}
                                                                    <button
                                                                        type="button"
                                                                        title="Move to tomorrow"
                                                                        onClick={() =>
                                                                            toggleStatus(item.id, "migrated")
                                                                        }
                                                                        className="p-1 rounded-md hover:bg-indigo-700/70"
                                                                    >
                                                                        <FaChevronRight className="w-3 h-3 text-indigo-300" />
                                                                    </button>

                                                                    {/* 예정된 일 */}
                                                                    <button
                                                                        type="button"
                                                                        title="Schedule (someday)"
                                                                        onClick={() =>
                                                                            toggleStatus(item.id, "scheduled")
                                                                        }
                                                                        className="p-1 rounded-md hover:bg-amber-700/70"
                                                                    >
                                                                        <FaCalendarAlt className="w-3 h-3 text-amber-300" />
                                                                    </button>

                                                                    {/* 취소된 일 */}
                                                                    <button
                                                                        type="button"
                                                                        title="Cancel (keep, but crossed out)"
                                                                        onClick={() =>
                                                                            toggleStatus(item.id, "canceled")
                                                                        }
                                                                        className="p-1 rounded-md hover:bg-slate-700"
                                                                    >
                                                                        <FaBan className="w-3 h-3 text-slate-300" />
                                                                    </button>

                                                                    {/* 삭제 */}
                                                                    <button
                                                                        type="button"
                                                                        title="Delete"
                                                                        onClick={() => deleteItem(item.id)}
                                                                        className="p-1 rounded-md hover:bg-rose-800/70"
                                                                    >
                                                                        <FaTrash className="w-3 h-3 text-rose-300" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                );
                                            })}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </section>
                        );
                    })}
                </div>
            </DragDropContext>
        </div>
    );
}
