import type { Task } from "../../timelineTypes";
import {
    HOURS,
    DAY_START_HOUR,
    DAY_END_HOUR,
    totalMinutes,
} from "../../timelineUtils";

type TimelinePanelProps = {
    tasks: Task[];
    currentDate: string;
};

export default function TimelinePanel({ tasks, currentDate }: TimelinePanelProps) {
    const now = new Date();
    const minTotal = DAY_START_HOUR * 60;
    const maxTotal = DAY_END_HOUR * 60;

    const hourBars: Record<
        number,
        { color: string; startPct: number; widthPct: number, name: string }[]
    > = {};

    // 시간대별로 초기화
    HOURS.forEach((h) => {
        hourBars[h] = [];
    });

    // 각 task segment를 시간대별 bar로 쪼개기
    tasks.forEach((task) => {
        task.segments.forEach((seg) => {
            let startTotal = totalMinutes(seg.start);
            let endTotal = totalMinutes(seg.end ?? now);

            // 하루 범위 밖이면 스킵
            if (endTotal <= minTotal || startTotal >= maxTotal) return;

            startTotal = Math.max(startTotal, minTotal);
            endTotal = Math.min(endTotal, maxTotal);

            // 각 시간대(시간 단위)로 나눠서 bar 계산
            for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
                const hourStart = h * 60;
                const hourEnd = (h + 1) * 60;

                const segStart = Math.max(startTotal, hourStart);
                const segEnd = Math.min(endTotal, hourEnd);
                if (segEnd <= segStart) continue;

                const withinStartMin = segStart - hourStart;
                const withinEndMin = segEnd - hourStart;

                const startPct = (withinStartMin / 60) * 100;
                const widthPct =
                    ((withinEndMin - withinStartMin) / 60) * 100;

                hourBars[h].push({
                    color: task.color,
                    startPct,
                    widthPct,
                    name: task.name,
                });
            }
        });
    });

    return (
        <div className="h-full w-full bg-slate-950 border-l border-slate-800">
            <div className="h-full flex">
                {/* 왼쪽 시간 표시 축 */}
                <div className="w-10 text-[11px] text-slate-400 flex flex-col justify-between py-4 pr-1">
                    {HOURS.map((h) => (
                        <div
                            key={h}
                            className="flex-1 flex items-start justify-end leading-none"
                        >
                            <span>{h}</span>
                        </div>
                    ))}
                </div>

                {/* 오른쪽 타임라인 바 영역 */}
                <div className="flex-1 flex flex-col py-4 pr-4">
                    {HOURS.map((h, i) => {
                        const bars = hourBars[h];
                        return (
                            <div
                                key={h}
                                className={`relative flex-1 border-t border-slate-800/70 ${i === HOURS.length - 1
                                        ? "border-b border-slate-800/70"
                                        : ""
                                    }`}
                            >
                                {bars.map((bar, idx) => (
                                    <div
                                        key={idx}
                                        className="absolute rounded-full opacity-90 cursor-pointer"  // ✅ 클릭 가능 스타일
                                        style={{
                                            left: `${bar.startPct}%`,
                                            width: `${bar.widthPct}%`,
                                            top: `${30 + idx * 12}%`,
                                            height: "3px",
                                            backgroundColor: bar.color,
                                        }}
                                        onClick={() => {
                                            const url = `/docs?task=${encodeURIComponent(
                                                bar.name
                                            )}&date=${encodeURIComponent(currentDate)}`;
                                            window.location.href = url;   // ✅ SPA지만 이 정도면 OK
                                        }}
                                    />
                                ))}
                            </div>
                        );
                    })}
                </div>

            </div>
        </div>
    );
}
