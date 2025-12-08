"use client";

import PSPProcessBoard from "./PSPProcessBoard";
import { FlowArrow } from "./FlowArrow";

export default function WeeklyFocusChallenge() {
  const hasMainGoal = true; // ✅ UI 전용 더미

  return (
    <div className="w-full max-w-6xl mx-auto rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl space-y-8">

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100 tracking-wide">
          Weekly Challenge
        </h2>

        <div className="flex items-center gap-3 text-xs">
          <div className="bg-slate-800 px-3 py-1 rounded-full text-slate-300">
            Mon → Sun
          </div>

          <a
            href="/challenge-history"
            className="text-emerald-400 hover:underline"
          >
            History
          </a>
        </div>
      </div>

      {/* ✅ 메인 목표 */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
        <input
          className="w-full bg-transparent border-b border-slate-600 text-base text-slate-100 outline-none"
          placeholder="Main Goal"
        />
      </div>

      {/* ✅ Main Goal → 1단계 흐름 화살표 */}
      <FlowArrow active={hasMainGoal} />

      {/* ✅ PSP 전체 프로세스 */}
      <PSPProcessBoard />
    </div>
  );
}
