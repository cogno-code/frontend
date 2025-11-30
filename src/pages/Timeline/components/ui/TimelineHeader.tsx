import { FaHome, FaPlus, FaClock, FaChevronLeft, FaChevronRight } from "react-icons/fa";

type TimelineHeaderProps = {
    currentDate: string;
    onOpenTaskModal: () => void;
    showTimeline: boolean;
    toggleTimeline: () => void;
};

export default function TimelineHeader({
    currentDate,
    onOpenTaskModal,
    showTimeline,
    toggleTimeline,
}: TimelineHeaderProps) {
    return (
        <header className="border-b border-slate-800 px-4 py-2 flex items-center justify-between bg-slate-950/95">
            {/* Left - Home + 현재 날짜 */}
            <div className="flex items-center gap-2">
                <button
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-xs"
                    onClick={() => (window.location.href = "/")}
                >
                    <FaHome className="text-slate-300" />
                    <span>/Home</span>
                </button>

                <span className="text-sm font-semibold ml-2">
                    Timeline ({currentDate})
                </span>
            </div>

            {/* Right - 카테고리 추가 + 타임라인 보기/숨기기 */}
            <div className="flex items-center gap-2 text-xs text-slate-300">
                {/* 카테고리 모달 열기 */}
                <button
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800"
                    onClick={onOpenTaskModal}
                >
                    <FaPlus />
                    <span>카테고리 추가</span>
                </button>

                {/* 타임라인 토글 */}
                <button
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800"
                    onClick={toggleTimeline}
                >
                    <FaClock />
                    <span>{showTimeline ? "타임라인 숨기기" : "타임라인 보기"}</span>

                    {showTimeline ? (
                        <FaChevronRight className="text-[10px]" />
                    ) : (
                        <FaChevronLeft className="text-[10px]" />
                    )}
                </button>
            </div>
        </header>
    );
}
