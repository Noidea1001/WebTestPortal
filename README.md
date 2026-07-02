# WebTestPortal

A web-based test and quiz platform built with **ASP.NET Core** and a static HTML frontend. Admins can create and manage tests; students can take them and see their results.

---

## 1. What Is This Project?

**WebTestPortal** is a full-stack web application that works like an online exam system. Think of it like a simplified version of Google Forms for quizzes, but with user accounts, roles, and a results dashboard.

- **Admins** log in and create tests with multiple-choice questions.
- **Students** log in, take available tests, and see their scores and answer review.
- Everything runs in your web browser — no extra app needed.

The backend is an **ASP.NET Core Web API** (.NET 10). The frontend is plain **HTML + JavaScript** files served as static files. The database is **SQLite** — a single file, no database server required.

---

## 2. Features

### Admin
- Create, edit, and delete tests
- Add single-choice and multiple-choice questions with optional images
- Set a time limit, max attempts, and shuffle options per test
- Publish or unpublish tests (students only see published ones)
- View all student submissions and scores
- Create and manage student accounts

### Student
- Browse available (published) tests
- Take a test with a live timer, auto-save, and a question navigator
- Flag questions for review before submitting
- Submit and immediately see a detailed result page with score, grade, and per-question breakdown
- View test history

### General
- Cookie-based authentication (no tokens to manage)
- Role-based access (Admin and Student)
- Swagger UI for API exploration (development only)
- SQLite database — zero configuration

---

## 3. Project Structure

```
WebTestPortalAPI/
│
├── Controllers/
│   └── Api/                   ← All REST API endpoints
│       ├── AuthController.cs       (login, logout, me)
│       ├── TestsController.cs      (tests and questions CRUD)
│       ├── AttemptsController.cs   (start, autosave, submit, result)
│       ├── UsersController.cs      (admin user management)
│       └── AdminReportsController.cs (admin results view)
│
├── Models/                    ← Database entities
│   ├── User.cs
│   ├── Test.cs
│   ├── Question.cs
│   ├── AnswerOption.cs
│   └── TestAttempt.cs
│
├── DTOs/                      ← Data shapes sent to/from the API
├── Services/                  ← Business logic
├── Repositories/              ← Database access
├── Data/                      ← AppDbContext (EF Core)
├── Extensions/                ← DbInitializer (seeds admin account)
│
├── wwwroot/                   ← All frontend files (served as static)
│   ├── index.html                  (redirects to login)
│   ├── login.html
│   ├── profile.html
│   ├── admin/                      (Admin pages)
│   │   ├── dashboard.html
│   │   ├── tests.html
│   │   ├── edit-test.html
│   │   ├── add-question.html
│   │   ├── edit-question.html
│   │   ├── users.html
│   │   └── results.html
│   ├── student/                    (Student pages)
│   │   ├── dashboard.html
│   │   ├── available-tests.html
│   │   ├── take-test.html
│   │   ├── submit-confirm.html
│   │   ├── result.html
│   │   └── history.html
│   ├── js/                         (JavaScript files, one per page)
│   └── css/
│       └── site.css
│
├── appsettings.json           ← App config (DB connection, seed admin)
├── Program.cs                 ← App startup
└── WebTestPortal.csproj       ← .NET project file
```

---

## 4. What You Need Before Starting

Install these tools first. They are all free.

### 1. .NET 10 SDK

This is the framework that runs the backend code.

- Go to: https://dotnet.microsoft.com/download/dotnet/10.0
- Download the **.NET 10 SDK** for your operating system (Windows / Mac / Linux)
- After installing, open a terminal and check it works:

```bash
dotnet --version
```

You should see something like `10.0.x`.

### 2. A Code Editor (Optional but Recommended)

- **Visual Studio Code** — free, works on all systems: https://code.visualstudio.com
- **Visual Studio 2022** (Windows only) — heavier but has more built-in tools: https://visualstudio.microsoft.com

### 3. A Web Browser

Any modern browser works — Chrome, Edge, Firefox, or Safari.

> **Note:** You do NOT need Node.js, a database server, or any other tool. SQLite is built in.

---

## 5. Installation & Setup

### Step 1 — Download the project

If you received a `.zip` file, extract it to a folder on your computer. For example:

