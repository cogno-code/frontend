// app/components/Todo/Todo.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
    DragDropContext,
    Droppable,
    Draggable,
} from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import {
    FaCheck,
    FaChevronRight,
    FaCalendarAlt,
    FaTrash,
    FaGripVertical,
    FaPen,
    FaBan,
} from "react-icons/fa";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

// 🔹 백엔드 enum TodoStatus 에 맞춘 대문자 상태값
export type TodoStatus =
    | "TODO"
    | "DONE"
    | "MIGRATED"
    | "SCHEDULED"
    | "CANCELED";

// 🔹 서버의 TaskDefinition
interface TaskDefinition {
    id: number;
    name: string;
    color: string;
}

interface TodoItem {
    id: string;          // 프론트 임시 ID
    serverId?: number;   // DB PK
    text: string;
    status: TodoStatus;
    taskDefId?: number | null; // TaskDefinition FK
    order: number;
}

interface TodoProps {
    date: string; // YYYY-MM-DD
}

// 서버 응답 DTO들
interface ServerTodoItem {
    id: number;
    text: string;
    status: TodoStatus;
    taskDefinitionId?: number | null;
    order?: number | null;
}

interface ServerTodoResponse {
    date: string;
    items: ServerTodoItem[];
}

interface SaveTodosRequest {
    date: string;
    items: {
        id?: number;
        text: string;
        status: TodoStatus;
        taskDefinitionId?: number | null;
        order?: number;
    }[];
}

// 유틸: 빈 Todo 슬롯 생성
function createEmptyItem(index: number): TodoItem {
    return {
        id: `tmp-${Date.now()}-${index}`,
        text: "",
        status: "TODO",
        taskDefId: null,
        order: index,
    };
}

// droppableId ↔ taskDefId 변환
function makeDroppableId(taskDefId: number | null): string {
    return taskDefId == null ? "none" : `def-${taskDefId}`;
}
function parseDroppableId(droppableId: string): number | null {
    if (droppableId === "none") return null;
    if (droppableId.startsWith("def-")) {
        const n = Number(droppableId.slice(4));
        return Number.isNaN(n) ? null : n;
    }
    return null;
}

