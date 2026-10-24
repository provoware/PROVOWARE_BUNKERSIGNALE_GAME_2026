const endpoint = process.env.CHROME_DEBUG_URL || "http://127.0.0.1:9222";
const page = process.env.TEST_PAGE_URL || "http://127.0.0.1:8765/index.html";
const target = await fetch(endpoint + "/json/new?" + encodeURIComponent(page), { method: "PUT" }).then(r => {
  if (!r.ok) throw new Error("Chrome target HTTP " + r.status);
  return r.json();
});
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});
let next = 0;
const pending = new Map();
ws.addEventListener("message", message => {
  const item = JSON.parse(message.data);
  if (!pending.has(item.id)) return;
  const callbacks = pending.get(item.id);
  pending.delete(item.id);
  item.error ? callbacks.reject(new Error(JSON.stringify(item.error))) : callbacks.resolve(item.result);
});
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++next;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
try {
  await call("Runtime.enable");
  await call("Page.enable");
  const navigation = await call("Page.navigate", { url: page });
  if (navigation.errorText) throw new Error("Chrome navigation failed: " + navigation.errorText);
  let ready = false;
  for (let i = 0; i < 100; i++) {
    const state = await call("Runtime.evaluate", { expression: "location.href + '|' + document.readyState", returnByValue: true });
    if (state.result?.value === page + "|complete") { ready = true; break; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error("Browser test page did not finish loading");
  const result = await call("Runtime.evaluate", {
    expression: "(async () => { const { runGameplayAtomicAppendSmoke } = await import('/tests/gameplay_atomic_append_browser_cases.mjs'); return await runGameplayAtomicAppendSmoke(); })()",
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  const value = result.result?.value;
  if (!value || value.passed !== 15 || value.finalWorldEvents !== 3) {
    throw new Error("Unexpected gameplay atomic append result: " + JSON.stringify(value));
  }
  console.log("GAMEPLAY ATOMIC APPEND CHROMIUM PASS", JSON.stringify(value));
} finally { ws.close(); }
