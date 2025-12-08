// src/HomePage.tsx
import KakaoLoginButton from "./components/KakaoLoginButton";
import Todo from "./components/Todo/Todo";
import { useAuth } from "./hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
    const user = useAuth();
    const navigate = useNavigate();

    const API_BASE = import.meta.env.VITE_API_URL;
    const LOGOUT_URL = `${API_BASE}/logout`;

    const today = new Date().toISOString().slice(0, 10);


    // 1) 로딩 상태
    if (!user) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
                <div className="w-full max-w-md bg-slate-900/90 border border-slate-700/70 rounded-2xl px-6 py-5 shadow-2xl">
                    <h1 className="text-2xl font-semibold tracking-tight">Cogno</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        생각을 기록하고 타임라인으로 정리하는 공간이에요.
                    </p>
                    <div className="mt-6 text-sm text-slate-400">로그인 상태 확인 중...</div>
                </div>
            </div>
        );
    }

    // 2) 비로그인 상태
    if (!user.authenticated) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
                <div className="w-full max-w-md bg-slate-900/90 border border-slate-700/70 rounded-2xl px-6 py-5 shadow-2xl">
                    <h1 className="text-2xl font-semibold tracking-tight">Cogno</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        시작하려면 카카오 로그인이 필요해요.
                    </p>

                    <div className="mt-8 flex flex-col items-center gap-3">
                        <KakaoLoginButton />
                        <p className="text-xs text-slate-500">
                            로그인 후에 타임라인과 대시보드를 사용할 수 있어요.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // 3) 로그인 완료 상태: 대시보드
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            {/* 상단 바 */}
            <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-baseline gap-3">
                        <span className="text-lg font-semibold tracking-tight">Cogno</span>
                        <span className="text-xs text-slate-500">Dashboard</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-300">
                            {user.nickname ?? "사용자"}님
                        </span>
                        <a
                            href={LOGOUT_URL}
                            className="text-xs text-slate-300 border border-slate-600 rounded-full px-3 py-1 hover:bg-slate-800 hover:border-slate-400 transition-colors"
                        >
                            로그아웃
                        </a>
                    </div>
                </div>
            </header>

            {/* 메인 */}
            <main className="max-w-5xl mx-auto px-4 py-6">
                {/* 인사 / 요약 */}
                <section>
                    <h2 className="text-xl font-semibold">
                        안녕하세요,{" "}
                        <span className="text-sky-400">{user.nickname ?? "사용자"}</span>님
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                        오늘의 생각과 작업들을 한눈에 모아볼 수 있어요.
                    </p>
                </section>

                {/* 카드 그리드 */}
                <section className="mt-6 grid gap-4 md:grid-cols-3">
                    {/* 카드 1: 오늘 타임라인 */}
                    <div className="col-span-1 md:col-span-2 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                        <h3 className="text-sm font-semibold text-slate-100">
                            오늘의 타임라인
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                            오늘 기록된 블록들이 없으면 타임라인에서 새로 시작해볼 수 있어요.
                        </p>
                        <button
                            onClick={() => navigate("/timeline")}
                            className="mt-4 inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-medium bg-sky-500 text-white hover:bg-sky-400 transition-colors"
                        >
                            타임라인 열기
                        </button>
                    </div>

                    {/* 카드 2: 더미 - 오늘 할 일 */}
                    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                        <h3 className="text-sm font-semibold text-slate-100">
                            오늘 할 일 (더미)
                        </h3>
                        <ul className="mt-2 space-y-1 text-xs text-slate-400">
                            <li>• TASK START로 공부 세션 시작</li>
                            <li>• React 타임라인 UI 다듬기</li>
                            <li>• AWS 배포 플로우 메모</li>
                        </ul>
                    </div>

                    {/* 카드 3: 더미 - 최근 메모 */}
                    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                        <h3 className="text-sm font-semibold text-slate-100">
                            Test Page
                        </h3>
                        <button
                            onClick={() => navigate("/test")}
                            className="mt-4 inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-medium bg-sky-500 text-white hover:bg-sky-400 transition-colors"
                        >
                            Test Page
                        </button>
                    </div>

                    {/* 카드 4: 타임라인 카드 (한 번 더 강조) */}
                    <div className="col-span-1 md:col-span-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <Todo date={today}/>
                    </div>
                </section>
            </main>
        </div>
    );
}
