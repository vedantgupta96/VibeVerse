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