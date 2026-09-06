//@ts-check
import { versions } from "process";

const MIN_NODE_VERSION = 20;
const MAX_NODE_VERSION = 22;

const majorVersion = Number(versions.node.split(".")[0]);
if (majorVersion < MIN_NODE_VERSION || majorVersion > MAX_NODE_VERSION) {
  console.log(
    `ERROR:\n!!!\nDeltEcho Chat supports Node.js ${MIN_NODE_VERSION} through ${MAX_NODE_VERSION}, but you have ${versions.node}. Use an LTS release in the supported range.\n!!!`,
  );
  process.exit(1);
}
