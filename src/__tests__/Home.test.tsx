import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import DashboardLayout from "../app/(dashboard)/layout";
import { FirebaseProvider } from "../firebase/provider";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  collection,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import * as firebase from "@/firebase";

const firebaseConfig = {
  apiKey: "mock-api-key",
  authDomain: "mock-auth-domain",
  projectId: "mock-project-id",
  storageBucket: "mock-storage-bucket",
  messagingSenderId: "mock-messaging-sender-id",
  appId: "mock-app-id",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

jest.mock("firebase/auth", () => {
  const original = jest.requireActual("firebase/auth");
  return {
    ...original,
    onAuthStateChanged: jest.fn(),
  };
});

const mockDb = { type: "firestore" };

jest.mock("firebase/firestore", () => {
  const original = jest.requireActual("firebase/firestore");
  return {
    ...original,
    getFirestore: jest.fn(() => mockDb),
    doc: jest.fn(),
    collection: jest.fn(() => ({})),
    query: jest.fn(() => ({})),
    orderBy: jest.fn(),
    limit: jest.fn(),
  };
});
const firestore = getFirestore(firebaseApp);

jest.mock("@/firebase", () => {
  const original = jest.requireActual("@/firebase");
  return {
    ...original,
    initiateAnonymousSignIn: jest.fn(),
    useFirestore: jest.fn(),
    setDocumentNonBlocking: jest.fn(),
  };
});

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(() => "/"),
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock("next/link", () => {
  const MockLink = ({ children, ...props }: any) => <a {...props}>{children}</a>;
  MockLink.displayName = "MockLink";
  return { __esModule: true, default: MockLink };
});

jest.mock("@/components/ui/sidebar", () => {
  const passthrough = ({ children }: { children?: any }) => (
    <div>{children}</div>
  );
  return {
    SidebarProvider: passthrough,
    Sidebar: passthrough,
    SidebarContent: passthrough,
    SidebarHeader: passthrough,
    SidebarTrigger: passthrough,
    SidebarMenu: passthrough,
    SidebarMenuItem: passthrough,
    SidebarMenuButton: ({ children }: { children?: any }) => (
      <div>{children}</div>
    ),
  };
});

jest.mock("@/components/dashboard/DashboardDataProvider", () => {
  const passthrough = ({ children }: { children?: any }) => (
    <div>{children}</div>
  );
  return {
    DashboardDataProvider: passthrough,
    useUserProfile: jest.fn(() => ({ data: null, isLoading: false })),
    useCredentials: jest.fn(() => ({ data: null, isLoading: false })),
    useAutomationSettings: jest.fn(() => ({ data: null, isLoading: false })),
    useActivityLogs: jest.fn(() => ({ data: null, isLoading: false })),
    usePvPVictories: jest.fn(() => ({ data: [], isLoading: false })),
  };
});

describe("DashboardLayout", () => {
  let authStateCallback: (user: User | null) => void;
  const mockOnAuthStateChanged = onAuthStateChanged as jest.Mock;
  const mockInitiateAnonymousSignIn =
    firebase.initiateAnonymousSignIn as jest.Mock;
  const mockUseFirestore = firebase.useFirestore as jest.Mock;
  const mockSetDocumentNonBlocking =
    firebase.setDocumentNonBlocking as jest.Mock;

  beforeEach(() => {
    mockOnAuthStateChanged.mockImplementation((auth: any, callback: any) => {
      authStateCallback = callback;
      return () => {};
    });
    mockInitiateAnonymousSignIn.mockClear();
    mockUseFirestore.mockReturnValue(mockDb);
    mockSetDocumentNonBlocking.mockClear();
  });

  it("renders the login button when user is not logged in", async () => {
    render(
      <FirebaseProvider
        firebaseApp={firebaseApp}
        firestore={firestore}
        auth={auth}
      >
        <DashboardLayout>
          <div>child</div>
        </DashboardLayout>
      </FirebaseProvider>,
    );

    expect(screen.getByText("INVOKING THE VOID...")).toBeInTheDocument();

    await act(async () => {
      authStateCallback(null);
    });

    expect(screen.getByText("Enter the Sanctuary")).toBeInTheDocument();
  });

  it("calls initiateAnonymousSignIn when login button is clicked", async () => {
    render(
      <FirebaseProvider
        firebaseApp={firebaseApp}
        firestore={firestore}
        auth={auth}
      >
        <DashboardLayout>
          <div>child</div>
        </DashboardLayout>
      </FirebaseProvider>,
    );

    await act(async () => {
      authStateCallback(null);
    });

    fireEvent.click(screen.getByText("Enter the Sanctuary"));
    expect(mockInitiateAnonymousSignIn).toHaveBeenCalled();
  });

  it("renders children when user is logged in", async () => {
    const mockUser = { uid: "test-uid", displayName: "Test User" } as User;

    render(
      <FirebaseProvider
        firebaseApp={firebaseApp}
        firestore={firestore}
        auth={auth}
      >
        <DashboardLayout>
          <div>Dashboard Content</div>
        </DashboardLayout>
      </FirebaseProvider>,
    );

    await act(async () => {
      authStateCallback(mockUser);
    });

    expect(screen.getByText("Dashboard Content")).toBeInTheDocument();
  });

  it("calls setDocumentNonBlocking when user is logged in", async () => {
    const mockUser = { uid: "test-uid", displayName: "Test User" } as User;

    render(
      <FirebaseProvider
        firebaseApp={firebaseApp}
        firestore={firestore}
        auth={auth}
      >
        <DashboardLayout>
          <div>child</div>
        </DashboardLayout>
      </FirebaseProvider>,
    );

    await act(async () => {
      authStateCallback(mockUser);
    });

    expect(mockSetDocumentNonBlocking).toHaveBeenCalled();
  });
});
