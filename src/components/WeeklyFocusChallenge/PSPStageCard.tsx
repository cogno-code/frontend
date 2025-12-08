"use client";

import { useEffect, useState } from "react";
import { FaGripVertical, FaPen, FaSave } from "react-icons/fa";

type Props = {
  title: string;
  defaultRows?: string[];
  onSave: (rows: string[]) => void;
};

export default function PSPStageCard({
  title,
  defaultRows = [],
  onSave,
}: Props) {
  const [rows, setRows] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  /** ✅ 핵심: 서버에서 값 들어오면 내부 state에 반영 */
  useEffect(() => {
    setRows(defaultRows.length > 0 ? defaultRows : [""]);
  }, [defaultRows]);

  const updateRow = (i: number, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  };

  const addRow = () => setRows((prev) => [...prev, ""]);

  const handleSave = () => {
    const cleaned = rows.map((r) => r.trim()).filter(Boolean);
    onSave(cleaned);
  };

  return (
    <div className="w-full rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-md">
      <div className="text-xs font-semibold text-slate-200 mb-3 tracking-wide flex justify-between">
        <span>{title}</span>

        <button
          onClick={handleSave}
          className="flex items-center gap-1 px-2 py-1 text-[11px] rounded border border-emerald-600 text-emerald-300 hover:bg-emerald-800"
        >
          <FaSave />
          Save
        </button>
      </div>

      <div className="space-y-1">
        {rows.map((row, i) => {
          const editing = editingIndex === i;

          return (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm bg-slate-800/60 hover:bg-slate-700 transition"
            >
              <FaGripVertical className="w-3 h-3 text-slate-500" />

              <div className="flex-1 flex items-center gap-1">
                {editing ? (
                  <input
                    className="w-full bg-transparent border-b border-slate-600 text-slate-100 outline-none text-sm"
                    value={row}
                    onChange={(e) => updateRow(i, e.target.value)}
                    onBlur={() => setEditingIndex(null)}
                    autoFocus
                  />
                ) : (
                  <span className="text-slate-200">{row || "(empty)"}</span>
                )}

                <button
                  onClick={() => setEditingIndex(i)}
                  className="p-1 rounded hover:bg-slate-600 text-slate-400"
                >
                  <FaPen className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex justify-between">
        <button
          onClick={addRow}
          className="text-[10px] px-2 py-1 rounded border border-slate-600 text-slate-300 hover:bg-slate-800"
        >
          + Add
        </button>
      </div>
    </div>
  );
}
