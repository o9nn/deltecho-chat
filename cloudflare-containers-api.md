# Cloudflare Containers API Reference

## startAndWaitForPorts

```ts
interface StartAndWaitForPortsOptions {
  startOptions?: {
    /** Environment variables to pass to the container */
    envVars?: Record<string, string>;
    /** Custom entrypoint to override container default */
    entrypoint?: string[];
    /** Whether to enable internet access for the container */
    enableInternet?: boolean;
  };
  /** Ports to check */
  ports?: number | number[];
  cancellationOptions?: {
    /** Abort signal to cancel start and port checking */
    abort?: AbortSignal;
    /** Max time to wait for container to start, in milliseconds */
    instanceGetTimeoutMS?: number;
    /** Max time to wait for ports to be ready, in milliseconds */
    portReadyTimeoutMS?: number;
    /** Polling interval for checking container has started or ports are ready, in milliseconds */
    waitInterval?: number;
  };
}
```

## Usage

```ts
await container.startAndWaitForPorts({
  startOptions: {
    envVars: {
      WEB_PASSWORD: env.WEB_PASSWORD,
    },
  },
  ports: 8080,
});
```
