"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Priority = "low" | "medium" | "high";

type Filter = "all" | "active" | "completed";

interface TodoRow {
  id: string;
  user_id: string;
  date: string;
  text: string;
  completed: boolean;
  created_at: string;
  priority: Priority;
  notes: string | null;
}

type Todo = TodoRow;

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
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [loadingTodos, setLoadingTodos] = useState(false);

  const [input, setInput] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedDate, setSelectedDate] = useState<string>(getTodayISODate);
  const [today] = useState<string>(getTodayISODate);

  // --- Auth setup ---
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setSessionUserId(data.user.id);
      }
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setSessionUserId(session.user.id);
        } else {
          setSessionUserId(null);
          setTodos([]);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // --- Load todos from Supabase when logged in ---
  useEffect(() => {
    const loadTodos = async () => {
      if (!sessionUserId) return;
      setLoadingTodos(true);
      const { data, error } = await supabase
        .from("todos")
        .select("id, user_id, date, text, completed, created_at, priority, notes")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading todos", error.message);
      } else if (data) {
        setTodos(data as Todo[]);
      }
      setLoadingTodos(false);
    };

    loadTodos();
  }, [sessionUserId]);

  // --- Auth actions ---
  const handleSendMagicLink = async () => {
    if (!authEmail.trim()) return;
    setAuthLoading(true);
    setAuthMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail.trim(),
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    if (error) {
      setAuthMessage(error.message);
    } else {
      setAuthMessage("Magic link sent! Check your email to sign in.");
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setTodos([]);
  };

  // --- Local helpers ---
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

  // --- CRUD actions wired to Supabase ---
  const addTodo = async () => {
    if (!sessionUserId) {
      setAuthMessage("Please sign in first to save tasks in the cloud.");
      return;
    }
    const text = input.trim();
    if (!text) return;

    const isoDate = selectedDate || getTodayISODate();
    const payload = {
      user_id: sessionUserId,
      text,
      date: isoDate,
      completed: false,
      priority,
      notes: notes.trim() || null,
    };

    const { data, error } = await supabase
      .from("todos")
      .insert(payload)
      .select("id, user_id, date, text, completed, created_at, priority, notes")
      .single();

    if (error) {
      console.error("Error adding todo", error.message);
      setAuthMessage("Could not save task. Try again.");
      return;
    }

    setTodos((prev) => [data as Todo, ...prev]);
    setInput("");
    setNotes("");
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    const { data, error } = await supabase
      .from("todos")
      .update({ completed: !completed })
      .eq("id", id)
      .select("id, user_id, date, text, completed, created_at, priority, notes")
      .single();

    if (error) {
      console.error("Error toggling todo", error.message);
      return;
    }

    setTodos((prev) => prev.map((t) => (t.id === id ? (data as Todo) : t)));
  };

  const deleteTodo = async (id: string) => {
    const prev = todos;
    setTodos((cur) => cur.filter((t) => t.id !== id));
    const { error } = await supabase.from("todos").delete().eq("id", id);
    if (error) {
      console.error("Error deleting todo", error.message);
      setTodos(prev); // rollback on error
    }
  };

  const clearCompleted = async () => {
    const completedIds = todos.filter((t) => t.completed).map((t) => t.id);
    if (!completedIds.length) return;
    const prev = todos;
    setTodos((cur) => cur.filter((t) => !t.completed));
    const { error } = await supabase
      .from("todos")
      .delete()
      .in("id", completedIds);
    if (error) {
      console.error("Error clearing completed", error.message);
      setTodos(prev);
    }
  };

  // --- UI ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-violet-100 to-pink-100 text-slate-900 flex items-center justify-center px-4 py-10">
      <main className="w-full max-w-5xl space-y-6">
        {/* Auth bar */}
        <section className="rounded-2xl bg-white/80 backdrop-blur border border-white/70 shadow-sm px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          {sessionUserId ? (
            <>
              <div className="text-slate-700 text-sm">
                <span className="font-medium">Signed in</span>
                <span className="ml-2 text-xs text-slate-500">
                  Your tasks are synced to the cloud.
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <div className="flex-1 flex flex-col gap-1">
                <p className="text-sm font-medium text-slate-800">
                  Sign in with your email
                </p>
                <p className="text-xs text-slate-500">
                  We9ll send you a magic link. Use the same email on any device
                  to see your tasks.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full sm:w-56 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none ring-2 ring-transparent focus:border-sky-400 focus:ring-sky-100"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleSendMagicLink}
                  disabled={authLoading || !authEmail.trim()}
                  className="rounded-full bg-sky-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {authLoading ? "Sending..." : "Send magic link"}
                </button>
              </div>
            </>
          )}
        </section>

        {authMessage && (
          <p className="text-xs text-slate-600 bg-white/70 border border-slate-200 rounded-xl px-3 py-2">
            {authMessage}
          </p>
        )}

        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 drop-shadow-sm">
              Daily ToDo Planner
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
                  disabled={!sessionUserId}
                />
                <button
                  onClick={addTodo}
                  className="rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white shadow-sm hover:from-sky-600 hover:to-violet-600 active:from-sky-700 active:to-violet-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={!input.trim() || !sessionUserId}
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
              className="min-h-[60px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-2 ring-transparent focus:border-sky-400 focus:ring-sky-100 resize-y"
              placeholder="Optional notes or details for this task (e.g. where, who, links)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!sessionUserId}
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
                {loadingTodos
                  ? "Loading your tasks..."
                  : remainingCount === 0
                  ? "All done for this day! ✅"
                  : `${remainingCount} task${
                      remainingCount === 1 ? "" : "s"
                    } left for this day`}
              </p>
              <button
                onClick={clearCompleted}
                className="text-xs sm:text-sm text-rose-500 hover:text-rose-600 disabled:text-slate-300 disabled:cursor-not-allowed"
                disabled={!todos.some((t) => t.completed) || !sessionUserId}
              >
                Clear completed
              </button>
            </div>
          </div>
        </section>

        {/* Date cards */}
        {groupedByDate.length === 0 ? (
          <p className="mt-4 text-center text-base text-slate-600">
            {sessionUserId
              ? "No tasks yet. Pick a date above, add a task, and your first day card will appear here."
              : "Sign in with your email above to start creating cloud-synced tasks."}
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
                        a.created_at < b.created_at ? 1 : -1
                      )
                      .map((todo) => (
                        <li
                          key={todo.id}
                          className="group/item flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 hover:bg-slate-50"
                        >
                          <button
                            onClick={() => toggleTodo(todo.id, todo.completed)}
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
                              {new Date(todo.created_at).toLocaleTimeString(
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
