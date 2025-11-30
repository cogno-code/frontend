import React from "react";
import type { KeyboardEvent } from "react";
import { FaTrash, FaPen, FaCheck } from "react-icons/fa";
import type { ChatEntry, TaskDefinition } from "../../timelineTypes";

type ChatPanelProps = {
    entries: ChatEntry[];
    /** taskName → color 반환하는 헬퍼 (부모에서 정의) */
    getTaskColor: (taskName?: string) => string | undefined;

    /** 입력창 상태 & 핸들러 */
    input: string;
    onChangeInput: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;


    /** 오늘 날짜인지 여부 (이전 날짜면 입력 비활성화) */
    isTodaySelected: boolean;

    /** 현재 입력에 사용 중인 task / 진행 중 task 리스트 표시용 */
    activeTaskName?: string;
    runningTaskNames: string[];

    /** 해시태그 자동완성 관련 */
    hashtagSuggestions: TaskDefinition[];
    hashtagQuery: string | null;
    hashtagSelectedIndex: number;
    onSelectHashtag: (name: string) => void;

    /** 채팅 수정/삭제 콜백 */
    onEditEntry: (entry: ChatEntry) => void;
    onDeleteEntry: (id: number) => void;

    currentDate: string;

    hashtagPrefix: "#" | "##";   // ✅ 추가
};

