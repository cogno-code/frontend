"use client";

import { useState } from "react";
import { FaGripVertical, FaPen, FaTrash } from "react-icons/fa";

type Props = {
    title: string;
    onSave?: (rows: string[]) => void; // ✅ onSave 타입 추가
    defaultRows?: string[];
};

type PspRow = {
    id: string;
    text: string;
};

export default function PSPStageCard({ title, onSave, defaultRows }: Props) {
    const [rows, setRows] = useState<PspRow[]>(
        defaultRows?.length
            ? defaultRows.map((text) => ({
                id: crypto.randomUUID(),
                text,
            }))
            : [{ id: crypto.randomUUID(), text: "" }]
    );


    const [editingId, setEditingId] = useState<string | null>(null);

    const addRow = () => {
        setRows((prev) => [
            ...prev,
            { id: crypto.randomUUID(), text: "" },
        ]);
    };

    const deleteRow = (id: string) => {
        setRows((prev) => prev.filter((r) => r.id !== id));
        if (editingId === id) setEditingId(null);
    };

    const changeText = (id: string, text: string) => {
        setRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, text } : r))
        );
    };

    const toggleEdit = (id: string) => {
        setEditingId((prev) => (prev === id ? null : id));
    };

    const finishEdit = () => {
        setEditingId(null);

        // ✅ API 저장용 콜백
        if (onSave) {
            onSave(rows.map((r) => r.text));
        }
    };

    return (
        <div className="w-full rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-md">
            {/* 제목 */}
            <div className="text-xs font-semibold text-slate-200 mb-3 tracking-wide">
                {title}
            </div>

            {/* 기록 리스트 */}
            <div className="space-y-1">
                {rows.map((row, idx) => {
                    const editing = editingId === row.id;

                    return (
                        <div
                            key={row.id}
                            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm bg-slate-800/60 hover:bg-slate-700 transition"
                        >
                            <FaGripVertical className="w-3 h-3 text-slate-500" />

                            <div className="flex-1 flex items-center gap-1">
                                {editing ? (
                                    <input
                                        autoFocus
                                        value={row.text}
                                        onChange={(e) =>
                                            changeText(row.id, e.target.value)
                                        }
                                        onBlur={finishEdit}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                finishEdit();
                                            }
                                        }}
                                        className="w-full bg-transparent border-b border-slate-600 text-slate-100 outline-none text-sm"
                                        placeholder="..."
                                    />
                                ) : (
                                    <span
                                        className={`${row.text
                                                ? "text-slate-200"
                                                : "text-slate-500 italic"
                                            }`}
                                    >
                                        {row.text || `기록 ${idx + 1}`}
                                    </span>
                                )}

                                {/* 편집 버튼 */}
                                <button
                                    type="button"
                                    onClick={() => toggleEdit(row.id)}
                                    className="p-1 rounded hover:bg-slate-600 text-slate-400"
                                    title="Edit"
                                >
                                    <FaPen className="w-3 h-3" />
                                </button>

                                {/* 삭제 버튼 */}
                                <button
                                    type="button"
                                    onClick={() => deleteRow(row.id)}
                                    className="p-1 rounded hover:bg-rose-800/70 text-rose-300"
                                    title="Delete"
                                >
                                    <FaTrash className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add 버튼 */}
            <div className="mt-3">
                <button
                    type="button"
                    onClick={addRow}
                    className="text-[10px] px-2 py-1 rounded border border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                    + Add
                </button>
            </div>
        </div>
    );
}
