/**
 * DeepTreeEchoAvatarContext Tests
 *
 * Tests for the avatar context provider and hooks.
 */

import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import {
  DeepTreeEchoAvatarProvider,
  useDeepTreeEchoAvatar,
  useDeepTreeEchoAvatarOptional,
  AvatarProcessingState,
} from "../DeepTreeEchoAvatarContext";

// Test component that uses the required hook
function TestConsumer() {
  const avatar = useDeepTreeEchoAvatar();
  return (
    <div>
      <span data-testid="processing-state">{avatar.state.processingState}</span>
      <span data-testid="is-speaking">
        {avatar.state.isSpeaking.toString()}
      </span>
      <span data-testid="audio-level">{avatar.state.audioLevel}</span>
      <span data-testid="outfit">{avatar.state.config.outfit}</span>
      <span data-testid="outfit-hue">{avatar.state.config.outfitHueShift}</span>
      <button
        type="button"
        data-testid="set-listening"
        onClick={() =>
          avatar.setProcessingState(AvatarProcessingState.LISTENING)
        }
      >
        Set Listening
      </button>
      <button
        type="button"
        data-testid="set-speaking"
        onClick={() => avatar.setIsSpeaking(true)}
      >
        Set Speaking
      </button>
      <button
        type="button"
        data-testid="set-audio"
        onClick={() => avatar.setAudioLevel(0.75)}
      >
        Set Audio
      </button>
      <button
        type="button"
        data-testid="set-rose-outfit"
        onClick={() =>
          avatar.updateConfig({
            outfit: "rose",
            outfitHiddenGroups: [],
            outfitHueShift: 310,
          })
        }
      >
        Set Rose
      </button>
    </div>
  );
}

// Test component that uses the optional hook
function TestOptionalConsumer() {
  const avatar = useDeepTreeEchoAvatarOptional();
  return (
    <div>
      <span data-testid="has-context">{avatar ? "yes" : "no"}</span>
      {avatar && (
        <span data-testid="optional-state">{avatar.state.processingState}</span>
      )}
    </div>
  );
}

