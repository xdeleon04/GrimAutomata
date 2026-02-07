import React from "react";
import { render, screen, act } from "@testing-library/react";
import { ActivityLog } from "@/components/dashboard/ActivityLog";
import { FirebaseProvider } from "@/firebase/provider";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import * as firebase from "@/firebase";

// Create configurable mock functions
const mockUseUserProfile = jest.fn();
const mockUseCredentials = jest.fn();
const mockUseAutomationSettings = jest.fn();
const mockUseActivityLogs = jest.fn();

// Mock DashboardDataProvider hooks
jest.mock("@/components/dashboard/DashboardDataProvider", () => ({
  useUserProfile: () => mockUseUserProfile(),
  useCredentials: () => mockUseCredentials(),
  useAutomationSettings: () => mockUseAutomationSettings(),
  useActivityLogs: () => mockUseActivityLogs(),
  usePvPVictories: () => ({ data: [], isLoading: false }),
  DashboardDataProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// Mock Firebase config
const firebaseConfig = {
  apiKey: "mock-api-key",
  authDomain: "mock-auth-domain",
  projectId: "mock-project-id",
  storageBucket: "mock-storage-bucket",
  messagingSenderId: "mock-messaging-sender-id",
  appId: "mock-app-id",
};

// Initialize Firebase for testing
const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

// Mock firebase module from the app
jest.mock("@/firebase", () => {
  const original = jest.requireActual("@/firebase");
  return {
    ...original,
    useCollection: jest.fn(),
    useUser: jest.fn(),
    useFirestore: jest.fn(),
  };
});

// Mock firebase/auth to control auth state
jest.mock("firebase/auth", () => {
  const original = jest.requireActual("firebase/auth");
  return {
    ...original,
    onAuthStateChanged: jest.fn(),
  };
});

describe("ActivityLog", () => {
  let authStateCallback: (user: User | null) => void;
  const mockUseCollection = firebase.useCollection as jest.Mock;
  const mockUseUser = firebase.useUser as jest.Mock;
  const mockUseFirestore = firebase.useFirestore as jest.Mock;
  const mockOnAuthStateChanged = onAuthStateChanged as jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    mockUseCollection.mockClear();
    mockUseUser.mockClear();
    mockUseFirestore.mockClear();
    mockUseUserProfile.mockClear();
    mockUseCredentials.mockClear();
    mockUseAutomationSettings.mockClear();
    mockUseActivityLogs.mockClear();

    mockUseFirestore.mockReturnValue(firestore);
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      authStateCallback = callback;
      return () => {}; // Unsubscribe function
    });

    // Default mock returns
    mockUseUserProfile.mockReturnValue({
      data: { race: "Vampire", level: 10 },
      isLoading: false,
      error: null,
    });
    mockUseCredentials.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
    mockUseAutomationSettings.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows loading state initially", async () => {
    // Arrange
    const mockUser = { uid: "test-uid" } as User;
    mockUseUser.mockReturnValue({ user: mockUser });
    mockUseCollection.mockReturnValue({ data: null, isLoading: true });
    mockUseActivityLogs.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    // Act
    await act(async () => {
      render(
        <FirebaseProvider
          firebaseApp={firebaseApp}
          firestore={firestore}
          auth={auth}
        >
          <ActivityLog />
        </FirebaseProvider>,
      );
      if (authStateCallback) {
        authStateCallback(mockUser);
      }
    });

    // Assert
    expect(screen.getByText("INVOKING...")).toBeInTheDocument();
  });

  it("shows empty message when no logs are available", async () => {
    // Arrange
    const mockUser = { uid: "test-uid" } as User;
    mockUseUser.mockReturnValue({ user: mockUser });
    mockUseCollection.mockReturnValue({ data: [], isLoading: false });
    mockUseActivityLogs.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    // Act
    await act(async () => {
      render(
        <FirebaseProvider
          firebaseApp={firebaseApp}
          firestore={firestore}
          auth={auth}
        >
          <ActivityLog />
        </FirebaseProvider>,
      );
      if (authStateCallback) {
        authStateCallback(mockUser);
      }
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Assert
    expect(screen.getByText(/The grimoire is empty/)).toBeInTheDocument();
  });

  it("displays logs when data is available", async () => {
    // Arrange
    const mockUser = { uid: "test-uid" } as User;
    const mockLogs = [
      {
        id: "3",
        timestamp: new Date(2023, 10, 10, 10, 3, 0).toISOString(),
        logLevel: "INFO",
        logMessage: "Automata starting...",
      },
      {
        id: "2",
        timestamp: new Date(2023, 10, 10, 10, 2, 0).toISOString(),
        logLevel: "LOOT",
        logMessage: "Found 100 Blood Gold.",
      },
      {
        id: "1",
        timestamp: new Date(2023, 10, 10, 10, 1, 0).toISOString(),
        logLevel: "BATTLE",
        logMessage: "Critical hit on the enemy!",
      },
    ];
    mockUseUser.mockReturnValue({ user: mockUser });
    mockUseCollection.mockReturnValue({ data: mockLogs, isLoading: false });
    mockUseActivityLogs.mockReturnValue({
      data: mockLogs,
      isLoading: false,
      error: null,
    });

    // Act
    await act(async () => {
      render(
        <FirebaseProvider
          firebaseApp={firebaseApp}
          firestore={firestore}
          auth={auth}
        >
          <ActivityLog />
        </FirebaseProvider>,
      );
      if (authStateCallback) {
        authStateCallback(mockUser);
      }
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Assert
    const logContainer = screen.getByText(/Awaiting next shadow ritual/)
      .parentElement?.parentElement;
    const logs = logContainer?.querySelectorAll(".group");
    const logMessages = Array.from(logs!).map(
      (log) => log.children[2].textContent,
    );

    expect(logMessages).toEqual([
      "Critical hit on the enemy!",
      "Found 100 Blood Gold.",
      "Automata starting...",
    ]);
    expect(
      screen.getByText(/Awaiting next shadow ritual.../),
    ).toBeInTheDocument();
  });
});
