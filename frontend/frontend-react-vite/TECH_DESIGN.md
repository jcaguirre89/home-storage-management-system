### Frontend Technical Design Document: Home Storage System

#### 1. Overview & Guiding Philosophy

This document outlines the technical plan for a new frontend for the Home Storage System. The primary goal is to create a simple, modern, and maintainable Single Page Application (SPA).

Our guiding philosophy is **"start simple, add complexity only when necessary."** We will begin with the most minimal viable architecture and introduce new tools (like routing or state management libraries) only when the application's needs clearly justify them.

#### 2. Core Technology Stack

| Category      | Technology                               | Purpose                                      |
| :------------ | :--------------------------------------- | :------------------------------------------- |
| **Framework** | React 18+ (with TypeScript)              | Building a component-based user interface.   |
| **Build Tool**  | Vite                                     | Fast development server and optimized builds.|
| **Styling**     | Tailwind CSS                             | A utility-first CSS framework for rapid UI development. |
| **HTTP Client** | Axios                                    | Making requests to the backend API.          |
| **State**       | React Hooks (`useState`, `useEffect`)    | Managing local and component-level state.    |
| **Linting**     | ESLint & Prettier                        | Enforcing code quality and consistency.      |

#### 3. Stack Justification (Mid-2025 Modern Approach)

The chosen stack represents a widely adopted, modern standard for building simple and efficient web applications in 2025.

*   **Vite + React:** This combination is considered the successor to the older Create React App (CRA). Web search results confirm that Vite's use of `esbuild` provides significantly faster build times and a superior developer experience with near-instant Hot Module Replacement (HMR). For new SPAs, Vite is the clear industry preference.

*   **Tailwind CSS:** It has become the dominant utility-first CSS framework. Its approach of applying style classes directly in the markup allows for incredibly rapid development and easy maintenance without writing custom CSS files. This aligns perfectly with our goal of a simple, component-based system.

*   **TypeScript:** The use of TypeScript is a standard best practice for modern web development. It improves code quality and maintainability by catching errors during development, which is invaluable even in smaller projects.

*   **Minimalism:** By intentionally omitting a router (`react-router-dom`) and a global state manager (`redux`, `zustand`) from the initial build, we adhere to our core philosophy. The search results highlight these tools as standard additions, but they are not required to start. We can build a fully functional SPA using only React's built-in hooks and add these powerful tools later if the application's complexity grows to require them.

In summary, this stack is not just a personal preference; it is validated by current industry trends as a "dream team" for frontend development, balancing power with a streamlined developer experience.

#### 4. Project Structure

We will adopt a simple, feature-oriented directory structure.

```
frontend/frontend-react-vite/
├── public/
└── src/
    ├── api/              # API call functions (e.g., items.ts, households.ts)
    ├── assets/           # Static assets like images, fonts
    ├── components/       # Reusable React components
    │   ├── auth/         # Login, Register
    │   ├── dashboard/    # Dashboard, ItemList, ItemCard
    │   ├── household/    # HouseholdSetup
    │   └── ui/           # Generic buttons, inputs, etc.
    ├── lib/              # Library configurations (e.g., firebase.ts)
    ├── App.tsx           # Main application component (handles logic)
    ├── main.tsx          # Application entry point
    └── index.css         # Main CSS file for Tailwind directives
```

#### 5. Application Flow (No Routing)

The entire application will be managed within `App.tsx`, which will act as a controller to conditionally render components based on the application state.

1.  **Initial State:** Check for a Firebase auth token.
2.  **If no user is logged in:** Render the `<Login />` component.
3.  **If a user is logged in:** Fetch the user's profile from the backend API.
4.  **If `user.householdId` is null:** Render the `<HouseholdSetup />` component.
5.  **If `user.householdId` exists:** Render the main `<Dashboard />` component.

This approach provides the user experience of a multi-page app without the initial complexity of a routing library.