describe("DeepTreeEchoAvatarContext", () => {
  describe("DeepTreeEchoAvatarProvider", () => {
    it("should render children", () => {
      render(
        <DeepTreeEchoAvatarProvider>
          <div data-testid="child">Child content</div>
        </DeepTreeEchoAvatarProvider>,
      );
      expect(screen.getByTestId("child")).toHaveTextContent("Child content");
    });

    it("should provide default values", () => {
      render(
        <DeepTreeEchoAvatarProvider>
          <TestConsumer />
        </DeepTreeEchoAvatarProvider>,
      );
      expect(screen.getByTestId("processing-state")).toHaveTextContent(
        AvatarProcessingState.IDLE,
      );
      expect(screen.getByTestId("is-speaking")).toHaveTextContent("false");
      expect(screen.getByTestId("audio-level")).toHaveTextContent("0");
    });
  });

  describe("useDeepTreeEchoAvatar", () => {
    it("should throw when used outside provider", () => {
      // Suppress console.error for this test
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow(
        "useDeepTreeEchoAvatar must be used within DeepTreeEchoAvatarProvider",
      );

      consoleSpy.mockRestore();
    });

    it("should update processing state", () => {
      render(
        <DeepTreeEchoAvatarProvider>
          <TestConsumer />
        </DeepTreeEchoAvatarProvider>,
      );

      const button = screen.getByTestId("set-listening");
      act(() => {
        button.click();
      });

      expect(screen.getByTestId("processing-state")).toHaveTextContent(
        AvatarProcessingState.LISTENING,
      );
    });

    it("should update speaking state", () => {
      render(
        <DeepTreeEchoAvatarProvider>
          <TestConsumer />
        </DeepTreeEchoAvatarProvider>,
      );

      const button = screen.getByTestId("set-speaking");
      act(() => {
        button.click();
      });

      expect(screen.getByTestId("is-speaking")).toHaveTextContent("true");
    });

    it("should update audio level", () => {
      render(
        <DeepTreeEchoAvatarProvider>
          <TestConsumer />
        </DeepTreeEchoAvatarProvider>,
      );

      const button = screen.getByTestId("set-audio");
      act(() => {
        button.click();
      });

      expect(screen.getByTestId("audio-level")).toHaveTextContent("0.75");
    });
  });

  describe("useDeepTreeEchoAvatarOptional", () => {
    it("should return null when used outside provider", () => {
      render(<TestOptionalConsumer />);
      expect(screen.getByTestId("has-context")).toHaveTextContent("no");
    });

    it("should return context when used inside provider", () => {
      render(
        <DeepTreeEchoAvatarProvider>
          <TestOptionalConsumer />
        </DeepTreeEchoAvatarProvider>,
      );
      expect(screen.getByTestId("has-context")).toHaveTextContent("yes");
      expect(screen.getByTestId("optional-state")).toHaveTextContent(
        AvatarProcessingState.IDLE,
      );
    });
  });

  describe("outfit persistence", () => {
    it("defaults to the official Miara outfit", () => {
      render(
        <DeepTreeEchoAvatarProvider>
          <TestConsumer />
        </DeepTreeEchoAvatarProvider>,
      );
      expect(screen.getByTestId("outfit")).toHaveTextContent("official");
      expect(screen.getByTestId("outfit-hue")).toHaveTextContent("0");
    });

    it("persists the selected outfit to localStorage", () => {
      render(
        <DeepTreeEchoAvatarProvider>
          <TestConsumer />
        </DeepTreeEchoAvatarProvider>,
      );

      act(() => {
        screen.getByTestId("set-rose-outfit").click();
      });

      expect(screen.getByTestId("outfit")).toHaveTextContent("rose");
      const saved = JSON.parse(
        window.localStorage.getItem("deepTreeEchoAvatarConfig") || "{}",
      );
      expect(saved.outfit).toBe("rose");
      expect(saved.outfitHueShift).toBe(310);
    });

    it("restores the selected outfit on a later session", async () => {
      window.localStorage.setItem(
        "deepTreeEchoAvatarConfig",
        JSON.stringify({
          outfit: "midnight",
          outfitHiddenGroups: [],
          outfitHueShift: 210,
        }),
      );

      render(
        <DeepTreeEchoAvatarProvider>
          <TestConsumer />
        </DeepTreeEchoAvatarProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("outfit")).toHaveTextContent("midnight");
      });
      expect(screen.getByTestId("outfit-hue")).toHaveTextContent("210");
    });
  });

  describe("AvatarProcessingState enum", () => {
    it("should have all expected states", () => {
      expect(AvatarProcessingState.IDLE).toBe("idle");
      expect(AvatarProcessingState.LISTENING).toBe("listening");
      expect(AvatarProcessingState.THINKING).toBe("thinking");
      expect(AvatarProcessingState.RESPONDING).toBe("responding");
      expect(AvatarProcessingState.ERROR).toBe("error");
    });
  });

  describe("state reset behavior", () => {
    it("should maintain state across re-renders", () => {
      const { rerender } = render(
        <DeepTreeEchoAvatarProvider>
          <TestConsumer />
        </DeepTreeEchoAvatarProvider>,
      );

      // Update state
      const button = screen.getByTestId("set-listening");
      act(() => {
        button.click();
      });

      expect(screen.getByTestId("processing-state")).toHaveTextContent(
        AvatarProcessingState.LISTENING,
      );

      // Re-render
      rerender(
        <DeepTreeEchoAvatarProvider>
          <TestConsumer />
        </DeepTreeEchoAvatarProvider>,
      );

      // State should be maintained (provider maintains its own state)
      expect(screen.getByTestId("processing-state")).toHaveTextContent(
        AvatarProcessingState.LISTENING,
      );
    });
  });
});
