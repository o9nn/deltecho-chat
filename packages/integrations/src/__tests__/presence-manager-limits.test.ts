import {
  createPresenceManager,
  Platform,
  PresenceStatus,
  ActivityType as _ActivityType,
  type PresenceAdapter,
  UnifiedPresenceManager,
} from "../cross-platform/presence-manager";

describe("UnifiedPresenceManager Limits", () => {
  let manager: UnifiedPresenceManager;

  beforeEach(() => {
    manager = createPresenceManager({ debug: false });
    jest.useFakeTimers();
  });

  afterEach(() => {
    manager.destroy();
    jest.useRealTimers();
  });

  it("should confirm initial lack of rate limiting", async () => {
    const setStatusMock = jest.fn().mockResolvedValue(undefined);
    const mockAdapter: PresenceAdapter = {
      platform: Platform.DISCORD,
      setStatus: setStatusMock,
      setActivity: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockResolvedValue(PresenceStatus.ONLINE),
      isConnected: jest.fn().mockReturnValue(true),
    };

    manager.registerAdapter(mockAdapter);

    // Send 10 updates rapidly
    for (let i = 0; i < 10; i++) {
      await manager.updatePresence({
        platform: Platform.DISCORD,
        status: i % 2 === 0 ? PresenceStatus.ONLINE : PresenceStatus.IDLE,
      });
    }

    // With rate limiting, only 2 calls should go through:
    // 1. The first immediate call
    // 2. The debounced final call after the timer runs
    // (The 8 intermediate calls are dropped because a pending update already exists)

    expect(setStatusMock).toHaveBeenCalledTimes(1);

    // Fast forward time
    jest.runAllTimers();

    // Should have one more call now (the final state)
    expect(setStatusMock).toHaveBeenCalledTimes(2);

    // And the final call should have the latest status (last loop iteration was IDLE)
    // i=9 -> 9%2 != 0 -> IDLE
    expect(setStatusMock).toHaveBeenLastCalledWith(PresenceStatus.IDLE);
  });
});
