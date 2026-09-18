import { identity } from "../domain/model.js";

export function createSession(value) {
  return identity(value);
}
