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

export type TodoStatus = "todo" | "done" | "migrated" | "scheduled" | "canceled";

export type TaskTypeId = "none" | "focus" | "study" | "exercise" | "life" | "work";

interface TaskType {
  id: TaskTypeId;
  label: string;
  color: string;
}

const TASK_TYPES: TaskType[] = [
  { id: "focus", label: "Focus", color: "#3b82f6" },
  { id: "study", label: "Study", color: "#22c55e" },
  { id: "exercise", label: "Exercise", color: "#facc15" },
  { id: "work", label: "Work", color: "#a855f7" },
  { id: "life", label: "Life", color: "#f97316" },
  { id: "none", label: "Uncategorized", color: "#9ca3af" },
];

interface TodoItem {
  id: string;           // 클라이언트용 임시 id 포함
  serverId?: number;    // 실제 DB id
  text: string;
  status: TodoStatus;
  taskType: TaskTypeId;
  order: number;        // 같은 taskType 안에서 순서
}

interface TodoProps {
  date: string; // YYYY-MM-DD
}

function createEmptyItem(index: number): TodoItem {
  return {
    id: `tmp-${Date.now()}-${index}`,
    text: "",
    status: "todo",
    taskType: "none",
    order: index,
  };
}

// 서버에서 오는 형태(지난번에 맞춰놨을 걸로 가정)
interface ServerTodoItem {
  id: number;
  text: string;
  status: TodoStatus;
  taskType: TaskTypeId;
  orderIndex: number;
}

interface SaveTodosRequest {
  date: string;
  items: {
    id?: number;
    text: string;
    status: TodoStatus;
    taskType: TaskTypeId;
    orderIndex: number;
  }[];
}

