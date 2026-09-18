import { readDirectly } from "../infrastructure/repository.js";

export function render() {
  return readDirectly();
}
