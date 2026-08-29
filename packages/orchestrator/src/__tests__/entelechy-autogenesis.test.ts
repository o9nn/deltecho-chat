import { describe, expect, it, jest } from "@jest/globals";
import {
  EntelechyIntegration,
  type EntelechyIntegrationDeps,
} from "../entelechy-integration.js";

function makeIntegration(deps: EntelechyIntegrationDeps) {
  return new EntelechyIntegration(
    {
      enableReservoir: false,
      enableEchoBeats: false,
      enableEntelechy: false,
      enableConsciousness: false,
    },
    deps,
  );
}

function mockCoupler(couple = jest.fn(() => ({ skipped: false }))) {
  return {
    couple,
    attachIdentity: jest.fn(),
  };
}

describe("EntelechyIntegration autogenesis couple", () => {
  it("invokes couple after backgroundTick when a report is present", () => {
    const coupler = mockCoupler();
    const integration = makeIntegration({
      coupler,
      reportPresent: () => true,
    });

    integration.tickOnce();

    expect(coupler.couple).toHaveBeenCalledTimes(1);
  });

  it("invokes couple after processMessage when a report is present", async () => {
    const coupler = mockCoupler();
    const integration = makeIntegration({
      coupler,
      reportPresent: () => true,
    });

    const result = await integration.processMessage("hello");

    expect(coupler.couple).toHaveBeenCalledTimes(1);
    expect(result.response).toBeDefined();
  });

  it("skips couple when no autognosis report is present", async () => {
    const coupler = mockCoupler();
    const integration = makeIntegration({
      coupler,
      reportPresent: () => false,
    });

    integration.tickOnce();
    await integration.processMessage("hello");

    expect(coupler.couple).not.toHaveBeenCalled();
  });

  it("swallows coupler throws on tick and still returns processMessage result", async () => {
    const couple = jest.fn().mockImplementation(() => {
      throw new Error("boom");
    });
    const coupler = mockCoupler(couple);
    const integration = makeIntegration({
      coupler,
      reportPresent: () => true,
    });

    expect(() => integration.tickOnce()).not.toThrow();
    const result = await integration.processMessage("hello");
    expect(result.response).toBeDefined();
    expect(result.snapshot).toBeDefined();
    expect(couple).toHaveBeenCalledTimes(2);
  });
});