export default function ChatPanel({
    entries,
    getTaskColor,
    input,
    onChangeInput,
    onKeyDown,
    textareaRef,
    isTodaySelected,
    activeTaskName,
    runningTaskNames,
    hashtagSuggestions,
    hashtagQuery,
    hashtagSelectedIndex,
    onSelectHashtag,
    onEditEntry,
    onDeleteEntry,
    currentDate,
    hashtagPrefix,
}: ChatPanelProps) {
    return (
        <div className="flex flex-col h-full">
            {/* 채팅 내역 */}
            <main className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                {entries.length === 0 && (
                    <div className="h-full flex items-center justify-center text-sm text-slate-500 text-center px-6">
                        예: <code className="text-sky-300">#미적분</code>{" "}
                        입력 후 공부 내용을 적으면 오른쪽 타임라인에 선이 그려집니다.
                    </div>
                )}

                {entries.map((entry) => {
                    const isSystem = entry.type === "SYSTEM";
                    const color = getTaskColor(entry.taskName);

                    // TASK_START 레이아웃
                    if (isSystem && entry.systemKind === "TASK_START") {
                        return (
                            <div
                                key={entry.id}
                                className="flex items-start gap-3 text-sm"
                            >
                                <div className="w-14 text-right text-[11px] text-slate-500 pt-1">
                                    {entry.time}
                                </div>
                                <div className="flex-1">
                                    <div className="inline-flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2">
                                        <div
                                            className="w-4 h-4 rounded-full"
                                            style={{
                                                backgroundColor:
                                                    color ?? "#22c55e",
                                            }}
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-[11px] uppercase tracking-wide text-emerald-400">
                                                TASK START
                                            </span>
                                            <span className="text-sm">
                                                {entry.taskName} task를
                                                시작합니다.
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    // TASK_END 레이아웃
                    if (isSystem && entry.systemKind === "TASK_END") {
                        return (
                            <div
                                key={entry.id}
                                className="flex items-start gap-3 text-sm"
                            >
                                <div className="w-14 text-right text-[11px] text-slate-500 pt-1">
                                    {entry.time}
                                </div>
                                <div className="flex-1">
                                    <div className="inline-flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2">
                                        <div className="relative w-4 h-4">
                                            <div
                                                className="absolute inset-0 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        color ?? "#64748b",
                                                }}
                                            />
                                            <FaCheck className="absolute inset-0 m-auto text-white text-[8px]" />
                                        </div>

                                        <div className="flex flex-col">
                                            <span className="text-[11px] uppercase tracking-wide text-slate-400">
                                                TASK END
                                            </span>
                                            <span className="text-sm">
                                                {entry.taskName} task를
                                                종료합니다.
                                            </span>
                                            <button
                                                className="ml-2 mt-1 inline-flex items-center px-2 py-0.5 rounded-full bg-sky-600 hover:bg-sky-500 text-[11px] text-slate-50"
                                                onClick={() => {
                                                    const url = `/docs?task=${encodeURIComponent(
                                                        entry.taskName!
                                                    )}&date=${encodeURIComponent(currentDate)}`;
                                                    window.location.href = url;
                                                }}
                                            >
                                                정리된 문서 보기
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    // 일반 SYSTEM / USER 채팅
                    return (
                        <div
                            key={entry.id}
                            className="flex items-start gap-3 text-sm"
                        >
                            <div className="w-14 text-right text-[11px] text-slate-500 pt-1">
                                {entry.time}
                            </div>

                            <div className="flex-1 flex items-start gap-2">
                                <div
                                    className={`inline-flex max-w-[90%] rounded-2xl px-3 py-2 whitespace-pre-wrap break-words ${isSystem
                                        ? "text-slate-200 text-xs"
                                        : "text-slate-50"
                                        }`}
                                    style={
                                        color && !isSystem
                                            ? {
                                                backgroundColor: color,
                                            }
                                            : isSystem
                                                ? {
                                                    backgroundColor: "#1f2933",
                                                }
                                                : undefined
                                    }
                                >
                                    {entry.text}
                                </div>

                                <div className="flex flex-col gap-1 mt-1">
                                    <button
                                        className="p-1 rounded-full hover:bg-slate-800 text-[10px] text-slate-400"
                                        title="수정"
                                        onClick={() => onEditEntry(entry)}
                                    >
                                        <FaPen />
                                    </button>
                                    <button
                                        className="p-1 rounded-full hover:bg-slate-800 text-[10px] text-slate-400"
                                        title="삭제"
                                        onClick={() =>
                                            onDeleteEntry(entry.id)
                                        }
                                    >
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </main>

            {/* 입력 영역 */}
            <footer className="border-t border-slate-800 px-4 py-3">
                <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2 flex flex-col gap-2">
                    <textarea
                        ref={textareaRef}
                        className="w-full bg-transparent text-sm outline-none resize-none min-h-[40px] placeholder:text-slate-500 disabled:text-slate-500 disabled:cursor-not-allowed"
                        placeholder={
                            isTodaySelected
                                ? "#미적분 (시작/등록), ##미적분 (종료) · Enter: 전송 / Shift+Enter: 줄바꿈 · Ctrl+/: task 전환"
                                : "이전 날짜에는 새 채팅을 추가할 수 없습니다."
                        }
                        value={input}
                        onChange={onChangeInput}
                        onKeyDown={onKeyDown}
                        disabled={!isTodaySelected}
                    />

                    {/* 해시태그 자동완성 드롭다운 */}
                    {hashtagSuggestions.length > 0 &&
                        hashtagQuery !== null &&
                        isTodaySelected && (
                            <div className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 text-xs max-h-40 overflow-y-auto shadow-lg">
                                {hashtagSuggestions.map((d, idx) => {
                                    const selected = idx === hashtagSelectedIndex;
                                    return (
                                        <button
                                            key={d.name}
                                            type="button"
                                            onClick={() => onSelectHashtag(d.name)}
                                            className={`w-full text-left px-2 py-1 flex items-center gap-2 ${selected
                                                    ? "bg-slate-800"
                                                    : "hover:bg-slate-800"
                                                }`}
                                        >
                                            <span
                                                className="w-3 h-3 rounded-full"
                                                style={{
                                                    backgroundColor: d.color,
                                                }}
                                            />
                                            {/* ✅ 여기만 수정 */}
                                            <span>
                                                {hashtagPrefix}
                                                {d.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}


                    {/* 아래쪽 상태 줄 */}
                    <div className="flex justify-between text-[11px] text-slate-500">
                        <span>
                            현재 입력 task:{" "}
                            {activeTaskName ? (
                                <span className="text-sky-300">
                                    {activeTaskName}
                                </span>
                            ) : (
                                "없음"
                            )}{" "}
                            (Ctrl+/ 로 변경)
                        </span>
                        <span>
                            진행 중:{" "}
                            {runningTaskNames.length === 0
                                ? "없음"
                                : runningTaskNames.join(", ")}
                        </span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
