import React from "react";
import {
  render,
  screen,
  fireEvent,
  act,
  cleanup,
} from "@testing-library/react";
import { StatusHeader } from "@/components/dashboard/StatusHeader";
import { FirebaseProvider } from "@/firebase/provider";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import * as moonIdSyncFlow from "@/ai/flows/moon-id-sync-flow";

const firebaseConfig = {
  apiKey: "mock-api-key",
  authDomain: "mock-auth-domain",
  projectId: "mock-project-id",
  storageBucket: "mock-storage-bucket",
  messagingSenderId: "mock-messaging-sender-id",
  appId: "mock-app-id",
};

const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

jest.mock("firebase/auth", () => {
  const original = jest.requireActual("firebase/auth");
  return {
    ...original,
    onAuthStateChanged: jest.fn(),
  };
});

jest.mock("@/firebase", () => {
  const original = jest.requireActual("@/firebase");
  return {
    ...original,
    useDoc: jest.fn(() => ({ data: null, isLoading: false })),
    useCollection: jest.fn(() => ({ data: [], isLoading: false })),
    setDocumentNonBlocking: jest.fn(),
  };
});

const mockCredentials = {
  moonIdUsername: "testuser",
  encryptedMoonIdPassword: "testpass",
};
let mockCredentialsData: any = mockCredentials;
let mockSettingsData: any[] = [];

jest.mock("@/components/dashboard/DashboardDataProvider", () => ({
  useCredentials: jest.fn(() => ({
    data: mockCredentialsData,
    isLoading: false,
  })),
  useAutomationSettings: jest.fn(() => ({
    data: mockSettingsData,
    isLoading: false,
  })),
  useUserProfile: jest.fn(() => ({ data: null, isLoading: false })),
  useActivityLogs: jest.fn(() => ({ data: [], isLoading: false })),
  DashboardDataProvider: ({ children }: { children: any }) => (
    <div>{children}</div>
  ),
}));

jest.mock("@/ai/flows/moon-id-sync-flow", () => ({
  syncMoonId: jest.fn(),
}));

describe("StatusHeader", () => {
  let authStateCallback: (user: User | null) => void;
  let unmount: () => void;
  const mockOnAuthStateChanged = onAuthStateChanged as jest.Mock;
  const mockSyncMoonId = moonIdSyncFlow.syncMoonId as jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    mockSyncMoonId.mockClear();
    mockCredentialsData = mockCredentials;
    mockSettingsData = [];
    mockOnAuthStateChanged.mockImplementation((auth: any, callback: any) => {
      authStateCallback = callback;
      return () => {};
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    if (unmount) unmount();
    cleanup();
  });

  it("calls syncMoonId when the ritual is started", async () => {
    const mockUser = { uid: "test-uid" } as User;
    mockSyncMoonId.mockResolvedValue({
      race: "Vampire",
      pvpCooldown: 0,
      logs: [],
      stats: {
        level: 1,
        gold: 100,
        stamina: 10,
        maxStamina: 10,
        experience: 0,
        nextLevelExp: 100,
        skillAverage: 1.0,
        attributes: {
          strength: 10,
          defense: 10,
          dexterity: 10,
          agility: 10,
          constitution: 10,
        },
      },
    });

    const { unmount: u } = render(
      <FirebaseProvider
        firebaseApp={firebaseApp}
        firestore={firestore}
        auth={auth}
      >
        <StatusHeader />
      </FirebaseProvider>,
    );
    unmount = u;

    await act(async () => {
      authStateCallback(mockUser);
    });
    act(() => {
      fireEvent.click(screen.getByText("Start Ritual"));
    });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockSyncMoonId).toHaveBeenCalled();
  });

  it("stops the ritual when the stop button is clicked", async () => {
    const mockUser = { uid: "test-uid" } as User;
    mockSyncMoonId.mockResolvedValue({
      race: "Vampire",
      pvpCooldown: 0,
      logs: [],
      stats: {
        level: 1,
        gold: 100,
        stamina: 10,
        maxStamina: 10,
        experience: 0,
        nextLevelExp: 100,
        skillAverage: 1.0,
        attributes: {
          strength: 10,
          defense: 10,
          dexterity: 10,
          agility: 10,
          constitution: 10,
        },
      },
    });

    const { unmount: u } = render(
      <FirebaseProvider
        firebaseApp={firebaseApp}
        firestore={firestore}
        auth={auth}
      >
        <StatusHeader />
      </FirebaseProvider>,
    );
    unmount = u;

    await act(async () => {
      authStateCallback(mockUser);
    });
    act(() => {
      fireEvent.click(screen.getByText("Start Ritual"));
    });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    act(() => {
      fireEvent.click(screen.getByText("Stop Ritual"));
    });

    mockSyncMoonId.mockClear();
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.getByText("System standby")).toBeInTheDocument();
    expect(mockSyncMoonId).not.toHaveBeenCalled();
  });

  it("disables the start button if there are no credentials", async () => {
    const mockUser = { uid: "test-uid" } as User;
    mockCredentialsData = null;

    const { unmount: u } = render(
      <FirebaseProvider
        firebaseApp={firebaseApp}
        firestore={firestore}
        auth={auth}
      >
        <StatusHeader />
      </FirebaseProvider>,
    );
    unmount = u;

    await act(async () => {
      authStateCallback(mockUser);
    });

    expect(screen.getByText("Start Ritual")).toBeDisabled();
  });

  it("toggles debug mode", async () => {
    const mockUser = { uid: "test-uid" } as User;

    const { unmount: u } = render(
      <FirebaseProvider
        firebaseApp={firebaseApp}
        firestore={firestore}
        auth={auth}
      >
        <StatusHeader />
      </FirebaseProvider>,
    );
    unmount = u;

    await act(async () => {
      authStateCallback(mockUser);
    });

    expect(screen.getByText(/SILENT/)).toBeInTheDocument();
    act(() => {
      fireEvent.click(screen.getByText(/SILENT/));
    });
    expect(screen.getByText(/VERBOSE/)).toBeInTheDocument();
    act(() => {
      fireEvent.click(screen.getByText(/VERBOSE/));
    });
    expect(screen.getByText(/SILENT/)).toBeInTheDocument();
  });
});
