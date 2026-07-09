import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

export const socket = io(SERVER_URL, {
  autoConnect: true,
});

// Lets the /test tournament simulator redirect all emitAck calls to a local mock
// engine instead of the real server, without every component needing to know
// about it. Real app code never calls these — override stays null unless the
// simulator page is mounted.
let emitAckOverride = null;

export function setEmitAckOverride(fn) {
  emitAckOverride = fn;
}

export function clearEmitAckOverride() {
  emitAckOverride = null;
}

export function emitAck(event, payload) {
  if (emitAckOverride) return emitAckOverride(event, payload);
  return new Promise((resolve) => {
    socket.emit(event, payload, (response) => resolve(response));
  });
}
