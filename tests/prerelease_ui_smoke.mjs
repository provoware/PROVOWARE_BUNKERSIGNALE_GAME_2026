// Technische Chromium-Regression der schreibgeschuetzten Spieloberflaeche.
// Keine externen Node-Pakete; keine Aenderung an Browser-Spielstaenden.
const endpoint = "http://127.0.0.1:9222";
const appUrl = "http://127.0.0.1:8765/index.html";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const check = (condition, message, data) => {
  if (!condition) throw new Error(message + ": " + JSON.stringify(data ?? {}));
};
const response = await fetch(endpoint + "/json/new?" + encodeURIComponent(appUrl), {method:"PUT"});
check(response.ok, "Chromium-Ziel konnte nicht angelegt werden", {status:response.status});
const target = await response.json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject) => {
  ws.addEventListener("open",resolve,{once:true});
  ws.addEventListener("error",reject,{once:true});
});
let seq=0;
const pending=new Map();
const exceptions=[];
ws.addEventListener("message",event => {
  const message=JSON.parse(event.data);
  if (pending.has(message.id)) {
    const p=pending.get(message.id);
    pending.delete(message.id);
    clearTimeout(p.timer);
    message.error ? p.reject(new Error(JSON.stringify(message.error))) : p.resolve(message.result ?? {});
  } else if (message.method==="Runtime.exceptionThrown") {
    exceptions.push(message.params?.exceptionDetails?.text ?? "Runtime exception");
  }
});
function send(method,params={}) {
  return new Promise((resolve,reject) => {
    const id=++seq;
    const timer=setTimeout(() => {pending.delete(id);reject(new Error("CDP timeout: "+method));},12000);
    pending.set(id,{resolve,reject,timer});
    ws.send(JSON.stringify({id,method,params}));
  });
}
async function inPage(fn) {
  const r=await send("Runtime.evaluate",{expression:"("+fn.toString()+")()",returnByValue:true,awaitPromise:true});
  check(!r.exceptionDetails,"Fehler im Browserausdruck",r.exceptionDetails);
  return r.result?.value;
}
async function press(key,code,keyCode) {
  for (const type of ["keyDown","keyUp"]) {
    await send("Input.dispatchKeyEvent",{type,key,code,windowsVirtualKeyCode:keyCode,nativeVirtualKeyCode:keyCode});
  }
}
try {
  await send("Runtime.enable");
  let ready=false;
  for (let i=0;i<100;i++) {
    ready=await inPage(() => document.querySelector("#app")?.getAttribute("aria-busy")==="false" && !!document.querySelector("#game-panel"));
    if (ready) break;
    await sleep(100);
  }
  check(ready,"Browserstart der echten Spieloberflaeche nicht abgeschlossen");
  for (const [width,height] of [[800,600],[400,300]]) {
    await send("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:false});
    await sleep(120);
    const state=await inPage(() => {
      const tab=[...document.querySelectorAll(".ssi-tab")].find(el=>el.textContent==="Spiel");
      tab.click();
      const panel=document.querySelector("#game-panel");
      const actions=[...panel.querySelectorAll(".ssi-game-action")];
      const grid=document.querySelector(".ssi-game-grid");
      return {
        viewport:[innerWidth,innerHeight],
        documentWidth:document.documentElement.scrollWidth,
        clientWidth:document.documentElement.clientWidth,
        bodyWidth:document.body.scrollWidth,
        visible:!panel.hidden,
        focused:document.activeElement?.id,
        columns:getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length,
        actions:actions.length,
        enabled:actions.filter(el=>!el.disabled).length
      };
    });
    check(state.viewport[0]===width && state.viewport[1]===height,"Viewport falsch",state);
    check(state.documentWidth<=state.clientWidth+1 && state.bodyWidth<=state.clientWidth+1,"Horizontales Scrollen",state);
    check(state.visible && state.focused==="game-panel","Navigation oder Fokus falsch",state);
    check(state.actions===4 && state.enabled===0,"Read-only-Schutz verletzt",state);
    if (width===400) check(state.columns===1,"Einspaltiges Raster fehlt",state);
    console.log("PASS viewport",JSON.stringify(state));
  }
  await send("Emulation.setDeviceMetricsOverride",{width:800,height:600,deviceScaleFactor:1,mobile:false});
  await inPage(() => document.querySelectorAll(".ssi-tab")[0].focus());
  await press("Tab","Tab",9);
  const focus=await inPage(() => {
    const el=document.activeElement,style=getComputedStyle(el);
    return {text:el?.textContent,outline:style.outlineStyle,width:parseFloat(style.outlineWidth)};
  });
  check(focus.text==="Spiel","Tab-Reihenfolge falsch",focus);
  check(focus.outline!=="none" && focus.width>=2,"Fokus nicht sichtbar",focus);
  await press("Enter","Enter",13);
  const activated=await inPage(() => ({
    selected:[...document.querySelectorAll(".ssi-tab")].find(el=>el.textContent==="Spiel")?.getAttribute("aria-pressed"),
    visible:!document.querySelector("#game-panel").hidden,
    focused:document.activeElement?.id
  }));
  check(activated.selected==="true" && activated.visible && activated.focused==="game-panel","Enter-Aktivierung fehlgeschlagen",activated);
  check(exceptions.length===0,"Unbehandelte Browser-Ausnahmen",exceptions);
  console.log("PASS keyboard",JSON.stringify({focus,activated}));
} finally {
  ws.close();
}
