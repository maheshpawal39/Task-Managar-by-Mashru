import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Inbox,
  ListTodo,
  Menu,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Sun,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";

const STORAGE_KEY = "tempo.tasks.v1";

const PRIORITIES = [
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

const PRIORITY_WEIGHT = { high: 0, medium: 1, low: 2 };
const PRIORITY_LABEL = { high: "High", medium: "Medium", low: "Low" };

const NAV_ITEMS = [
  { id: "all", label: "All tasks", icon: ListTodo },
  { id: "today", label: "Today", icon: Sun },
  { id: "upcoming", label: "Upcoming", icon: CalendarDays },
  { id: "completed", label: "Completed", icon: CheckCircle2 },
];

const CATEGORY_TITLES = {
  all: "All tasks",
  today: "Due today",
  upcoming: "Upcoming",
  completed: "Completed",
};

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateWithOffset(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function dayDifference(first, second) {
  const [firstYear, firstMonth, firstDay] = first.split("-").map(Number);
  const [secondYear, secondMonth, secondDay] = second.split("-").map(Number);
  const firstUtc = Date.UTC(firstYear, firstMonth - 1, firstDay);
  const secondUtc = Date.UTC(secondYear, secondMonth - 1, secondDay);
  return Math.round((firstUtc - secondUtc) / 86400000);
}

function getDueMeta(dueDate, today) {
  if (!dueDate) return { label: "No due date", state: "none" };
  if (dueDate === today) return { label: "Due today", state: "today" };

  const difference = dayDifference(dueDate, today);
  const [year, month, day] = dueDate.split("-").map(Number);
  const currentYear = new Date().getFullYear();
  const formatted = new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(year !== currentYear ? { year: "numeric" } : {}),
  });

  if (difference === 1) return { label: "Tomorrow", state: "upcoming" };
  if (difference < 0) return { label: `Overdue · ${formatted}`, state: "overdue" };
  return { label: formatted, state: "upcoming" };
}

function compareDueDates(first, second) {
  if (first.dueDate && second.dueDate) {
    return first.dueDate.localeCompare(second.dueDate);
  }
  if (first.dueDate) return -1;
  if (second.dueDate) return 1;
  return 0;
}

function normalizeTask(task) {
  const title = typeof task?.title === "string" ? task.title.trim() : "";
  const dueDate =
    typeof task?.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)
      ? task.dueDate
      : "";
  return {
    id: typeof task?.id === "string" && task.id ? task.id : makeId(),
    title,
    description: typeof task?.description === "string" ? task.description : "",
    dueDate,
    priority: PRIORITY_WEIGHT[task?.priority] !== undefined ? task.priority : "medium",
    completed: Boolean(task?.completed),
    createdAt: Number.isFinite(task?.createdAt) ? task.createdAt : Date.now(),
  };
}

function buildSeedTasks() {
  const now = Date.now();
  return [
    {
      id: makeId(),
      title: "Finalize the Q4 product roadmap",
      description:
        "Align priorities with design and engineering leads before Friday's review.",
      dueDate: dateKey(),
      priority: "high",
      completed: false,
      createdAt: now - 1000 * 60 * 90,
    },
    {
      id: makeId(),
      title: "Polish the onboarding flow",
      description: "Refine empty states and microcopy for the first-run experience.",
      dueDate: dateWithOffset(2),
      priority: "medium",
      completed: false,
      createdAt: now - 1000 * 60 * 60 * 3,
    },
    {
      id: makeId(),
      title: "Review weekly analytics",
      description:
        "Check activation and retention numbers, then flag anything unusual.",
      dueDate: dateWithOffset(-2),
      priority: "high",
      completed: false,
      createdAt: now - 1000 * 60 * 60 * 6,
    },
    {
      id: makeId(),
      title: "Send the weekly team update",
      description: "Share progress, blockers, and next week's focus with the team.",
      dueDate: dateKey(),
      priority: "low",
      completed: true,
      createdAt: now - 1000 * 60 * 60 * 9,
    },
    {
      id: makeId(),
      title: "Book two customer interviews",
      description: "Schedule 30 minutes with two new beta users.",
      dueDate: dateWithOffset(4),
      priority: "low",
      completed: false,
      createdAt: now - 1000 * 60 * 60 * 12,
    },
    {
      id: makeId(),
      title: "Update the portfolio case study",
      description: "Rewrite the intro and add the latest product shots.",
      dueDate: dateWithOffset(-3),
      priority: "medium",
      completed: true,
      createdAt: now - 1000 * 60 * 60 * 20,
    },
  ];
}

function loadTasks() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeTask).filter((task) => task.title);
      }
    }
  } catch {
    // Fall back to the starter set when storage is unavailable or corrupt.
  }
  return buildSeedTasks();
}

function makeForm() {
  return { title: "", description: "", dueDate: dateKey(), priority: "medium" };
}

