"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import type { DropResult } from "@hello-pangea/dnd";

/* =========================
   ✅ 타입들 (Todo.tsx에서 그대로 이동)
========================= */

export type TodoStatus =
    | "TODO"
    | "DONE"
    | "MIGRATED"
    | "SCHEDULED"
    | "CANCELED";

export interface TaskDefinition {
    id: number;
    name: string;
    color: string;
}

export interface TodoItem {
    id: string;
    serverId?: number;
    text: string;
    status: TodoStatus;
    taskDefId?: number | null;
    order: number;
}

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

const API_BASE = import.meta.env.VITE_API_URL ?? "";

/* =========================
   ✅ 유틸도 그대로 이동
========================= */

function createEmptyItem(index: number): TodoItem {
    return {
        id: `tmp-${Date.now()}-${index}`,
        text: "",
        status: "TODO",
        taskDefId: null,
        order: index,
    };
}

function parseDroppableId(droppableId: string): number | null {
    if (droppableId === "none") return null;
    if (droppableId.startsWith("def-")) {
        const n = Number(droppableId.slice(4));
        return Number.isNaN(n) ? null : n;
    }
    return null;
}

/* =========================
   ✅ ✅ ✅ 핵심: Todo의 모든 로직을
   그대로 useTodo 하나로 감쌈
========================= */

export function useTodo(date: string) {
    const [items, setItems] = useState<TodoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [taskDefs, setTaskDefs] = useState<TaskDefinition[]>([]);
    const [taskDefsLoading, setTaskDefsLoading] = useState(true);

    // ✅ TaskDefinition 로드 (그대로)
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

    // ✅ saveAll 그대로
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

    // ✅ 최초 로딩 그대로
    useEffect(() => {
        let cancelled = false;

        (async () => {
            setLoading(true);
            try {
                const res = await axios.get<ServerTodoResponse>(
                    `${API_BASE}/api/todo`,
                    { params: { date }, withCredentials: true }
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
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [date, saveAll]);

    // ✅ grouped 그대로
    const grouped = (() => {
        const byDefId: Record<number, TodoItem[]> = {};
        for (const def of taskDefs) byDefId[def.id] = [];
        const uncategorized: TodoItem[] = [];

        for (const it of items) {
            if (it.taskDefId != null && byDefId[it.taskDefId]) {
                byDefId[it.taskDefId].push(it);
            } else {
                uncategorized.push(it);
            }
        }

        Object.values(byDefId).forEach((arr) =>
            arr.sort((a, b) => a.order - b.order)
        );
        uncategorized.sort((a, b) => a.order - b.order);

        return { byDefId, uncategorized };
    })();

    // ✅ handlers 전부 그대로 복사
    const handleChangeText = (id: string, text: string) => {
        setItems((prev) =>
            prev.map((it) => (it.id === id ? { ...it, text } : it))
        );
    };

    const toggleEdit = (id: string) => {
        setEditingId((prev) => {
            if (prev === id) {
                saveAll(items);
                return null;
            }
            return id;
        });
    };

    const deleteItem = (id: string) => {
        setItems((prev) => {
            const next = prev.filter((it) => it.id !== id);
            saveAll(next);
            return next;
        });
    };

    const addItem = () => {
        setItems((prev) => {
            const next = [...prev, createEmptyItem(prev.length)];
            saveAll(next);
            return next;
        });
    };

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
                    .filter((it) => (it.taskDefId ?? null) === sourceTaskDefId)
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

            // ✅ 다른 그룹으로 이동
            const sourceItems = prev
                .filter((it) => (it.taskDefId ?? null) === sourceTaskDefId)
                .sort((a, b) => a.order - b.order);

            const destItems = prev
                .filter((it) => (it.taskDefId ?? null) === destTaskDefId)
                .sort((a, b) => a.order - b.order);

            const [moved] = sourceItems.splice(source.index, 1);
            if (!moved) return prev;

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
                (it) => (it.taskDefId ?? null) === taskDefId && it.id !== id
            );
            const newOrder = sameGroup.length;

            const next = prev.map((it) =>
                it.id === id ? { ...it, taskDefId, order: newOrder } : it
            );
            saveAll(next);
            return next;
        });
    };

    const finishEditing = () => {
        setEditingId(null);
        saveAll(items);
    };


    return {
        items,
        loading,
        taskDefs,
        taskDefsLoading,
        editingId,
        grouped,

        handleChangeText,
        toggleEdit,
        deleteItem,
        addItem,
        toggleStatus,
        changeTaskDef,
        finishEditing,
        onDragEnd,
    };

}
