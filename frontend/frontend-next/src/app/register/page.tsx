'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
// import { createUserWithEmailAndPassword } from 'firebase/auth'; // No longer directly creating user
import { signInWithEmailAndPassword } from 'firebase/auth'; // To sign in after backend registration
import { auth } from '../../lib/firebase/config';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(''); // Added display name
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      // Step 1: Call the backend /api/register endpoint
      const registerResponse = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, displayName }),
      });

      const registerData = await registerResponse.json();
      if (!registerResponse.ok || !registerData.success) {
        // Handle errors from the backend registration
        const errorMessage = registerData.error?.message || 'Registration failed. Please check your details.';
        if (registerData.error?.code === "EMAIL_ALREADY_EXISTS") {
          setError('This email is already in use. Please try logging in or use a different email.');
        } else {
          setError(errorMessage);
        }
        return; // Stop if registration failed
      }
      // Step 2: If backend registration is successful, sign the user in using Firebase client SDK
      // This will trigger onAuthStateChanged and update the AuthContext
      await signInWithEmailAndPassword(auth, email, password);

      // User is now signed in. AuthProvider will detect this.
      // The tech design doc says: "They are redirected to the household setup page"
      router.push('/household/setup'); // Explicitly redirect after successful registration and sign-in.
    } catch (err: any) {
      console.error("Registration or subsequent login error:", err);
      // This will catch errors from signInWithEmailAndPassword or network errors for fetch
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        // This should ideally not happen if registration was successful and we're using the same credentials
        setError('Login failed after registration. Please try logging in manually.');
      } else {
        setError(err.message || 'An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <h1>Register</h1>
      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px' }}>
        <div>
          <label htmlFor="displayName\">Display Name:</label>
          <input
            type="text"
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div>
          <label htmlFor="email\">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div>
          <label htmlFor="password\">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" style={{ padding: '0.75rem', backgroundColor: 'green', color: 'white', border: 'none', cursor: 'pointer' }}>
          Sign Up
        </button>
      </form>
      <div style={{ marginTop: '1rem' }}>
        <Link href="/login">Already have an account? Sign In</Link>
      </div>
    </div>
  );
}