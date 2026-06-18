export function hasRunningPipeline(session) {
  return Boolean(session?.process && !session.process.killed);
}
