"use client";

import PSPStageCard from "./PSPStageCard";
import WeeklyTodoMock from "./WeeklyTodoMock";
import { FlowArrow } from "./FlowArrow";

export default function PSPProcessBoard() {
  // ✅ UI 전용 더미 상태 (나중에 실제 입력값으로 교체)
  const hasIssue = true;
  const hasCause = true;
  const hasIdea = false;
  const hasPlan = false;
  const hasExecution = false;

  return (
    <div className="space-y-8">

      {/* 1단계 */}
      <PSPStageCard title="1. Issue Framing" />
      <FlowArrow active={hasIssue} />

      {/* 2단계 */}
      <PSPStageCard title="2. Root Cause" />
      <FlowArrow active={hasCause} />

      {/* 3단계 */}
      <PSPStageCard title="3. Brainstorm" />
      <FlowArrow active={hasIdea} />

      {/* 4단계 */}
      <PSPStageCard title="4. Planning" />
      <FlowArrow active={hasPlan} />

      {/* 5단계 */}
      <WeeklyTodoMock />
      <FlowArrow active={hasExecution} />

      {/* 6단계 */}
      <div className="w-full rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-md">
        <div className="text-xs font-semibold text-slate-200 mb-2 tracking-wide">
          6. Review
        </div>

        <textarea
          className="w-full min-h-[140px] bg-slate-950 border border-slate-700 rounded-md p-3 text-sm text-slate-100 resize-none"
          placeholder="..."
        />
      </div>

    </div>
  );
}
