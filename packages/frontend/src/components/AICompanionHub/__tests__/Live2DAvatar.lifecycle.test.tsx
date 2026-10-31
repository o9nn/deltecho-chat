import React from "react";
import { act, render, waitFor } from "@testing-library/react";
import { Live2DAvatarManager } from "@deltecho/avatar";
import { Live2DAvatar } from "../Live2DAvatar";

jest.mock("@deltecho/avatar", () => ({ Live2DAvatarManager: jest.fn() }));
const mockConstructor = Live2DAvatarManager as unknown as jest.Mock;
const deferred = () => {
  let resolve!: (value: unknown) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const mockPending: ReturnType<typeof deferred>[] = [];
const mockManagers: Array<{
  initialize: jest.Mock;
  dispose: jest.Mock;
  updateCognitiveState: jest.Mock;
  updateEmotionalState: jest.Mock;
  resize: jest.Mock;
}> = [];
const controller = () => ({
  updateLipSync: jest.fn(),
  setNamedExpression: jest.fn(),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockManagers.length = 0;
  mockPending.length = 0;
  mockConstructor.mockImplementation(() => {
    const pending = mockPending.shift()!;
    const manager = {
      initialize: jest.fn((_host, props) =>
        pending.promise.then((value) => {
          props.onLoad?.();
          return value;
        }),
      ),
      dispose: jest.fn(),
      updateCognitiveState: jest.fn(),
      updateEmotionalState: jest.fn(),
      resize: jest.fn(),
    };
    mockManagers.push(manager);
    return manager;
  });
});

it("disposes its own pending manager and never publishes after unmount", async () => {
  const pending = deferred();
  mockPending.push(pending);
  const ready = jest.fn();
  const view = render(<Live2DAvatar onControllerReady={ready} />);
  await waitFor(() => expect(mockManagers).toHaveLength(1));
  view.unmount();
  expect(mockManagers[0].dispose).toHaveBeenCalledTimes(1);
  await act(async () => {
    pending.resolve(controller());
    await pending.promise;
  });
  expect(mockManagers[0].dispose).toHaveBeenCalledTimes(1);
  expect(ready).not.toHaveBeenCalled();
});

it("keeps the newer model controller when the older load finishes late", async () => {
  const first = deferred(),
    second = deferred();
  mockPending.push(first, second);
  const ready = jest.fn();
  const view = render(
    <Live2DAvatar model="/first.model3.json" onControllerReady={ready} />,
  );
  await waitFor(() => expect(mockManagers).toHaveLength(1));
  view.rerender(
    <Live2DAvatar model="/second.model3.json" onControllerReady={ready} />,
  );
  await waitFor(() => expect(mockManagers).toHaveLength(2));
  const current = controller();
  await act(async () => {
    second.resolve(current);
    await second.promise;
  });
  await waitFor(() => expect(ready).toHaveBeenCalledWith(current));
  await act(async () => {
    first.resolve(controller());
    await first.promise;
  });
  expect(ready).toHaveBeenCalledTimes(1);
  expect(mockManagers[0].dispose).toHaveBeenCalledTimes(1);
  expect(mockManagers[1].dispose).not.toHaveBeenCalled();
  view.unmount();
  expect(mockManagers[1].dispose).toHaveBeenCalledTimes(1);
});

it("does not report an old model's late failure on the newer effect", async () => {
  const first = deferred(),
    second = deferred();
  mockPending.push(first, second);
  const error = jest.fn();
  const view = render(
    <Live2DAvatar model="/first.model3.json" onError={error} />,
  );
  await waitFor(() => expect(mockManagers).toHaveLength(1));
  view.rerender(<Live2DAvatar model="/second.model3.json" onError={error} />);
  await waitFor(() => expect(mockManagers).toHaveLength(2));
  await act(async () => {
    first.reject(new Error("stale model"));
    await first.promise.catch(() => {});
  });
  expect(error).not.toHaveBeenCalled();
  expect(mockManagers[1].dispose).not.toHaveBeenCalled();
  await act(async () => {
    second.resolve(controller());
    await second.promise;
  });
});
