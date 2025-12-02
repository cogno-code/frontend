// src/components/CognoTodo.tsx (경로는 프로젝트에 맞게)
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

type TaskTypeId = "none" | "focus" | "study" | "exercise" | "life" | "work";

type ServerTodoStatus =
  | "TODO"
  | "DONE"
  | "MIGRATED"
  | "SCHEDULED"
  | "CANCELED";

interface TaskType {
  id: TaskTypeId;
  label: string;
  color: string;
}

const TASK_TYPES: TaskType[] = [
  { id: "focus", label: "Focus",         color: "#3b82f6" },
  { id: "study", label: "Study",         color: "#22c55e" },
  { id: "exercise", label: "Exercise",   color: "#facc15" },
  { id: "work", label: "Work",           color: "#a855f7" },
  { id: "life", label: "Life",           color: "#f97316" },
  { id: "none", label: "Uncategorized",  color: "#9ca3af" },
];

interface TodoItem {
  id: string;
  text: string;
  status: TodoStatus;
  taskType: TaskTypeId;
  order: number;
  taskDefinitionId?: number | null;
}

interface ServerTodoItem {
  id: number | null;
  text: string | null;
  status: ServerTodoStatus | null;
  taskDefinitionId: number | null;
  order: number | null;
}

interface TodoListResponse {
  date: string;
  items: ServerTodoItem[];
}

type CognoTodoProps = {
  date: string; // "2025-12-02"
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
    taskType: "none",
    order: index,
    taskDefinitionId: null,
  };
}

// ─────────────────────
// 컴포넌트
// ─────────────────────

export default function Todo({ date }: CognoTodoProps) {
  const [items, setItems] = useState<TodoItem[]>(
    Array.from({ length: 5 }, (_, i) => createEmptyItem(i))
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // ── 1) 서버에서 "내 계정" Todo 불러오기 ──
  useEffect(() => {
    let cancelled = false;

    async function fetchTodos() {
      setLoading(true);
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

        const data = res.data;

        const loaded: TodoItem[] = (data.items ?? []).map((it, idx) => ({
          id:
            it.id !== null && it.id !== undefined
              ? String(it.id)
              : `tmp-${Date.now()}-${idx}`,
          text: it.text ?? "",
          status: serverStatusToClient(it.status),
          // TODO: 나중에 TaskDefinition ↔ taskType 매핑 넣을 자리
          taskType: "none",
          order: it.order ?? idx,
          taskDefinitionId: it.taskDefinitionId,
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

        if (!cancelled) {
          setItems(padded);
        }
      } catch (e: any) {
        console.error("load todos failed", e);
        if (!cancelled) {
          setError(e?.message ?? "Failed to load todos");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTodos();
    return () => {
      cancelled = true;
    };
  }, [date]);

  // taskType별 그룹 + order 정렬
  const grouped = useMemo(() => {
    const base: Record<TaskTypeId, TodoItem[]> = {
      focus: [],
      study: [],
      exercise: [],
      life: [],
      work: [],
      none: [],
    };
    for (const it of items) {
      base[it.taskType].push(it);
    }
    (Object.keys(base) as TaskTypeId[]).forEach((k) => {
      base[k].sort((a, b) => a.order - b.order);
    });
    return base;
  }, [items]);

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

  const changeTaskType = (id: string, taskType: TaskTypeId) => {
    setItems((prev) => {
      const sameGroup = prev.filter(
        (it) => it.taskType === taskType && it.id !== id
      );
      const newOrder = sameGroup.length;
      return prev.map((it) =>
        it.id === id ? { ...it, taskType, order: newOrder } : it
      );
    });
  };

  const addItem = () => {
    setItems((prev) => [...prev, createEmptyItem(prev.length)]);
  };

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

  // 드래그로 taskType / 순서 변경
  const onDragEnd = (result: DropResult) => {
    const { destination, source } = result;
    if (!destination) return;

    const sourceType = source.droppableId.trim() as TaskTypeId;
    const destType = destination.droppableId.trim() as TaskTypeId;

    if (sourceType === destType && source.index === destination.index) {
      return;
    }

    setItems((prev) => {
      const groups: Record<TaskTypeId, TodoItem[]> = {
        focus: [],
        study: [],
        exercise: [],
        life: [],
        work: [],
        none: [],
      };

      for (const it of prev) {
        groups[it.taskType].push({ ...it });
      }

      (Object.keys(groups) as TaskTypeId[]).forEach((type) => {
        groups[type].sort((a, b) => a.order - b.order);
      });

      const sourceGroup = groups[sourceType];
      const destGroup = groups[destType];

      const [moved] = sourceGroup.splice(source.index, 1);
      if (!moved) return prev;

      const movedUpdated: TodoItem = {
        ...moved,
        taskType: destType,
      };

      destGroup.splice(destination.index, 0, movedUpdated);

      (Object.keys(groups) as TaskTypeId[]).forEach((type) => {
        groups[type] = groups[type].map((it, idx) => ({
          ...it,
          order: idx,
        }));
      });

      const flattened: TodoItem[] = [];
      for (const t of TASK_TYPES) {
        flattened.push(...groups[t.id]);
      }

      return flattened;
    });
  };

  // ── 2) 서버 저장 ──
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
          taskDefinitionId: it.taskDefinitionId ?? null,
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
        taskType: "none",
        order: it.order ?? idx,
        taskDefinitionId: it.taskDefinitionId,
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
      setError(e?.message ?? "Failed to save todos");
    } finally {
      setSaving(false);
    }
  };

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
          {loading && (
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
        <div className="mb-2 text-xs text-rose-400">{error}</div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="space-y-4 mt-2">
          {TASK_TYPES.map((taskType) => {
            const itemsInGroup = grouped[taskType.id];
            if (!itemsInGroup || itemsInGroup.length === 0) return null;

            return (
              <section key={taskType.id}>
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
                                className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm transition-colors ${
                                  snapshot.isDragging
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

                                  <button
                                    type="button"
                                    onClick={() => toggleEdit(item.id)}
                                    className="p-1 rounded hover:bg-slate-700 text-slate-400 ml-1"
                                    title="Edit"
                                  >
                                    <FaPen className="w-3 h-3" />
                                  </button>
                                </div>

                                {editing && (
                                  <div className="flex items-center gap-1">
                                    <select
                                      className="bg-slate-900 border border-slate-700 rounded-md text-xs text-slate-200 px-2 py-1"
                                      value={item.taskType}
                                      onChange={(e) =>
                                        changeTaskType(
                                          item.id,
                                          e.target.value as TaskTypeId
                                        )
                                      }
                                    >
                                      {TASK_TYPES.map((t) => (
                                        <option key={t.id} value={t.id}>
                                          {t.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                <div className="flex items-center gap-1 ml-1">
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
