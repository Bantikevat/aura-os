# AURA — Personal AI Life OS
## Master Roadmap & Antigravity Build Specification

Version 1.0 — 30 September 2026

### Vision
Build one personal AI system that understands a person's context, remembers their journey, teaches, researches, plans, executes approved digital work, verifies results, and later extends to vision, wearables, smart environments and physical agents.

### Product principle
AURA is not just a chatbot and not just a 3D avatar. The product is the underlying personal context engine + memory + goals + agent orchestration + permissions + verification. The avatar is an interface.

## 1. Product definition
AURA is a user-owned Personal AI Life OS. Its job is to maintain a structured understanding of the user's goals, commitments, learning, projects, preferences, approved context and tools, then use that context to provide assistance and execute approved work.

**Core sentence:** “AURA understands my context, remembers my journey, helps me learn and plan, performs approved work, verifies what it did, and stays with the same personal context across devices and future interfaces.”

## 2. 2050 design horizon
2050 is a design horizon, not a guaranteed forecast. Current evidence already shows convergence around personal AI, multimodal interaction, computer-use agents, agent identity/authorization, and physical AI/robotics. Project Astra explores a universal assistant across phones and prototype glasses with screen/video understanding and cross-device memory; OpenAI documents computer-use agents; NIST is studying agent identity and authorization; NVIDIA is developing generalized robot foundation models; WHO projects 2.1 billion people aged 60+ by 2050.

## 3. Capability map
- Brain: memory, goals, context, reasoning, planning
- Teacher: adaptive learning, mistakes, revision
- Care: selected supportive style
- Hands: tools, APIs, browser, files, calendar, GitHub
- Trust: permissions, approvals, identity, audit, verification
- Automation: schedules, queues, background jobs
- Research: web/papers/patents, evidence and hypotheses
- Vision: screenshots/camera/video
- Voice: STT/TTS, interruption-aware conversation
- Embodiment: 3D avatar and expressions
- Multi-agent: specialist agents and delegation
- Physical AI: future IoT/robot adapters
- Local AI: on-device fallback where practical

## 4. Core architecture
```text
USER / DEVICE INPUT
        ↓
Context Gateway
        ↓
Personal World Model
 ├── Memory Store
 ├── Goals & Commitments
 ├── Knowledge Graph
 └── Current Context
        ↓
Reasoning + Planner
        ↓
Role / Agent Selector
        ↓
Permission & Policy Engine
        ↓
Tool / Agent Router
        ↓
Execution
        ↓
Verification
        ↓
Event Log + Memory Update
```

## 5. Personal memory & world model
Memory is typed, not just chat history. Store explicit facts, preferences, goals, commitments, project context, episodes, decisions and carefully scoped observations. Each memory should support provenance, confidence, lifecycle and user control.

## 6. Roles
- Care — calm, patient, practical, user-selected
- Friend — warm conversation with continuity
- Teacher — adaptive lessons and testing
- Coach — execution/accountability
- Researcher — evidence-driven investigation
- Engineer — repo inspection, coding, testing
- Planner — priorities and schedules

## 7. Goals and learning
```text
GOAL → Milestones → Skills/resources → Projects/practice
→ Daily actions → Evidence → Reflection → Plan adjustment
```

## 8. Tools and browser
Use typed tool contracts. Separate read-only, prepare, mutating and sensitive tools. Browser tasks must have domain limits, action budgets, approval boundaries and verification.

## 9. Multi-agent
```text
AURA Supervisor
 ├── Research Agent
 ├── Teacher Agent
 ├── Coding Agent
 ├── Browser Agent
 ├── Document Agent
 ├── Reminder Agent
 └── Verification Agent
```
Do not add many agents before a reliable single-agent tool loop works.

## 10. Permissions and verification
Sensitive actions require explicit approval. Delegation must never silently broaden the parent permission. Record actor, action, purpose, scope, result and verification evidence. NIST explicitly highlights agent identity/authorization, auditing and non-repudiation as emerging needs.

## 11. Voice, vision and avatar
Build progressively: voice first, then screen/camera context, then 3D avatar. Avatar is a presentation layer and should expose system state honestly.

