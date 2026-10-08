"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  firebaseAuth,
  googleProvider,
} from "../lib/firebase";

export default function ConnectPage() {
  const router = useRouter();

  const {
    address,
    isConnected,
    isReconnecting,
  } = useAccount();

  const [firebaseLoading, setFirebaseLoading] =
    useState(true);

  const [authLoading, setAuthLoading] =
    useState(false);

  const [showEmail, setShowEmail] =
    useState(false);

  const [isRegistering, setIsRegistering] =
    useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      (user) => {
        setFirebaseLoading(false);

        if (user) {
          router.replace("/");
        }
      },
    );

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (
      isConnected &&
      address &&
      !isReconnecting
    ) {
      router.replace("/");
    }
  }, [
    address,
    isConnected,
    isReconnecting,
    router,
  ]);

  async function handleGoogle() {
    try {
      setError("");
      setAuthLoading(true);

      await signInWithPopup(
        firebaseAuth,
        googleProvider,
      );

      router.replace("/");
    } catch (err: unknown) {
      console.error(err);

      const message =
        err instanceof Error
          ? err.message
          : "Google sign-in failed.";

      setError(message);
      setAuthLoading(false);
    }
  }

  async function handleEmail(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters.",
      );
      return;
    }

    try {
      setError("");
      setAuthLoading(true);

      if (isRegistering) {
        await createUserWithEmailAndPassword(
          firebaseAuth,
          email,
          password,
        );
      } else {
        await signInWithEmailAndPassword(
          firebaseAuth,
          email,
          password,
        );
      }

      router.replace("/");
    } catch (err: unknown) {
      console.error(err);

      const code =
        typeof err === "object" &&
        err !== null &&
        "code" in err
          ? String(
              (
                err as {
                  code?: string;
                }
              ).code ?? "",
            )
          : "";

      if (
        code ===
        "auth/email-already-in-use"
      ) {
        setError(
          "That email already has an account. Switch to Sign in.",
        );
      } else if (
        code ===
        "auth/invalid-credential"
      ) {
        setError(
          "Incorrect email or password.",
        );
      } else if (
        code ===
        "auth/invalid-email"
      ) {
        setError(
          "Enter a valid email address.",
        );
      } else {
        setError(
          "Authentication failed. Please try again.",
        );
      }

      setAuthLoading(false);
    }
  }

  if (
    firebaseLoading ||
    (isConnected && isReconnecting)
  ) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-black tracking-tight">
            AGORA
          </div>

          <p className="mt-2 text-sm text-white/50">
            Entering Agora...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-block text-3xl font-black tracking-tight"
          >
            AGORA
          </Link>

          <p className="mt-2 text-sm text-white/50">
            Chat. Swap. Build.
          </p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#111214] p-6 shadow-2xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">
              Enter Agora
            </h1>

            <p className="mt-2 text-sm text-white/50">
              Connect your account or wallet to continue.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={authLoading}
              className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3.5 font-semibold text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {authLoading
                ? "Connecting..."
                : "Continue with Google"}
            </button>

            {!showEmail ? (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setShowEmail(true);
                }}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 font-semibold text-white transition hover:bg-white/10"
              >
                Continue with Email
              </button>
            ) : (
              <form
                onSubmit={handleEmail}
                className="space-y-3"
              >
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  autoComplete="email"
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3.5 text-white outline-none placeholder:text-white/30 focus:border-[#f5c400]"
                />

                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  autoComplete={
                    isRegistering
                      ? "new-password"
                      : "current-password"
                  }
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3.5 text-white outline-none placeholder:text-white/30 focus:border-[#f5c400]"
                />

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full rounded-2xl bg-[#f5c400] px-4 py-3.5 font-bold text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {authLoading
                    ? "Please wait..."
                    : isRegistering
                      ? "Create account"
                      : "Sign in"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(
                      (value) => !value,
                    );
                    setError("");
                  }}
                  className="w-full py-2 text-sm text-[#f5c400] hover:underline"
                >
                  {isRegistering
                    ? "Already have an account? Sign in"
                    : "New to Agora? Create an account"}
                </button>
              </form>
            )}

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-white/30">
                OR
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-white/30">
            Your wallet connection and Agora account are
            separate. You can use either one to enter.
          </p>
        </div>
      </div>
    </main>
  );
}