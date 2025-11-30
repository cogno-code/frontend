// src/timeline/components/MonthlyPlanner.tsx
"use client";

import React, { useState, useEffect } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { DAY_LABELS, getTodayDateString } from "../../timelineUtils";

type MonthlyPlannerProps = {
    currentDate: string;
    onDateChange: (date: string) => void;
};

export default function MonthlyPlanner({
    currentDate,
    onDateChange,
}: MonthlyPlannerProps) {
    const [visibleYear, setVisibleYear] = useState<number>(() => {
        const d = new Date(currentDate || getTodayDateString());
        return d.getFullYear();
    });

    const [visibleMonth, setVisibleMonth] = useState<number>(() => {
        const d = new Date(currentDate || getTodayDateString());
        return d.getMonth(); // 0~11
    });

    // currentDate 바뀔 때 월/년도도 맞춰서 이동
    useEffect(() => {
        if (!currentDate) return;
        const d = new Date(currentDate);
        if (!isNaN(d.getTime())) {
            setVisibleYear(d.getFullYear());
            setVisibleMonth(d.getMonth());
        }
    }, [currentDate]);

    const firstDayOfMonth = new Date(visibleYear, visibleMonth, 1);
    const startWeekDay = firstDayOfMonth.getDay(); // 0(일)~6(토)
    const daysInMonth = new Date(visibleYear, visibleMonth + 1, 0).getDate();

    const cells: Date[] = [];
    const firstCellDate = new Date(
        visibleYear,
        visibleMonth,
        1 - startWeekDay
    );

    for (let i = 0; i < 42; i++) {
        const d = new Date(
            firstCellDate.getFullYear(),
            firstCellDate.getMonth(),
            firstCellDate.getDate() + i
        );
        cells.push(d);
    }

    const todayStr = getTodayDateString();

    const handleMoveMonth = (delta: number) => {
        const newMonth = visibleMonth + delta;
        const y = visibleYear + Math.floor(newMonth / 12);
        const m = ((newMonth % 12) + 12) % 12; // 음수 보정
        setVisibleYear(y);
        setVisibleMonth(m);
    };

    const formatDateStr = (d: Date) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    return (
        <div className="border-b border-slate-800 bg-slate-950/95">
            <div className="px-3 py-2">
                {/* 상단 월 이동/헤더 */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                        <button
                            className="p-1 rounded-full hover:bg-slate-800 text-[11px]"
                            onClick={() => handleMoveMonth(-1)}
                        >
                            <FaChevronLeft />
                        </button>
                        <div className="text-xs font-semibold">
                            {visibleYear}년 {visibleMonth + 1}월
                        </div>
                        <button
                            className="p-1 rounded-full hover:bg-slate-800 text-[11px]"
                            onClick={() => handleMoveMonth(1)}
                        >
                            <FaChevronRight />
                        </button>
                    </div>
                    <button
                        className="px-2 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-[10px]"
                        onClick={() => onDateChange(getTodayDateString())}
                    >
                        오늘로 이동
                    </button>
                </div>

                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 text-[10px] text-center text-slate-400 mb-1">
                    {DAY_LABELS.map((d) => (
                        <div key={d} className="py-0.5">
                            {d}
                        </div>
                    ))}
                </div>

                {/* 날짜 그리드 */}
                <div className="grid grid-cols-7 text-[11px] gap-y-1">
                    {cells.map((d, idx) => {
                        const isCurrentMonth =
                            d.getMonth() === visibleMonth &&
                            d.getFullYear() === visibleYear;
                        const dateStr = formatDateStr(d);
                        const isToday = dateStr === todayStr;
                        const isSelected = dateStr === currentDate;

                        let textColor = "text-slate-300";
                        if (!isCurrentMonth) textColor = "text-slate-500";
                        if (d.getDay() === 0) textColor = "text-rose-400";
                        if (d.getDay() === 6) textColor = "text-sky-400";

                        return (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => onDateChange(dateStr)}
                                className={[
                                    "h-6 flex items-center justify-center mx-auto w-6 rounded-full transition-colors",
                                    isSelected
                                        ? "bg-sky-500 text-slate-50"
                                        : isToday
                                        ? "border border-sky-500/70"
                                        : "hover:bg-slate-800/70",
                                    textColor,
                                    !isCurrentMonth
                                        ? "opacity-60"
                                        : "opacity-100",
                                ].join(" ")}
                            >
                                {d.getDate()}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