export default function Todo({ date }: TodoProps) {
    const [items, setItems] = useState<TodoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // 🔹 TaskDefinition 리스트
    const [taskDefs, setTaskDefs] = useState<TaskDefinition[]>([]);
    const [taskDefsLoading, setTaskDefsLoading] = useState(true);

    // --- TaskDefinition 로드 ---
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setTaskDefsLoading(true);
            try {
                const res = await axios.get<TaskDefinition[]>(
                    `${API_BASE}/api/timeline/task-definitions`,
                    { withCredentials: true }
                );
                if (cancelled) return;
                setTaskDefs(res.data ?? []);
            } catch (e) {
                console.error("load task definitions failed", e);
                if (!cancelled) setTaskDefs([]);
            } finally {
                if (!cancelled) setTaskDefsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // --- 서버에 전체 저장 ---
    const saveAll = useCallback(
        async (nextItems: TodoItem[]) => {
            try {
                setSaving(true);

                const payload: SaveTodosRequest = {
                    date,
                    items: nextItems.map((it, idx) => ({
                        id: it.serverId,
                        text: it.text,
                        status: it.status ?? "TODO",
                        taskDefinitionId: it.taskDefId ?? null,
                        order: it.order ?? idx,
                    })),
                };

                await axios.put(`${API_BASE}/api/todo`, payload, {
                    withCredentials: true,
                });
            } catch (e) {
                console.error("save todos failed", e);
            } finally {
                setSaving(false);
            }
        },
        [date]
    );

    // --- 최초 / 날짜 변경 시 Todo 로드 ---
    useEffect(() => {
        let cancelled = false;

        (async () => {
            setLoading(true);
            try {
                const res = await axios.get<ServerTodoResponse>(
                    `${API_BASE}/api/todo`,
                    {
                        params: { date },
                        withCredentials: true,
                    }
                );
                if (cancelled) return;

                const fromServer = res.data?.items ?? [];

                if (fromServer.length === 0) {
                    const base = Array.from({ length: 5 }, (_, i) =>
                        createEmptyItem(i)
                    );
                    setItems(base);
                    saveAll(base);
                } else {
                    const mapped: TodoItem[] = fromServer.map((s, idx) => ({
                        id: `srv-${s.id}`,
                        serverId: s.id,
                        text: s.text ?? "",
                        status: s.status ?? "TODO",
                        taskDefId:
                            s.taskDefinitionId !== undefined
                                ? s.taskDefinitionId
                                : null,
                        order: s.order ?? idx,
                    }));
                    setItems(mapped);
                }
            } catch (e) {
                console.error("load todos failed", e);
                const base = Array.from({ length: 5 }, (_, i) =>
                    createEmptyItem(i)
                );
                setItems(base);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [date, saveAll]);

    // --- TaskDefinition 기준 그룹핑 ---
    const grouped = (() => {
        // id -> 배열
        const byDefId: Record<number, TodoItem[]> = {};
        for (const def of taskDefs) {
            byDefId[def.id] = [];
        }
        const uncategorized: TodoItem[] = [];

        for (const it of items) {
            if (it.taskDefId != null && byDefId[it.taskDefId]) {
                byDefId[it.taskDefId].push(it);
            } else {
                uncategorized.push(it);
            }
        }

        // order 정렬
        Object.values(byDefId).forEach((arr) =>
            arr.sort((a, b) => a.order - b.order)
        );
        uncategorized.sort((a, b) => a.order - b.order);

        return { byDefId, uncategorized };
    })();

    // 섹션 순서: TaskDefinition들 + Uncategorized
    const sections: {
        key: string;
        label: string;
        color: string;
        taskDefId: number | null;
        items: TodoItem[];
    }[] = [];

    for (const def of taskDefs) {
        const arr = grouped.byDefId[def.id] ?? [];
        if (arr.length === 0) continue; // 해당 카테고리에 할 일 없으면 섹션 안 보여줌
        sections.push({
            key: `def-${def.id}`,
            label: def.name,
            color: def.color,
            taskDefId: def.id,
            items: arr,
        });
    }

    if (grouped.uncategorized.length > 0) {
        sections.push({
            key: "none",
            label: "Uncategorized",
            color: "#9ca3af",
            taskDefId: null,
            items: grouped.uncategorized,
        });
    }

    // --- 불렛저널 기호 / 스타일 ---
    const getStatusBullet = (status: TodoStatus) => {
        switch (status) {
            case "TODO":
                return "•";
            case "DONE":
                return "✕";
            case "MIGRATED":
                return ">";
            case "SCHEDULED":
                return "<";
            case "CANCELED":
                return "-";
            default:
                return "•";
        }
    };

    const getStatusClassName = (status: TodoStatus) => {
        switch (status) {
            case "TODO":
                return "text-slate-100";
            case "DONE":
                return "text-emerald-300 line-through";
            case "MIGRATED":
                return "text-indigo-300";
            case "SCHEDULED":
                return "text-amber-300";
            case "CANCELED":
                return "text-slate-500 line-through";
            default:
                return "";
        }
    };

    // --- 변경 핸들러들 ---

    const handleChangeText = (id: string, text: string) => {
        setItems((prev) =>
            prev.map((it) => (it.id === id ? { ...it, text } : it))
        );
    };

    const toggleStatus = (id: string, target: TodoStatus) => {
        setItems((prev) => {
            const next = prev.map((it) => {
                if (it.id !== id) return it;
                const nextStatus = it.status === target ? "TODO" : target;
                return { ...it, status: nextStatus };
            });
            saveAll(next);
            return next;
        });
    };

    const changeTaskDef = (id: string, taskDefId: number | null) => {
        setItems((prev) => {
            const sameGroup = prev.filter(
                (it) =>
                    (it.taskDefId ?? null) === taskDefId && it.id !== id
            );
            const newOrder = sameGroup.length;

            const next = prev.map((it) =>
                it.id === id
                    ? { ...it, taskDefId, order: newOrder }
                    : it
            );
            saveAll(next);
            return next;
        });
    };

    const deleteItem = (id: string) => {
        setItems((prev) => {
            const next = prev.filter((it) => it.id !== id);
            saveAll(next);
            return next;
        });
        if (editingId === id) setEditingId(null);
    };

    const addItem = () => {
        setItems((prev) => {
            const next = [...prev, createEmptyItem(prev.length)];
            saveAll(next);
            return next;
        });
    };

    const finishEditing = () => {
        setEditingId(null);
        // 마지막 입력까지 반영된 현재 items를 저장
        saveAll(items);
    };

    const toggleEdit = (id: string) => {
        setEditingId((prev) => {
            if (prev === id) {
                // 수정 모드 → 일반 모드로 나갈 때
                saveAll(items);
                return null;
            }
            // 다른 아이템으로 수정모드 진입
            return id;
        });
    };
    // --- Drag & Drop ---
    const onDragEnd = (result: DropResult) => {
        const { destination, source } = result;
        if (!destination) return;

        const sourceTaskDefId = parseDroppableId(source.droppableId);
        const destTaskDefId = parseDroppableId(destination.droppableId);

        if (
            sourceTaskDefId === destTaskDefId &&
            destination.index === source.index
        ) {
            return;
        }

        setItems((prev) => {
            // 같은 그룹 내 이동
            if (sourceTaskDefId === destTaskDefId) {
                const sameGroup = prev
                    .filter(
                        (it) => (it.taskDefId ?? null) === sourceTaskDefId
                    )
                    .sort((a, b) => a.order - b.order);

                const [moved] = sameGroup.splice(source.index, 1);
                sameGroup.splice(destination.index, 0, moved);

                const updated = sameGroup.map((it, idx) => ({
                    ...it,
                    order: idx,
                }));

                const next = prev.map((it) =>
                    (it.taskDefId ?? null) === sourceTaskDefId
                        ? updated.find((u) => u.id === it.id) ?? it
                        : it
                );
                saveAll(next);
                return next;
            }

            // 다른 그룹으로 이동
            const sourceItems = prev
                .filter(
                    (it) => (it.taskDefId ?? null) === sourceTaskDefId
                )
                .sort((a, b) => a.order - b.order);

            const destItems = prev
                .filter((it) => (it.taskDefId ?? null) === destTaskDefId)
                .sort((a, b) => a.order - b.order);

            const [moved] = sourceItems.splice(source.index, 1);

            if (!moved) {
                return prev;
            }

            const movedId = moved.id;

            destItems.splice(destination.index, 0, {
                ...moved,
                taskDefId: destTaskDefId,
            });

            const updatedSource = sourceItems.map((it, idx) => ({
                ...it,
                order: idx,
            }));
            const updatedDest = destItems.map((it, idx) => ({
                ...it,
                order: idx,
            }));

            const next = prev.map((it) => {
                const key = it.taskDefId ?? null;

                // 🔥 이동한 아이템은 dest 그룹 기준으로 강제 업데이트
                if (it.id === movedId) {
                    return (
                        updatedDest.find((u) => u.id === movedId) ?? {
                            ...it,
                            taskDefId: destTaskDefId,
                        }
                    );
                }

                if (key === sourceTaskDefId) {
                    return updatedSource.find((u) => u.id === it.id) ?? it;
                }
                if (key === destTaskDefId) {
                    return updatedDest.find((u) => u.id === it.id) ?? it;
                }
                return it;
            });

            saveAll(next);
            return next;
        });
    };

    if (loading || taskDefsLoading) {
        return (
            <div className="w-full max-w-2xl mx-auto rounded-xl border border-slate-700 bg-slate-900/80 p-4 text-sm text-slate-300">
                Loading todos…
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-slate-100">
                    Todo
                </h2>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="space-y-4 mt-2">
                    {sections.map((section) => (
                        <section key={section.key}>
                            {/* 섹션 헤더: 색 동그라미 + Task 이름 */}
                            <div className="flex items-center gap-2 mb-1">
                                <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: section.color }}
                                />
                                <span className="text-sm font-medium text-slate-100">
                                    {section.label}
                                </span>
                            </div>

                            <Droppable
                                droppableId={makeDroppableId(section.taskDefId)}
                            >
                                {(provided) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className="space-y-1 pl-4"
                                    >
                                        {section.items.map((item, index) => {
                                            const editing = editingId === item.id;

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
                                                                                e.preventDefault();
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

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        toggleEdit(item.id)
                                                                    }
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
                                                                        value={
                                                                            item.taskDefId ?? "none"
                                                                        }
                                                                        onChange={(e) => {
                                                                            const v = e.target.value;
                                                                            const nextId =
                                                                                v === "none"
                                                                                    ? null
                                                                                    : Number(v);
                                                                            changeTaskDef(
                                                                                item.id,
                                                                                nextId
                                                                            );
                                                                        }}
                                                                    >
                                                                        <option value="none">
                                                                            Uncategorized
                                                                        </option>
                                                                        {taskDefs.map((def) => (
                                                                            <option
                                                                                key={def.id}
                                                                                value={def.id}
                                                                            >
                                                                                {def.name}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            )}

                                                            {/* 오른쪽 상태/삭제 아이콘들 */}
                                                            <div className="flex items-center gap-1 ml-1">
                                                                <button
                                                                    type="button"
                                                                    title="Complete"
                                                                    onClick={() =>
                                                                        toggleStatus(item.id, "DONE")
                                                                    }
                                                                    className="p-1 rounded-md hover:bg-emerald-700/70"
                                                                >
                                                                    <FaCheck className="w-3 h-3 text-emerald-300" />
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    title="Move to tomorrow"
                                                                    onClick={() =>
                                                                        toggleStatus(
                                                                            item.id,
                                                                            "MIGRATED"
                                                                        )
                                                                    }
                                                                    className="p-1 rounded-md hover:bg-indigo-700/70"
                                                                >
                                                                    <FaChevronRight className="w-3 h-3 text-indigo-300" />
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    title="Schedule (someday)"
                                                                    onClick={() =>
                                                                        toggleStatus(
                                                                            item.id,
                                                                            "SCHEDULED"
                                                                        )
                                                                    }
                                                                    className="p-1 rounded-md hover:bg-amber-700/70"
                                                                >
                                                                    <FaCalendarAlt className="w-3 h-3 text-amber-300" />
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    title="Cancel (keep, but crossed out)"
                                                                    onClick={() =>
                                                                        toggleStatus(
                                                                            item.id,
                                                                            "CANCELED"
                                                                        )
                                                                    }
                                                                    className="p-1 rounded-md hover:bg-slate-700"
                                                                >
                                                                    <FaBan className="w-3 h-3 text-slate-300" />
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    title="Delete"
                                                                    onClick={() =>
                                                                        deleteItem(item.id)
                                                                    }
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
                    ))}
                </div>
            </DragDropContext>

            <div className="mt-3">
                <button
                    type="button"
                    onClick={addItem}
                    className="text-xs px-2 py-1 rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800"
                >
                    + Add item
                </button>
            </div>
        </div>
    );
}
