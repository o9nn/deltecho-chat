/**
 * Cloudflare Worker for DeltEcho Chat Browser Target
 *
 * This Worker acts as a proxy to the Container running the browser target.
 * It handles routing, WebSocket upgrades, and container lifecycle management.
 */

import { Container, getContainer } from "@cloudflare/containers";

export interface Env {
  DELTECHO_CONTAINER: DurableObjectNamespace;
  WEB_PASSWORD?: string;
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

  // Sleep after 30 minutes of inactivity to save resources
  sleepAfter = "30m";

  // Environment variables passed to the container
  envVars = {
    NODE_ENV: "production",
    USE_HTTP_IN_TEST: "true",
    WEB_PORT: "8080",
  };

  /**
   * Called when the container starts successfully
   */
  override onStart() {
    console.log("[DeltEcho] Container started successfully");
  }

  /**
   * Called when the container stops
   */
  override onStop() {
    console.log("[DeltEcho] Container stopped");
  }

  /**
   * Called when an error occurs in the container
   */
  override onError(error: unknown) {
    console.error("[DeltEcho] Container error:", error);
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

    // Get session ID from cookie or create new one
    const sessionId = getSessionId(request);

    // Get or create container instance for this session
    const container = getContainer(env.DELTECHO_CONTAINER, sessionId);

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
        `deltecho-session=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
      );
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return response;
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
