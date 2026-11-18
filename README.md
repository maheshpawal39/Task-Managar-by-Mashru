# Tempo — Task Manager

A calm, premium-looking task manager built with React, Vite, and Lucide icons. All UI and styles live in a single component file: `src/TaskManager.jsx`.

## Run it

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`).

To build for production:

```bash
npm run build
npm run preview
```

## Features

- Dashboard with today's date, total/completed/pending counts, and completion progress
- Create, edit, complete, and delete tasks (with undo)
- Task titles, descriptions, due dates, and high/medium/low priorities
- All, Today, Upcoming, and Completed views
- Live search, priority filter, and sorting by due date, priority, or newest
- Tasks persist in LocalStorage under `tempo.tasks.v1`
- Responsive layout with a slide-out sidebar on mobile
- Keyboard shortcuts: `/` to search, `N` for a new task, `Esc` to close

A few realistic starter tasks are seeded on first launch so the dashboard feels alive. Delete them and add your own, or clear the `tempo.tasks.v1` LocalStorage key to reset.
