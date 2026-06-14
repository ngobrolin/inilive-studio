# Keep the Local Room Prototype Authless and Ephemeral

The Local Room Prototype should avoid Host auth, Postgres, and durable Room records unless they are needed to validate the media flow. It can use in-memory or local ephemeral state for Host links, Guest Invites, Room Chat, and participant presence, with Room Chat disappearing when the prototype Room or server ends. The v1 Product Shell later introduces Host Accounts, reusable Rooms, Postgres, and custom email magic-link auth.
