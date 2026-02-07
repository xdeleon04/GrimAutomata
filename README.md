# GrimAutomata

GrimAutomata is a Next.js application with a dark, gothic theme. It uses Firebase for backend services (Authentication and Firestore) and Genkit for AI-powered features. The application provides a dashboard for "Shadow Ritualists" to manage their activities.

## Features

- **Anonymous Authentication:** Users can sign in anonymously using Firebase Authentication.
- **Firestore Integration:** User data is stored and managed in Firestore.
- **Responsive Sidebar:** A navigation sidebar allows users to switch between different views.
- **Modular UI:** The user interface is built with reusable components and features different views like Dashboard, Profile, and more.
- **Styling:** The project is styled using Tailwind CSS and shadcn/ui.
- **Icons:** Icons are provided by the lucide-react library.
- **AI Capabilities:** The application integrates Genkit for AI-powered functionalities.

## Getting Started

### Prerequisites

- Node.js
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/grim-automata.git
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```

### Running the Development Server

To run the application in development mode, use the following command:

```bash
npm run dev
```

The application will be available at http://localhost:9002.

## Available Scripts

- `npm run dev`: Runs the development server with Next.js and Turbopack.
- `npm run build`: Creates a production build of the application.
- `npm run start`: Starts the production server.
- `npm run test`: Runs tests using Jest.
- `npm run genkit:dGEMINI_API_KEY=AIzaSyCCMs6CjRmtfeh6SfhJbZgRVfyH_VAc1VQ
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=studio-722893461-38648
  NEXT_PUBLIC_FIREBASE_APP_ID=1:1090518479353:web:bf07b48305800c7111cd28
  NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBJqmpm4pY3TC31KANAMS67EOZ_ChryRII
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=studio-722893461-38648.firebaseapp.com
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1090518479353

      ev`: Starts the Genkit development server.
- `npm run genkit:watch`: Starts the Genkit development server in watch mode.

## Technologies Used

- [Next.js](https://nextjs.org/) - React framework for building user interfaces.
- [Firebase](https://firebase.google.com/) - Backend platform for building web and mobile applications.
- [Genkit](https://firebase.google.com/docs/genkit) - Open-source framework for building AI-powered applications.
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework for rapid UI development.
- [shadcn/ui](https://ui.shadcn.com/) - A collection of reusable UI components.
- [lucide-react](https://lucide.dev/) - A library of beautiful and consistent icons.
- [Jest](https://jestjs.io/) - A delightful JavaScript testing framework.

## Project Structure

The project follows a standard Next.js project structure.

- `src/app`: Contains the main application pages and layouts.
- `src/components`: Contains reusable UI components.
- `src/firebase`: Contains Firebase configuration and utility functions.
- `src/ai`: Contains Genkit AI flows and configurations.
- `src/hooks`: Contains custom React hooks.
- `src/lib`: Contains library functions and utilities.
- `src/services`: Contains services for interacting with external APIs.
