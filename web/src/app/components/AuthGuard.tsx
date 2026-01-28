// ==============================================================================
// file_id: SOM-COM-0001-v1.0.0
// name: AuthGuard.tsx
// description: Authentication guard component with email/password login
// project_id: HIPPOCRATIC
// category: component
// tags: [auth, guard, email, password]
// created: 2026-01-28
// version: 1.0.0
// ==============================================================================

"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const searchParams = useSearchParams();
  const verifyParam = searchParams.get("verify");

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationKey, setVerificationKey] = useState(verifyParam || "");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showVerificationInput, setShowVerificationInput] = useState(false);

  useEffect(() => {
    // Check if already authenticated
    const token = localStorage.getItem("auth_token");
    if (token) {
      verifyToken(token);
    } else if (verifyParam) {
      // Auto-verify if verification key in URL
      handleVerification(verifyParam);
    } else {
      setIsLoading(false);
    }
  }, [verifyParam]);

  async function verifyToken(token: string) {
    try {
      const res = await fetch("/api/auth/login", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem("auth_token");
      }
    } catch (err) {
      console.error("Token verification failed:", err);
      localStorage.removeItem("auth_token");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      setMessage("Verification email sent! Check your email for the verification link.");
      setShowVerificationInput(true);

      // In development, show the verification key
      if (data.verificationKey) {
        setVerificationKey(data.verificationKey);
        setMessage(
          `Verification email sent! In development mode, your key is: ${data.verificationKey}`
        );
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
  }

  async function handleVerification(key?: string) {
    const keyToVerify = key || verificationKey;
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationKey: keyToVerify }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed");
        return;
      }

      localStorage.setItem("auth_token", data.token);
      setIsAuthenticated(true);
      setMessage("Successfully authenticated!");
    } catch (err) {
      setError("Network error. Please try again.");
    }
  }

  function handleLogout() {
    localStorage.removeItem("auth_token");
    setIsAuthenticated(false);
    setEmail("");
    setPassword("");
    setVerificationKey("");
    setShowVerificationInput(false);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 rounded-lg border border-zinc-800 p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">Hippocratic Access</h1>
            <p className="text-sm text-zinc-400">Data Ingest Portal</p>
          </div>

          {!showVerificationInput ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
                  {error}
                </div>
              )}

              {message && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md text-blue-400 text-sm">
                  {message}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
              >
                Request Access
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="verificationKey" className="block text-sm font-medium text-zinc-300 mb-1">
                  Verification Key
                </label>
                <input
                  id="verificationKey"
                  type="text"
                  value={verificationKey}
                  onChange={(e) => setVerificationKey(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="Enter verification key"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
                  {error}
                </div>
              )}

              {message && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md text-blue-400 text-sm">
                  {message}
                </div>
              )}

              <button
                onClick={() => handleVerification()}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
              >
                Verify & Login
              </button>

              <button
                onClick={() => setShowVerificationInput(false)}
                className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-md transition-colors"
              >
                Back to Login
              </button>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 text-center">
              Access is restricted to authorized personnel only.
              <br />
              Contact your administrator for access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md border border-zinc-700 transition-colors"
        >
          Logout
        </button>
      </div>
      {children}
    </div>
  );
}
