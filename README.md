# Kanban App

A modern, accessible, and secure Kanban board application built with **Next.js**, **TypeScript**, **Supabase**, **Tailwind CSS**, and **TanStack Query**.

The project focuses on real-world frontend architecture, authentication, role-based permissions, optimistic UI updates, realtime synchronization, accessibility, and database-level security.

## ✨ Features

* 🔐 **Authentication**

  * Email/password sign in and registration
  * Protected routes
  * Session persistence
  * Secure sign-out flow
  * Password reset flow

* 📋 **Kanban Boards**

  * Create, rename, and delete boards
  * Create, rename, and delete columns
  * Create and manage cards
  * Persistent board state
  * Responsive board interface

* 🖱️ **Drag & Drop**

  * Reorder cards within columns
  * Move cards between columns
  * Reorder columns
  * Keyboard-accessible card movement
  * Permission-aware drag controls

* 👥 **Board Sharing**

  * Invite users to boards
  * `Editor` and `Viewer` roles
  * Role-aware UI controls
  * Viewers can access shared boards without edit permissions
  * Editors can modify board content without being able to delete the board

* ⚡ **Realtime Collaboration**

  * Realtime card updates
  * Realtime column updates
  * Multi-user board synchronization
  * Automatic recovery and resynchronization after reconnects
  * Reload fallback for data consistency

* 🔒 **Security**

  * Supabase Row Level Security (RLS)
  * Database-level ownership checks
  * Role-based access control
  * Secure database functions with `SECURITY DEFINER`
  * Protected board, column, and card operations
  * Foreign-key constraints and cascade handling
  * RPC-based protected operations

* ♿ **Accessibility**

  * Semantic HTML
  * Accessible interactive controls
  * Keyboard navigation
  * Accessible dialogs and forms
  * Automated accessibility testing

* 📱 **Responsive UI**

  * Desktop and mobile layouts
  * RTL-first Persian interface
  * Consistent design tokens
  * Custom self-hosted **Pinar** font

## 🛠️ Tech Stack

### Frontend

* **Next.js 16**
* **React 19**
* **TypeScript**
* **Tailwind CSS v4**
* **Zustand**
* **TanStack React Query**
* **dnd-kit**

### Backend & Data

* **Supabase**
* **PostgreSQL**
* **Supabase Auth**
* **Supabase Realtime**
* **Row Level Security (RLS)**

### Testing

* **Vitest**
* **Testing Library**
* **Playwright**
* **axe-core**
* **PGlite**

## 🏗️ Architecture

The application uses a layered frontend architecture designed to keep UI, state management, data access, and domain logic separated.

```text
app/
├── board/
├── boards/
├── login/
├── register/
├── account/
├── privacy/
└── terms/

components/
├── board/
├── auth/
├── dialogs/
├── legal/
└── ui/

hooks/
├── useBoardRealtime.ts
└── useCurrentUser.ts

lib/
├── board/
├── errors/
├── supabase/
└── ...

store/
└── ...

e2e/
├── auth.spec.ts
├── board-crud.spec.ts
├── dnd.spec.ts
├── realtime.spec.ts
└── sharing.spec.ts

tests/
├── security/
└── ...
```

### Data Flow

```text
UI
 ↓
React Query / Zustand
 ↓
Domain & Data Access
 ↓
Supabase
 ↓
PostgreSQL + RLS
```

Realtime changes are synchronized back into the client cache so multiple users can work on the same board without manually refreshing the page.

## 🔐 Authorization Model

Authorization is enforced at the database level rather than relying only on frontend controls.

### Board Owner

The board owner can:

* Manage the board
* Manage columns
* Manage cards
* Invite other users
* Manage shared access

### Editor

An editor can:

* View the shared board
* Create and modify cards
* Modify columns
* Reorder board content

An editor cannot:

* Delete the board

### Viewer

A viewer can:

* View the shared board
* View its columns and cards

A viewer cannot:

* Create or modify cards
* Modify columns
* Reorder content
* Access editing controls

The UI reflects these permissions, while PostgreSQL RLS provides the actual security boundary.

## 🧪 Testing

The project includes several levels of automated testing.

### Unit & Component Tests

```bash
npm test
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Database Tests

```bash
npm run test:db
```

### Security Tests

```bash
npm run test:security
```

### Security Smoke Test

```bash
npm run test:security:smoke
```

### End-to-End Tests

```bash
npm run test:e2e
```

### Production Build

```bash
npm run build
```

## ✅ QA Status

The project has been validated through the complete QA pipeline.

| Test Suite             |              Result |
| ---------------------- | ------------------: |
| TypeScript             |              ✅ PASS |
| ESLint                 |              ✅ PASS |
| Unit / Component Tests |         ✅ 172 / 172 |
| Database Tests         |           ✅ 34 / 34 |
| Security Tests         | ✅ 158 PASS / 0 FAIL |
| Security Smoke         |              ✅ PASS |
| Realtime E2E           |             ✅ 2 / 2 |
| Full E2E               |           ✅ 20 / 20 |
| Production Build       |              ✅ PASS |

The E2E suite covers authentication, CRUD operations, drag & drop, permissions, realtime synchronization, and board sharing.

## 🎨 Typography

The application uses **Pinar** as its primary UI font.

Font files are self-hosted under:

```text
public/font/
```

Available weights:

```text
400
500
700
800
```

The font is declared through `@font-face` in:

```text
app/globals.css
```

and exposed through the project's `--font-sans` design token.

## 🚀 Getting Started

### Prerequisites

* Node.js
* npm
* A Supabase project

### Installation

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd kanban-app
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### Production

Create an optimized production build:

```bash
npm run build
```

Then start the production server:

```bash
npm run start
```

## 📜 Legal Pages

The application includes dedicated:

* Privacy Policy
* Terms of Service

pages with automated coverage for their accessibility and rendering behavior.

## 📌 Project Goals

This project was built to demonstrate practical frontend engineering beyond basic UI implementation.

Key engineering goals include:

* Maintainable component architecture
* Type-safe development with TypeScript
* Server-backed authorization
* Secure database access
* Realtime collaboration
* Optimistic UI patterns
* Accessible interaction design
* Reliable automated testing
* Production-ready build validation

## 📄 License

This project is intended as a portfolio and learning project.
