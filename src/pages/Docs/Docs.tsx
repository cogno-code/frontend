import React, { useEffect, useMemo, useState } from "react";
import {
    useLocation,
    useNavigate,
} from "react-router-dom";
import {
    API_BASE,
    getTodayDateString,
} from "../Timeline/timelineUtils";
import type {
    ApiTimelineResponse,
    ApiChatEntry,
    // ApiTaskDefinition  // 필요하면 사용
} from "../Timeline/timelineTypes";

type DocEntry = {
    id: number;
    time: string;
    text: string;
};

type DocsByTaskMap = Record<string, DocEntry[]>;

const ALL_KEY = "__ALL__"; // "전체" 문서 키

// 쿼리스트링 파서 훅
function useQuery() {
    const { search } = useLocation();
    return useMemo(() => new URLSearchParams(search), [search]);
}

const DocsPage: React.FC = () => {
    const query = useQuery();
    const location = useLocation();
    const navigate = useNavigate();

    const taskParam = query.get("task") || "";
    const dateParam = query.get("date");
    const date = dateParam || getTodayDateString();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // taskName → DocEntry[]
    const [docsByTask, setDocsByTask] = useState<DocsByTaskMap>({});
    // 실제로 선택된 key (ALL_KEY 또는 taskName)
    const [selectedKey, setSelectedKey] = useState<string>(ALL_KEY);

    // ------------ 타임라인에서 문서(=task별 USER 채팅) 가져오기 ------------
    useEffect(() => {
        const fetchDocs = async () => {
            setLoading(true);
            setError(null);

            try {
                const res = await fetch(
                    `${API_BASE}?date=${encodeURIComponent(date)}`,
                    {
                        credentials: "include",
                    }
                );

                if (!res.ok) {
                    setError(
                        `타임라인을 불러오는 데 실패했습니다. (status: ${res.status})`
                    );
                    setDocsByTask({});
                    setLoading(false);
                    return;
                }

                const data: ApiTimelineResponse = await res.json();

                // USER 채팅만 문서 대상으로 사용
                const userEntries: ApiChatEntry[] = data.entries.filter(
                    (e) => e.type === "USER"
                );

                const grouped: DocsByTaskMap = {};

                // 전체(ALL) 문서
                const allDocs: DocEntry[] = userEntries.map((e) => {
                    const created = new Date(e.createdAt);
                    const time = created.toTimeString().slice(0, 5); // HH:mm
                    return {
                        id: e.id,
                        time,
                        text: e.text,
                    };
                });
                grouped[ALL_KEY] = allDocs;

                // taskName 기준으로 문서 그룹화
                for (const e of userEntries) {
                    const key = e.taskName || "(task 없음)";
                    const created = new Date(e.createdAt);
                    const time = created.toTimeString().slice(0, 5);

                    if (!grouped[key]) {
                        grouped[key] = [];
                    }
                    grouped[key].push({
                        id: e.id,
                        time,
                        text: e.text,
                    });
                }

                // 시간 기준으로 정렬
                Object.values(grouped).forEach((arr) =>
                    arr.sort((a, b) => a.time.localeCompare(b.time))
                );

                setDocsByTask(grouped);

                // URL의 task 파라미터에 맞춰 선택 key 설정
                if (!taskParam) {
                    setSelectedKey(ALL_KEY);
                } else if (grouped[taskParam]) {
                    setSelectedKey(taskParam);
                } else {
                    // 없는 task가 들어왔으면 전체로
                    setSelectedKey(ALL_KEY);
                }
            } catch (err) {
                console.error(err);
                setError("데이터를 불러오는 중 오류가 발생했습니다.");
                setDocsByTask({});
            } finally {
                setLoading(false);
            }
        };

        fetchDocs();
    }, [date, taskParam]);

    const currentEntries: DocEntry[] = docsByTask[selectedKey] || [];

    const titleLabel =
        selectedKey === ALL_KEY ? "전체" : selectedKey;

    // ----------- URL 쿼리(task) 동기화 + 선택 변경 -----------

    const updateTaskQuery = (taskName: string | null) => {
        const params = new URLSearchParams(location.search);

        if (!taskName || taskName === "전체") {
            params.delete("task");
        } else {
            params.set("task", taskName);
        }

        navigate({
            pathname: location.pathname,
            search: `?${params.toString()}`,
        }, { replace: true });
    };

    const handleSelectDoc = (key: string) => {
        setSelectedKey(key);
        if (key === ALL_KEY) {
            updateTaskQuery(null);
        } else {
            updateTaskQuery(key);
        }
    };

    // ---------------- 새 문서(=새 task) 생성 ----------------

    const handleCreateNewDoc = async () => {
        const name = window.prompt("새 문서(=task) 이름을 입력하세요");
        if (!name) return;

        const trimmed = name.trim();
        if (!trimmed) return;

        // 이미 있는 task면 그냥 선택만
        if (docsByTask[trimmed]) {
            handleSelectDoc(trimmed);
            return;
        }

        // 1) 백엔드에 task-definition 생성 (스키마에 맞게 수정해서 사용)
        try {
            const res = await fetch(
                `${API_BASE}/task-definitions`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        // TODO: 실제 TaskDefinition 생성 포맷에 맞게 수정
                        name: trimmed,
                        color: "#22d3ee",
                        // 필요하다면 category / description 등 추가
                    }),
                }
            );

            if (!res.ok) {
                console.error(
                    "새 task 생성 실패",
                    res.status
                );
            } else {
                // const created: ApiTaskDefinition = await res.json();
                // 필요하면 created 사용
            }
        } catch (e) {
            console.error("새 task 생성 중 오류", e);
        }

        // 2) 프론트 쪽 문서 리스트에 비어 있는 문서로 추가
        setDocsByTask((prev) => ({
            ...prev,
            [trimmed]: [],
        }));
        handleSelectDoc(trimmed);
    };

    // ------------- 페이지 나갈 때 task 완료 처리 자리 -------------
    useEffect(() => {
        // 선택된 task가 실제 task일 때만 (전체는 제외)
        if (selectedKey === ALL_KEY) return;

        const taskName = selectedKey;

        // cleanup: 컴포넌트 unmount 시 실행
        return () => {
            // TODO: 여기에서 해당 task를 "완료" 상태로 만드는 API 호출을 넣으면 됨.
            // 예: /api/timeline/chat 에 TASK END 시스템 메세지 추가 등
            //
            // (예시 스켈레톤)
            /*
            fetch(`${API_BASE}/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    type: "SYSTEM",
                    systemType: "TASK_END", // 실제 필드명에 맞게 수정
                    taskName,
                    text: `[AUTO] ${taskName} 문서 정리 완료`,
                    date,
                }),
            }).catch((e) =>
                console.error("자동 TASK END 실패", e)
            );
            */
        };
    }, [selectedKey, date]);

    // --------------------------- UI ---------------------------

    const hasAnyDocs = Object.keys(docsByTask).length > 0;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
            {/* 헤더 */}
            <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold">
                        정리된 문서{" "}
                        <span className="text-sky-400">
                            ({titleLabel} task)
                        </span>
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        날짜:{" "}
                        <span className="font-mono">
                            {date}
                        </span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCreateNewDoc}
                        className="text-xs px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-slate-50"
                    >
                        새 문서 작성
                    </button>
                    <button
                        onClick={() => navigate("/")}
                        className="text-xs px-3 py-1 rounded-full border border-slate-700 hover:border-slate-500 hover:bg-slate-900"
                    >
                        홈으로
                    </button>
                    <button
                        onClick={() => navigate("/timeline")}
                        className="text-xs px-3 py-1 rounded-full bg-sky-600 hover:bg-sky-500 text-slate-50"
                    >
                        타임라인으로 돌아가기
                    </button>
                </div>
            </header>

            {/* 본문: 왼쪽 문서 목록 / 오른쪽 내용 */}
            <main className="flex-1 px-6 py-4 flex gap-4">
                {/* 문서 목록(카테고리별) */}
                <aside className="w-64 border border-slate-800 rounded-lg bg-slate-900/60 p-3 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xs font-semibold text-slate-200">
                            문서 목록
                        </h2>
                        <span className="text-[10px] text-slate-500">
                            {hasAnyDocs
                                ? `${Object.keys(docsByTask).length}개`
                                : "0개"}
                        </span>
                    </div>

                    {loading && (
                        <div className="text-[11px] text-slate-400">
                            불러오는 중…
                        </div>
                    )}

                    {!loading && !hasAnyDocs && !error && (
                        <div className="text-[11px] text-slate-500">
                            아직 정리된 문서가 없습니다.
                        </div>
                    )}

                    {!loading && hasAnyDocs && (
                        <div className="flex-1 overflow-auto space-y-1 pr-1">
                            {Object.entries(docsByTask)
                                .sort(([a], [b]) => {
                                    if (a === ALL_KEY) return -1;
                                    if (b === ALL_KEY) return 1;
                                    return a.localeCompare(b);
                                })
                                .map(([key, arr]) => {
                                    const isAll = key === ALL_KEY;
                                    const label = isAll ? "전체" : key;
                                    const selected =
                                        key === selectedKey;

                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() =>
                                                handleSelectDoc(key)
                                            }
                                            className={`w-full text-left px-2 py-1 rounded-md text-xs flex items-center justify-between ${
                                                selected
                                                    ? "bg-slate-800 text-sky-300"
                                                    : "hover:bg-slate-800 text-slate-200"
                                            }`}
                                        >
                                            <span className="truncate">
                                                {label}
                                            </span>
                                            <span className="ml-2 text-[10px] text-slate-400">
                                                {arr.length}
                                            </span>
                                        </button>
                                    );
                                })}
                        </div>
                    )}
                </aside>

                {/* 우측: 선택된 문서 내용 */}
                <section className="flex-1">
                    {loading && (
                        <div className="text-sm text-slate-400">
                            불러오는 중…
                        </div>
                    )}

                    {error && (
                        <div className="text-sm text-red-400 mb-3">
                            {error}
                        </div>
                    )}

                    {!loading &&
                        !error &&
                        currentEntries.length === 0 && (
                            <div className="text-sm text-slate-400">
                                {selectedKey === ALL_KEY
                                    ? "이 날짜에는 정리된 내용이 없습니다."
                                    : `"${titleLabel}" task에 해당하는 정리된 내용이 없습니다.`}
                            </div>
                        )}

                    {!loading &&
                        !error &&
                        currentEntries.length > 0 && (
                            <section className="border border-slate-800 rounded-lg bg-slate-900/60 p-4 max-w-3xl">
                                <h2 className="text-sm font-semibold mb-3 text-slate-100">
                                    요약용 텍스트
                                </h2>
                                <div className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                                    데모입니다 (나중에 AI 요약이 들어갈 예정)
                                </div>

                                <hr className="my-4 border-slate-800" />

                                <h3 className="text-xs font-semibold mb-2 text-slate-300">
                                    타임라인 순서대로 보기
                                </h3>
                                <div className="space-y-2 max-h-[400px] overflow-auto pr-2">
                                    {currentEntries.map((e) => (
                                        <div
                                            key={e.id}
                                            className="rounded-md border border-slate-800 bg-slate-900/80 px-3 py-2"
                                        >
                                            <div className="text-[11px] text-slate-400 mb-1">
                                                {e.time}
                                            </div>
                                            <div className="text-sm whitespace-pre-wrap">
                                                {e.text}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                </section>
            </main>
        </div>
    );
};

export default DocsPage;
