"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import useStore from "@/lib/store";
import type { SessionUser } from "@/lib/types";
import { User, HardHat, ChevronRight, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const setUser = useStore((s) => s.setUser);
  const currentUser = useStore((s) => s.currentUser);
  const hasHydrated = useStore((s) => s._hasHydrated);

  const [role, setRole] = useState<"spark_user" | "worker">("spark_user");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (currentUser) {
      router.push(currentUser.role === "worker" ? "/scan" : "/permits");
    }
  }, [currentUser, router, hasHydrated]);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers);
  }, []);

  async function handleSubmit() {
    setError("");
    const value = name.trim();
    if (!value) {
      setError(`Please enter your ${role === "spark_user" ? "username" : "worker ID"}`);
      return;
    }
    if (role === "worker" && !/^\d{6}$/.test(value)) {
      setError("Worker ID must be a 6-digit number");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, name: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      setUser(data);
      router.push(data.role === "worker" ? "/scan" : "/permits");
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  async function handleQuickLogin(userId: string) {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setUser(user);
      router.push(user.role === "worker" ? "/scan" : "/permits");
    }
  }

  return (
    <div className="login-shell">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center">
          <div className="bg-white p-3 rounded-2xl shadow-xl mb-4">
            <Image
              src="/spark-nel-logo.png"
              alt="Spark NEL"
              width={64}
              height={64}
              className="rounded-lg"
            />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Spark Permit Check</h1>
          <p className="text-spark-blue font-medium text-sm mt-1 uppercase tracking-wider">Field Operations Middleware</p>
        </div>

        {users.length > 0 && (
          <div className="glass-card p-5 space-y-3">
            <h2 className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Recent Sessions</h2>
            <div className="grid grid-cols-1 gap-2">
              {users.slice(0, 4).map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleQuickLogin(u.id)}
                  className="flex items-center justify-between w-full bg-white/5 hover:bg-white/10 rounded-xl p-3 text-white transition-all group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white/20"
                      style={{ backgroundColor: u.avatarColor }}
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm">{u.name}</p>
                      <p className="text-[10px] text-white/50">{u.role === "worker" ? `Worker #${u.workerId}` : "Permit Issuer/Holder"}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-[1.5rem] p-6 shadow-2xl space-y-6">
          <div className="spark-button-group">
            <button
              onClick={() => { setRole("spark_user"); setName(""); setError(""); }}
              className={`spark-button-group-item flex items-center justify-center gap-2 ${role === "spark_user" ? "active" : ""}`}
            >
              <User className="w-4 h-4" />
              Staff
            </button>
            <button
              onClick={() => { setRole("worker"); setName(""); setError(""); }}
              className={`spark-button-group-item flex items-center justify-center gap-2 ${role === "worker" ? "active" : ""}`}
            >
              <HardHat className="w-4 h-4" />
              Worker
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                {role === "spark_user" ? "Username" : "Worker ID"}
              </Label>
              <div className="relative">
                <Input
                  id="name"
                  type="text"
                  inputMode={role === "worker" ? "numeric" : undefined}
                  pattern={role === "worker" ? "[0-9]*" : undefined}
                  placeholder={role === "spark_user" ? "Enter your name" : "6-digit ID number"}
                  maxLength={role === "worker" ? 6 : 50}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-12 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                <p className="text-red-600 text-xs font-medium">{error}</p>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full h-12 bg-spark-purple hover:bg-spark-purple/90 text-white rounded-xl font-bold shadow-lg shadow-spark-purple/20 transition-all active:scale-[0.98]"
            >
              {loading ? "Signing in..." : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </span>
              )}
            </Button>
          </div>
        </div>

        <p className="text-center text-white/40 text-[10px] uppercase tracking-[0.2em] font-medium">
          Powered by Spark NEL Field Operations
        </p>
      </div>
    </div>
  );
}
