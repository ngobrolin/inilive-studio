# Use coturn for WHIP UDP Fallback

The WHIP path from the Host browser to the Broadcast Bridge requires WebRTC media over UDP between the browser and the bridge's public IP. Caddy handles WHIP signaling over HTTPS, but UDP media cannot traverse a reverse proxy.

If direct UDP connectivity fails during the Milestone 2 spike (symmetric NAT, restrictive firewalls), add coturn as a Podman Compose service. The bridge and browser use TURN relay candidates as a fallback. coturn is not provisioned preemptively — only when the spike proves direct UDP is unreliable.

Test condition: Host browser on a typical home network can complete WHIP ingest to the bridge without TURN. If not, deploy coturn before calling Milestone 2 done.
