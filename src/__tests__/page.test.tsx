import React from "react";
import { render, screen, act } from "@testing-library/react";
import DashboardLayout from "../app/(dashboard)/layout";
import { FirebaseProvider } from "../firebase/provider";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

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

describe("DashboardLayout", () => {
  it("renders the INVOKING THE VOID... message when loading", async () => {
    const mockOnAuthStateChanged = onAuthStateChanged as jest.Mock;
    let authStateCallback: (user: any) => void;
    mockOnAuthStateChanged.mockImplementation((auth: any, callback: any) => {
      authStateCallback = callback;
      return () => {};
    });

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
  });
});
