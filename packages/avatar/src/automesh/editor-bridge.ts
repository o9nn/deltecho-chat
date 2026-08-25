/**
 * Cubism Editor External Application Integration client.
 * Editor is the WebSocket server (default port 22033). This is the official
 * "editor SDK" surface — it cannot rewrite .moc3 topology from the browser,
 * but it can read/write the open model's parameters when Editor is running.
 *
 * @see https://docs.live2d.com/en/cubism-editor-manual/external-application-integration-api/
 */

export const CUBISM_EDITOR_DEFAULT_PORT = 22033;
export const CUBISM_EDITOR_API_VERSION = "1.0.0";

export interface CubismEditorEnvelope {
  Version?: string;
  Timestamp?: number;
  RequestId?: string;
  Type: "Request" | "Response" | "Event" | "Error";
  Method: string;
  Data: Record<string, unknown>;
}

export function cubismEditorUrl(port = CUBISM_EDITOR_DEFAULT_PORT): string {
  return `ws://127.0.0.1:${port}`;
}

export function cubismEditorRequest(
  method: string,
  data: Record<string, unknown> = {},
  extras: { requestId?: string; token?: string } = {},
): CubismEditorEnvelope {
  return {
    Version: CUBISM_EDITOR_API_VERSION,
    Timestamp: Date.now(),
    RequestId: extras.requestId,
    Type: "Request",
    Method: method,
    Data: extras.token ? { ...data, Token: extras.token } : data,
  };
}

export function parseCubismEditorMessage(
  raw: string,
): CubismEditorEnvelope | null {
  try {
    const parsed = JSON.parse(raw) as Partial<CubismEditorEnvelope>;
    if (
      !parsed ||
      typeof parsed.Method !== "string" ||
      typeof parsed.Type !== "string"
    ) {
      return null;
    }
    return {
      Version: parsed.Version,
      Timestamp: parsed.Timestamp,
      RequestId: parsed.RequestId,
      Type: parsed.Type,
      Method: parsed.Method,
      Data:
        parsed.Data && typeof parsed.Data === "object"
          ? (parsed.Data as Record<string, unknown>)
          : {},
    };
  } catch {
    return null;
  }
}

export type CubismEditorSocket = {
  send: (data: string) => void;
  close: () => void;
  addEventListener: (
    type: "message" | "open" | "close" | "error",
    listener: (event: { data?: string }) => void,
  ) => void;
};

export class CubismEditorBridge {
  private socket: CubismEditorSocket | null = null;
  private token: string | undefined;
  private pending = new Map<
    string,
    {
      resolve: (value: CubismEditorEnvelope) => void;
      reject: (error: Error) => void;
    }
  >();
  private nextId = 1;

  constructor(
    private readonly connectSocket: (url: string) => CubismEditorSocket,
  ) {}

  async connect(
    port = CUBISM_EDITOR_DEFAULT_PORT,
    pluginName = "Deltecho Automesh",
  ): Promise<CubismEditorEnvelope> {
    this.disconnect();
    const socket = this.connectSocket(cubismEditorUrl(port));
    this.socket = socket;
    socket.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;
      const message = parseCubismEditorMessage(event.data);
      if (!message) return;
      const waiter = message.RequestId
        ? this.pending.get(message.RequestId)
        : undefined;
      if (waiter) {
        this.pending.delete(message.RequestId as string);
        if (message.Type === "Error") {
          waiter.reject(new Error(String(message.Data.ErrorType ?? "Error")));
          return;
        }
        waiter.resolve(message);
      }
    });

    const registered = await this.request("RegisterPlugin", {
      Name: pluginName,
    });
    const token = registered.Data.Token;
    if (typeof token === "string") this.token = token;
    return registered;
  }

  async getCurrentModelUID(): Promise<string | null> {
    const response = await this.request("GetCurrentModelUID");
    const uid = response.Data.ModelUID;
    return typeof uid === "string" ? uid : null;
  }

  async getParameterValues(modelUID: string): Promise<unknown> {
    const response = await this.request("GetParameterValues", { ModelUID: modelUID });
    return response.Data.Parameters;
  }

  async setParameterValues(
    modelUID: string,
    parameters: Array<{ Id: string; Value: number }>,
  ): Promise<CubismEditorEnvelope> {
    return this.request("SetParameterValues", {
      ModelUID: modelUID,
      Parameters: parameters,
    });
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
    for (const waiter of this.pending.values()) {
      waiter.reject(new Error("disconnected"));
    }
    this.pending.clear();
  }

  private request(
    method: string,
    data: Record<string, unknown> = {},
  ): Promise<CubismEditorEnvelope> {
    if (!this.socket) {
      return Promise.reject(new Error("not connected"));
    }
    const requestId = String(this.nextId++);
    const envelope = cubismEditorRequest(method, data, {
      requestId,
      token: this.token,
    });
    const promise = new Promise<CubismEditorEnvelope>((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
    });
    this.socket.send(JSON.stringify(envelope));
    return promise;
  }
}

export function createBrowserCubismEditorBridge(): CubismEditorBridge {
  return new CubismEditorBridge((url) => new WebSocket(url));
}
