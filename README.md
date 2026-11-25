# AIML Department Student Academic Management System

**Official Academic Record & Performance Management Platform**

---

## 1. Project Overview

The **AIML Department Student Academic Management System** is a full-stack, enterprise-grade educational portal engineered for the **Department of Artificial Intelligence and Machine Learning (AIML)** at **DVR & Dr. HS MIC College of Technology**.

Designed for an operational capacity of **400–1,000+ students**, the platform streamlines:
- Comprehensive student and faculty academic management
- Multi-tier assessment evaluation (Mid-Term Exams, Semester Finals, Lab Practicals, Internal Assessments)
- Automated CGPA calculation and grade tabulation
- Fast bulk marks entry via CSV/Excel
- Departmental analytics and executive intelligence for the Head of the Department (HOD)
- Personalized student academic records and transcript generation

---

## 2. Institutional Information

- **Institution:** DVR & Dr. HS MIC College of Technology
- **Department:** Department of Artificial Intelligence and Machine Learning
- **Department Abbreviation:** AIML
- **Logo Configuration:** The official college logo is reserved at `client/public/assets/branding/college-logo.png` (provided separately by the project owner).

---

## 3. Technology Stack

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (with Glassmorphism and Claymorphism specifications)
- **Routing:** React Router DOM (v6)
- **Icons:** Lucide React
- **Hosting Target:** Vercel

### Backend
- **Runtime:** Node.js (v20+)
- **Framework:** Express.js
- **Security & Utilities:** Helmet, CORS, Morgan, Dotenv
- **Hosting Target:** Render

### Database & Authentication
- **Database:** Supabase PostgreSQL with Row-Level Security (RLS)
- **Authentication:** Supabase Auth (Role-based access: HOD, Faculty, Student)
- **Storage:** Supabase Storage (Transcripts, reports, official documents)

---

## 4. Project Directory Structure

```
aiml-department-portal/
|
|-- client/                            # React + Vite Frontend
|   |-- public/
|   |   |-- assets/
|   |       |-- branding/             # Dedicated official college logo directory
|   |-- src/
|   |   |-- assets/                   # Static media, icons
|   |   |-- components/               # Reusable UI components
|   |   |-- config/                   # Centralized branding and app config
|   |   |-- context/                  # React state providers (Auth, Theme)
|   |   |-- hooks/                    # Custom React hooks
|   |   |-- layouts/                  # Portal layouts (HOD, Student, Public)
|   |   |-- pages/                    # Route views
|   |   |-- services/                 # API & Supabase client integration
|   |   |-- styles/                   # Tailwind and global CSS
|   |   |-- utils/                    # Formatting & calculation utilities
|   |   |-- App.jsx                   # Main application root
|   |   |-- main.jsx                  # Entry point
|   |-- .env.example                  # Frontend environment placeholder
|   |-- package.json
|   |-- tailwind.config.js
|   |-- vite.config.js
|
|-- server/                            # Node.js + Express API Backend
|   |-- src/
|   |   |-- config/                   # Server environment config
|   |   |-- controllers/              # Request handlers & logic
|   |   |-- middleware/               # Auth, validation, error handlers
|   |   |-- routes/                   # API endpoint definitions
|   |   |-- services/                 # Database & external business services
|   |   |-- utils/                    # Helper functions
|   |   |-- validators/               # Input validation schemas
|   |   |-- app.js                    # Express app configuration
|   |   |-- server.js                 # Server entry point & listener
|   |-- .env.example                  # Backend environment placeholder
|   |-- package.json
|
|-- database/                          # Supabase PostgreSQL Definitions
|   |-- migrations/                   # Schema migrations
|   |-- policies/                     # Row Level Security (RLS) policies
|   |-- seed/                         # Master regulation & grading seed data
|
|-- docs/                              # Project Documentation
|   |-- architecture.md               # Technical architecture
|   |-- branding.md                   # Brand identity standards
|   |-- design-system.md              # Theme & UI color palettes (HOD & Student)
|
|-- .gitignore                         # Strict repository exclusions
|-- package.json                       # Root workspace orchestrator
|-- README.md                          # Project documentation
```

---

## 5. Future Design System Specifications

### HOD Theme (Administrative Interface)
- **Sage Fog (60%)** – Primary canvas tone
- **Claret Wine (30%)** – Structural panels, sidebars, headers
- **Tangerine Flash (10%)** – Accent buttons, status badges (`#FF6B1A`)
- **Interaction:** Dynamic cursor spotlight effect

### Student Theme (Student Portal)
- **Almond Milk (60%)** – Primary background tone
- **Dusty Teal (30%)** – Subject cards, navigation panels
- **Cherry Soda (10%)** – Highlights, CTAs, notifications (`#E8213A`)
- **Interaction:** Spotlight and spring-physics bounce animations

*Note: Colors between the two palettes are strictly segregated.*

---

## 6. Installation & Setup Instructions

### Prerequisites
- Node.js (v18.0.0 or higher recommended; v24+ supported)
- npm (v9.0.0 or higher)

### 1. Install Dependencies
Install all root, client, and server dependencies with a single command:
```bash
npm run install:all
```
Or install each individually:
```bash
# Root
npm install

# Client
cd client && npm install && cd ..

# Server
cd server && npm install && cd ..
```

---

## 7. Environment Variables Configuration

Copy the example environment files:

### Frontend (`client/.env`)
```bash
cp client/.env.example client/.env
```
Fill in the parameters:
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
```

### Backend (`server/.env`)
```bash
cp server/.env.example server/.env
```
Fill in the parameters:
```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SECRET_KEY=<your-secret-service-role-key>
```

> **Security Rule:** Real credentials, database passwords, and `.env` files must NEVER be committed to Git. All environment files are strictly gitignored.

---

## 8. Development Commands

| Command | Description |
|---|---|
| `npm run dev` | Runs both Express backend and Vite frontend concurrently |
| `npm run dev:client` | Starts Vite React frontend on `http://localhost:5173` |
| `npm run dev:server` | Starts Express API server on `http://localhost:5000` |
| `npm run build:client` | Builds production-ready client bundle to `client/dist` |
| `npm run start:server` | Runs the production backend Express server |

---

## 9. Backend Health Check Verification

The backend exposes a health endpoint:
```http
GET /api/health
```

**Expected JSON Response:**
```json
{
  "status": "healthy",
  "service": "AIML Department Student Academic Management System API",
  "institution": "DVR & Dr. HS MIC College of Technology",
  "department": "Artificial Intelligence and Machine Learning (AIML)",
  "timestamp": "2026-11-25T07:33:00.000Z",
  "uptime": 12.34
}
```

The Vite frontend automatically proxies `/api` requests to the Express server during local development.

---

## 10. Future Development Phases

- **Phase 0:** Foundation and Initialization *(Completed)*
- **Phase 1:** Supabase Database Schema, RLS Policies & Master Migrations
- **Phase 2:** Authentication System (HOD, Faculty, Student Auth & Role Guarding)
- **Phase 3:** HOD Administrative Dashboard & Analytics Engine
- **Phase 4:** Faculty Marks Management, Grading Matrix & Excel/CSV Parser
- **Phase 5:** Student Academic Portal, Marksheet Viewer & Transcript Export
- **Phase 6:** End-to-End Testing, Security Audits, and Production Deployment (Vercel & Render)
