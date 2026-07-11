@AGENTS.md

## Claude Code Specific Instructions

Use planning mode before large changes.

For substantial hands-on implementation, use the project-scoped `implementer` agent in `.claude/agents/implementer.md` after the approach and acceptance criteria are settled. It runs on Sonnet for cost-efficient execution while the main thread retains planning, design, review, and verification. If the named agent is unavailable in the current session, use a single general-purpose Sonnet subagent with the same bounded implementation brief. Do not delegate small edits merely to satisfy the model split.

Before implementing code:
1. Read the project docs.
2. Propose the exact files to create or modify.
3. Implement one phase at a time.
4. Avoid overengineering the first version.
5. Ask for review after creating or significantly modifying planning documents.
