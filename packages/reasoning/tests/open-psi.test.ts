import { OpenPsi } from "../src/index.js";

describe("OpenPsi", () => {
  let psi: OpenPsi;

  beforeEach(() => {
    psi = new OpenPsi();
  });

  it("should initialize needs", () => {
    expect(psi.getNeed("energy")).toBeDefined();
    expect(psi.getGlobalSatisfaction()).toBeGreaterThan(0);
  });

  it("should decay needs over time", () => {
    const initial = psi.getNeed("energy")!.value;
    psi.step();
    expect(psi.getNeed("energy")!.value).toBeLessThan(initial);
  });

  it("should update needs manually", () => {
    psi.updateNeed("energy", -0.5);
    expect(psi.getNeed("energy")!.value).toBe(0.5);
  });
});
