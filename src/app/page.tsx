"use client";

import { useEffect, useState } from "react";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

type Filter = "all" | "active" | "completed";

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = window.localStorage.getItem("todos");
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  // Save to localStorage whenever todos change
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  const addTodo = () => {
    const text = input.trim();
    if (!text) return;
    setTodos((prev) => [
      { id: Date.now(), text, completed: false },
      ...prev,
    ]);
    setInput("");
  };

  const toggleTodo = (id: number) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: number) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  const clearCompleted = () => {
    setTodos((prev) => prev.filter((todo) => !todo.completed));
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === "active") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });

  const remainingCount = todos.filter((t) => !t.completed).length;

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      addTodo();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 flex items-center justify-center px-4 py-10">
      <main className="w-full max-w-xl rounded-2xl bg-white shadow-lg border border-zinc-200 p-6 sm:p-8">
        <header className="mb-6 flex items-baseline justify-between gap-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900">
            To‑Do List
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500">
            {remainingCount === 0
              ? "All done! ✅"
              : `${remainingCount} task${remainingCount === 1 ? "" : "s"} left`}
          </p>
        </header>

        {/* Input */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm sm:text-base outline-none ring-2 ring-transparent focus:border-zinc-400 focus:ring-zinc-200"
            placeholder="What do you need to do?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={addTodo}
            className="rounded-lg bg-zinc-900 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white shadow-sm hover:bg-zinc-800 active:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!input.trim()}
          >
            Add
          </button>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="inline-flex rounded-full bg-zinc-100 p-1 text-xs sm:text-sm">
            {(["all", "active", "completed"] as Filter[]).map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-full px-3 py-1 capitalize transition-colors ${
                  filter === value
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {value}
              </button>
            ))}
          </div>

          <button
            onClick={clearCompleted}
            className="text-xs sm:text-sm text-red-500 hover:text-red-600 disabled:text-zinc-300 disabled:cursor-not-allowed"
            disabled={!todos.some((t) => t.completed)}
          >
            Clear completed
          </button>
        </div>

        {/* List */}
        {filteredTodos.length === 0 ? (
          <p className="mt-6 text-center text-sm text-zinc-400">
            No tasks here yet. Add something above to get started.
          </p>
        ) : (
          <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {filteredTodos.map((todo) => (
              <li
                key={todo.id}
                className="group flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm hover:bg-zinc-100"
              >
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border text-[10px] transition-colors ${
                    todo.completed
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-zinc-300 bg-white text-transparent group-hover:border-zinc-400"
                  }`}
                  aria-label={
                    todo.completed ? "Mark as not completed" : "Mark as completed"
                  }
                >
                  ✓
                </button>
                <span
                  className={`flex-1 text-sm break-words ${
                    todo.completed
                      ? "text-zinc-400 line-through"
                      : "text-zinc-800"
                  }`}
                >
                  {todo.text}
                </span>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs text-zinc-400 hover:bg-red-50 hover:text-red-500"
                  aria-label="Delete task"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
