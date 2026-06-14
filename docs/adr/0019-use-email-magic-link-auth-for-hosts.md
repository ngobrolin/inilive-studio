# Use Email Magic Link Auth for Hosts

V1 should use email magic links for Host Accounts, implemented as a custom flow within the SvelteKit app (not a third-party auth provider). This gives Hosts a way to create and return to Rooms without requiring passwords, social OAuth, password reset flows, or team account management before the core live Room and Broadcast workflow is proven.

Token policy: ≥128-bit entropy, 15-minute expiry, single-use, invalidated when a new token is requested. The magic-link request endpoint returns an identical response regardless of whether the email exists (enumeration-safe). Tokens must not appear in structured logs or access logs — use a POST exchange step rather than logging GET URLs with embedded tokens.

Session policy: HttpOnly, Secure, SameSite=Lax cookies; ≥128-bit session tokens; 30-day absolute expiry with sliding activity window; sessions invalidated on magic-link re-auth.
