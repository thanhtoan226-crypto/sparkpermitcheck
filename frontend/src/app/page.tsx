"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useStore from "@/lib/store";
import type { SessionUser } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const setUser = useStore((s) => s.setUser);
  const currentUser = useStore((s) => s.currentUser);
  const hasHydrated = useStore((s) => s._hasHydrated);

  const [role, setRole] = useState<"spark_user" | "worker">("spark_user");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [users, setUsers] = useState<SessionUser[]>([]);

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
      setError("Please enter your name");
      return;
    }
    if (role === "worker" && !/^\d{6}$/.test(value)) {
      setError("Worker ID must be a 6-digit number");
      return;
    }
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
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  async function handleQuickLogin(userId: string) {
    const res = await fetch("/api/users");
    const all = await res.json();
    const user = all.find((u: { id: string }) => u.id === userId);
    if (user) {
      setUser(user);
      router.push(user.role === "worker" ? "/scan" : "/permits");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-spark-navy px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/spark-nel-logo.png"
            alt="Spark NEL"
            width={80}
            height={80}
            className="rounded-lg mb-4"
          />
          <h1 className="text-2xl font-bold text-white">Spark Permit Check</h1>
          <p className="text-spark-gray text-sm mt-1">Field permit execution and attendance</p>
        </div>

        {users.length > 0 && (
          <div className="bg-white/10 rounded-lg p-4 mb-6">
            <p className="text-white/70 text-xs mb-2">Quick login</p>
            <div className="flex flex-wrap gap-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleQuickLogin(u.id)}
                  className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-full px-3 py-2.5 text-white text-sm transition-colors min-h-[44px]"
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: u.avatarColor }}
                  >
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  {u.name}
                  {u.workerId && <span className="text-white/60">#{u.workerId}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
            <button
              onClick={() => { setRole("spark_user"); setName(""); setError(""); }}
              className={`flex-1 py-3 text-sm font-medium rounded-md transition-colors ${role === "spark_user" ? "bg-spark-blue text-white shadow-sm" : "text-gray-600"}`}
            >
              Spark User
            </button>
            <button
              onClick={() => { setRole("worker"); setName(""); setError(""); }}
              className={`flex-1 py-3 text-sm font-medium rounded-md transition-colors ${role === "worker" ? "bg-spark-blue text-white shadow-sm" : "text-gray-600"}`}
            >
              Worker
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">{role === "spark_user" ? "Username" : "Worker ID"}</Label>
              <Input
                id="name"
                type="text"
                inputMode={role === "worker" ? "numeric" : undefined}
                pattern={role === "worker" ? "[0-9]*" : undefined}
                placeholder={role === "spark_user" ? "Enter your name" : "Enter 6-digit ID"}
                maxLength={role === "worker" ? 6 : 50}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="mt-1.5"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              onClick={handleSubmit}
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-spark-purple hover:bg-spark-purple/90 text-white text-sm font-medium h-9 gap-1.5 px-4 w-full cursor-pointer"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
