import { SharedMemoryManager } from "../federation/SharedMemoryManager";
import { Node, AtomType } from "../atomspace/atom";

describe("SharedMemoryManager", () => {
  let manager: SharedMemoryManager;

  beforeEach(() => {
    // Reset singleton (hacky but needed for tests if state persists,
    // ideally we'd have a reset method or avoid singleton in tests)
    // For now, we assume fresh instance or just test state mutations
    manager = SharedMemoryManager.getInstance();
  });

  test("should publish public atoms", async () => {
    const atom = new Node(
      "test-public",
      AtomType.ConceptNode,
      undefined,
      undefined,
      "public",
    );
    const success = await manager.publishAtom(atom);
    expect(success).toBe(true);

    const results = await manager.querySharedAtoms({ topic: "test" });
    expect(results).toContain(atom);
  });

  test("should reject private atoms", async () => {
    const atom = new Node(
      "test-private",
      AtomType.ConceptNode,
      undefined,
      undefined,
      "private",
    );
    const success = await manager.publishAtom(atom);
    expect(success).toBe(false);

    const results = await manager.querySharedAtoms({ topic: "test-private" });
    expect(results).not.toContain(atom);
  });

  test("should notify subscribers", async () => {
    const callback = jest.fn();
    manager.subscribeToTopic("subscribe", callback);

    const atom = new Node(
      "subscribe-test",
      AtomType.ConceptNode,
      undefined,
      undefined,
      "public",
    );
    await manager.publishAtom(atom);

    expect(callback).toHaveBeenCalledWith(atom);
  });
});
