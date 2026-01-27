/**
 * Cloudflare Worker for DeltEcho Chat Browser Target
 *
 * This Worker acts as a proxy to the Container running the browser target.
 * It handles routing, WebSocket upgrades, and container lifecycle management.
 */

import { Container, getContainer } from "@cloudflare/containers";

export interface Env {
  DELTECHO_CONTAINER: DurableObjectNamespace;
  WEB_PASSWORD: string;
}

/**
 * DeltEcho Container configuration
 *
 * Each container instance runs the full browser target server
 * with its own DeltaChat accounts and data.
 */
export class DeltEchoContainer extends Container {
  // Port the container server listens on
  defaultPort = 8080;

  // Ports to wait for during startup
  requiredPorts = [8080];

  // Sleep after 30 minutes of inactivity to save resources
  sleepAfter = "30m";

  // Enable internet access for the container (needed for DeltaChat)
  enableInternet = true;

  // Environment variables for the container
  // Note: These are default values, can be overridden in startAndWaitForPorts
  env = {
    NODE_ENV: "production",
    USE_HTTP_IN_TEST: "true",
    WEB_PORT: "8080",
  };

  /**
   * Called when the container starts successfully
   */
  override onStart() {
    /* ignore-console-log */
    console.log("[DeltEcho] Container started successfully");
  }

  /**
   * Called when the container stops
   */
  override onStop() {
    /* ignore-console-log */
    console.log("[DeltEcho] Container stopped");
  }

  /**
   * Called when an error occurs in the container
   */
  override onError(error: unknown) {
    /* ignore-console-log */
    console.error("[DeltEcho] Container error:", error);
    // Don't rethrow - let the worker handle the error gracefully
  }
}

/**
 * Main Worker fetch handler
 *
 * Routes requests to the appropriate container instance based on
 * the session or user identifier.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === "/health") {
      return new Response("OK", { status: 200 });
    }

    // Debug endpoint to check environment
    if (url.pathname === "/_debug") {
      return new Response(
        JSON.stringify({
          hasWebPassword: !!env.WEB_PASSWORD,
          webPasswordLength: env.WEB_PASSWORD?.length || 0,
          hasContainer: !!env.DELTECHO_CONTAINER,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate that WEB_PASSWORD is configured
    if (!env.WEB_PASSWORD) {
      return new Response(
        "Server configuration error: WEB_PASSWORD secret is not set. Please configure it using 'wrangler secret put WEB_PASSWORD'.",
        { status: 500 },
      );
    }

    // Get session ID from cookie or create new one
    const sessionId = getSessionId(request);

    try {
      // Get or create container instance for this session
      const container = getContainer(env.DELTECHO_CONTAINER, sessionId);

      /* ignore-console-log */
      console.log("[DeltEcho] Starting container for session:", sessionId);

      // Start the container with WEB_PASSWORD passed via startOptions
      // This is the correct way to pass secrets to containers per-instance
      await container.startAndWaitForPorts({
        startOptions: {
          envVars: {
            NODE_ENV: "production",
            USE_HTTP_IN_TEST: "true",
            WEB_PORT: "8080",
            WEB_PASSWORD: env.WEB_PASSWORD,
            DELTA_CHAT_RPC_SERVER: "/usr/local/bin/deltachat-rpc-server",
            DC_ACCOUNTS_PATH: "/data/accounts",
            DATA_DIR: "/data",
            DIST_DIR: "/app/dist",
          },
          enableInternet: true,
        },
        ports: 8080,
        cancellationOptions: {
          instanceGetTimeoutMS: 60000, // 60 seconds to get instance
          portReadyTimeoutMS: 60000, // 60 seconds to wait for port
        },
      });

      /* ignore-console-log */
      console.log("[DeltEcho] Container started, forwarding request");

      // Check if this is a WebSocket upgrade request
      const upgradeHeader = request.headers.get("Upgrade");
      if (upgradeHeader?.toLowerCase() === "websocket") {
        // Forward WebSocket requests directly to the container
        return container.fetch(request);
      }

      // Forward HTTP requests to the container
      const response = await container.fetch(request);

      // Add session cookie if not present
      if (!request.headers.get("Cookie")?.includes("deltecho-session")) {
        const headers = new Headers(response.headers);
        headers.append(
          "Set-Cookie",
          `deltecho-session=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`,
        );
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }

      return response;
    } catch (error) {
      /* ignore-console-log */
      console.error("[DeltEcho] Error handling request:", error);

      // Provide more detailed error information
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      return new Response(
        JSON.stringify({
          error: "Failed to start container",
          message: errorMessage,
          stack: errorStack,
          sessionId,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};

/**
 * Extract or generate a session ID for container routing
 */
function getSessionId(request: Request): string {
  const cookies = request.headers.get("Cookie") || "";
  const match = cookies.match(/deltecho-session=([^;]+)/);

  if (match) {
    return match[1];
  }

  // Generate a new session ID
  return crypto.randomUUID();
}
