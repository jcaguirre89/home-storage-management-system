import { redirect } from 'next/navigation';

export default function RootPage() {
  // Placeholder for authentication check
  const isLoggedIn = false; // Replace with actual auth check

  if (isLoggedIn) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }

  // This part will not be reached due to redirects,
  // but a component must return JSX or null.
  return null;
}