```
C:\Projects\WebTestPortalAPI\    (Windows)
~/Projects/WebTestPortalAPI/     (Mac / Linux)
```

### Step 2 — Open a terminal in the project folder

Open your terminal (Command Prompt, PowerShell, or Terminal) and navigate into the project folder:

```bash
cd path/to/WebTestPortalAPI
```

You should see files like `WebTestPortal.csproj` and `Program.cs` in this folder.

### Step 3 — Restore packages

This downloads all the libraries the project needs. Run:

```bash
dotnet restore
```

You will see output like "Restored WebTestPortal.csproj". This is normal.

### Step 4 — Build the project

Check that the project compiles without errors:

```bash
dotnet build
```

If it says `Build succeeded`, you are ready to run.

> If you see errors, see [Common Problems & Fixes](#12-common-problems--fixes).

---

## 6. How to Run the Project

Run this command inside the project folder:

```bash
dotnet run
```

### To stop the server

Press `Ctrl + C` in the terminal.

### Running in Development Mode

Development mode enables the Swagger API explorer and shows more error details:

```bash
dotnet run --environment Development
```

Then visit `http://localhost:5168/swagger` to see and test all API endpoints.

---

## 7. Default Login Accounts

When the project runs for the first time, it automatically creates an **Admin** account using the settings in `appsettings.json`.

| Role    | Username | Password   |
|---------|----------|------------|
| Admin   | `admin`  | `Admin123!` |

> There are no default student accounts. The admin must create them manually (see the Admin Guide below).

---

## 8. How to Use – Admin Guide

Log in with the admin account. You will land on the **Admin Dashboard**.

### Creating a Test

1. Click **Tests** in the left sidebar.
2. Click the **New Test** button (top right).
3. Fill in the test title and description.
4. Set options:
   - **Time limit** — how many minutes students have (leave empty for no limit)
   - **Max attempts** — how many times a student can retake the test
   - **Shuffle questions** — randomize question order for each attempt
   - **Shuffle options** — randomize answer order
   - **Allow review** — whether students can see correct answers after submitting
5. Click **Create Test**.

### Adding Questions

1. From the Tests list, click the **Edit** button on a test.
2. Scroll down to the **Questions** section and click **Add Question**.
3. Fill in the question text and select the type:
   - **Single choice** — student picks one answer (radio buttons)
   - **Multiple choice** — student picks one or more answers (checkboxes)
4. Add at least two answer options. Check the box next to the correct answer(s).
5. Optionally set a **weight** (how many points this question is worth).
6. Click **Save Question**.

### Editing or Deleting a Question

1. From the test editor, click **Edit** next to a question.
2. Make your changes and click **Save Changes**.
3. To delete, click the **Delete Question** button (top right of the edit page).

> Questions cannot be edited after a student has already answered them (they are locked to protect existing results).

### Publishing a Test

Tests start as **Draft** and are invisible to students. When your test is ready:

1. Open the test editor.
2. Click the **Publish** button.

Students will immediately see it in their Available Tests list.

### Managing Users

1. Click **Users** in the sidebar.
2. Click **Create User** to make a new student account.
3. You can also edit, reset passwords for, or delete existing users.

### Viewing Results

1. Click **Results** in the sidebar.
2. You can see all submissions, filter by test or student, and view individual attempt details.

---

## 9. How to Use – Student Guide

A student account must be created by an admin before you can log in.

### Taking a Test

1. Log in and you will land on the **Student Dashboard**.
2. Click **Available Tests** in the sidebar.
3. Find a test and click **Start Test**.
4. Read each question and select your answer(s).
5. Use the **Question Navigator** panel on the right to jump between questions.
6. Click the **flag icon** on any question to mark it for review later.
7. When done, click **Review & Submit** (bottom of the page or sidebar).

### The Submit Confirmation Page

Before finalising, you will see a summary showing:
- How many questions you answered
- How many are unanswered or flagged
- A map of all questions so you can jump back to any one

Click **Submit Exam** to confirm. This cannot be undone.

### Viewing Your Result

After submitting you are taken to your **Result Page**, which shows:
- Your score percentage with an animated ring
- A letter grade (A / B / C / D / F)
- Pass or Fail status
- A breakdown: correct, incorrect, skipped, points, and time taken
- A full question-by-question review (if the admin enabled it)

You can also click **History** in the sidebar to see all your past attempts.

---

## 10. API Reference

All API endpoints are under `/api/`. The key ones are:

| Method | Endpoint | What it does |
|--------|----------|--------------|
| `POST` | `/api/auth/login` | Log in |
| `POST` | `/api/auth/logout` | Log out |
| `GET`  | `/api/auth/me` | Get current logged-in user |
| `GET`  | `/api/tests` | List all tests (admin sees all, students see published) |
| `POST` | `/api/tests` | Create a new test (admin only) |
| `PUT`  | `/api/tests/{id}` | Update test details (admin only) |
| `POST` | `/api/tests/{id}/publish` | Publish or unpublish a test (admin only) |
| `POST` | `/api/tests/{testId}/questions` | Add a question to a test |
| `PUT`  | `/api/tests/{testId}/questions/{questionId}` | Edit a question |
| `DELETE` | `/api/tests/{testId}/questions/{questionId}` | Delete a question |
| `POST` | `/api/tests/{testId}/attempts` | Start a new attempt (student) |
| `POST` | `/api/attempts/{id}/autosave` | Save answers in progress |
| `POST` | `/api/attempts/{id}/submit` | Submit the attempt |
| `GET`  | `/api/attempts/{id}/result` | Get the result for a completed attempt |
| `GET`  | `/api/users` | List all users (admin only) |
| `POST` | `/api/users` | Create a new user (admin only) |

When running in **Development** mode, visit `/swagger` to see every endpoint with full request/response details and test them interactively.

---

## 11. Changing the Admin Password

### Option A — Change it in the app

1. Log in as admin.
2. Click your name or avatar at the bottom of the sidebar.
3. Go to **Profile** and change your password there.

### Option B — Change the seed password (before first run)

Open `appsettings.json` and edit the `SeedAdmin` section:

```json
"SeedAdmin": {
  "Username": "Admin",
  "Email": "admin@gmail.com",
  "Password": "Admin123!",
  "FullName": "Portal Administrator"
}
```

> This only takes effect the **first time** you run the app (before the database is created). If the database already exists, use Option A instead.

Password rules: at least 8 characters, one uppercase letter, one number, one special character (e.g. `!`, `@`, `#`).

---

## 12. Common Problems & Fixes

### "dotnet: command not found"

You have not installed the .NET SDK yet, or it was not added to your system PATH.

- Re-run the .NET installer from https://dotnet.microsoft.com/download/dotnet/10.0
- Restart your terminal after installing

---

### "Build failed" errors mentioning missing packages

Run the restore command again:

```bash
dotnet restore
```

---

### The app starts but the browser shows "This site can't be reached"

- Make sure you are using the exact address shown in the terminal, including the port number.
- Example: if the terminal says `Now listening on: http://localhost:5089`, open `http://localhost:5089` — not port 5168.

---

### "Access Denied" page after logging in

Your account might not have the right role, or the session cookie did not save.

- Try logging out and back in.
- Make sure cookies are enabled in your browser.
- If you see a blank page or redirect loop, clear your browser cookies for `localhost`.

---

### Login fails with the default admin account

The database may already exist from a previous run with different seed settings.

- Delete the file `webtestportal.db` in the project folder.
- Run `dotnet run` again — the database and admin account will be recreated.

> **Warning:** Deleting the database removes all tests, users, and results.

---

### Images on questions are not showing

Uploaded images are stored in `wwwroot/uploads/`. If you moved the project to a different folder or machine, this folder must be present and the files inside it must be copied over too.

---

## Tech Stack (For Reference)

| Layer | Technology |
|-------|-----------|
| Backend | ASP.NET Core 10 Web API |
| ORM | Entity Framework Core 10 |
| Database | SQLite |
| Auth | ASP.NET Core Identity (cookie-based) |
| Frontend | Plain HTML5, Bootstrap 5.3, Vanilla JavaScript |
| Icons | Bootstrap Icons |
| Charts | Chart.js (dashboard) |
| API Docs | Swagger / Swashbuckle |

---

*WebTestPortal — Built with ASP.NET Core 10*
