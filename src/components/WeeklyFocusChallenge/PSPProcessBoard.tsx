"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import PSPStageCard from "./PSPStageCard";
import { FlowArrow } from "./FlowArrow";
import WeeklyTodo from "./WeeklyTodo";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

type PSPItem = {
  id: number;
  challengeId: number;
  stage: "ISSUE" | "CAUSE" | "IDEA" | "PLAN";
  content: string;
};

type ChallengeDetailRaw = {
  challenge: {
    id: number;
    mainGoal: string;
    startDate: string;
    endDate: string;
    finished: boolean;
  };
  pspList: PSPItem[];
  review: {
    reviewText: string;
  } | null;
};

export default function PSPProcessBoard({
  challengeId,
  startDate,
}: {
  challengeId: number;
  startDate: string;
}) {
  const [completed, setCompleted] = useState({
    issue: false,
    cause: false,
    idea: false,
    plan: false,
    execution: false,
  });

  const [pspMap, setPspMap] = useState<Record<string, string[]>>({
    ISSUE: [],
    CAUSE: [],
    IDEA: [],
    PLAN: [],
  });

  const [review, setReview] = useState("");

  /* =========================
     ✅ 상세 조회 (구조 정확히 맞춤)
  ========================= */
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get<ChallengeDetailRaw>(
          `${API_BASE}/api/challenge/${challengeId}`,
          { withCredentials: true }
        );

        console.log("✅ challenge detail RAW:", res.data);

        const map: Record<string, string[]> = {
          ISSUE: [],
          CAUSE: [],
          IDEA: [],
          PLAN: [],
        };

        // ✅ 같은 stage 여러 개 있으면 "가장 마지막 것"만 사용
        res.data.pspList.forEach((p) => {
          map[p.stage] = p.content.split("\n");
        });

        setPspMap(map);

        setCompleted({
          issue: map.ISSUE.length > 0,
          cause: map.CAUSE.length > 0,
          idea: map.IDEA.length > 0,
          plan: map.PLAN.length > 0,
          execution: Boolean(res.data.review),
        });

        setReview(res.data.review?.reviewText ?? "");
      } catch (e) {
        console.warn("❌ challenge detail 불러오기 실패", e);
      }
    })();
  }, [challengeId]);

  /* =========================
     ✅ 저장 API
  ========================= */
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
      {/* 1️⃣ ISSUE */}
      <PSPStageCard
        title="1. Issue Framing"
        defaultRows={pspMap.ISSUE}
        onSave={(rows) => {
          savePsp("ISSUE", rows);
          setCompleted((p) => ({ ...p, issue: true }));
        }}
      />
      <FlowArrow active={completed.issue} />

      {/* 2️⃣ CAUSE */}
      <PSPStageCard
        title="2. Root Cause"
        defaultRows={pspMap.CAUSE}
        onSave={(rows) => {
          savePsp("CAUSE", rows);
          setCompleted((p) => ({ ...p, cause: true }));
        }}
      />
      <FlowArrow active={completed.cause} />

      {/* 3️⃣ IDEA */}
      <PSPStageCard
        title="3. Brainstorm"
        defaultRows={pspMap.IDEA}
        onSave={(rows) => {
          savePsp("IDEA", rows);
          setCompleted((p) => ({ ...p, idea: true }));
        }}
      />
      <FlowArrow active={completed.idea} />

      {/* 4️⃣ PLAN */}
      <PSPStageCard
        title="4. Planning"
        defaultRows={pspMap.PLAN}
        onSave={(rows) => {
          savePsp("PLAN", rows);
          setCompleted((p) => ({ ...p, plan: true }));
        }}
      />
      <FlowArrow active={completed.plan} />

      {/* 5️⃣ TODO */}
      <WeeklyTodo startDate={startDate} />
      <FlowArrow active={completed.execution} />

      {/* 6️⃣ REVIEW */}
      <div className="w-full rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-md">
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          onBlur={() => {
            saveReview(review);
            setCompleted((p) => ({ ...p, execution: true }));
          }}
          className="w-full min-h-[140px] bg-slate-950 border border-slate-700 rounded-md p-3 text-sm text-slate-100 resize-none"
          placeholder="Review"
        />
      </div>
    </div>
  );
}
