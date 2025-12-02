// app/test-todo/TestPage.tsx (혹은 app/test-todo/page.tsx 에서 사용)
"use client";

import Todo from "./components/Todo/Todo";

export default function TestPage() {
    const today = new Date().toISOString().slice(0, 10);
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
            <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                <h1 className="text-xl font-semibold">Cogno · Todo Prototype</h1>
                <span className="text-xs text-slate-400">
                    Single click = actions · Double click = edit
                </span>
            </header>

            <main className="flex-1 flex items-start justify-center p-6">
                <Todo date={today} />
            </main>
        </div>
    );
}
