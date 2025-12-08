"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import PSPProcessBoard from "./PSPProcessBoard";
import { FlowArrow } from "./FlowArrow";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

type WeeklyChallenge = {
    id: number;
    mainGoal: string;
    startDate: string;
    endDate: string;
};

export default function WeeklyFocusChallenge() {
    const [mainGoal, setMainGoal] = useState("");
    const [challengeId, setChallengeId] = useState<number | null>(null);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    /* =========================
       ✅ 1. 이번 주 챌린지 자동 로딩
       GET /api/challenge/current
    ========================= */
    useEffect(() => {
        (async () => {
            try {
                const res = await axios.get<WeeklyChallenge>(
                    `${API_BASE}/api/challenge/current`,
                    { withCredentials: true }
                );

                if (!res.data) {
                    setLoading(false);
                    return;
                }

                console.log("✅ current challenge:", res.data);

                setChallengeId(res.data.id);
                setMainGoal(res.data.mainGoal);
                setStartDate(res.data.startDate);
                setEndDate(res.data.endDate);

            } catch (e) {
                console.warn("⚠️ 이번 주 챌린지 없음");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    /* =========================
       ✅ 2. 신규 챌린지 생성
       POST /api/challenge
    ========================= */
    const saveMainGoal = async () => {
        if (!mainGoal.trim() || !startDate || !endDate || saving) return;

        try {
            setSaving(true);

            const res = await axios.post(
                `${API_BASE}/api/challenge`,
                { startDate, endDate, mainGoal },
                { withCredentials: true }
            );

            console.log("✅ challenge created:", res.data);
            setChallengeId(res.data.id);

        } catch (e) {
            console.error("❌ challenge 생성 실패", e);
            alert("챌린지 생성 실패");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="text-slate-300 p-10 text-center">
                Loading Weekly Challenge...
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl space-y-8">

            <h2 className="text-lg font-semibold text-slate-100 tracking-wide">
                Weekly Challenge
            </h2>

            {/* ✅ 시작일 / 종료일 */}
            <div className="flex gap-4">
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-slate-800 text-slate-100 px-3 py-1 rounded border border-slate-600"
                />

                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-slate-800 text-slate-100 px-3 py-1 rounded border border-slate-600"
                />
            </div>

            {/* ✅ 메인 목표 */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 flex gap-3">
                <input
                    value={mainGoal}
                    onChange={(e) => setMainGoal(e.target.value)}
                    className="flex-1 bg-transparent border-b border-slate-600 text-base text-slate-100 outline-none"
                    placeholder="Main Goal"
                />

                <button
                    onClick={saveMainGoal}
                    disabled={saving}
                    className="px-3 py-1 text-sm rounded-md border border-emerald-600 text-emerald-300 hover:bg-emerald-800 disabled:opacity-50"
                >
                    {challengeId ? "Update" : "Save"}
                </button>
            </div>

            {/* ✅ Main Goal → 1단계 */}
            <FlowArrow active={Boolean(challengeId)} />

            {/* ✅ PSP 전체 프로세스 */}
            {challengeId && (
                <PSPProcessBoard
                    challengeId={challengeId}
                    startDate={startDate}   // ✅ 추가
                />
            )}
        </div>
    );
}
