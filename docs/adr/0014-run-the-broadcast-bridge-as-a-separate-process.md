# Run the Broadcast Bridge as a Separate Process

The Broadcast Bridge should run as a separate supervised process on the same VPS as the v1 app, rather than inside the SvelteKit web server process. This keeps long-running media work isolated from web deploys, request handling, and UI/API failures while avoiding extra infrastructure for the first version.

V1 implements the bridge with GStreamer: WHIP ingest from the Host browser, VP8/VP9-to-H.264 transcoding, AAC audio, and RTMP output to YouTube. The bridge runs as a persistent daemon that starts and stops GStreamer pipelines per Broadcast via an authenticated control API. Requires GStreamer ≥1.22 with WebRTC plugins in a pinned container image.
