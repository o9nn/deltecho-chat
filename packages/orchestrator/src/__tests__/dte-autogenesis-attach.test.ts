import { describe, expect, it, jest } from "@jest/globals";
import {
  attachEntelechyIdentity,
  startEntelechyWithOptionalIdentity,
  tryStartCoreSelf,
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

    const { attached, canonicalAttached } =
      await startEntelechyWithOptionalIdentity(entelechy, identity);

    expect(attached).toBe(true);
    expect(canonicalAttached).toBe(false);
    expect(events).toEqual(["attach:same", "start"]);
  });

  it("attaches adaptive identity and canonical proposal sink before start", async () => {
    const events: string[] = [];
    const identity = { id: "core-self-identity" };
    const canonical = {
      observeAdaptiveGovernance: () => undefined,
    };
    const result = await startEntelechyWithOptionalIdentity(
      {
        attachIdentity: () => events.push("identity"),
        attachCanonicalProposalSink: (sink) =>
          events.push(sink === canonical ? "canonical" : "wrong-canonical"),
        start: async () => {
          events.push("start");
        },
      },
      identity,
      canonical,
    );

    expect(result).toEqual({ attached: true, canonicalAttached: true });
    expect(events).toEqual(["identity", "canonical", "start"]);
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

    const { attached, canonicalAttached } =
      await startEntelechyWithOptionalIdentity(entelechy, undefined);

    expect(attached).toBe(false);
    expect(canonicalAttached).toBe(false);
    expect(events).toEqual(["start"]);
  });

  it("attachEntelechyIdentity is a no-op when identity is undefined", () => {
    const attachIdentity = jest.fn();
    const attached = attachEntelechyIdentity({ attachIdentity }, undefined);
    expect(attached).toBe(false);
    expect(attachIdentity).not.toHaveBeenCalled();
  });

  it("tryStartCoreSelf returns the engine and still starts Entelechy after a throw", async () => {
    const engine = { getIdentity: () => ({ id: "mesh" }) };
    const started = await tryStartCoreSelf(async () => engine);
    expect(started).toBe(engine);

    const onError = jest.fn();
    const failed = await tryStartCoreSelf(async () => {
      throw new Error("lucy-down");
    }, onError);
    expect(failed).toBeUndefined();
    expect(onError).toHaveBeenCalledTimes(1);

    const events: string[] = [];
    const { attached } = await startEntelechyWithOptionalIdentity(
      {
        attachIdentity: () => {
          events.push("attach");
        },
        start: async () => {
          events.push("start");
        },
      },
      undefined,
    );
    expect(attached).toBe(false);
    expect(events).toEqual(["start"]);
  });
});