export default function Todo({ date }: TodoProps) {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // --- 서버 동기화 헬퍼: "현재 items를 그대로 서버에 저장" ---
  const saveAll = useCallback(
    async (nextItems: TodoItem[]) => {
      try {
        setSaving(true);

        const payload: SaveTodosRequest = {
          date,
          items: nextItems.map((it) => ({
            id: it.serverId,
            text: it.text,
            status: it.status,
            taskType: it.taskType,
            orderIndex: it.order,
          })),
        };

        await axios.put(`${API_BASE}/api/todo`, payload, {
          withCredentials: true,
        });
      } catch (e) {
        console.error("save todos failed", e);
        // 필요하면 여기서 토스트나 경고창으로 알려줘도 됨
      } finally {
        setSaving(false);
      }
    },
    [date]
  );

  // --- 최초 / 날짜 변경 시 로딩 ---
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await axios.get<ServerTodoItem[]>(
          `${API_BASE}/api/todo`,
          {
            params: { date },
            withCredentials: true,
          }
        );

        if (cancelled) return;

        const fromServer = res.data ?? [];
        if (fromServer.length === 0) {
          // 데이터 없으면 5개 기본 생성
          const base = Array.from({ length: 5 }, (_, i) =>
            createEmptyItem(i)
          );
          setItems(base);
          // 새로 만든 5개도 서버에 반영
          saveAll(base);
        } else {
          const mapped: TodoItem[] = fromServer.map((s) => ({
            id: `srv-${s.id}`,
            serverId: s.id,
            text: s.text,
            status: s.status,
            taskType: s.taskType,
            order: s.orderIndex,
          }));
          setItems(mapped);
        }
      } catch (e) {
        console.error("load todos failed", e);
        // 실패 시에도 일단 5개 기본 슬롯 제공
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

  // --- taskType별 그룹 + order 정렬 (Uncategorized는 항상 맨 밑) ---
  const groupedByTaskType = (() => {
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
  })();

  const orderedTaskTypes: TaskType[] = [
    ...TASK_TYPES.filter((t) => t.id !== "none"),
    TASK_TYPES.find((t) => t.id === "none")!,
  ];

  // --- 불렛저널 기호 ---
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

  // --- 변경 핸들러들: 모두 "setItems + saveAll(next)" 패턴 ---

  const handleChangeText = (id: string, text: string) => {
    setItems((prev) => {
      const next = prev.map((it) =>
        it.id === id ? { ...it, text } : it
      );
      saveAll(next);
      return next;
    });
  };

  const toggleStatus = (id: string, target: TodoStatus) => {
    setItems((prev) => {
      const next = prev.map((it) => {
        if (it.id !== id) return it;
        const nextStatus = it.status === target ? "todo" : target;
        return { ...it, status: nextStatus };
      });
      saveAll(next);
      return next;
    });
  };

  const changeTaskType = (id: string, taskType: TaskTypeId) => {
    setItems((prev) => {
      const sameGroup = prev.filter(
        (it) => it.taskType === taskType && it.id !== id
      );
      const newOrder = sameGroup.length;

      const next = prev.map((it) =>
        it.id === id ? { ...it, taskType, order: newOrder } : it
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

  const finishEditing = (id: string) => {
    setEditingId(null);
    // 텍스트 변경은 이미 handleChangeText에서 saveAll 호출함
  };

  const toggleEdit = (id: string) => {
    setEditingId((prev) => (prev === id ? null : id));
  };

  // --- Drag & Drop: 그룹 내 순서 변경 + 그룹 간 이동 모두 저장 ---
  const onDragEnd = (result: DropResult) => {
    const { destination, source } = result;
    if (!destination) return;

    const sourceType = source.droppableId.trim() as TaskTypeId;
    const destType = destination.droppableId.trim() as TaskTypeId;

    if (
      sourceType === destType &&
      destination.index === source.index
    ) {
      return;
    }

    setItems((prev) => {
      // 같은 그룹 내 이동
      if (sourceType === destType) {
        const sameGroup = prev
          .filter((it) => it.taskType === sourceType)
          .sort((a, b) => a.order - b.order);

        const [moved] = sameGroup.splice(source.index, 1);
        sameGroup.splice(destination.index, 0, moved);

        const updated = sameGroup.map((it, idx) => ({
          ...it,
          order: idx,
        }));

        const next = prev.map((it) =>
          it.taskType === sourceType
            ? updated.find((u) => u.id === it.id) ?? it
            : it
        );
        saveAll(next);
        return next;
      }

      // 다른 그룹으로 이동
      const sourceItems = prev
        .filter((it) => it.taskType === sourceType)
        .sort((a, b) => a.order - b.order);

      const destItems = prev
        .filter((it) => it.taskType === destType)
        .sort((a, b) => a.order - b.order);

      const [moved] = sourceItems.splice(source.index, 1);

      destItems.splice(destination.index, 0, {
        ...moved,
        taskType: destType,
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
        if (it.taskType === sourceType) {
          return updatedSource.find((u) => u.id === it.id) ?? it;
        }
        if (it.taskType === destType) {
          return updatedDest.find((u) => u.id === it.id) ?? it;
        }
        return it;
      });

      saveAll(next);
      return next;
    });
  };

  if (loading) {
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
        <div className="text-xs text-slate-400">
          {saving ? "Saving…" : "Auto-saved"}
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="space-y-4 mt-2">
          {orderedTaskTypes.map((taskType) => {
            const itemsInGroup = groupedByTaskType[taskType.id];
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
                                          e.preventDefault();
                                          finishEditing(item.id);
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

                                {/* 편집 중일 때만 카테고리 선택 */}
                                {editing && (
                                  <div className="flex items-center gap-1">
                                    <select
                                      className="bg-slate-900 border border-slate-700 rounded-md text-xs text-slate-200 px-2 py-1"
                                      value={item.taskType}
                                      onChange={(e) =>
                                        changeTaskType(
                                          item.id,
                                          e.target
                                            .value as TaskTypeId
                                        )
                                      }
                                    >
                                      {TASK_TYPES.map((t) => (
                                        <option
                                          key={t.id}
                                          value={t.id}
                                        >
                                          {t.label}
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
                                      toggleStatus(
                                        item.id,
                                        "migrated"
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
                                        "scheduled"
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
                                        "canceled"
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
            );
          })}
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
