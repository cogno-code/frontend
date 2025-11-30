import type { TaskDefinition } from "../../timelineTypes";
import { COLOR_POOL } from "../../timelineUtils";

type TaskCategoryModalProps = {
    /** 모달 열림 여부 */
    isOpen: boolean;
    /** 닫기 버튼 / 오버레이에서 호출 */
    onClose: () => void;

    /** 이미 등록된 카테고리들 */
    taskDefs: TaskDefinition[];

    /** 새 카테고리 이름 상태 (부모에서 관리) */
    newTaskName: string;
    onChangeTaskName: (value: string) => void;

    /** 새 카테고리 색상 상태 (부모에서 관리) */
    newTaskColor: string | null;
    onSelectColor: (color: string) => void;

    /** 저장 버튼 클릭 시 실행 (부모에서 API 호출 등 처리) */
    onSave: () => void;
};

export default function TaskCategoryModal({
    isOpen,
    onClose,
    taskDefs,
    newTaskName,
    onChangeTaskName,
    newTaskColor,
    onSelectColor,
    onSave,
}: TaskCategoryModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-4 space-y-4">
                {/* 헤더 */}
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Task 카테고리 등록</h2>
                    <button
                        className="text-slate-400 hover:text-slate-200"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                {/* 바디 */}
                <div className="space-y-2 text-sm">
                    {/* 이름 입력 */}
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">
                            이름
                        </label>
                        <input
                            className="w-full rounded-md bg-slate-800 border border-slate-700 px-2 py-1 text-sm outline-none"
                            value={newTaskName}
                            onChange={(e) => onChangeTaskName(e.target.value)}
                            placeholder="예: 알고리즘, 논문읽기"
                        />
                    </div>

                    {/* 색상 선택 */}
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">
                            색상 (팔레트에서 선택)
                        </label>
                        <div className="flex flex-wrap gap-1">
                            {COLOR_POOL.map((c) => {
                                const used = taskDefs.some(
                                    (d) => d.color === c
                                );
                                const selected = newTaskColor === c;
                                return (
                                    <button
                                        key={c}
                                        type="button"
                                        disabled={used}
                                        onClick={() => onSelectColor(c)}
                                        className={[
                                            "w-6 h-6 rounded-full border",
                                            selected
                                                ? "border-white scale-110"
                                                : "border-slate-700",
                                            used
                                                ? "opacity-30 cursor-not-allowed"
                                                : "cursor-pointer",
                                        ].join(" ")}
                                        style={{ backgroundColor: c }}
                                        title={c}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* 이미 등록된 카테고리 리스트 */}
                    <div>
                        <div className="text-xs text-slate-400 mb-1">
                            등록된 카테고리
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                            {taskDefs.map((d) => (
                                <div
                                    key={d.name}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800 border border-slate-700"
                                >
                                    <span
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: d.color }}
                                    />
                                    <span>{d.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 푸터 버튼들 */}
                <div className="flex justify-end gap-2 text-xs">
                    <button
                        className="px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700"
                        onClick={onClose}
                    >
                        취소
                    </button>
                    <button
                        className="px-3 py-1 rounded-full bg-sky-600 hover:bg-sky-500 text-slate-50"
                        onClick={onSave}
                    >
                        저장
                    </button>
                </div>
            </div>
        </div>
    );
}
