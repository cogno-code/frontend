// src/timeline/timelineTypes.ts

/** ==== 기본 도메인 타입 ==== */

export type ChatType = "USER" | "SYSTEM";

export type SystemKind = "TASK_START" | "TASK_END" | "INFO" | null;

export type TaskStatus = "RUNNING" | "FINISHED";

export type ChatEntry = {
    id: number;
    time: string;
    createdAt: Date;
    text: string;
    type: ChatType;
    taskName?: string;
    systemKind?: SystemKind;
};

export type TaskSegment = {
    start: Date;
    end?: Date;
};

export type Task = {
    name: string;
    color: string;
    status: TaskStatus;
    segments: TaskSegment[];
};

export type TaskDefinition = {
    name: string;
    color: string;
};

/** ==== 백엔드 DTO 타입 ==== */

export type ApiTaskSegment = {
    id: number | null;
    startTime: string;
    endTime: string | null;
};

export type ApiTask = {
    id: number | null;
    name: string;
    color: string;
    status: TaskStatus;
    date: string;
    segments: ApiTaskSegment[];
};

export type ApiChatEntry = {
    id: number;
    createdAt: string;
    text: string;
    type: ChatType;
    taskName: string | null;
    systemKind: SystemKind;
};

export type ApiTimelineResponse = {
    date: string;
    tasks: ApiTask[];
    entries: ApiChatEntry[];
};

export type ApiChatCreateRequest = {
    date: string;
    text: string;
    type: ChatType;
    taskName: string | null;
    systemKind: SystemKind | null;
};

export type ApiChatUpdateRequest = {
    text: string;
};
