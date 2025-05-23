'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase/config'; // Adjusted path

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // User is signed in. AuthProvider will detect this.
      // RootPage should redirect to /dashboard automatically.
      // Explicit push can be kept as a fallback or if specific immediate navigation is needed.
      router.push('/dashboard');
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || 'Failed to login. Please check your credentials.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <h1>Login</h1>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px' }}>
        <div>
          <label htmlFor="email">Email:</label>
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
          <label htmlFor="password">Password:</label>
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
        <button type="submit" style={{ padding: '0.75rem', backgroundColor: 'blue', color: 'white', border: 'none', cursor: 'pointer' }}>
          Sign In
        </button>
      </form>
      <div style={{ marginTop: '1rem' }}>
        <Link href="#" style={{ marginRight: '1rem' }}>Forgot password?</Link>
        <Link href="/register">Don't have an account? Sign Up</Link>
      </div>
    </div>
  );
}