export default function TaskManager() {
  const [tasks, setTasks] = useState(loadTasks);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [sortBy, setSortBy] = useState("dueDate");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState(makeForm);
  const [formError, setFormError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const searchRef = useRef(null);

  const today = dateKey();
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const fullDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const pending = total - completed;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
  const pendingToday = tasks.filter(
    (task) => !task.completed && task.dueDate === today
  ).length;

  const counts = {
    all: total,
    today: pendingToday,
    upcoming: tasks.filter(
      (task) => !task.completed && task.dueDate && task.dueDate > today
    ).length,
    completed,
  };

  const visibleTasks = useMemo(() => {
    const term = search.trim().toLowerCase();

    const list = tasks.filter((task) => {
      if (
        term &&
        !`${task.title} ${task.description}`.toLowerCase().includes(term)
      ) {
        return false;
      }
      if (priority !== "all" && task.priority !== priority) return false;
      if (category === "today") return !task.completed && task.dueDate === today;
      if (category === "upcoming") {
        return !task.completed && Boolean(task.dueDate) && task.dueDate > today;
      }
      if (category === "completed") return task.completed;
      return true;
    });

    return [...list].sort((first, second) => {
      if (category !== "completed") {
        const completionOrder =
          Number(first.completed) - Number(second.completed);
        if (completionOrder !== 0) return completionOrder;
      }
      if (sortBy === "newest") {
        return (second.createdAt || 0) - (first.createdAt || 0);
      }
      if (sortBy === "priority") {
        const byPriority =
          PRIORITY_WEIGHT[first.priority] - PRIORITY_WEIGHT[second.priority];
        if (byPriority !== 0) return byPriority;
        return compareDueDates(first, second);
      }
      return (
        compareDueDates(first, second) ||
        PRIORITY_WEIGHT[first.priority] - PRIORITY_WEIGHT[second.priority] ||
        (second.createdAt || 0) - (first.createdAt || 0)
      );
    });
  }, [tasks, search, priority, category, sortBy, today]);

  const isFiltering = search.trim().length > 0 || priority !== "all";

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // Storage can be unavailable (private mode); the app still works in memory.
    }
  }, [tasks]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(
      () => setToast(null),
      toast.undo ? 5200 : 2800
    );
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modalOpen]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setModalOpen(false);
        setEditingTask(null);
        setFormError("");
        setSidebarOpen(false);
        return;
      }

      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target;
      const isTyping =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if (isTyping || modalOpen) return;

      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setEditingTask(null);
        setForm(makeForm());
        setFormError("");
        setModalOpen(true);
        setSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen]);

  const showToast = (message, undo = null) => {
    setToast({ id: Date.now(), message, undo });
  };

  const openCreate = () => {
    setEditingTask(null);
    setForm(makeForm());
    setFormError("");
    setModalOpen(true);
    setSidebarOpen(false);
  };

  const openEdit = (task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      priority: task.priority,
    });
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTask(null);
    setFormError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) {
      setFormError("Please give your task a title.");
      return;
    }

    const details = {
      title,
      description: form.description.trim(),
      dueDate: form.dueDate,
      priority: form.priority,
    };

    if (editingTask) {
      setTasks((previous) =>
        previous.map((task) =>
          task.id === editingTask.id ? { ...task, ...details } : task
        )
      );
      showToast("Task updated");
    } else {
      setTasks((previous) => [
        {
          id: makeId(),
          ...details,
          completed: false,
          createdAt: Date.now(),
        },
        ...previous,
      ]);
      showToast("Task created");
    }

    closeModal();
  };

  const toggleTask = (id) => {
    setTasks((previous) =>
      previous.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const handleDelete = (task) => {
    const index = tasks.findIndex((item) => item.id === task.id);
    if (index === -1) return;
    setTasks((previous) => previous.filter((item) => item.id !== task.id));
    setToast({
      id: Date.now(),
      message: "Task deleted",
      undo: { task, index },
    });
  };

  const handleUndo = () => {
    if (!toast?.undo) return;
    const { task, index } = toast.undo;
    setTasks((previous) => {
      if (previous.some((item) => item.id === task.id)) return previous;
      const next = [...previous];
      next.splice(Math.min(index, next.length), 0, task);
      return next;
    });
    showToast("Task restored");
  };

  const clearFilters = () => {
    setSearch("");
    setPriority("all");
  };

  let emptyTitle = "Your workspace is empty";
  let emptyText = "Add your first task and make today count.";
  let emptyAction = (
    <button type="button" className="btn-secondary" onClick={openCreate}>
      Add a task
    </button>
  );

  if (isFiltering) {
    emptyTitle = "No matching tasks";
    emptyText = "Try a different search or reset your filters to see everything again.";
    emptyAction = (
      <button type="button" className="btn-secondary" onClick={clearFilters}>
        Clear filters
      </button>
    );
  } else if (category === "completed") {
    emptyTitle = "Nothing completed yet";
    emptyText = "Tasks you check off will be collected here.";
    emptyAction = (
      <button
        type="button"
        className="btn-secondary"
        onClick={() => setCategory("all")}
      >
        View all tasks
      </button>
    );
  } else if (category === "today") {
    emptyTitle = "You're all clear for today";
    emptyText = "Nothing else is due today. A good moment to get ahead.";
  } else if (category === "upcoming") {
    emptyTitle = "No upcoming tasks";
    emptyText = "Your schedule is open. Plan ahead when you're ready.";
  }

  return (
    <>
      <style>{styles}</style>

      <div className="app">
        {sidebarOpen && (
          <button
            type="button"
            className="sidebar-scrim"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={`sidebar ${sidebarOpen ? "is-open" : ""}`}>
          <div className="brand-row">
            <div className="brand">
              <span className="brand-mark">
                <Check size={19} strokeWidth={2.8} />
              </span>
              <span className="brand-name">
                Tempo<span>.</span>
              </span>
            </div>
            <button
              type="button"
              className="icon-btn sidebar-close"
              aria-label="Close navigation"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          <p className="nav-label">Workspace</p>
          <nav className="nav" aria-label="Task categories">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`nav-item ${category === id ? "active" : ""}`}
                aria-current={category === id ? "page" : undefined}
                onClick={() => {
                  setCategory(id);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={18} strokeWidth={2} />
                <span className="nav-text">{label}</span>
                <span className="nav-count">{counts[id]}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-spacer" />

          <div className="saved-note">
            <span className="saved-dot" />
            Saved on this device
          </div>

          <div className="profile">
            <div className="avatar">M</div>
            <div className="profile-meta">
              <p>Mashru</p>
              <span>Personal workspace</span>
            </div>
          </div>
        </aside>

        <main className="main">
          <div className="main-inner">
            <header className="topbar">
              <div className="heading-wrap">
                <button
                  type="button"
                  className="icon-btn menu-btn"
                  aria-label="Open navigation"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu size={19} />
                </button>
                <div>
                  <p className="eyebrow">My workspace</p>
                  <h1>
                    {greeting}, Mashru
                  </h1>
                  <p className="subline">
                    <CalendarDays size={14} />
                    {fullDate}
                    <span className="sep">·</span>
                    {pendingToday === 0
                      ? "Nothing due today"
                      : `${pendingToday} task${pendingToday === 1 ? "" : "s"} due today`}
                  </p>
                </div>
              </div>

              <div className="topbar-actions">
                <div className="search">
                  <Search size={17} />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search tasks"
                    aria-label="Search tasks"
                  />
                  {search ? (
                    <button
                      type="button"
                      className="search-clear"
                      aria-label="Clear search"
                      onClick={() => setSearch("")}
                    >
                      <X size={14} />
                    </button>
                  ) : (
                    <kbd>/</kbd>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-primary add-task-btn"
                  aria-label="Add task"
                  onClick={openCreate}
                >
                  <Plus size={17} strokeWidth={2.5} />
                  <span>Add task</span>
                </button>
              </div>
            </header>

            <section className="stats" aria-label="Task overview">
              <article className="stat-card">
                <div className="stat-top">
                  <span className="stat-label">Total tasks</span>
                  <span className="stat-icon tint-indigo">
                    <ListTodo size={17} />
                  </span>
                </div>
                <p className="stat-value">{total}</p>
                <p className="stat-note">Across your workspace</p>
              </article>

              <article className="stat-card">
                <div className="stat-top">
                  <span className="stat-label">Completed</span>
                  <span className="stat-icon tint-emerald">
                    <CheckCircle2 size={17} />
                  </span>
                </div>
                <p className="stat-value">{completed}</p>
                <p className="stat-note">Done and dusted</p>
              </article>

              <article className="stat-card">
                <div className="stat-top">
                  <span className="stat-label">Pending</span>
                  <span className="stat-icon tint-amber">
                    <Clock3 size={17} />
                  </span>
                </div>
                <p className="stat-value">{pending}</p>
                <p className="stat-note">Left to finish</p>
              </article>

              <article className="stat-card stat-progress">
                <div className="stat-top">
                  <span className="stat-label">Progress</span>
                  <span className="stat-icon tint-violet">
                    <TrendingUp size={17} />
                  </span>
                </div>
                <div className="progress-head">
                  <p className="stat-value">{progress}%</p>
                  <span className="progress-caption">
                    {completed} of {total}
                  </span>
                </div>
                <div
                  className="progress-track"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                  aria-label="Task completion"
                >
                  <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </article>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div className="panel-title">
                  <h2>{CATEGORY_TITLES[category]}</h2>
                  <span className="count-pill">{visibleTasks.length}</span>
                </div>

                <div className="filters">
                  <label className="select-wrap">
                    <SlidersHorizontal size={14} />
                    <select
                      value={priority}
                      aria-label="Filter by priority"
                      onChange={(event) => setPriority(event.target.value)}
                    >
                      <option value="all">All priorities</option>
                      <option value="high">High priority</option>
                      <option value="medium">Medium priority</option>
                      <option value="low">Low priority</option>
                    </select>
                    <ChevronDown size={13} className="chev" />
                  </label>

                  <label className="select-wrap">
                    <ArrowUpDown size={14} />
                    <select
                      value={sortBy}
                      aria-label="Sort tasks"
                      onChange={(event) => setSortBy(event.target.value)}
                    >
                      <option value="dueDate">Due date</option>
                      <option value="priority">Priority</option>
                      <option value="newest">Newest</option>
                    </select>
                    <ChevronDown size={13} className="chev" />
                  </label>
                </div>
              </div>

              {visibleTasks.length > 0 ? (
                <ul className="task-list" aria-label="Tasks">
                  {visibleTasks.map((task) => {
                    const due = getDueMeta(task.dueDate, today);
                    const dueLabel =
                      task.completed && due.state === "overdue"
                        ? due.label.replace("Overdue · ", "")
                        : due.label;
                    return (
                      <li
                        key={task.id}
                        className={`task ${task.completed ? "is-completed" : ""}`}
                      >
                        <button
                          type="button"
                          className={`task-check ${
                            task.completed ? "is-done" : ""
                          }`}
                          aria-pressed={task.completed}
                          aria-label={
                            task.completed
                              ? `Mark "${task.title}" as pending`
                              : `Mark "${task.title}" as completed`
                          }
                          onClick={() => toggleTask(task.id)}
                        >
                          <Check size={12} strokeWidth={3.2} />
                        </button>

                        <div className="task-body">
                          <h3 className="task-title">{task.title}</h3>
                          {task.description && (
                            <p className="task-desc" title={task.description}>
                              {task.description}
                            </p>
                          )}
                          <div className="task-meta">
                            <span
                              className={`meta-date ${
                                !task.completed && due.state === "today"
                                  ? "is-today"
                                  : !task.completed && due.state === "overdue"
                                    ? "is-overdue"
                                    : ""
                              }`}
                            >
                              <Calendar size={12} />
                              {dueLabel}
                            </span>
                            <span
                              className={`priority-pill ${task.priority}`}
                            >
                              <span className="priority-dot" />
                              {PRIORITY_LABEL[task.priority]}
                            </span>
                          </div>
                        </div>

                        <div className="task-actions">
                          <button
                            type="button"
                            className="task-action"
                            aria-label={`Edit "${task.title}"`}
                            onClick={() => openEdit(task)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="task-action danger"
                            aria-label={`Delete "${task.title}"`}
                            onClick={() => handleDelete(task)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="empty">
                  <span className="empty-icon">
                    <Inbox size={22} />
                  </span>
                  <h3>{emptyTitle}</h3>
                  <p>{emptyText}</p>
                  {emptyAction}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {modalOpen && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-modal-title"
          >
            <div className="modal-head">
              <div>
                <p className="modal-kicker">
                  {editingTask ? "Update details" : "New task"}
                </p>
                <h2 id="task-modal-title">
                  {editingTask ? "Edit task" : "Create a task"}
                </h2>
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close dialog"
                onClick={closeModal}
              >
                <X size={17} />
              </button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit} noValidate>
              <div className={`field ${formError ? "has-error" : ""}`}>
                <label htmlFor="task-title">Task title</label>
                <input
                  id="task-title"
                  type="text"
                  autoFocus
                  maxLength={120}
                  placeholder="e.g. Finish the project proposal"
                  value={form.title}
                  onChange={(event) => {
                    setForm((previous) => ({
                      ...previous,
                      title: event.target.value,
                    }));
                    if (formError) setFormError("");
                  }}
                  aria-invalid={Boolean(formError)}
                  aria-describedby={formError ? "task-title-error" : undefined}
                />
                {formError && (
                  <p className="field-error" id="task-title-error">
                    {formError}
                  </p>
                )}
              </div>

              <div className="field">
                <label htmlFor="task-description">
                  Description <span className="optional">Optional</span>
                </label>
                <textarea
                  id="task-description"
                  maxLength={300}
                  placeholder="Add a little context or a next step..."
                  value={form.description}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-grid">
                <div className="field">
                  <label htmlFor="task-due">Due date</label>
                  <input
                    id="task-due"
                    type="date"
                    value={form.dueDate}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        dueDate: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="field">
                  <span className="field-label">Priority</span>
                  <div
                    className="priority-group"
                    role="group"
                    aria-label="Priority"
                  >
                    {PRIORITIES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`priority-choice ${item.id} ${
                          form.priority === item.id ? "active" : ""
                        }`}
                        aria-pressed={form.priority === item.id}
                        onClick={() =>
                          setForm((previous) => ({
                            ...previous,
                            priority: item.id,
                          }))
                        }
                      >
                        <span className="priority-dot" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingTask ? <Check size={16} /> : <Plus size={16} />}
                  {editingTask ? "Save changes" : "Create task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={16} />
          <span>{toast.message}</span>
          {toast.undo && (
            <button type="button" className="toast-undo" onClick={handleUndo}>
              Undo
            </button>
          )}
        </div>
      )}
    </>
  );
}

const styles = `
  :root {
    --bg: #f6f6fb;
    --surface: #ffffff;
    --ink: #1b1a25;
    --ink-soft: #5f5e70;
    --muted: #8d8c9d;
    --line: #ecebf3;
    --accent: #6c5ce7;
    --accent-strong: #5b4bd6;
    --accent-soft: #f0eeff;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  html {
    -webkit-text-size-adjust: 100%;
  }

  body {
    margin: 0;
    font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background:
      radial-gradient(1000px 460px at 102% -8%, rgba(124, 108, 248, 0.08), transparent 60%),
      var(--bg);
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  button, input, textarea, select {
    font: inherit;
  }

  button {
    cursor: pointer;
  }

  button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible {
    outline: 2px solid rgba(108, 92, 231, 0.55);
    outline-offset: 2px;
  }

  .app {
    display: flex;
    min-height: 100vh;
  }

  /* ---------- Sidebar ---------- */

  .sidebar {
    width: 276px;
    flex: 0 0 276px;
    position: sticky;
    top: 0;
    height: 100vh;
    padding: 26px 18px 20px;
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border-right: 1px solid var(--line);
    z-index: 60;
  }

  .brand-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 0 6px 27px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .brand-mark {
    width: 36px;
    height: 36px;
    border-radius: 11px;
    display: grid;
    place-items: center;
    color: #fff;
    background: linear-gradient(145deg, #8172f8, #5b4bd6);
    box-shadow: 0 8px 18px -8px rgba(91, 75, 214, 0.8);
  }

  .brand-name {
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--ink);
  }

  .brand-name span {
    color: var(--accent);
  }

  .nav-label {
    margin: 0 10px 8px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #a3a2b3;
  }

  .nav {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 11px;
    width: 100%;
    padding: 10px 12px;
    border-radius: 11px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--ink-soft);
    font-size: 13.5px;
    font-weight: 600;
    text-align: left;
    transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
  }

  .nav-item svg {
    color: #9695a6;
    flex: 0 0 auto;
    transition: color 0.18s ease;
  }

  .nav-text {
    flex: 1;
  }

  .nav-count {
    flex-shrink: 0;
    min-width: 22px;
    height: 20px;
    padding: 0 7px;
    border-radius: 7px;
    background: #f4f4f8;
    color: #8a899b;
    font-size: 11px;
    font-weight: 700;
    display: inline-grid;
    place-items: center;
  }

  .nav-item:hover {
    background: #f8f8fc;
    color: var(--ink);
  }

  .nav-item:hover svg {
    color: #6f6e80;
  }

  .nav-item.active {
    background: var(--accent-soft);
    border-color: #e4e0ff;
    color: var(--accent-strong);
  }

  .nav-item.active svg {
    color: var(--accent);
  }

  .nav-item.active .nav-count {
    background: #fff;
    color: var(--accent-strong);
    box-shadow: 0 1px 2px rgba(91, 75, 214, 0.08);
  }

  .sidebar-spacer {
    flex: 1;
  }

  .saved-note {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 0 8px 14px;
    font-size: 11.5px;
    font-weight: 500;
    color: #9a99aa;
  }

  .saved-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #34c38f;
    box-shadow: 0 0 0 3px rgba(52, 195, 143, 0.12);
  }

  .profile {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px;
    border-radius: 14px;
    background: #fafafd;
    border: 1px solid var(--line);
  }

  .avatar {
    width: 36px;
    height: 36px;
    flex: 0 0 auto;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: linear-gradient(145deg, #dcd6ff, #c3b8ff);
    color: #4a3cb8;
    font-size: 13px;
    font-weight: 800;
  }

  .profile-meta {
    min-width: 0;
  }

  .profile-meta p {
    margin: 0;
    font-size: 12.5px;
    font-weight: 700;
    color: var(--ink);
  }

  .profile-meta span {
    display: block;
    margin-top: 2px;
    font-size: 11px;
    color: #9291a2;
  }

  .icon-btn.sidebar-close {
    display: none;
  }

  .sidebar-scrim {
    display: none;
  }

  /* ---------- Main ---------- */

  .main {
    flex: 1;
    min-width: 0;
    padding: 34px clamp(20px, 3.6vw, 44px) 48px;
  }

  .main-inner {
    max-width: 1120px;
    margin: 0 auto;
  }

  .topbar {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 26px;
  }

  .heading-wrap {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    min-width: 0;
  }

  .eyebrow {
    margin: 0 0 5px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: #a09fb0;
  }

  h1 {
    margin: 0;
    font-size: clamp(22px, 2.4vw, 28px);
    line-height: 1.2;
    font-weight: 800;
    letter-spacing: -0.035em;
    color: var(--ink);
  }

  .subline {
    margin: 7px 0 0;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 12.5px;
    font-weight: 500;
    color: #88879a;
  }

  .subline svg {
    color: #a5a4b4;
  }

  .sep {
    color: #c9c8d4;
  }

  .topbar-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .search {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 42px;
    width: 236px;
    padding: 0 11px;
    border-radius: 11px;
    border: 1px solid #e9e8f1;
    background: #fff;
    box-shadow: 0 1px 2px rgba(23, 22, 31, 0.03);
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
  }

  .search:focus-within {
    border-color: #c9c2fa;
    box-shadow: 0 0 0 3.5px rgba(108, 92, 231, 0.1);
  }

  .search > svg {
    color: #a2a1b2;
    flex: 0 0 auto;
  }

  .search input {
    border: 0;
    outline: 0;
    background: transparent;
    width: 100%;
    min-width: 0;
    font-size: 13px;
    color: var(--ink);
  }

  .search input::placeholder {
    color: #a5a4b4;
  }

  .search kbd {
    border: 1px solid #e7e6ef;
    background: #fafafd;
    color: #a2a1b2;
    border-radius: 5px;
    font-size: 10.5px;
    font-family: inherit;
    padding: 1px 5px;
    line-height: 1.5;
  }

  .search-clear {
    border: 0;
    background: transparent;
    color: #a2a1b2;
    padding: 2px;
    display: grid;
    place-items: center;
    border-radius: 5px;
    flex: 0 0 auto;
  }

  .search-clear:hover {
    color: var(--ink);
    background: #f2f2f7;
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    height: 42px;
    padding: 0 17px;
    border: 0;
    border-radius: 11px;
    background: linear-gradient(135deg, #7465f4, #5b4bd6);
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: -0.01em;
    white-space: nowrap;
    box-shadow: 0 8px 18px -8px rgba(91, 75, 214, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.18);
    transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
  }

  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 22px -8px rgba(91, 75, 214, 0.8);
    filter: saturate(1.05);
  }

  .btn-primary:active {
    transform: translateY(0);
  }

  .icon-btn {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    display: inline-grid;
    place-items: center;
    border: 1px solid #e9e8f1;
    background: #fff;
    color: #777688;
    flex: 0 0 auto;
    transition: background 0.18s ease, color 0.18s ease;
  }

  .icon-btn:hover {
    background: #f7f7fb;
    color: var(--ink);
  }

  .menu-btn {
    display: none;
    margin-top: 3px;
  }

  /* ---------- Stats ---------- */

  .stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }

  .stat-card {
    position: relative;
    padding: 16px 17px 15px;
    background: var(--surface);
    border: 1px solid #edecf4;
    border-radius: 16px;
    box-shadow: 0 1px 2px rgba(23, 22, 31, 0.02), 0 10px 30px -22px rgba(23, 22, 31, 0.18);
    overflow: hidden;
  }

  .stat-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .stat-label {
    font-size: 12px;
    font-weight: 600;
    color: #858496;
  }

  .stat-icon {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
  }

  .tint-indigo {
    background: #eef0ff;
    color: #5e62d9;
  }

  .tint-emerald {
    background: #eaf8f2;
    color: #2c9c79;
  }

  .tint-amber {
    background: #fff6e8;
    color: #c08a32;
  }

  .tint-violet {
    background: #f2eeff;
    color: #7a5cd6;
  }

  .stat-value {
    margin: 11px 0 2px;
    font-size: 27px;
    line-height: 1;
    font-weight: 800;
    letter-spacing: -0.045em;
    color: var(--ink);
  }

  .stat-note {
    margin: 0;
    font-size: 11px;
    font-weight: 500;
    color: #a2a1b2;
  }

  .progress-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .progress-caption {
    font-size: 11px;
    font-weight: 600;
    color: #9b9aab;
    white-space: nowrap;
  }

  .progress-track {
    height: 6px;
    border-radius: 999px;
    background: #f0eff6;
    overflow: hidden;
    margin-top: 10px;
    margin-bottom: 6px;
  }

  .progress-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #7465f4, #9a86f8 60%, #6ca9ff);
    transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* ---------- Task panel ---------- */

  .panel {
    background: var(--surface);
    border: 1px solid #edecf4;
    border-radius: 18px;
    box-shadow: 0 1px 2px rgba(23, 22, 31, 0.02), 0 20px 50px -32px rgba(23, 22, 31, 0.22);
    overflow: hidden;
  }

  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 18px;
    border-bottom: 1px solid #f1f0f7;
    flex-wrap: wrap;
  }

  .panel-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .panel-title h2 {
    margin: 0;
    font-size: 15.5px;
    font-weight: 800;
    letter-spacing: -0.025em;
    color: var(--ink);
  }

  .count-pill {
    min-width: 22px;
    height: 21px;
    padding: 0 7px;
    border-radius: 7px;
    background: #f3f3f8;
    color: #858496;
    font-size: 11px;
    font-weight: 700;
    display: inline-grid;
    place-items: center;
  }

  .filters {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .select-wrap {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 24px 0 9px;
    border: 1px solid #e9e8f1;
    border-radius: 9px;
    background: #fbfbfd;
    color: #88879a;
    transition: border-color 0.18s ease, background 0.18s ease;
  }

  .select-wrap:hover {
    background: #fff;
    border-color: #ddd9ee;
  }

  .select-wrap:focus-within {
    border-color: #c9c2fa;
    background: #fff;
  }

  .select-wrap > svg:first-child {
    color: #9b9aab;
    flex: 0 0 auto;
  }

  .select-wrap .chev {
    position: absolute;
    right: 7px;
    pointer-events: none;
    color: #a3a2b3;
  }

  .select-wrap select {
    appearance: none;
    -webkit-appearance: none;
    border: 0;
    outline: 0;
    background: transparent;
    color: #5f5e70;
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    min-width: 0;
  }

  .task-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .task {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 18px;
    border-bottom: 1px solid #f4f3f8;
    background: transparent;
    transition: background 0.18s ease;
  }

  .task:last-child {
    border-bottom: 0;
  }

  .task:hover {
    background: #fbfbfe;
  }

  .task-check {
    flex: 0 0 auto;
    width: 20px;
    height: 20px;
    margin-top: 2px;
    padding: 0;
    border-radius: 50%;
    border: 1.5px solid #d5d4e2;
    background: #fff;
    color: #fff;
    display: grid;
    place-items: center;
    transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
  }

  .task-check:hover {
    border-color: #a99bf7;
    background: #f7f4ff;
  }

  .task-check svg {
    opacity: 0;
    transform: scale(0.6);
    transition: opacity 0.16s ease, transform 0.16s ease;
  }

  .task-check.is-done {
    background: linear-gradient(135deg, #7c6cf8, #5b4bd6);
    border-color: transparent;
    box-shadow: 0 4px 10px -5px rgba(91, 75, 214, 0.8);
  }

  .task-check.is-done svg {
    opacity: 1;
    transform: scale(1);
  }

  .task-body {
    flex: 1;
    min-width: 0;
  }

  .task-title {
    margin: 0;
    font-size: 13.5px;
    line-height: 1.4;
    font-weight: 600;
    letter-spacing: -0.012em;
    color: #24232e;
    overflow-wrap: anywhere;
  }

  .task.is-completed .task-title {
    color: #9a99aa;
    text-decoration: line-through;
    text-decoration-color: #c8c7d3;
  }

  .task-desc {
    margin: 3px 0 0;
    font-size: 12px;
    line-height: 1.5;
    color: #8d8c9d;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .task.is-completed .task-desc {
    color: #b2b1be;
  }

  .task.is-completed .task-meta {
    opacity: 0.72;
  }

  .task-meta {
    display: flex;
    align-items: center;
    gap: 7px;
    flex-wrap: wrap;
    margin-top: 7px;
  }

  .meta-date {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    color: #9392a3;
  }

  .meta-date svg {
    color: #aaa9b8;
    flex: 0 0 auto;
  }

  .meta-date.is-today {
    color: #6c5ce7;
  }

  .meta-date.is-today svg {
    color: #8b7cf6;
  }

  .meta-date.is-overdue {
    color: #c55353;
  }

  .meta-date.is-overdue svg {
    color: #d17a7a;
  }

  .priority-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 7px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.01em;
    border: 1px solid transparent;
  }

  .priority-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
    flex: 0 0 auto;
  }

  .priority-pill.high {
    color: #b84747;
    background: #fdf2f2;
    border-color: #f8e3e3;
  }

  .priority-pill.medium {
    color: #a56a1c;
    background: #fff7ea;
    border-color: #f8e9cf;
  }

  .priority-pill.low {
    color: #2f7d68;
    background: #eef9f5;
    border-color: #d8efe7;
  }

  .task-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 0 0 auto;
    opacity: 0;
    transform: translateX(2px);
    transition: opacity 0.18s ease, transform 0.18s ease;
  }

  .task:hover .task-actions,
  .task:focus-within .task-actions {
    opacity: 1;
    transform: none;
  }

  .task-action {
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: #a3a2b3;
    display: grid;
    place-items: center;
    transition: background 0.18s ease, color 0.18s ease;
  }

  .task-action:hover {
    background: #f1efff;
    color: var(--accent);
  }

  .task-action.danger:hover {
    background: #fdf0f0;
    color: #cf5555;
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 52px 24px 56px;
  }

  .empty-icon {
    width: 54px;
    height: 54px;
    border-radius: 16px;
    display: grid;
    place-items: center;
    background: linear-gradient(145deg, #f4f1ff, #eef4ff);
    color: #7c6cf8;
    border: 1px solid #e9e4ff;
    margin-bottom: 14px;
  }

  .empty h3 {
    margin: 0;
    font-size: 14.5px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--ink);
  }

  .empty p {
    margin: 6px 0 16px;
    max-width: 290px;
    font-size: 12.5px;
    line-height: 1.5;
    color: #9291a2;
  }

  .btn-secondary {
    height: 36px;
    padding: 0 13px;
    border-radius: 9px;
    border: 1px solid #e6e4f1;
    background: #fff;
    color: #5f5e70;
    font-size: 12px;
    font-weight: 600;
    transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
  }

  .btn-secondary:hover {
    background: #f7f5ff;
    border-color: #d9d2fb;
    color: var(--accent-strong);
  }

  /* ---------- Modal ---------- */

  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 120;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    overflow-y: auto;
    background: rgba(24, 23, 33, 0.38);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
    animation: fadeIn 0.18s ease;
  }

  .modal {
    width: min(490px, 100%);
    max-height: calc(100dvh - 40px);
    overflow-y: auto;
    margin: auto;
    background: #fff;
    border-radius: 22px;
    box-shadow: 0 30px 80px -24px rgba(23, 22, 31, 0.5);
    animation: modalIn 0.24s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .modal-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 22px 24px 0;
  }

  .modal-kicker {
    margin: 0 0 4px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #9b9aab;
  }

  .modal-head h2 {
    margin: 0;
    font-size: 19px;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--ink);
  }

  .modal-head .icon-btn {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    border: 0;
    background: #f6f5fa;
    color: #8b8a9b;
  }

  .modal-head .icon-btn:hover {
    background: #efedf7;
    color: var(--ink);
  }

  .modal-form {
    display: flex;
    flex-direction: column;
    gap: 15px;
    padding: 20px 24px 24px;
  }

  .field {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .field label,
  .field-label {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 6px;
    font-size: 11.5px;
    font-weight: 700;
    color: #5e5d6e;
  }

  .optional {
    font-size: 9.5px;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #aaa9b8;
  }

  .field input,
  .field textarea {
    width: 100%;
    border: 1px solid #e8e6f1;
    border-radius: 10px;
    background: #fafafd;
    padding: 10px 11px;
    font-size: 13px;
    color: var(--ink);
    transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
  }

  .field input {
    min-height: 39px;
  }

  .field textarea {
    min-height: 78px;
    resize: vertical;
    line-height: 1.55;
  }

  .field input::placeholder,
  .field textarea::placeholder {
    color: #adacbb;
  }

  .field input:focus,
  .field textarea:focus {
    outline: none;
    border-color: #c4bcfb;
    background: #fff;
    box-shadow: 0 0 0 3.5px rgba(108, 92, 231, 0.1);
  }

  .field input[type="date"] {
    color-scheme: light;
  }

  .field.has-error input {
    border-color: #e5a9a9;
    box-shadow: 0 0 0 3.5px rgba(207, 85, 85, 0.08);
  }

  .field-error {
    margin: 6px 0 0;
    font-size: 11px;
    font-weight: 500;
    color: #c24b4b;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 13px;
  }

  .priority-group {
    display: flex;
    gap: 3px;
    height: 39px;
    padding: 3px;
    border: 1px solid #e8e6f1;
    border-radius: 10px;
    background: #fafafd;
  }

  .priority-choice {
    flex: 1;
    min-width: 0;
    border: 1px solid transparent;
    border-radius: 7px;
    background: transparent;
    color: #8b8a9b;
    font-size: 10.5px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 0 3px;
    transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
  }

  .priority-choice .priority-dot {
    background: #c9c8d4;
  }

  .priority-choice.high .priority-dot {
    background: #d46a6a;
  }

  .priority-choice.medium .priority-dot {
    background: #d2a04b;
  }

  .priority-choice.low .priority-dot {
    background: #55a88f;
  }

  .priority-choice:hover {
    background: #f3f2f9;
    color: #5e5d6e;
  }

  .priority-choice.high.active {
    background: #fdf2f2;
    border-color: #f3d7d7;
    color: #b84747;
  }

  .priority-choice.medium.active {
    background: #fff7ea;
    border-color: #f4e3c7;
    color: #a56a1c;
  }

  .priority-choice.low.active {
    background: #eef9f5;
    border-color: #d6eee5;
    color: #2f7d68;
  }

  .priority-choice.active .priority-dot {
    background: currentColor;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
  }

  .btn-ghost {
    height: 40px;
    padding: 0 15px;
    border-radius: 10px;
    border: 1px solid #e8e6f1;
    background: #fff;
    color: #6f6e80;
    font-size: 12.5px;
    font-weight: 600;
    transition: background 0.18s ease, color 0.18s ease;
  }

  .btn-ghost:hover {
    background: #f7f6fb;
    color: var(--ink);
  }

  .modal-actions .btn-primary {
    height: 40px;
    font-size: 12.5px;
    padding: 0 15px;
  }

  /* ---------- Toast ---------- */

  .toast {
    position: fixed;
    left: 50%;
    bottom: 26px;
    transform: translateX(-50%);
    z-index: 200;
    display: flex;
    align-items: center;
    gap: 9px;
    max-width: calc(100vw - 32px);
    padding: 9px 10px 9px 13px;
    border-radius: 12px;
    background: #201f2a;
    color: #f7f6fb;
    font-size: 12.5px;
    font-weight: 600;
    box-shadow: 0 18px 40px -14px rgba(23, 22, 31, 0.55);
    animation: toastIn 0.26s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .toast > svg {
    color: #a99cfb;
    flex-shrink: 0;
  }

  .toast-undo {
    margin-left: 4px;
    padding: 5px 9px;
    border: 0;
    border-radius: 7px;
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    font-size: 11.5px;
    font-weight: 700;
    transition: background 0.18s ease;
  }

  .toast-undo:hover {
    background: rgba(255, 255, 255, 0.18);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes modalIn {
    from { opacity: 0; transform: translateY(12px) scale(0.98); }
    to { opacity: 1; transform: none; }
  }

  @keyframes toastIn {
    from { opacity: 0; transform: translate(-50%, 10px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }

  /* ---------- Responsive ---------- */

  @media (max-width: 1180px) {
    .stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 1080px) {
    .topbar {
      flex-wrap: wrap;
      align-items: flex-start;
    }

    .topbar-actions {
      width: 100%;
    }

    .search {
      width: auto;
      flex: 1;
    }
  }

  @media (max-width: 880px) {
    .app {
      display: block;
    }

    .sidebar {
      position: fixed;
      inset: 0 auto 0 0;
      width: 282px;
      height: 100dvh;
      flex-basis: 282px;
      transform: translateX(-104%);
      transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      border-right: 0;
      box-shadow: 30px 0 60px -30px rgba(23, 22, 31, 0.3);
      z-index: 90;
    }

    .sidebar.is-open {
      transform: none;
    }

    .icon-btn.sidebar-close {
      display: inline-grid;
      width: 32px;
      height: 32px;
      border: 0;
      background: #f6f5fa;
      color: #8b8a9b;
    }

    .sidebar-scrim {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 80;
      padding: 0;
      border: 0;
      background: rgba(23, 22, 31, 0.32);
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
      animation: fadeIn 0.2s ease;
    }

    .menu-btn {
      display: inline-grid;
    }

    .main {
      padding-top: 22px;
    }
  }

  @media (max-width: 660px) {
    .main {
      padding: 20px 16px 36px;
    }

    .topbar {
      gap: 16px;
      margin-bottom: 20px;
    }

    .search {
      height: 40px;
    }

    .btn-primary {
      height: 40px;
      padding: 0 14px;
    }

    .stats {
      gap: 10px;
      margin-bottom: 16px;
    }

    .stat-card {
      padding: 14px;
      border-radius: 14px;
    }

    .stat-value {
      font-size: 24px;
    }

    .panel-head {
      padding: 14px;
    }

    .filters {
      width: 100%;
    }

    .select-wrap {
      flex: 1;
      justify-content: flex-start;
    }

    .select-wrap select {
      width: 100%;
    }

    .task {
      gap: 10px;
      padding: 13px 14px;
    }

    .task-desc {
      -webkit-line-clamp: 2;
    }

    .task-actions {
      opacity: 1;
      transform: none;
      align-self: flex-start;
      margin-top: -2px;
    }

    .modal-head {
      padding: 20px 18px 0;
    }

    .modal-form {
      padding: 18px;
    }

    .form-grid {
      grid-template-columns: 1fr;
    }

    .empty {
      padding: 44px 20px 48px;
    }
  }

  @media (max-width: 420px) {
    .eyebrow {
      display: none;
    }

    h1 {
      font-size: 21px;
    }

    .subline {
      font-size: 11.5px;
    }

    .search kbd {
      display: none;
    }

    .stat-note {
      font-size: 10px;
    }

    .stat-value {
      font-size: 22px;
    }

    .task-actions {
      gap: 0;
    }

    .modal-actions {
      justify-content: stretch;
    }

    .modal-actions .btn-ghost,
    .modal-actions .btn-primary {
      flex: 1;
    }
  }

  @media (max-width: 360px) {
    .add-task-btn {
      width: 40px;
      padding: 0;
    }

    .add-task-btn span {
      display: none;
    }
  }

  @media (hover: none) {
    .task-actions {
      opacity: 1;
      transform: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
