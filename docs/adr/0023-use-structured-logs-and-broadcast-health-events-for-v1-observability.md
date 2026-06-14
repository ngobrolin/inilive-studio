# Use Structured Logs and Broadcast Health Events for V1 Observability

V1 should rely on structured logs plus minimal Broadcast Health events for early operations and debugging. Milestone 2 surfaces ephemeral health to the Host via in-memory bridge callbacks. Milestone 3 persists health events in Postgres. This gives enough visibility into Room and Broadcast failures without introducing a full metrics or tracing stack before the media path and support patterns are proven.
