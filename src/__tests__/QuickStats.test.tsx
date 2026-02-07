import React from "react";
import { render, screen, act } from "@testing-library/react";
import { QuickStats } from "@/components/dashboard/QuickStats";
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
    useDoc: jest.fn(),
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

describe("QuickStats", () => {
  let authStateCallback: (user: User | null) => void;
  const mockUseDoc = firebase.useDoc as jest.Mock;
  const mockUseUser = firebase.useUser as jest.Mock;
  const mockUseFirestore = firebase.useFirestore as jest.Mock;
  const mockOnAuthStateChanged = onAuthStateChanged as jest.Mock;

  beforeEach(() => {
    mockUseDoc.mockClear();
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
    mockUseActivityLogs.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
  });

  it("shows loading state initially", async () => {
    // Arrange
    mockUseUser.mockReturnValue({ user: null, isUserLoading: true });
    mockUseDoc.mockReturnValue({ data: null, isLoading: true });
    mockUseUserProfile.mockReturnValue({
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
          <QuickStats />
        </FirebaseProvider>,
      );
    });

    // Assert
    expect(screen.getByText(/READING SCROLLS.../)).toBeInTheDocument();
  });

  it("displays stats when data is loaded", async () => {
    // Arrange
    const mockUser = { uid: "test-uid" } as User;
    const mockStats = {
      race: "Vampire",
      level: 10,
      gold: 1234,
      stamina: 80,
      maxStamina: 100,
      experience: 500,
      nextLevelExp: 1000,
      skillAverage: 55.5,
      attributes: {
        strength: 50,
        defense: 40,
        dexterity: 60,
        agility: 70,
        constitution: 55,
      },
    };
    mockUseUser.mockReturnValue({ user: mockUser, isUserLoading: false });
    mockUseDoc.mockReturnValue({ data: mockStats, isLoading: false });
    mockUseUserProfile.mockReturnValue({
      data: mockStats,
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
          <QuickStats />
        </FirebaseProvider>,
      );
      if (authStateCallback) {
        authStateCallback(mockUser);
      }
    });

    // Assert
    expect(screen.getByText("Vampire Level")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("80 / 100")).toBeInTheDocument();
    expect(screen.getByText("55.50")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getByText("70")).toBeInTheDocument();
    expect(screen.getByText("55")).toBeInTheDocument();
  });
});
