# AGENTS.md

## Project

We are building VibeVerse, an AI-native interactive music discovery web app.

The product combines:
- AI playlist generation
- AI DJ explanations
- Music memory journaling
- Interactive music galaxy visualization
- Realtime collaborative listening rooms
- Taste profiling
- Music metadata/search integrations
- Vector search and graph-style music relationships

## Read First

Before making implementation decisions, read:

1. `PROJECT_BRIEF.md`
2. `PRODUCT_SPEC.md`
3. `ARCHITECTURE.md`
4. `TASKS.md`
5. `DATABASE.md`
6. `API_CONTRACTS.md`
7. `DESIGN_SYSTEM.md`

If these files do not exist yet, create them before writing application code.

## Development Rules

- Use TypeScript everywhere.
- Prefer production-grade architecture over tutorial-style code.
- Keep files modular and readable.
- Do not hardcode API keys or secrets.
- Use environment variables for external services.
- Validate all server inputs.
- Prefer reusable components.
- Do not create large monolithic files.
- Explain major architectural choices before implementing them.
- After each major change, summarize files changed and why.

## Role Split and Delegation

The main agent owns exploration, planning, product and design decisions, architecture, implementation specifications, diff review, final verification, and user communication.

- Implement small, tightly scoped changes directly when delegation would add more overhead than value. Typical examples are a focused fix, a copy change, or a low-risk edit contained to one or two files.
- For substantial hands-on implementation, finish the approach first and then delegate to exactly one implementation agent at a time. Treat a change as substantial when it spans several files, builds a feature or project phase, changes architecture or data flow, or benefits from an isolated coding context.
- Give the implementation agent a bounded brief containing the goal, exact behavior, expected files, constraints, relevant project documents, acceptance criteria, and verification commands.
- Keep follow-up fixes with the same implementation agent when practical so it can reuse context.
- Do not fan out multiple writing agents against the same worktree. Parallel read-only investigation is acceptable when it is genuinely independent and supported by the active environment.
- The implementation agent must preserve unrelated user changes, stay within the brief, run proportionate checks, and report changed files, verification results, and unresolved issues. It must not commit, push, open pull requests, or make product and architecture decisions unless explicitly authorized.
- The main agent reviews the resulting diff, resolves any decisions returned by the implementation agent, and owns final verification and all Git or external actions.
- If a suitable delegation mechanism is unavailable, the main agent may implement the work directly rather than blocking progress.

## Preferred Stack

Frontend:
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion
- React Three Fiber / Three.js
- TanStack Query
- Zustand

Backend:
- Next.js API routes initially
- PostgreSQL
- Prisma or Drizzle
- pgvector
- Redis later for realtime state
- WebSockets later for collaborative rooms

AI:
- LLM API for AI DJ/chat
- Embeddings for semantic search
- Tool-calling for playlist generation and memory retrieval

## Implementation Order

Do not build everything at once.

Build in phases:

1. Project setup
2. Database schema
3. Auth
4. Track/artist search
5. Save tracks
6. Music memory journal
7. AI playlist generator
8. Taste dashboard
9. Basic music galaxy visualization
10. Realtime vibe rooms
11. Advanced AI DJ and voice features

## Quality Bar

This should feel like a serious portfolio/startup-grade product.

The app should be:
- Visually distinctive
- Interactive
- Cleanly architected
- Database-backed
- AI-native
- Demo-friendly
