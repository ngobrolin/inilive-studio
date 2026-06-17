import type { Cookies } from "@sveltejs/kit";
import { getAuthStore } from "$lib/server/auth/runtime";
import { resolveHostSession, SESSION_COOKIE_NAME } from "$lib/server/auth/sessions";

export async function getHostSessionFromCookies(cookies: Cookies) {
  return resolveHostSession(cookies.get(SESSION_COOKIE_NAME), { store: getAuthStore() });
}
