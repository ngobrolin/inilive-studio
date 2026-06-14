# Use a Server-Side Broadcast Bridge

The browser app should remain the Host-facing production surface, but YouTube Live typically expects RTMP ingestion and browsers do not push RTMP directly. V1 should send the Composed Room Feed from the browser over WHIP (WebRTC HTTP Ingestion Protocol) to a server-side Broadcast Bridge, which then carries the feed onward to YouTube.
