// src/timeline/timelineUtils.ts

import type { Task, TaskDefinition } from "./timelineTypes";

/** ==== 공용 상수 ==== */

// 백엔드 타임라인 API 베이스 URL
export const API_BASE = "http://localhost:8080/api/timeline";

// 타임라인 시간 범위
export const DAY_START_HOUR = 0;
export const DAY_END_HOUR = 24;

// 0 ~ 23 시까지 배열
export const HOURS = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR },
    (_, i) => DAY_START_HOUR + i
);

// Task / 카테고리에서 사용할 색상 풀
export const COLOR_POOL = [
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#eab308",
    "#84cc16",
    "#22c55e",
    "#10b981",
    "#14b8a6",
    "#06b6d4",
    "#0ea5e9",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#a855f7",
    "#d946ef",
    "#ec4899",
    "#f43f5e",
    "#fb7185",
    "#f97373",
    "#facc15",
    "#4ade80",
    "#34d399",
    "#2dd4bf",
    "#38bdf8",
    "#60a5fa",
    "#818cf8",
    "#a5b4fc",
    "#f9a8d4",
    "#fbbf24",
    "#22c55e",
];

// 월간 플래너에서 쓰는 요일 라벨
export const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/** ==== 공용 함수 ==== */

// 새 task 색상 선택 (기존 정의/이미 사용 중 색 피해서 선택)
export function pickColorForTask(
    taskName: string,
    taskDefs: TaskDefinition[],
    existingTasks: Task[]
): string {
    const def = taskDefs.find((d) => d.name === taskName);
    if (def) return def.color;

    const used = new Set<string>([
        ...taskDefs.map((d) => d.color),
        ...existingTasks.map((t) => t.color),
    ]);

    const candidates = COLOR_POOL.filter((c) => !used.has(c));
    if (candidates.length === 0) {
        return COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)];
    }
    return candidates[Math.floor(Math.random() * COLOR_POOL.length)];
}

// "HH:MM" 형식으로 시간 포맷
export function formatTime(d: Date): string {
    return d.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

// 00:00 기준 누적 분
export function totalMinutes(date: Date): number {
    return date.getHours() * 60 + date.getMinutes();
}

// 오늘 날짜를 "YYYY-MM-DD" 문자열로 반환
export function getTodayDateString(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}
