// app/components/Todo/Todo.tsx
"use client";

import { useTodo } from "./hooks/useTodo";
import type { TodoStatus } from "./hooks/useTodo";
import {
    DragDropContext,
    Droppable,
    Draggable,
} from "@hello-pangea/dnd";

import {
    FaCheck,
    FaChevronRight,
    FaCalendarAlt,
    FaTrash,
    FaGripVertical,
    FaPen,
    FaBan,
} from "react-icons/fa";

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

// droppableId ↔ taskDefId 변환
function makeDroppableId(taskDefId: number | null): string {
    return taskDefId == null ? "none" : `def-${taskDefId}`;
}


export default function Todo({ date }: TodoProps) {
    const {
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
    } = useTodo(date);


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
