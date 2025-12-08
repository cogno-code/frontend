"use client";

import {
  FaGripVertical,
  FaCheck,
  FaChevronRight,
  FaCalendarAlt,
  FaBan,
  FaTrash,
  FaPen,
} from "react-icons/fa";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WeeklyTodoMock() {
  return (
    <div className="space-y-4">
      {DAYS.map((day) => (
        <div
          key={day}
          className="w-full w-full rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg"
        >
          <h2 className="text-sm font-semibold text-slate-100 mb-2">
            {day} Todo
          </h2>

          <div className="space-y-1 pl-2">
            {[1, 2, 3].map((i) => {
              const editing = false; // ✅ UI 전용

              return (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm transition-colors hover:bg-slate-800/60"
                >
                  <div className="cursor-grab px-1 text-slate-500">
                    <FaGripVertical className="w-3 h-3" />
                  </div>

                  <div className="w-4 flex items-center justify-center text-slate-300">
                    •
                  </div>

                  {/* ✅ 네가 준 “텍스트 + 연필” 구조 그대로 반영 */}
                  <div className="flex-1 flex items-center gap-1">
                    {editing ? (
                      <input
                        autoFocus
                        className="w-full bg-transparent border-b border-slate-600 text-slate-100 outline-none text-sm"
                        placeholder="Write your task…"
                      />
                    ) : (
                      <span className="text-slate-200">
                        샘플 할 일 {i}
                      </span>
                    )}

                    <button
                      type="button"
                      className="p-1 rounded hover:bg-slate-700 text-slate-400 ml-1"
                      title="Edit"
                    >
                      <FaPen className="w-3 h-3" />
                    </button>
                  </div>

                  {/* 상태 아이콘 5종 */}
                  <div className="flex items-center gap-1 ml-1">
                    <button className="p-1 rounded-md hover:bg-emerald-700/70">
                      <FaCheck className="w-3 h-3 text-emerald-300" />
                    </button>

                    <button className="p-1 rounded-md hover:bg-indigo-700/70">
                      <FaChevronRight className="w-3 h-3 text-indigo-300" />
                    </button>

                    <button className="p-1 rounded-md hover:bg-amber-700/70">
                      <FaCalendarAlt className="w-3 h-3 text-amber-300" />
                    </button>

                    <button className="p-1 rounded-md hover:bg-slate-700">
                      <FaBan className="w-3 h-3 text-slate-300" />
                    </button>

                    <button className="p-1 rounded-md hover:bg-rose-800/70">
                      <FaTrash className="w-3 h-3 text-rose-300" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3">
            <button className="text-xs px-2 py-1 rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800">
              + Add item
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
