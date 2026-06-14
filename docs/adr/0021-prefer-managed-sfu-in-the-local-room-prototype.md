# Prefer Managed SFU in the Local Room Prototype

The Local Room Prototype should use the managed SFU path immediately if provider setup is straightforward, because the production direction is WebRTC SFU. If managed SFU integration takes more than a short spike to get working, peer-to-peer WebRTC mesh can be used only as a temporary fallback to unblock Room UI and Composed Room Feed testing.
