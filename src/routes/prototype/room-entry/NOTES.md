# PROTOTYPE - Room Entry

Question: what should the first authless Host Room URL and Guest Invite URL feel like before the real Room implementation exists?

Plan: three structurally different variants of the Room entry surface, switchable via `?variant=A|B|C`, on the throwaway `/prototype/room-entry` route.

Verdict: variant B ("Join console") promoted to the real Room entry routes at `/room/[roomId]` and `/room/[roomId]/invite/[token]`. This throwaway route remains for comparison until cleanup-001.
