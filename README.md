# AURA — Personal AI Life OS

## System Overview
AURA is a user-owned Personal AI Life OS engineered to maintain structured personal context, typed memories, adaptive learning, goal tracking, and safe tool execution with human-in-the-loop verification.

> "AURA understands my context, remembers my journey, helps me learn and plan, performs approved work, verifies what it did, and stays with the same personal context across devices and future interfaces."

---

## Architecture Blueprint

```text
USER / DEVICE INPUT
         │
         ▼
  Context Gateway
         │
         ▼
Personal World Model
 ├── Memory Store (Typed Facts, Preferences, Episodes)
 ├── Goals & Commitments
 └── Knowledge Graph
         │
         ▼
 Reasoning & Planner
         │
         ▼
Role / Agent Selector (Care, Friend, Teacher, Coach, Researcher, Engineer, Planner)
         │
         ▼
Permission & Policy Engine (NIST Trust & Approval Boundaries)
         │
         ▼
 Tool / Agent Router
         │
         ▼
     Execution
         │
         ▼
   Verification (Validates evidence before completion)
         │
         ▼
Event Log & Memory Update
```

---

## Directory Structure

```text
aura-os/
├── config/              # Runtime environment & role profiles
├── docs/                # Architectural Decision Records (ADRs) & Specs
├── packages/
│   ├── core/            # Brain, Planner, Trust, Hands, Roles, Verification
│   ├── db/              # Typed Schemas (Memories, Goals, Audits)
│   └── server/          # API & Gateway Services
├── apps/
│   └── web/             # Command Center Dashboard
└── tests/               # Unit, Safety & Permission verification suites
```
