import { createSession } from "../application/session.js";

export function renderValue(value) {
  return String(createSession(value));
}
