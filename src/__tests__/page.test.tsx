import React from 'react';
import { render, screen, act } from '@testing-library/react';
import Home from '../app/page';
import { FirebaseProvider } from '../firebase/provider';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Mock Firebase config
const firebaseConfig = {
  apiKey: 'mock-api-key',
  authDomain: 'mock-auth-domain',
  projectId: 'mock-project-id',
  storageBucket: 'mock-storage-bucket',
  messagingSenderId: 'mock-messaging-sender-id',
  appId: 'mock-app-id',
};

// Initialize Firebase for testing
const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

// Mock onAuthStateChanged
jest.mock('firebase/auth', () => {
    const original = jest.requireActual('firebase/auth');
    return {
        ...original,
        onAuthStateChanged: jest.fn(),
    };
});

describe('Home', () => {
  it('renders the INVOKING THE VOID... message when loading', async () => {
    // Arrange
    const mockOnAuthStateChanged = onAuthStateChanged as jest.Mock;
    let authStateCallback: (user: any) => void;
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      authStateCallback = callback;
      return () => {}; // Unsubscribe function
    });

    // Act
    render(
      <FirebaseProvider firebaseApp={firebaseApp} firestore={firestore} auth={auth}>
        <Home />
      </FirebaseProvider>
    );

    // Assert
    expect(screen.getByText('INVOKING THE VOID...')).toBeInTheDocument();

    // Act
    await act(async () => {
      authStateCallback(null); // Simulate user being logged out
    });
  });
});
