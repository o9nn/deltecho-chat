import { defineEventa } from "@moeru/eventa";
import { createContext } from "@moeru/eventa/adapters/window-message";

const cueEvent = defineEventa<unknown>("airi:dte:stage:cue:v1");
const releaseEvent = defineEventa<{ leaseId: string }>(
  "airi:dte:stage:release:v1",
);
const helloEvent = defineEventa<undefined>("airi:dte:stage:hello:v1");
const readyEvent = defineEventa<{ modelId: string; modelSha256: string }>(
  "airi:dte:stage:ready:v1",
);
const ackEvent = defineEventa<{ leaseId: string; accepted: boolean }>(
  "airi:dte:stage:ack:v1",
);
const status = document.getElementById("status")!;
const launch = document.getElementById("launch") as HTMLButtonElement;
const stop = document.getElementById("stop") as HTMLButtonElement;
const capability = new URLSearchParams(location.hash.slice(1)).get("cap") || "";
history.replaceState(null, "", location.pathname);
if (!/^[a-f0-9]{64}$/.test(capability)) {
  status.textContent =
    "No local broker capability. Close this window and open the URL from the broker terminal.";
  launch.disabled = true;
  throw new Error("Missing broker capability");
}
const headers = { "X-DTE-Capability": capability };
let popup: Window | null = null;
let channel: ReturnType<typeof createContext> | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let model: { modelId: string; modelSha256: string } | null = null;
let leaseId: string | null = null;
let pollBusy = false;
let stageUrl = "";
let expectedDigest = "";
let expectedModelId = "";

async function release(): Promise<void> {
  if (leaseId && channel)
    await channel.context.emit(releaseEvent, { leaseId }).catch(() => {});
  leaseId = null;
  await fetch("/api/release", {
    method: "POST",
    headers,
    cache: "no-store",
  }).catch(() => {});
}
async function close(): Promise<void> {
  if (timer) clearInterval(timer);
  timer = null;
  await release();
  channel?.dispose();
  channel = null;
  model = null;
  if (popup && !popup.closed) popup.close();
  popup = null;
  stop.disabled = true;
  launch.disabled = false;
  status.textContent = "Disconnected. No DTE cue is active.";
}

async function poll(): Promise<void> {
  if (
    pollBusy ||
    !model ||
    !channel ||
    !popup ||
    popup.closed ||
    document.hidden
  ) {
    if (popup?.closed || document.hidden) await release();
    return;
  }
  pollBusy = true;
  try {
    const url = `/api/cue?modelId=${encodeURIComponent(
      model.modelId,
    )}&modelSha256=${encodeURIComponent(model.modelSha256)}`;
    const response = await fetch(url, { headers, cache: "no-store" });
    if (response.status === 204) {
      await release();
      status.textContent =
        "Daemon or canonical core-self unavailable; pose released.";
      return;
    }
    if (!response.ok) {
      await release();
      status.textContent = "Presentation bridge rejected the cue.";
      return;
    }
    const cue: unknown = await response.json();
    if (
      !cue ||
      typeof cue !== "object" ||
      !("leaseId" in cue) ||
      typeof cue.leaseId !== "string"
    ) {
      await release();
      return;
    }
    leaseId = cue.leaseId;
    await channel.context.emit(cueEvent, cue);
    status.textContent = "Fresh DTE cue delivered to generic AIRI avatar.";
  } catch {
    await release();
    status.textContent = "Bridge unavailable; pose released.";
  } finally {
    pollBusy = false;
  }
}

launch.onclick = async () => {
  const config = await fetch("/api/config", { headers }).then((response) =>
    response.ok
      ? response.json()
      : Promise.reject(new Error("Broker unavailable")),
  );
  stageUrl = config.stageUrl;
  expectedDigest = config.modelSha256;
  expectedModelId = config.modelId;
  const target = new URL(stageUrl);
  target.searchParams.set("dteBridge", "1");
  target.searchParams.set("dteModelId", expectedModelId);
  target.searchParams.set("dteParentOrigin", location.origin);
  popup = window.open(
    target.toString(),
    "DTE-AIRI",
    "popup,width=1100,height=850",
  );
  if (!popup) {
    status.textContent = "Allow the local AIRI popup in this browser.";
    return;
  }
  channel = createContext({
    channel: "airi:dte:stage:v1",
    currentWindow: window,
    targetWindow: () => popup!,
    expectedSource: () => popup!,
    expectedOrigin: target.origin,
    targetOrigin: target.origin,
  });
  channel.context.on(readyEvent, (event) => {
    if (
      event.body?.modelSha256 !== expectedDigest ||
      event.body.modelId !== expectedModelId ||
      !/^[a-z0-9][a-z0-9_-]{1,63}$/.test(event.body.modelId)
    ) {
      model = null;
      status.textContent =
        "AIRI selected a different model archive; cue blocked.";
      void release();
      return;
    }
    model = event.body;
    status.textContent =
      "AIRI model identity verified; waiting for a qualified DTE daemon.";
  });
  channel.context.on(ackEvent, (event) => {
    if (!event.body?.accepted && event.body?.leaseId === leaseId) {
      status.textContent = "AIRI rejected the cue; lease released.";
      void release();
    }
  });
  stop.disabled = false;
  launch.disabled = true;
  timer = setInterval(() => {
    if (popup?.closed) {
      void close();
      return;
    }
    if (!model) void channel?.context.emit(helloEvent, undefined);
    void poll();
  }, 500);
  void channel.context.emit(helloEvent, undefined);
  status.textContent =
    "Open the matching generic model ZIP in AIRI; waiting for stage ready.";
};
stop.onclick = () => {
  void close();
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden) void release();
});
window.addEventListener("pagehide", () => {
  void release();
});
