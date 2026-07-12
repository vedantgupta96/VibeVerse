# Beta Measurement Plan

This is a proposed measurement contract, not implemented tracking. Phase 11 adds no analytics SDK, event table, cookies, session replay, or behavioral collection. Consent/opt-out behavior and the short retention period require an explicit product/privacy decision before instrumentation.

## Measurement principles

- Optimize for successful tasks and time-to-value, not time spent.
- Pair every adoption signal with a quality or burden counter-metric.
- Never collect playlist prompts, memory text, search queries, room names, reaction contents, generated AI prose, email addresses, or track titles in analytics.
- Use a rotating pseudonymous user ID and random event ID; keep account identity mapping outside the analytics system.
- Proposed raw-event retention: 30 days, aggregated metrics up to 13 months, subject to privacy/legal review. Delete or de-identify on account deletion where technically applicable.
- Collect only after the team chooses a lawful basis, consent/opt-out experience, processor, access policy, and deletion workflow.

## Goal–Signal–Metric chains

| Goal | Signals | Primary metrics | Counter-metrics |
|---|---|---|---|
| Reach first musical value quickly | signup completed → first track saved | completion rate; median/p75 time from signup to first save; save error rate | immediate unsave rate; retry burden; post-task ease rating |
| Make journaling understandable | first memory editor opened → memory saved | task completion; time on task; validation/error rate | delete-within-5-min rate; abandonment after typing; satisfaction |
| Make AI playlist generation dependable | generation started → completed/opened | success rate; time to generated playlist; sparse-result rate | retry rate; cancellation/exit; usefulness rating; provider/AI error rate |
| Make Taste DNA attainable and legible | eligibility reached → profile refresh completed → profile viewed | eligible-user completion; refresh success/time | cooldown/error burden; “does this feel accurate?” rating |
| Make Galaxy exploration purposeful | galaxy viewed → artist inspected | artist-inspection completion; time to first inspection | early exit; canvas-control errors; “helped me understand my taste” rating |
| Make collaborative rooms easy to start | room create started → room joined by another listener | room-create success; join success; time from create to second active member | invalid-code retries; leave-within-2-min; perceived control/safety |
| Make queue collaboration reliable | joined room → first queue add → first vote | queue-add/vote completion and latency; mutation error rate | duplicate/retry burden; removal/undo need; SSE reconnect/poll fallback rate |

## Proposed event definitions

All properties below are allowlisted. Common properties: `event_id`, pseudonymous `user_id`, `occurred_at`, `session_id`, app version, coarse platform (`desktop_web`/`mobile_web`), and result (`success`/`failure`). Do not attach arbitrary context objects.

| Event | When emitted | Additional allowed properties |
|---|---|---|
| `signup_completed` | account creation succeeds | auth method category only |
| `track_saved_first` | user's saved-track count transitions 0 → 1 | elapsed bucket from signup; provider enum |
| `memory_created_first` | user's memory count transitions 0 → 1 | mood-present boolean; elapsed bucket |
| `playlist_generation_started` | explicit Generate action accepted | none |
| `playlist_generation_completed` | generation returns success/failure | duration bucket; resolved-track-count bucket; error code |
| `taste_profile_generated_first` | first successful profile refresh | saved-track-count bucket; duration bucket |
| `galaxy_viewed_first` | first usable galaxy render | node-count bucket; empty boolean |
| `galaxy_artist_inspected_first` | first artist inspector opens | elapsed bucket from galaxy view |
| `room_created` | room persistence succeeds | none |
| `room_join_completed` | join by code/link succeeds/fails | join method category; error code; duration bucket |
| `room_queue_item_added_first` | first successful queue add per user/room | duration bucket from join |
| `room_vote_cast_first` | first successful vote per user/room | direction (`up`/`down`) only |
| `room_left` | explicit Leave succeeds | coarse dwell-time bucket |

Failures should use enumerated API error codes, never messages or stack traces. Durations and counts should be bucketed where exact values are unnecessary.

## Reporting and guardrails

- Report completion denominators explicitly (eligible users or task starters), not all accounts.
- Segment only by coarse platform and new/returning status until sample sizes protect privacy.
- Do not rank users, create addiction/streak goals, or optimize notification pressure.
- Review adoption beside task errors, retries, easy exit, and qualitative satisfaction every beta cycle.
- Pause collection if access controls, deletion, consent, or data-quality checks fail.
