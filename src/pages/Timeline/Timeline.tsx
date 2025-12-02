import type {
    ChatEntry
} from "./timelineTypes";

import { useTaskDefinitions } from "./hooks/useTaskDefinitions";
import { ChatPanel, TimelineHeader, TimelinePanel, MonthlyPlanner, TaskCategoryModal } from "./components/form";
import Todo from "../../components/Todo/Todo";
import { useTimelineData } from "./hooks/useTimelineData";
import { useChatInput } from "./hooks/useChatInput";
import { useResizableTimeline } from "./hooks/useResizableTimeline";

import { useState } from "react";
import type { KeyboardEvent } from "react";

export default function TimelinePage() {
    const [showTodoInline, setShowTodoInline] = useState(false);


    const {
        showTimeline, toggleTimeline, timelineWidthPct, chatWidthPct, containerRef, startResizing,
    } = useResizableTimeline(40);
    const { taskDefs, showTaskModal, openTaskModal, closeTaskModal, newTaskName, setNewTaskName, newTaskColor, setNewTaskColor, addTaskDef } = useTaskDefinitions();
    const { entries, tasks, currentDate, activeTaskName, runningTasks, lastEndedTask, isTodaySelected,
        setCurrentDate, setActiveTaskName, setLastEndedTask,
        findTask, startTask, endTask, addChat, updateChat, deleteChat, getTaskColor,
    } = useTimelineData(taskDefs);
    const {
        input, hashtagPrefix, hashtagQuery, hashtagSelectedIndex, hashtagSuggestions, textareaRef,
        handleInputChange, handleSelectHashtag, handleKeyDown: baseHandleKeyDown,
    } = useChatInput({
        taskDefs, isTodaySelected, runningTasks, activeTaskName,
        setActiveTaskName, currentDate, findTask, startTask, endTask, addChat, setLastEndedTask,
    });

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        const rawValue = textareaRef.current?.value ?? "";
        const trimmed = rawValue.trim();

        // 🔹 1) /Todo 자동완성 (Tab)
        if (e.key === "Tab") {
            const lower = trimmed.toLowerCase();
            const target = "/todo";
            if (target.startsWith(lower) && lower.length > 0) {
                e.preventDefault();
                const fakeEvent = {
                    target: { value: "/Todo" },
                } as any;
                handleInputChange(fakeEvent);
                return;
            }
        }

        // 🔹 2) /Todo 입력 시, 채팅 대신 Todo 컴포넌트 띄우기
        if (e.key === "Enter" && !e.shiftKey) {
            if (trimmed === "/Todo") {
                e.preventDefault();

                // 채팅 리스트 안에 Todo 보이게
                setShowTodoInline(true);   // ✅ 여기!

                // 입력창 비우기
                const fakeEvent = {
                    target: { value: "" },
                } as any;
                handleInputChange(fakeEvent);

                return;
            }
        }

        // 나머지는 원래 로직
        baseHandleKeyDown(e);
    };




    /** ----- 채팅 수정 ----- */
    const handleEditEntry = async (entry: ChatEntry) => {
        const newText = window.prompt("채팅 내용 수정", entry.text);
        if (newText === null) return;
        if (!newText.trim()) {
            alert("내용이 비어 있습니다.");
            return;
        }

        await updateChat(entry.id, newText);
    };

    /** ----- 채팅 삭제 ----- */
    const handleDeleteEntry = async (id: number) => {
        if (!window.confirm("이 채팅을 삭제할까요?")) return;
        await deleteChat(id);
    };


    /** ----- 렌더 ----- */
    return (
        <div className="h-screen flex flex-col bg-slate-950 text-slate-50">
            {/* 상단 헤더 */}
            <TimelineHeader
                currentDate={currentDate}
                onOpenTaskModal={openTaskModal}
                showTimeline={showTimeline}
                toggleTimeline={toggleTimeline}
            />

            {/* 전체 바디: 왼쪽 채팅, 오른쪽 (위: 캘린더, 아래: 타임라인) */}
            <div className="flex-1 flex min-h-0" ref={containerRef}>
                {/* 왼쪽: 채팅 영역 */}
                <div
                    className="flex flex-col"
                    style={{ width: `${chatWidthPct}%` }}
                >
                    {/* ✅ 마지막 종료된 task 알림 + 버튼 */}
                    {lastEndedTask && lastEndedTask.date === currentDate && (
                        <div className="px-3 py-2 border-b border-slate-800 bg-slate-900 flex items-center justify-between text-xs">
                            <span className="text-slate-200">
                                <span className="font-semibold">
                                    {lastEndedTask.name}
                                </span>
                                &nbsp;task가 종료되었습니다.
                            </span>
                            <button
                                className="px-2 py-1 rounded-full bg-sky-600 hover:bg-sky-500 text-[11px] text-slate-50"
                                onClick={() => {
                                    const url = `/docs?task=${encodeURIComponent(
                                        lastEndedTask.name
                                    )}&date=${encodeURIComponent(lastEndedTask.date)}`;
                                    window.location.href = url;
                                }}
                            >
                                정리된 문서 보기
                            </button>
                        </div>
                    )}
                    {/* ✅ ChatPanel이 남은 세로 공간을 모두 쓰게 하고, 내부에서 스크롤 처리 */}
                    <div className="flex-1 min-h-0 flex flex-col">
                        <div className="flex-1 min-h-0">
                            <div className="flex-1 min-h-0">
                                <ChatPanel
                                    entries={entries}
                                    getTaskColor={getTaskColor}
                                    input={input}
                                    onChangeInput={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    textareaRef={textareaRef}
                                    isTodaySelected={isTodaySelected}
                                    activeTaskName={activeTaskName}
                                    runningTaskNames={runningTasks.map((t) => t.name)}
                                    hashtagSuggestions={hashtagSuggestions}
                                    hashtagQuery={hashtagQuery}
                                    hashtagSelectedIndex={hashtagSelectedIndex}
                                    onSelectHashtag={handleSelectHashtag}
                                    onEditEntry={handleEditEntry}
                                    onDeleteEntry={handleDeleteEntry}
                                    currentDate={currentDate}
                                    hashtagPrefix={hashtagPrefix}
                                    showTodoInline={showTodoInline}
                                />
                            </div>

                        </div>
                    </div>

                </div>

                {/* 오른쪽: 위 캘린더 + 아래 타임라인 패널 */}
                {showTimeline && (
                    <>
                        {/* 리사이즈 핸들 */}
                        <div
                            className="w-1 cursor-col-resize bg-slate-800/80 hover:bg-slate-500"
                            onMouseDown={startResizing}
                        />
                        <div
                            className="h-full flex flex-col border-l border-slate-800"
                            style={{ width: `${timelineWidthPct}%` }}
                        >
                            {/* 위쪽: 작은 월간 플래너 */}
                            <div className="shrink-0">
                                <MonthlyPlanner
                                    currentDate={currentDate}
                                    onDateChange={setCurrentDate}
                                />
                            </div>
                            {/* 아래쪽: 타임라인 패널 */}
                            <div className="flex-1">
                                <TimelinePanel tasks={tasks} currentDate={currentDate} />
                            </div>
                            {/* 🔥 추가: Todo 패널 */}
                            <div className="border-t border-slate-800 min-h-[250px] max-h-[40%] overflow-y-auto">
                                <Todo date={currentDate} />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Task 카테고리 모달 */}
            <TaskCategoryModal
                isOpen={showTaskModal}
                onClose={closeTaskModal}
                taskDefs={taskDefs}
                newTaskName={newTaskName}
                onChangeTaskName={setNewTaskName}
                newTaskColor={newTaskColor}
                onSelectColor={setNewTaskColor}
                onSave={addTaskDef}
            />
        </div>
    );
}
