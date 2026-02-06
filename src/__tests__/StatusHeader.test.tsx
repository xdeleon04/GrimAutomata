
import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { StatusHeader } from '@/components/dashboard/StatusHeader';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import * as firebase from '@/firebase';
import * as moonIdSyncFlow from '@/ai/flows/moon-id-sync-flow';

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

// Mock firebase module from the app
jest.mock('@/firebase', () => {
  const original = jest.requireActual('@/firebase');
  return {
    ...original,
    useDoc: jest.fn(),
    useCollection: jest.fn(),
  };
});

// Mock firebase/auth to control auth state
jest.mock('firebase/auth', () => {
    const original = jest.requireActual('firebase/auth');
    return {
        ...original,
        onAuthStateChanged: jest.fn(),
    };
});

// Mock the AI flow
jest.mock('@/ai/flows/moon-id-sync-flow', () => ({
  syncMoonId: jest.fn(),
}));

describe('StatusHeader', () => {
  let authStateCallback: (user: User | null) => void;
  let unmount: () => void;
  const mockUseDoc = firebase.useDoc as jest.Mock;
  const mockUseCollection = firebase.useCollection as jest.Mock;
  const mockOnAuthStateChanged = onAuthStateChanged as jest.Mock;
  const mockSyncMoonId = moonIdSyncFlow.syncMoonId as jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    mockUseDoc.mockClear();
    mockUseCollection.mockClear();
    mockSyncMoonId.mockClear();
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      authStateCallback = callback;
      return () => {}; // Unsubscribe function
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    if (unmount) {
      unmount();
    }
    cleanup();
  });

  it('calls syncMoonId when the ritual is started', async () => {
    // Arrange
    const mockUser = { uid: 'test-uid' } as User;
    const mockCredentials = { moonIdUsername: 'testuser', encryptedMoonIdPassword: 'testpass' };
    mockUseDoc.mockReturnValue({ data: mockCredentials });
    mockUseCollection.mockReturnValue({ data: [] });
    mockSyncMoonId.mockResolvedValue({
        race: 'Vampire',
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
            }
        }
    });

    // Act
    const { unmount: unmountComponent } = render(
      <FirebaseProvider firebaseApp={firebaseApp} firestore={firestore} auth={auth}>
        <StatusHeader />
      </FirebaseProvider>
    );
    unmount = unmountComponent;

    await act(async () => {
        if (authStateCallback) {
            authStateCallback(mockUser);
        }
    });

    // Act
    act(() => {
        fireEvent.click(screen.getByText('Start Ritual'));
    });

    await act(async () => {
        jest.advanceTimersByTime(1000);
    });

    // Assert
    expect(mockSyncMoonId).toHaveBeenCalled();
  });

  it('stops the ritual when the stop button is clicked', async () => {
    // Arrange
    const mockUser = { uid: 'test-uid' } as User;
    const mockCredentials = { moonIdUsername: 'testuser', encryptedMoonIdPassword: 'testpass' };
    mockUseDoc.mockReturnValue({ data: mockCredentials });
    mockUseCollection.mockReturnValue({ data: [] });
    mockSyncMoonId.mockResolvedValue({
        race: 'Vampire',
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
            }
        }
    });

    // Act
    const { unmount: unmountComponent } = render(
      <FirebaseProvider firebaseApp={firebaseApp} firestore={firestore} auth={auth}>
        <StatusHeader />
      </FirebaseProvider>
    );
    unmount = unmountComponent;

    await act(async () => {
        if (authStateCallback) {
            authStateCallback(mockUser);
        }
    });

    // Start the ritual
    act(() => {
        fireEvent.click(screen.getByText('Start Ritual'));
    });

    await act(async () => {
        jest.advanceTimersByTime(1000);
    });

    // Stop the ritual
    act(() => {
        fireEvent.click(screen.getByText('Stop Ritual'));
    });

    mockSyncMoonId.mockClear();

    await act(async () => {
        jest.advanceTimersByTime(5000);
    });

    // Assert
    expect(screen.getByText('System standby')).toBeInTheDocument();
    expect(mockSyncMoonId).not.toHaveBeenCalled();
  });

  it('disables the start button if there are no credentials', async () => {
    // Arrange
    const mockUser = { uid: 'test-uid' } as User;
    mockUseDoc.mockReturnValue({ data: null }); // No credentials
    mockUseCollection.mockReturnValue({ data: [] });

    // Act
    const { unmount: unmountComponent } = render(
      <FirebaseProvider firebaseApp={firebaseApp} firestore={firestore} auth={auth}>
        <StatusHeader />
      </FirebaseProvider>
    );
    unmount = unmountComponent;

    await act(async () => {
        if (authStateCallback) {
            authStateCallback(mockUser);
        }
    });

    // Assert
    expect(screen.getByText('Start Ritual')).toBeDisabled();
  });

  it('toggles debug mode', async () => {
    // Arrange
    const mockUser = { uid: 'test-uid' } as User;
    const mockCredentials = { moonIdUsername: 'testuser', encryptedMoonIdPassword: 'testpass' };
    mockUseDoc.mockReturnValue({ data: mockCredentials });
    mockUseCollection.mockReturnValue({ data: [] });

    // Act
    const { unmount: unmountComponent } = render(
      <FirebaseProvider firebaseApp={firebaseApp} firestore={firestore} auth={auth}>
        <StatusHeader />
      </FirebaseProvider>
    );
    unmount = unmountComponent;

    await act(async () => {
        if (authStateCallback) {
            authStateCallback(mockUser);
        }
    });

    // Assert initial state
    expect(screen.getByText(/SILENT/)).toBeInTheDocument();

    // Toggle debug mode on
    act(() => {
        fireEvent.click(screen.getByText(/SILENT/));
    });

    // Assert debug mode is on
    expect(screen.getByText(/VERBOSE/)).toBeInTheDocument();

    // Toggle debug mode off
    act(() => {
        fireEvent.click(screen.getByText(/VERBOSE/));
    });

    // Assert debug mode is off
    expect(screen.getByText(/SILENT/)).toBeInTheDocument();
  });
});
