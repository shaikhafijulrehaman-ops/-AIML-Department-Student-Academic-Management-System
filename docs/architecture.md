# System Architecture & Technical Specifications

**Institution:** DVR & Dr. HS MIC College of Technology  
**Department:** Department of Artificial Intelligence and Machine Learning (AIML)  
**System:** AIML Department Student Academic Management System  
**Target Capacity:** 400–1,000+ active students  

---

## 1. High-Level Architectural Flow

```
                      +---------------------------------------+
                      |               End Users               |
                      |   [HOD]     [Faculty]     [Student]   |
                      +-------------------+-------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |         Frontend (Vite + React)       |
                      |  - Role-based Layouts & Navigation    |
                      |  - Glassmorphic & Claymorphic UI      |
                      |  - Real-time Client Form Validation   |
                      +---------+-------------------+---------+
                                |                   |
                 Direct Auth /  |                   | Proxied REST Calls
                 Public Data    |                   | (/api/*)
                                v                   v
          +-----------------------------+    +-----------------------------+
          |     Supabase Auth & RLS     |    |   Express API (Node.js)     |
          | - JWT Token Verification    |    | - Business logic & audits   |
          | - Row-Level Security        |    | - Bulk marks calculation    |
          | - Isolated Student Scopes   |    | - Excel / CSV parsers       |
          +--------------+--------------+    +--------------+--------------+
                         |                                  |
                         +-----------------+----------------+
                                           |
                                           v
                      +---------------------------------------+
                      |     Supabase PostgreSQL Database      |
                      |  - Master Academic Schema             |
                      |  - Tabulation Registers & GPA Engine  |
                      |  - Transactional Audit Logs           |
                      +---------------------------------------+
```

---

## 2. Security Boundaries & Zero-Leakage Architecture

1. **Client Isolation**:
   - The React client only possesses the public publishable key (`VITE_SUPABASE_PUBLISHABLE_KEY`).
   - All database queries performed from the client adhere strictly to Supabase Row Level Security (RLS) policies.
   - Students cannot read or mutate records outside their authenticated student ID.

2. **Backend Service Layer**:
   - The Express backend handles administrative operations, complex marks aggregations, report generation, and system audits.
   - Communicates securely using `SUPABASE_SECRET_KEY` (service role).

3. **Credential Storage Protocol**:
   - No private keys, database passwords, or secret tokens are committed to source control.
   - All development configurations utilize `.env.example` templates.
