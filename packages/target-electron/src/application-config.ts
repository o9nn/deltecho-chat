// @ts-ignore
import applicationConfig from "application-config";
if (process.env.NODE_ENV !== "production") {
  try {
    const { config } = await import("dotenv");
    config();
  } catch (e) {
    /* ignore-console-log */
    console.error("Failed to load .env file", e);
  }
}

// Use 'DeltEcho' instead of 'DeltaChat' to have separate data directory
// This prevents conflicts with regular DeltaChat installations
const appConfig = applicationConfig("DeltEcho");

import { join } from "path";

if (process.env.DC_TEST_DIR) {
  appConfig.filePath = join(process.env.DC_TEST_DIR, "config.json");
} else if (process.env.PORTABLE_EXECUTABLE_DIR) {
  /* ignore-console-log */
  console.log("Running in Portable Mode", process.env.PORTABLE_EXECUTABLE_DIR);
  appConfig.filePath = join(
    process.env.PORTABLE_EXECUTABLE_DIR,
    "DeltEchoData",
    "config.json",
  );
}

export default Object.freeze(appConfig);
