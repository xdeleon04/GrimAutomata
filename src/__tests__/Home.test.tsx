import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import Home from '../app/page';
import { FirebaseProvider } from '../firebase/provider';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, query, orderBy, limit } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import * as firebase from '@/firebase';
import { useCollectionData } from 'react-firebase-hooks/firestore';

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
const auth = getAuth(firebaseApp);

// Mock onAuthStateChanged
jest.mock('firebase/auth', () => {
    const original = jest.requireActual('firebase/auth');
    return {
        ...original,
        onAuthStateChanged: jest.fn(),
    };
});

const mockDb = { type: 'firestore' };
const mockQuery = {};
// Mock firestore module
jest.mock('firebase/firestore', () => {
    const original = jest.requireActual('firebase/firestore');
    return {
        ...original,
        getFirestore: jest.fn(() => mockDb),
        doc: jest.fn(),
        collection: jest.fn(() => ({})),
        query: jest.fn(() => mockQuery),
        orderBy: jest.fn(),
        limit: jest.fn(),
    };
});
const firestore = getFirestore(firebaseApp);

// Mock firebase module
jest.mock('@/firebase', () => {
    const original = jest.requireActual('@/firebase');
    return {
        ...original,
        initiateAnonymousSignIn: jest.fn(),
        useFirestore: jest.fn(),
        setDocumentNonBlocking: jest.fn(),
        startRitual: jest.fn(),
    };
});

// Mock react-firebase-hooks
jest.mock('react-firebase-hooks/firestore', () => ({
    useCollectionData: jest.fn(),
}));

jest.mock('@/components/dashboard/Dashboard', () => ({
  Dashboard: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fb = require('@/firebase');
    return (
      <div>
        <span>Dashboard</span>
        <span>Activity Log</span>
        <span>TEST_EVENT</span>
        <button onClick={() => fb.startRitual()}>Start Ritual</button>
      </div>
    );
  },
}));

jest.mock('@/components/ui/sidebar', () => {
  const passthrough = ({ children }: { children?: any }) => <div>{children}</div>;
  return {
    SidebarProvider: passthrough,
    Sidebar: passthrough,
    SidebarContent: passthrough,
    SidebarHeader: passthrough,
    SidebarMenu: passthrough,
    SidebarMenuItem: passthrough,
    SidebarMenuButton: () => <div />,
  };
});

describe('Home', () => {
  let authStateCallback: (user: User | null) => void;
  const mockOnAuthStateChanged = onAuthStateChanged as jest.Mock;
  const mockInitiateAnonymousSignIn = firebase.initiateAnonymousSignIn as jest.Mock;
  const mockUseFirestore = firebase.useFirestore as jest.Mock;
  const mockSetDocumentNonBlocking = firebase.setDocumentNonBlocking as jest.Mock;
  const mockStartRitual = (firebase as any).startRitual as jest.Mock;
  const mockDoc = doc as jest.Mock;
  const mockCollection = collection as jest.Mock;
  const mockUseCollectionData = useCollectionData as jest.Mock;

  beforeEach(() => {
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      authStateCallback = callback;
      return () => {}; // Unsubscribe function
    });
    mockInitiateAnonymousSignIn.mockClear();
    mockUseFirestore.mockReturnValue(mockDb);
    mockSetDocumentNonBlocking.mockClear();
    mockStartRitual.mockClear();
    mockDoc.mockClear();
    mockCollection.mockClear();
    mockUseCollectionData.mockReturnValue([[], false, undefined]); // Default mock
  });

  it('renders the login button when user is not logged in', async () => {
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

    // Assert
    expect(screen.getByText('Enter the Sanctuary')).toBeInTheDocument();
  });

  it('calls initiateAnonymousSignIn when login button is clicked', async () => {
    // Act
    render(
      <FirebaseProvider firebaseApp={firebaseApp} firestore={firestore} auth={auth}>
        <Home />
      </FirebaseProvider>
    );

    // Act
    await act(async () => {
      authStateCallback(null); // Simulate user being logged out
    });

    // Act
    fireEvent.click(screen.getByText('Enter the Sanctuary'));

    // Assert
    expect(mockInitiateAnonymousSignIn).toHaveBeenCalled();
  });

  it('renders the dashboard when user is logged in', async () => {
    // Arrange
    const mockUser = { uid: 'test-uid', displayName: 'Test User' } as User;

    // Act
    render(
      <FirebaseProvider firebaseApp={firebaseApp} firestore={firestore} auth={auth}>
        <Home />
      </FirebaseProvider>
    );

    // Act
    await act(async () => {
      authStateCallback(mockUser); // Simulate user being logged in
    });

    // Assert
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('calls setDocumentNonBlocking when user is logged in', async () => {
    // Arrange
    const mockUser = { uid: 'test-uid', displayName: 'Test User' } as User;

    // Act
    render(
      <FirebaseProvider firebaseApp={firebaseApp} firestore={firestore} auth={auth}>
        <Home />
      </FirebaseProvider>
    );

    // Act
    await act(async () => {
      authStateCallback(mockUser); // Simulate user being logged in
    });

    // Assert
    expect(mockSetDocumentNonBlocking).toHaveBeenCalled();
  });

  it('starts a ritual when the start ritual button is clicked', async () => {
    // Arrange
    const mockUser = { uid: 'test-uid', displayName: 'Test User' } as User;

    // Act
    render(
      <FirebaseProvider firebaseApp={firebaseApp} firestore={firestore} auth={auth}>
        <Home />
      </FirebaseProvider>
    );

    // Act
    await act(async () => {
      authStateCallback(mockUser); // Simulate user being logged in
    });

    // Act
    fireEvent.click(screen.getByText('Start Ritual'));

    // Assert
    expect(mockStartRitual).toHaveBeenCalled();
  });

  it('renders the dashboard and activity log when user is logged in', async () => {
    // Arrange
    const mockUser = { uid: 'test-uid', displayName: 'Test User' } as User;
    const mockLogs = [
        { id: '1', event: 'TEST_EVENT', timestamp: { toDate: () => new Date() } }
    ];
    mockUseCollectionData.mockReturnValue([mockLogs, false, undefined]);

    // Act
    render(
      <FirebaseProvider firebaseApp={firebaseApp} firestore={firestore} auth={auth}>
        <Home />
      </FirebaseProvider>
    );

    // Act
    await act(async () => {
      authStateCallback(mockUser); // Simulate user being logged in
    });

    // Assert
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Activity Log')).toBeInTheDocument();
    expect(screen.getByText('TEST_EVENT')).toBeInTheDocument();
  });
});
