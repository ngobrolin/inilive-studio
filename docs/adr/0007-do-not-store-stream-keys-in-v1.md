# Do Not Store Stream Keys in V1

V1 should treat pasted YouTube stream credentials as ephemeral broadcast inputs, held only long enough to start and run the Broadcast Bridge for the current broadcast. Avoiding persistent stream-key storage reduces secret-management work and limits the impact of an application data leak.

Credentials are passed once from SvelteKit to the bridge over an authenticated control API at broadcast start and are held in bridge memory for the broadcast duration. They are not written to disk, environment variables, or logs. RTMP URLs must be redacted in structured logs and bridge error output. The bridge drops credential references on Broadcast End or Failed.
