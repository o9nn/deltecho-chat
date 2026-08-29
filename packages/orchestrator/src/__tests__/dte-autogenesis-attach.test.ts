import { describe, expect, it, jest } from "@jest/globals";
import {
  attachEntelechyIdentity,
  startEntelechyWithOptionalIdentity,
} from "../dte-composition.js";

describe("startEntelechyWithOptionalIdentity", () => {
  it("attaches the same identity instance then starts Entelechy", async () => {
    const events: string[] = [];
    const identity = { id: "core-self-identity" };
    const entelechy = {
      attachIdentity: (mesh: unknown) => {
        events.push(mesh === identity ? "attach:same" : "attach:other");
      },
      start: async () => {
        events.push("start");
      },
    };

    const { attached } = await startEntelechyWithOptionalIdentity(
      entelechy,
      identity,
    );

    expect(attached).toBe(true);
    expect(events).toEqual(["attach:same", "start"]);
  });

  it("starts Entelechy without attaching when CoreSelf is absent", async () => {
    const events: string[] = [];
    const entelechy = {
      attachIdentity: () => {
        events.push("attach");
      },
      start: async () => {
        events.push("start");
      },
    };

    const { attached } = await startEntelechyWithOptionalIdentity(
      entelechy,
      undefined,
    );

    expect(attached).toBe(false);
    expect(events).toEqual(["start"]);
  });

  it("attachEntelechyIdentity is a no-op when identity is undefined", () => {
    const attachIdentity = jest.fn();
    const attached = attachEntelechyIdentity({ attachIdentity }, undefined);
    expect(attached).toBe(false);
    expect(attachIdentity).not.toHaveBeenCalled();
  });
});
