"use client";

import { FaGripVertical, FaPen } from "react-icons/fa";

type Props = {
  title: string;
};

export default function PSPStageCard({ title }: Props) {
  return (
    <div className="w-full rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-md">

      <div className="text-xs font-semibold text-slate-200 mb-3 tracking-wide">
        {title}
      </div>

      <div className="space-y-1">
        {[1, 2, 3].map((i) => {
          const editing = false;

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
                    placeholder="..."
                  />
                ) : (
                  <span className="text-slate-200">
                    기록 {i}
                  </span>
                )}

                <button className="p-1 rounded hover:bg-slate-600 text-slate-400">
                  <FaPen className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3">
        <button className="text-[10px] px-2 py-1 rounded border border-slate-600 text-slate-300 hover:bg-slate-800">
          + Add
        </button>
      </div>
    </div>
  );
}
