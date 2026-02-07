import React from "react";
import { render, screen, act } from "@testing-library/react";
import { Dashboard } from "@/components/dashboard/Dashboard";
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

describe("Dashboard", () => {
  let authStateCallback: (user: User | null) => void;
  const mockUseCollection = firebase.useCollection as jest.Mock;
  const mockOnAuthStateChanged = onAuthStateChanged as jest.Mock;

  beforeEach(() => {
    mockUseCollection.mockClear();
    mockUseUserProfile.mockClear();
    mockUseCredentials.mockClear();
    mockUseAutomationSettings.mockClear();
    mockUseActivityLogs.mockClear();

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

  it("renders the activity log with data", async () => {
    // Arrange
    const mockUser = { uid: "test-uid" } as User;
    const mockLogs = [
      {
        id: "1",
        logLevel: "BATTLE",
        logMessage: "Test battle log",
        timestamp: new Date().toISOString(),
      },
      {
        id: "2",
        logLevel: "LOOT",
        logMessage: "Test loot log",
        timestamp: new Date().toISOString(),
      },
    ];
    mockUseCollection.mockReturnValue({ data: mockLogs, isLoading: false });
    mockUseActivityLogs.mockReturnValue({
      data: mockLogs,
      isLoading: false,
      error: null,
    });

    // Act
    render(
      <FirebaseProvider
        firebaseApp={firebaseApp}
        firestore={firestore}
        auth={auth}
      >
        <Dashboard />
      </FirebaseProvider>,
    );

    await act(async () => {
      if (authStateCallback) {
        authStateCallback(mockUser);
      }
    });

    // Assert
    expect(screen.getByText("Ritual Chronicles")).toBeInTheDocument();
    expect(screen.getByText("Test battle log")).toBeInTheDocument();
    expect(screen.getByText("Test loot log")).toBeInTheDocument();
  });
});
