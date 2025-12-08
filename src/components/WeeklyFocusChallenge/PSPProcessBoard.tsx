"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import PSPStageCard from "./PSPStageCard";
import { FlowArrow } from "./FlowArrow";
import WeeklyTodo from "./WeeklyTodo";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

type ChallengeDetail = {
  psp: {
    stage: "ISSUE" | "CAUSE" | "IDEA" | "PLAN";
    content: string;
  }[];
  review?: {
    reviewText: string;
  };
};

export default function PSPProcessBoard({ challengeId, startDate }: { challengeId: number, startDate: string }) {
  const [completed, setCompleted] = useState({
    issue: false,
    cause: false,
    idea: false,
    plan: false,
    execution: false,
  });

  const [initialData, setInitialData] = useState<ChallengeDetail | null>(null);

  /* =========================
     ✅ 상세 조회
     GET /api/challenge/{id}
  ========================= */
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(
          `${API_BASE}/api/challenge/${challengeId}`,
          { withCredentials: true }
        );

        console.log("✅ challenge detail:", res.data);
        setInitialData(res.data);

        setCompleted({
          issue: res.data.psp?.some((p: any) => p.stage === "ISSUE"),
          cause: res.data.psp?.some((p: any) => p.stage === "CAUSE"),
          idea: res.data.psp?.some((p: any) => p.stage === "IDEA"),
          plan: res.data.psp?.some((p: any) => p.stage === "PLAN"),
          execution: Boolean(res.data.review),
        });
      } catch (e) {
        console.warn("❌ challenge detail 불러오기 실패", e);
      }
    })();
  }, [challengeId]);

  const savePsp = async (stage: string, rows: string[]) => {
    const content = rows.join("\n");

    await axios.post(
      `${API_BASE}/api/challenge/${challengeId}/psp`,
      { stage, content },
      { withCredentials: true }
    );
  };

  const saveReview = async (reviewText: string) => {
    await axios.post(
      `${API_BASE}/api/challenge/${challengeId}/review`,
      {
        reviewText,
        executionProgress: 1,
        doneCount: 1,
        totalCount: 1,
      },
      { withCredentials: true }
    );
  };

  return (
    <div className="space-y-8">

      <PSPStageCard
        title="1. Issue Framing"
        onSave={(rows) => {
          savePsp("ISSUE", rows);
          setCompleted((p) => ({ ...p, issue: true }));
        }}
        defaultRows={
          initialData?.psp
            ?.find((p) => p.stage === "ISSUE")
            ?.content.split("\n") ?? []
        }
      />
      <FlowArrow active={completed.issue} />

      <PSPStageCard
        title="2. Root Cause"
        onSave={(rows) => {
          savePsp("CAUSE", rows);
          setCompleted((p) => ({ ...p, cause: true }));
        }}
        defaultRows={
          initialData?.psp
            ?.find((p) => p.stage === "CAUSE")
            ?.content.split("\n") ?? []
        }
      />
      <FlowArrow active={completed.cause} />

      <PSPStageCard
        title="3. Brainstorm"
        onSave={(rows) => {
          savePsp("IDEA", rows);
          setCompleted((p) => ({ ...p, idea: true }));
        }}
        defaultRows={
          initialData?.psp
            ?.find((p) => p.stage === "IDEA")
            ?.content.split("\n") ?? []
        }
      />
      <FlowArrow active={completed.idea} />

      <PSPStageCard
        title="4. Planning"
        onSave={(rows) => {
          savePsp("PLAN", rows);
          setCompleted((p) => ({ ...p, plan: true }));
        }}
        defaultRows={
          initialData?.psp
            ?.find((p) => p.stage === "PLAN")
            ?.content.split("\n") ?? []
        }
      />
      <FlowArrow active={completed.plan} />

      <WeeklyTodo startDate={startDate} />

      <FlowArrow active={completed.execution} />

      <div className="w-full rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-md">
        <textarea
          defaultValue={initialData?.review?.reviewText ?? ""}
          onBlur={(e) => {
            saveReview(e.target.value);
            setCompleted((p) => ({ ...p, execution: true }));
          }}
          className="w-full min-h-[140px] bg-slate-950 border border-slate-700 rounded-md p-3 text-sm text-slate-100 resize-none"
          placeholder="Review"
        />
      </div>
    </div>
  );
}
