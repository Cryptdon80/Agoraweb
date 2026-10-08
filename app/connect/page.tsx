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
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
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
    let active = true;

    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      (user) => {
        if (!active) return;

        setFirebaseLoading(false);

        if (user) {
          router.replace("/chat");
        }
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (
      isConnected &&
      address &&
      !isReconnecting
    ) {
      router.replace("/chat");
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

      await setPersistence(
        firebaseAuth,
        browserLocalPersistence,
      );

      await signInWithPopup(
        firebaseAuth,
        googleProvider,
      );

      router.replace("/chat");
    } catch (err: unknown) {
      console.error(
        "Google popup sign-in error:",
        err,
      );

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
      setError(
        "Enter your email and password.",
      );
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

      router.replace("/chat");
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
      <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5c400] text-2xl font-black text-black shadow-[0_0_45px_rgba(245,196,0,0.22)]">
            A
          </div>

          <div className="text-2xl font-black tracking-tight">
            AGORA
          </div>

          <p className="mt-2 text-sm text-white/40">
            Entering Agora...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/2 top-[-220px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#f5c400]/10 blur-[120px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-12">
        {/* Header */}
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="group flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5c400] text-xl font-black text-black shadow-[0_8px_30px_rgba(245,196,0,0.18)] transition duration-200 group-hover:-translate-y-0.5 group-hover:scale-105">
              A
            </div>

            <div>
              <div className="text-lg font-black tracking-tight">
                AGORA
              </div>

              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                AI & Web3 Agent
              </div>
            </div>
          </Link>

          <div className="hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/45 sm:block">
            Chat. Swap. Build.
          </div>
        </header>

        {/* Main */}
        <section className="flex flex-1 items-center justify-center py-14">
          <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1fr_440px] lg:gap-20">
            {/* Left side */}
            <div className="hidden lg:block">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#f5c400]/20 bg-[#f5c400]/[0.06] px-4 py-2 text-xs font-semibold text-[#f5c400]">
                <span className="h-2 w-2 rounded-full bg-[#f5c400] shadow-[0_0_12px_#f5c400]" />
                Your Web3 workspace
              </div>

              <h1 className="max-w-xl text-6xl font-black leading-[0.95] tracking-[-0.045em]">
                Enter
                <span className="text-[#f5c400]">
                  {" "}
                  Agora.
                </span>
              </h1>

              <p className="mt-7 max-w-lg text-lg leading-8 text-white/45">
                Connect your account or wallet and
                step into an AI-powered workspace
                built for Web3.
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                {[
                  "AI Agent",
                  "Swap",
                  "Portfolio",
                  "Web3 Tools",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-semibold text-white/50"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Connect card */}
            <div className="w-full">
              <div className="mb-5 lg:hidden">
                <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#f5c400]">
                  Welcome to Agora
                </div>

                <h1 className="text-4xl font-black tracking-tight">
                  Enter Agora.
                </h1>
              </div>

              <div className="rounded-[32px] border border-white/10 bg-[#111214]/95 p-6 shadow-[0_25px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8">
                <div className="mb-7">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5c400]/10 text-lg font-black text-[#f5c400]">
                    A
                  </div>

                  <h2 className="text-2xl font-black tracking-tight">
                    Connect to Agora
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-white/40">
                    Choose how you want to enter your
                    workspace.
                  </p>
                </div>

                {error && (
                  <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-300">
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  {/* Google */}
                  <button
                    type="button"
                    onClick={handleGoogle}
                    disabled={authLoading}
                    className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white px-5 py-4 font-bold text-black transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_35px_rgba(255,255,255,0.08)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-xs font-black text-white">
                      G
                    </span>

                    <span>
                      {authLoading
                        ? "Connecting..."
                        : "Continue with Google"}
                    </span>
                  </button>

                  {/* Email */}
                  {!showEmail ? (
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setShowEmail(true);
                      }}
                      className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-4 font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08]"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-sm">
                        @
                      </span>

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
                          setEmail(
                            event.target.value,
                          )
                        }
                        autoComplete="email"
                        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-sm text-white outline-none placeholder:text-white/25 transition focus:border-[#f5c400]/70 focus:ring-2 focus:ring-[#f5c400]/10"
                      />

                      <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(event) =>
                          setPassword(
                            event.target.value,
                          )
                        }
                        autoComplete={
                          isRegistering
                            ? "new-password"
                            : "current-password"
                        }
                        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-sm text-white outline-none placeholder:text-white/25 transition focus:border-[#f5c400]/70 focus:ring-2 focus:ring-[#f5c400]/10"
                      />

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full rounded-2xl bg-[#f5c400] px-5 py-4 font-black text-black transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_35px_rgba(245,196,0,0.15)] disabled:cursor-not-allowed disabled:opacity-50"
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
                        className="w-full rounded-xl py-2 text-sm font-semibold text-[#f5c400] transition hover:bg-[#f5c400]/5"
                      >
                        {isRegistering
                          ? "Already have an account? Sign in"
                          : "New to Agora? Create an account"}
                      </button>
                    </form>
                  )}

                  {/* Divider */}
                  <div className="flex items-center gap-3 py-3">
                    <div className="h-px flex-1 bg-white/10" />

                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/25">
                      or
                    </span>

                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  {/* Wallet */}
                  <div className="flex justify-center">
                    <div className="w-full">
                      <ConnectButton.Custom>
                        {({
                          account,
                          chain,
                          openAccountModal,
                          openChainModal,
                          openConnectModal,
                          mounted,
                        }) => {
                          const connected =
                            mounted &&
                            account &&
                            chain;

                          if (!connected) {
                            return (
                              <button
                                type="button"
                                onClick={
                                  openConnectModal
                                }
                                className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-[#f5c400]/30 bg-[#f5c400]/[0.07] px-5 py-4 font-black text-[#f5c400] transition duration-200 hover:-translate-y-0.5 hover:border-[#f5c400]/60 hover:bg-[#f5c400]/[0.12]"
                              >
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f5c400] text-xs font-black text-black">
                                  ◈
                                </span>

                                Connect Wallet
                              </button>
                            );
                          }

                          if (chain.unsupported) {
                            return (
                              <button
                                type="button"
                                onClick={
                                  openChainModal
                                }
                                className="w-full rounded-2xl bg-[#f5c400] px-5 py-4 font-black text-black"
                              >
                                Wrong Network
                              </button>
                            );
                          }

                          return (
                            <button
                              type="button"
                              onClick={
                                openAccountModal
                              }
                              className="w-full rounded-2xl bg-[#f5c400] px-5 py-4 font-black text-black"
                            >
                              {account.displayName}
                            </button>
                          );
                        }}
                      </ConnectButton.Custom>
                    </div>
                  </div>
                </div>

                <div className="mt-7 border-t border-white/10 pt-5">
                  <p className="text-center text-xs leading-5 text-white/30">
                    Your wallet connection and Agora
                    account are separate. You can use
                    either one to enter.
                  </p>
                </div>
              </div>

              <p className="mt-5 text-center text-[11px] text-white/25">
                By continuing, you agree to use Agora
                responsibly.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex items-center justify-center pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/20">
          AGORA · AI × WEB3
        </footer>
      </div>
    </main>
  );
}