import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import _userEvent from "@testing-library/user-event";
import BotSettings from "../BotSettings";

// Mock dependencies
jest.mock("@deltachat-desktop/runtime-interface", () => ({
  runtime: {
    getDesktopSettings: jest.fn().mockResolvedValue({
      deepTreeEchoBotEnabled: true,
      deepTreeEchoBotMemoryEnabled: false,
      deepTreeEchoBotPersonality: "Test personality",
      deepTreeEchoBotApiKey: "test-api-key",
      deepTreeEchoBotApiEndpoint: "https://api.example.com",
      deepTreeEchoBotVisionEnabled: false,
      deepTreeEchoBotWebAutomationEnabled: false,
      deepTreeEchoBotEmbodimentEnabled: false,
      deepTreeEchoBotProactiveEnabled: false,
      deepTreeEchoBotProactiveTriggers: "[]",
    }),
    setDesktopSetting: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock the logger
jest.mock("../../../../../shared/logger", () => ({
  getLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock saveBotSettings
jest.mock("../../DeepTreeEchoBot", () => ({
  saveBotSettings: jest.fn(),
}));

// Mock PersonaCore
jest.mock("../../DeepTreeEchoBot/PersonaCore", () => ({
  PersonaCore: {
    getInstance: jest.fn().mockReturnValue({
      evaluateSettingAlignment: jest.fn().mockReturnValue({
        approved: true,
        reasoning: "",
      }),
    }),
  },
}));

// Mock DivergenceMonitor
jest.mock("../../DeepTreeEchoBot/DivergenceMonitor", () => ({
  DivergenceMonitor: () => (
    <div data-testid="divergence-monitor">Divergence Monitor</div>
  ),
}));

// Mock UI components with proper typing
jest.mock("../SettingsHeading", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

jest.mock("../DesktopSettingsSwitch", () => ({
  __esModule: true,
  default: ({
    settingsKey,
    label,
    description,
    disabled,
  }: {
    settingsKey: string;
    label: string;
    description?: string;
    disabled?: boolean;
  }) => (
    <div data-testid={`switch-${settingsKey}`}>
      <input
        type="checkbox"
        role="checkbox"
        aria-label={label}
        disabled={disabled}
        data-settings-key={settingsKey}
      />
      <span>{label}</span>
      {description && <span data-testid="description">{description}</span>}
    </div>
  ),
}));

jest.mock("../SettingsSeparator", () => ({
  __esModule: true,
  default: () => <hr data-testid="separator" />,
}));

jest.mock("../SettingsButton", () => ({
  __esModule: true,
  default: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

jest.mock("../../Login-Styles", () => ({
  DeltaInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
  DeltaTextarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
}));

jest.mock("../../Callout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div role="alert">{children}</div>
  ),
}));

describe("BotSettings", () => {
  const mockSettingsStore = {
    accountId: 1,
    selfContact: {
      address: "test@example.com",
      displayName: "Test User",
      color: "#5555FF",
      authName: "Test User",
      status: "Available",
      id: 1,
      name: "Test User",
      profileImage: "",
      nameAndAddr: "Test User (test@example.com)",
      isBlocked: false,
      isVerified: true,
      verifier: "",
      wasSeenRecently: true,
      lastSeen: new Date().getTime(),
      isBot: false,
      isArchiveLink: false,
      e2eeAvail: true,
      isProfileVerified: false,
      verifierId: 0,
    },
    settings: {
      sentbox_watch: "1",
      mvbox_move: "1",
      e2ee_enabled: "1",
      addr: "test@example.com",
      displayname: "Test User",
      selfstatus: "",
      mdns_enabled: "1",
      show_emails: "0",
      bcc_self: "0",
      delete_device_after: "0",
      delete_server_after: "0",
      webrtc_instance: "",
      download_limit: "0",
      only_fetch_mvbox: "0",
      media_quality: "0",
      is_chatmail: "0" as const,
      webxdc_realtime_enabled: "1",
    },
    rc: {
      "log-debug": false,
      "log-to-console": false,
      "machine-readable-stacktrace": false,
      theme: undefined,
      "theme-watch": false,
      devmode: false,
      "translation-watch": false,
      minimized: false,
      version: false,
      v: false,
      help: false,
      h: false,
      "allow-unsafe-core-replacement": false,
    },
    desktopSettings: {
      bounds: {},
      HTMLEmailWindowBounds: undefined,
      lastChats: {},
      lastSaveDialogLocation: undefined,
      enterKeySends: false,
      notifications: true,
      showNotificationContent: true,
      locale: null,
      lastAccount: undefined,
      enableAVCalls: false,
      enableBroadcastLists: false,
      enableChatAuditLog: false,
      enableOnDemandLocationStreaming: false,
      zoomFactor: 1,
      activeTheme: "system",
      minimizeToTray: true,
      syncAllAccounts: true,
      experimentalEnableMarkdownInMessages: false,
      enableWebxdcDevTools: false,
      HTMLEmailAskForRemoteLoadingConfirmation: true,
      HTMLEmailAlwaysLoadRemoteContent: false,
      enableRelatedChats: false,
      galleryImageKeepAspectRatio: false,
      useSystemUIFont: false,
      contentProtectionEnabled: false,
      isMentionsEnabled: true,
      autostart: true,
      deepTreeEchoBotEnabled: true,
      deepTreeEchoBotMemoryEnabled: false,
      deepTreeEchoBotPersonality: "Test personality",
      deepTreeEchoBotApiKey: "test-api-key",
      deepTreeEchoBotApiEndpoint: "https://api.example.com",
      deepTreeEchoBotVisionEnabled: false,
      deepTreeEchoBotWebAutomationEnabled: false,
      deepTreeEchoBotEmbodimentEnabled: false,
      deepTreeEchoBotPersonaState: "",
      deepTreeEchoBotMemories: "",
      deepTreeEchoBotReflections: "",
      deepTreeEchoBotCognitiveKeys: "",
    },
    setDesktopSetting: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows loading state initially", async () => {
    render(<BotSettings settingsStore={mockSettingsStore} />);

    // Initially should show loading
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // After async operations complete, should show content
    await act(async () => {
      jest.runAllTimers();
    });
  });

  it("renders correctly after loading", async () => {
    await act(async () => {
      render(<BotSettings settingsStore={mockSettingsStore} />);
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText("General")).toBeInTheDocument();
    });

    expect(screen.getByText("Capabilities")).toBeInTheDocument();
    expect(screen.getByText("API Configuration")).toBeInTheDocument();
    expect(screen.getByText("Personality")).toBeInTheDocument();
  });

  it("renders enable bot switch", async () => {
    await act(async () => {
      render(<BotSettings settingsStore={mockSettingsStore} />);
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("switch-deepTreeEchoBotEnabled"),
      ).toBeInTheDocument();
    });
  });

  it("renders memory switch", async () => {
    await act(async () => {
      render(<BotSettings settingsStore={mockSettingsStore} />);
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("switch-deepTreeEchoBotMemoryEnabled"),
      ).toBeInTheDocument();
    });
  });

  it("renders capability switches", async () => {
    await act(async () => {
      render(<BotSettings settingsStore={mockSettingsStore} />);
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("switch-deepTreeEchoBotVisionEnabled"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("switch-deepTreeEchoBotWebAutomationEnabled"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("switch-deepTreeEchoBotEmbodimentEnabled"),
      ).toBeInTheDocument();
    });
  });

  it("renders API key input", async () => {
    await act(async () => {
      render(<BotSettings settingsStore={mockSettingsStore} />);
      jest.runAllTimers();
    });

    await waitFor(() => {
      const apiKeyInput = screen.getByPlaceholderText("Enter your LLM API key");
      expect(apiKeyInput).toBeInTheDocument();
    });
  });

  it("renders API endpoint input", async () => {
    await act(async () => {
      render(<BotSettings settingsStore={mockSettingsStore} />);
      jest.runAllTimers();
    });

    await waitFor(() => {
      const apiEndpointInput = screen.getByPlaceholderText(
        "Enter LLM API endpoint",
      );
      expect(apiEndpointInput).toBeInTheDocument();
    });
  });

  it("renders personality textarea", async () => {
    await act(async () => {
      render(<BotSettings settingsStore={mockSettingsStore} />);
      jest.runAllTimers();
    });

    await waitFor(() => {
      const personalityTextarea = screen.getByPlaceholderText(
        "Define the bot's personality...",
      );
      expect(personalityTextarea).toBeInTheDocument();
    });
  });

  it("renders divergence monitor", async () => {
    await act(async () => {
      render(<BotSettings settingsStore={mockSettingsStore} />);
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByTestId("divergence-monitor")).toBeInTheDocument();
    });
  });

  it("renders available commands list", async () => {
    await act(async () => {
      render(<BotSettings settingsStore={mockSettingsStore} />);
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText("Available Commands:")).toBeInTheDocument();
      expect(screen.getByText("/help - List commands")).toBeInTheDocument();
      expect(screen.getByText("/vision - Analyze images")).toBeInTheDocument();
      expect(screen.getByText("/search - Web search")).toBeInTheDocument();
    });
  });

  it("renders advanced settings button", async () => {
    const mockOnNavigate = jest.fn();

    await act(async () => {
      render(
        <BotSettings
          settingsStore={mockSettingsStore}
          onNavigateToAdvanced={mockOnNavigate}
        />,
      );
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Advanced Settings" }),
      ).toBeInTheDocument();
    });
  });

  it("disables capability switches when bot is disabled", async () => {
    const disabledSettingsStore = {
      ...mockSettingsStore,
      desktopSettings: {
        ...mockSettingsStore.desktopSettings,
        deepTreeEchoBotEnabled: false,
      },
    };

    await act(async () => {
      render(<BotSettings settingsStore={disabledSettingsStore} />);
      jest.runAllTimers();
    });

    await waitFor(() => {
      const memorySwitch = screen.getByTestId(
        "switch-deepTreeEchoBotMemoryEnabled",
      );
      const checkbox = memorySwitch.querySelector("input");
      expect(checkbox).toBeDisabled();
    });
  });

  it("disables API inputs when bot is disabled", async () => {
    const disabledSettingsStore = {
      ...mockSettingsStore,
      desktopSettings: {
        ...mockSettingsStore.desktopSettings,
        deepTreeEchoBotEnabled: false,
      },
    };

    await act(async () => {
      render(<BotSettings settingsStore={disabledSettingsStore} />);
      jest.runAllTimers();
    });

    await waitFor(() => {
      const apiKeyInput = screen.getByPlaceholderText("Enter your LLM API key");
      expect(apiKeyInput).toBeDisabled();

      const apiEndpointInput = screen.getByPlaceholderText(
        "Enter LLM API endpoint",
      );
      expect(apiEndpointInput).toBeDisabled();
    });
  });

  it("disables personality textarea when bot is disabled", async () => {
    const disabledSettingsStore = {
      ...mockSettingsStore,
      desktopSettings: {
        ...mockSettingsStore.desktopSettings,
        deepTreeEchoBotEnabled: false,
      },
    };

    await act(async () => {
      render(<BotSettings settingsStore={disabledSettingsStore} />);
      jest.runAllTimers();
    });

    await waitFor(() => {
      const personalityTextarea = screen.getByPlaceholderText(
        "Define the bot's personality...",
      );
      expect(personalityTextarea).toBeDisabled();
    });
  });
});
