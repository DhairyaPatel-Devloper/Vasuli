// lib/call-memory.js — simple in-memory store, keyed by CallSid
const activeCalls = new Map();

export function getCallHistory(callSid) {
  if (!callSid) return [];
  if (!activeCalls.has(callSid)) activeCalls.set(callSid, []);
  return activeCalls.get(callSid);
}

export function addToCallHistory(callSid, role, text) {
  if (!callSid || !text) return;
  getCallHistory(callSid).push({ role, text });
}

export function endCall(callSid) {
  if (!callSid) return;
  activeCalls.delete(callSid); // free memory once the call ends
}
