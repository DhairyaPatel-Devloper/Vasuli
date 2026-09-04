// lib/call-memory.js
// In-memory conversation state store for Sarvam voice agent sessions

const activeSessions = new Map();

export function getCallHistory(callId) {
  if (!callId) return [];
  if (!activeSessions.has(callId)) {
    activeSessions.set(callId, { history: [], metadata: {}, startedAt: Date.now() });
  }
  return activeSessions.get(callId).history;
}

export function addToCallHistory(callId, role, text) {
  if (!callId || !text) return;
  if (!activeSessions.has(callId)) {
    activeSessions.set(callId, { history: [], metadata: {}, startedAt: Date.now() });
  }
  const session = activeSessions.get(callId);
  session.history.push({
    role,
    text,
    timestamp: new Date().toISOString(),
  });
}

export function setSessionMetadata(callId, metadata) {
  if (!callId) return;
  if (!activeSessions.has(callId)) {
    activeSessions.set(callId, { history: [], metadata: {}, startedAt: Date.now() });
  }
  const session = activeSessions.get(callId);
  session.metadata = { ...session.metadata, ...metadata };
}

export function getSessionMetadata(callId) {
  if (!callId || !activeSessions.has(callId)) return {};
  return activeSessions.get(callId).metadata || {};
}

export function endCall(callId) {
  if (!callId) return;
  activeSessions.delete(callId);
}
