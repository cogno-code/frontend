"use client";

import Todo from "../Todo/Todo";

type Props = {
  startDate: string; // "2025-12-02"
};

function addDays(dateStr: string, offset: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WeeklyTodo({ startDate }: Props) {
  return (
    <div className="space-y-4">
      {DAY_LABELS.map((label, i) => {
        const date = addDays(startDate, i);

        return (
          <div
            key={date}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg"
          >
            <h2 className="text-sm font-semibold text-slate-100 mb-2">
              {label} ({date})
            </h2>

            {/* ✅ 기존 Todo 컴포넌트를 날짜만 바꿔서 재사용 */}
            <Todo date={date} />
          </div>
        );
      })}
    </div>
  );
}
