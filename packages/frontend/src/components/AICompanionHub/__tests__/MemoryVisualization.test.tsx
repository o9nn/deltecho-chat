import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import MemoryVisualization from "../MemoryVisualization";
import { AIMemory } from "../MemoryPersistenceLayer";

let mockMemories: AIMemory[] = [];
const mockCompanions: any[] = [];
const mockGraphConstructor = jest.fn();
const mockSpriteText = jest.fn();
let mockDependencyError: Error | null = null;

jest.mock("../AICompanionController", () => ({
  AICompanionProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useAICompanion: () => ({
    companions: mockCompanions,
    memories: mockMemories,
    searchMemories: jest.fn().mockResolvedValue([]),
  }),
}));

// The browser-only graph engine is explicitly mocked here because jsdom cannot
// create a WebGL renderer. Production still dynamically loads the published API.
jest.mock("3d-force-graph", () => ({
  __esModule: true,
  default: mockGraphConstructor,
}));

jest.mock("three-spritetext", () => ({
  __esModule: true,
  get default() {
    if (mockDependencyError) throw mockDependencyError;
    return mockSpriteText;
  },
}));

const memory: AIMemory = {
  id: "memory-1",
  companionId: "companion-1",
  timestamp: 1,
  content: "A stored memory for the force graph",
  context: "test",
  emotionalTone: "joy",
  topics: ["testing"],
  importance: 1,
  relationships: {},
};

const createGraph = () => {
  const graph = {
    _destructor: jest.fn(),
    width: jest.fn(),
    height: jest.fn(),
    backgroundColor: jest.fn(),
    nodeVal: jest.fn(),
    nodeLabel: jest.fn(),
    nodeColor: jest.fn(),
    linkWidth: jest.fn(),
    linkColor: jest.fn(),
    nodeThreeObject: jest.fn(),
    onNodeClick: jest.fn(),
    onNodeHover: jest.fn(),
    graphData: jest.fn(),
    d3Force: jest.fn(),
    scene: jest.fn(),
  };
  const chainableMethods = [
    "width",
    "height",
    "backgroundColor",
    "nodeVal",
    "nodeLabel",
    "nodeColor",
    "linkWidth",
    "linkColor",
    "nodeThreeObject",
    "onNodeClick",
    "onNodeHover",
    "graphData",
  ] as const;
  chainableMethods.forEach((method) => graph[method].mockReturnValue(graph));
  graph.d3Force.mockImplementation((name: string) =>
    name === "charge" ? { strength: jest.fn() } : { distance: jest.fn() },
  );
  graph.scene.mockReturnValue({ rotation: { y: 0 } });
  return graph;
};

describe("MemoryVisualization graph runtime", () => {
  let consoleErrorSpy: jest.SpyInstance;
  let requestAnimationFrameSpy: jest.Mock;
  let cancelAnimationFrameSpy: jest.Mock;

  beforeEach(() => {
    mockMemories = [memory];
    mockGraphConstructor.mockReset();
    mockSpriteText.mockReset();
    mockDependencyError = null;
    mockSpriteText.mockImplementation(function SpriteText(this: object) {
      return this;
    });
    requestAnimationFrameSpy = jest.fn(() => 42);
    cancelAnimationFrameSpy = jest.fn();
    Object.defineProperty(global, "requestAnimationFrame", {
      configurable: true,
      value: requestAnimationFrameSpy,
    });
    Object.defineProperty(global, "cancelAnimationFrame", {
      configurable: true,
      value: cancelAnimationFrameSpy,
    });
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("constructs the published graph API, rotates its Three scene, and destroys it on unmount", async () => {
    const graph = createGraph();
    mockGraphConstructor.mockImplementation(() => graph);

    const { unmount } = render(<MemoryVisualization />);

    await waitFor(() => expect(mockGraphConstructor).toHaveBeenCalledTimes(1));
    expect(mockGraphConstructor.mock.calls[0][1]).toEqual({
      rendererConfig: { antialias: true, alpha: true },
    });
    expect(graph.scene).toHaveBeenCalledTimes(1);
    const scene = graph.scene.mock.results[0].value;
    expect(scene.rotation.y).toBeCloseTo(0.001);
    expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    unmount();

    expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(42);
    expect(graph._destructor).toHaveBeenCalledTimes(1);
  });

  it("reports a failed initializer, cleans its partial graph, and retries successfully", async () => {
    const partialGraph = createGraph();
    const succeedingGraph = createGraph();
    mockGraphConstructor
      .mockImplementationOnce(() => {
        partialGraph.scene.mockImplementation(() => {
          throw new Error("WebGL initialization failed");
        });
        return partialGraph;
      })
      .mockImplementation(() => succeedingGraph);

    render(<MemoryVisualization />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Unable to load the 3D memory graph.");
    expect(alert).toHaveTextContent("WebGL initialization failed");
    expect(partialGraph._destructor).toHaveBeenCalledTimes(1);
    expect(cancelAnimationFrameSpy).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Retry graph loading" }),
    );

    await waitFor(() => expect(mockGraphConstructor).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(succeedingGraph.scene).toHaveBeenCalledTimes(1);
  });

  it("announces a dependency loading failure and retries without constructing a broken renderer", async () => {
    mockDependencyError = new Error("Controlled sprite dependency failure");
    mockGraphConstructor.mockImplementation(() => createGraph());
    render(<MemoryVisualization />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Controlled sprite dependency failure");
    expect(mockGraphConstructor).not.toHaveBeenCalled();

    mockDependencyError = null;
    fireEvent.click(
      screen.getByRole("button", { name: "Retry graph loading" }),
    );
    await waitFor(() => expect(mockGraphConstructor).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not construct or update a graph after unmounting before imports resolve", async () => {
    mockGraphConstructor.mockImplementation(() => createGraph());

    const { unmount } = render(<MemoryVisualization />);
    unmount();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockGraphConstructor).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
