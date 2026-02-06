"use client";

import { useEffect, useMemo, useState } from "react";

type Priority = "low" | "medium" | "high";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  /** ISO date string, e.g. 2026-02-05 */
  date: string;
  /** ISO timestamp */
  createdAt: string;
  priority: Priority;
  notes?: string;
}

type Filter = "all" | "active" | "completed";

function getTodayISODate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`; // YYYY-MM-DD in local time
}

function formatDisplayDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function addDays(base: string, offset: number) {
  const [y, m, d] = base.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function priorityLabel(priority: Priority) {
  if (priority === "high") return "High";
  if (priority === "medium") return "Medium";
  return "Low";
}

function priorityClasses(priority: Priority) {
  switch (priority) {
    case "high":
      return "bg-rose-50 text-rose-600 border-rose-200";
    case "medium":
      return "bg-amber-50 text-amber-600 border-amber-200";
    case "low":
    default:
      return "bg-emerald-50 text-emerald-600 border-emerald-200";
  }
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = window.localStorage.getItem("todos-by-date-v3");
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  });

  const [input, setInput] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedDate, setSelectedDate] = useState<string>(getTodayISODate);
  const [today] = useState<string>(getTodayISODate);

  // Save to localStorage whenever todos change
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("todos-by-date-v3", JSON.stringify(todos));
  }, [todos]);

  const addTodo = () => {
    const text = input.trim();
    if (!text) return;
    const now = new Date();
    const isoDate = selectedDate || getTodayISODate();

    setTodos((prev) => [
      {
        id: now.getTime(),
        text,
        completed: false,
        date: isoDate,
        createdAt: now.toISOString(),
        priority,
        notes: notes.trim() || undefined,
      },
      ...prev,
    ]);
    setInput("");
    setNotes("");
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

  const remainingCount = useMemo(
    () => todos.filter((t) => t.date === selectedDate && !t.completed).length,
    [todos, selectedDate]
  );

  const groupedByDate = useMemo(() => {
    const map = new Map<string, Todo[]>();
    for (const todo of todos) {
      const arr = map.get(todo.date) ?? [];
      arr.push(todo);
      map.set(todo.date, arr);
    }
    // Sort dates descending (newest first)
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [todos]);

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      addTodo();
    }
  };

  const quickDates = [
    { label: "Today", value: today },
    { label: "Tomorrow", value: addDays(today, 1) },
    { label: "+1 Week", value: addDays(today, 7) },
  ];

  const weekStrip = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-violet-100 to-pink-100 text-slate-900 flex items-center justify-center px-4 py-10">
      <main className="w-full max-w-5xl space-y-6">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 drop-shadow-sm">
              Daily To‑Do Planner
            </h1>
            <p className="mt-1 text-base text-slate-600 max-w-md">
              Plan by day, set priority, and add notes. Each date gets its own
              card so you can see your week at a glance.
            </p>
          </div>

          {/* Date controls */}
          <div className="flex flex-col gap-3">
            {/* Quick chips */}
            <div className="flex flex-wrap gap-2 justify-end">
              {quickDates.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setSelectedDate(d.value)}
                  className={`rounded-full border px-3 py-1 text-xs sm:text-sm transition-colors backdrop-blur ${
                    selectedDate === d.value
                      ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                      : "bg-white/80 text-slate-700 border-slate-200 hover:bg-sky-50"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Date picker + label */}
            <div className="rounded-2xl bg-white/80 backdrop-blur border border-white/60 px-4 py-3 shadow-sm flex flex-col text-sm text-slate-700">
              <span className="font-medium">Selected day</span>
              <span className="text-xs text-slate-500 mb-1">
                {formatDisplayDate(selectedDate)}
              </span>
              <input
                type="date"
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none ring-2 ring-transparent focus:border-sky-400 focus:ring-sky-100"
                value={selectedDate}
                onChange={(e) =>
                  setSelectedDate(e.target.value || getTodayISODate())
                }
              />
            </div>
          </div>
        </header>

        {/* Week strip */}
        <section className="rounded-2xl bg-white/80 backdrop-blur border border-white/70 shadow-sm px-3 py-2 flex items-center gap-2 overflow-x-auto text-sm">
          {weekStrip.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDate(d)}
              className={`flex flex-col items-center px-2.5 py-1.5 rounded-xl border min-w-[62px] transition-colors ${
                selectedDate === d
                  ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                  : "bg-white/80 text-slate-700 border-slate-200 hover:bg-sky-50"
              }`}
            >
              <span className="text-[10px] uppercase tracking-wide">
                {formatDisplayDate(d).split(",")[0]}
              </span>
              <span className="text-xs font-semibold">
                {formatDisplayDate(d).split(" ")[1]} {formatDisplayDate(d).split(" ")[2]}
              </span>
            </button>
          ))}
        </section>

        {/* Input + filters card */}
        <section className="rounded-2xl bg-white/90 backdrop-blur border border-white/80 shadow-lg p-4 sm:p-5 flex flex-col gap-4">
          {/* Inputs row */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base outline-none ring-2 ring-transparent focus:border-sky-400 focus:ring-sky-100"
                  placeholder="What do you need to do on this day?"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  onClick={addTodo}
                  className="rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white shadow-sm hover:from-sky-600 hover:to-violet-600 active:from-sky-700 active:to-violet-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={!input.trim()}
                >
                  Add
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Priority:</span>
                {["low", "medium", "high"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p as Priority)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] capitalize transition-colors ${
                      priority === p
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              className="min-h-[60px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm outline-none ring-2 ring-transparent focus:border-sky-400 focus:ring-sky-100 resize-y"
              placeholder="Optional notes or details for this task (e.g. where, who, links)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Filters + summary */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs sm:text-sm">
              {(["all", "active", "completed"] as Filter[]).map((value) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`rounded-full px-3 py-1 capitalize transition-colors ${
                    filter === value
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <p className="text-xs sm:text-sm text-slate-500">
                {remainingCount === 0
                  ? "All done for this day! ✅"
                  : `${remainingCount} task${
                      remainingCount === 1 ? "" : "s"
                    } left for this day`}
              </p>
              <button
                onClick={clearCompleted}
                className="text-xs sm:text-sm text-rose-500 hover:text-rose-600 disabled:text-slate-300 disabled:cursor-not-allowed"
                disabled={!todos.some((t) => t.completed)}
              >
                Clear completed
              </button>
            </div>
          </div>
        </section>

        {/* Date cards */}
        {groupedByDate.length === 0 ? (
          <p className="mt-4 text-center text-sm text-slate-600">
            No tasks yet. Pick a date above, add a task, and your first day
            card will appear here.
          </p>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groupedByDate.map(([date, items]) => {
              const isSelected = date === selectedDate;
              const completedCount = items.filter((t) => t.completed).length;
              const total = items.length;

              return (
                <article
                  key={date}
                  className={`group relative flex flex-col rounded-2xl border bg-white/90 backdrop-blur p-4 shadow-sm transition-transform transition-colors hover:-translate-y-0.5 hover:shadow-md ${
                    isSelected
                      ? "border-sky-400/70 ring-2 ring-sky-200/80"
                      : "border-white/80"
                  }`}
                >
                  <header className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <button
                        type="button"
                        onClick={() => setSelectedDate(date)}
                        className="text-left"
                      >
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          {date}
                        </p>
                        <p className="text-sm font-medium text-slate-900">
                          {formatDisplayDate(date)}
                        </p>
                      </button>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>
                        {completedCount}/{total} done
                      </p>
                    </div>
                  </header>

                  <ul className="space-y-1.5 max-h-64 overflow-y-auto pr-1 text-sm">
                    {items
                      .slice()
                      .sort((a, b) =>
                        a.createdAt < b.createdAt ? 1 : -1
                      )
                      .map((todo) => (
                        <li
                          key={todo.id}
                          className="group/item flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 hover:bg-slate-50"
                        >
                          <button
                            onClick={() => toggleTodo(todo.id)}
                            className={`mt-1 flex h-5 w-5 flex-none items-center justify-center rounded-full border text-[10px] transition-colors ${
                              todo.completed
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-slate-300 bg-white text-transparent group-hover/item:border-slate-400"
                            }`}
                            aria-label={
                              todo.completed
                                ? "Mark as not completed"
                                : "Mark as completed"
                            }
                          >
                            ✓
                          </button>
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className={`truncate text-sm ${
                                  todo.completed
                                    ? "text-slate-400 line-through"
                                    : "text-slate-800"
                                }`}
                              >
                                {todo.text}
                              </p>
                              <span
                                className={`ml-2 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${priorityClasses(
                                  todo.priority
                                )}`}
                              >
                                {priorityLabel(todo.priority)}
                              </span>
                            </div>
                            {todo.notes && (
                              <p className="text-[11px] text-slate-500 line-clamp-2">
                                {todo.notes}
                              </p>
                            )}
                            <p className="text-[10px] text-slate-400">
                              Added at{" "}
                              {new Date(todo.createdAt).toLocaleTimeString(
                                undefined,
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteTodo(todo.id)}
                            className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                            aria-label="Delete task"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                  </ul>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