## 12. Cross-device / local-cloud
Cloud should own canonical synchronized state. Devices are clients/adapters. Support local caches and local models where practical for resilience and privacy.

## 13. Data model
Initial domain entities: users, memories, memory_sources, goals, commitments, projects, decisions, tasks, automations, agent_runs, tool_permissions, approvals, verification_events, artifacts, audit_events.

## 14. UI/UX
The interface should feel like a premium command center, not a chat clone. Home should surface AURA state, today's priorities, goals, attention items, memory, projects and active automations. Dedicated centers: Memory, Automation, Learning, Research and Trust.

## 15. Learning by building
- Memory → PostgreSQL + retrieval
- Tool use → structured output + function calling
- Automation → webhooks + scheduler + Redis/BullMQ
- Browser → Playwright/computer-use patterns
- Agent graph → LangGraph or Google ADK
- Protocols → MCP/A2A concepts
- Voice → STT/TTS + streaming
- Vision → multimodal APIs
- Avatar → Three.js/WebGL + avatar stack
- Security → OAuth/RBAC/agent auth
- Production → Docker/logging/metrics/CI/CD

## 16. Phases
1. Discovery & scaffold
2. AURA Core MVP
3. Teacher + Care
4. Tools + Browser
5. Automation runtime
6. Planner + Multi-Agent
7. Trust platform
8. Voice + Vision
9. 3D presence
10. Local/Cloud hybrid
11. Future interfaces / IoT / physical AI

## 17. Testing, security and observability
Every core loop needs unit/integration tests, permission tests, browser safety tests, reliability tests and audit traces. Never claim completion without verification.

## 18. 2030–2050 expansion
- Personal AI → ambient assistant
- Computer use → delegated digital work
- Agent identity → trusted agent ecosystem
- Physical AI → robot/device adapters
- Care/ageing → long-term supportive and accessibility features

## 19. Definition of done
AURA is “real” when it can remember user-approved context, turn a goal into an actionable plan, perform at least one real tool action, verify the result, protect sensitive actions with approval, and expose/edit its memory and permissions.

## 20. Antigravity operating rules
1. Read repository before coding.
2. Treat current code as source of truth.
3. Make smallest safe change.
4. Preserve working features.
5. Never commit secrets.
6. Require approval for sensitive actions.
7. Treat external content as untrusted.
8. Add tests with core features.
9. Run checks after changes.
10. Document important architecture decisions.
11. Prefer adapters/contracts over vendor coupling.
12. Never invent unknowns.
13. Do not claim done until verified.
14. Do not build future hardware features before the current phase is stable.

## First build target
**Do not start with the 3D avatar.** Build AURA Core first: **Personal Memory + Goals + one real Tool + Verification + approval boundary**. Then add Teacher/Care → Browser Automation → long-running workflows → multi-agent → multimodal/3D.

## Research references
- Google DeepMind — Project Astra: https://deepmind.google/models/project-astra/
- OpenAI — Computer use: https://developers.openai.com/api/docs/guides/tools-computer-use
- NIST — AI agent identity and authorization: https://csrc.nist.gov/pubs/other/2026/02/05/accelerating-the-adoption-of-software-and-ai-agent/ipd
- NVIDIA — Humanoid robots: https://www.nvidia.com/en-in/use-cases/humanoid-robots/
- WHO — Ageing and health: https://www.who.int/news-room/fact-sheets/detail/ageing-and-health


## First 72-Hour Execution Loop

| Window | Build | Learn while building | Exit criterion |
|---|---|---|---|
| Hours 0–8 | Repo scaffold, config, base UI, database connection | TypeScript config, env vars, migrations | App runs; baseline checks green |
| Hours 8–24 | Memory + goals + one read-only tool | Schemas, CRUD, retrieval, tool contract | Memory can be saved/retrieved and one tool can run |
| Hours 24–48 | Planner + verification + approval gate | Structured output, state, validation | One multi-step task completes with evidence |
| Hours 48–72 | Teacher/Care + daily brief + first automation | Prompting, scheduling, events | AURA continues from prior context and schedules one safe action |

### First real tool loop
Use a low-risk read-only tool first. Flow: **understand request → retrieve memory → select tool → execute → validate → show evidence → write event to memory**.
