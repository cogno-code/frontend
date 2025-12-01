import { useState, useEffect } from "react";
import { apiFetchTaskDefs, apiCreateTaskDef } from "../timelineApi";
import type { TaskDefinition } from "../timelineTypes";
import { COLOR_POOL } from "../timelineUtils";

export function useTaskDefinitions() {
    const [taskDefs, setTaskDefs] = useState<TaskDefinition[]>([]);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [newTaskName, setNewTaskName] = useState("");
    const [newTaskColor, setNewTaskColor] = useState<string | null>(null);

    // 초기 로드
    useEffect(() => {
        const fetchTaskDefs = async () => {
            try {
                const data = await apiFetchTaskDefs();
                if (data.length > 0) {
                    setTaskDefs(
                        data.map((d) => ({
                            name: d.name,
                            color: d.color,
                        }))
                    );
                }
            } catch (e) {
                console.error("Failed to load task definitions", e);
            }
        };
        fetchTaskDefs();
    }, []);

    // 이미 사용 중인 색은 빼고 남은 색들
    const availableColors = COLOR_POOL.filter(
        (c) => !taskDefs.some((d) => d.color === c)
    );

    const addTaskDef = async () => {
        const name = newTaskName.trim();
        if (!name) return;
        if (taskDefs.some((d) => d.name === name)) return;

        const color =
            newTaskColor ??
            (availableColors.length > 0
                ? availableColors[0]
                : COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)]);

        try {
            const saved = await apiCreateTaskDef(name, color);

            setTaskDefs((prev) => [
                ...prev,
                { name: saved.name, color: saved.color },
            ]);
            setNewTaskName("");
            setNewTaskColor(null);
            setShowTaskModal(false);
        } catch (e) {
            console.error("Error creating task definition", e);
            alert("카테고리 저장 중 오류가 발생했습니다.");
        }
    };

    const openTaskModal = () => setShowTaskModal(true);
    const closeTaskModal = () => setShowTaskModal(false);

    return {
        taskDefs,
        showTaskModal,
        openTaskModal,
        closeTaskModal,
        newTaskName,
        setNewTaskName,
        newTaskColor,
        setNewTaskColor,
        addTaskDef,
    };
}