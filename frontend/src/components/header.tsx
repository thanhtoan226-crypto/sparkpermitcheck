"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import useStore from "@/lib/store";
import type { SessionUser } from "@/lib/types";
import { ChevronDown, LogOut, LayoutDashboard, ScanLine } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useStore((s) => s.currentUser);
  const setUser = useStore((s) => s.setUser);
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentUser && pathname !== "/") {
      fetch("/api/users").then((r) => r.json()).then(setUsers);
    }
  }, [currentUser, pathname]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!currentUser || pathname === "/") return null;

  async function switchUser(userId: string) {
    const user = users.find((u: { id: string }) => u.id === userId);
    if (user) {
      setUser(user);
      router.push(user.role === "worker" ? "/scan" : "/permits");
    }
    setDropdownOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 bg-[#032147] text-white shadow-md shadow-slate-900/10">
      <div className="px-4 py-2.5 flex items-center justify-between max-w-[680px] mx-auto">
        <Link href={currentUser.role === "worker" ? "/scan" : "/permits"} className="flex items-center gap-2.5 group">
          <div className="bg-white p-1 rounded-md transition-transform group-active:scale-95">
            <Image src="/spark-nel-logo.png" alt="Spark NEL" width={32} height={32} className="rounded-sm" />
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-sm block leading-tight">Spark Permit Check</span>
            <span className="text-[10px] text-spark-blue font-bold uppercase tracking-wider leading-tight">Field Middleware</span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {currentUser.role === "spark_user" && pathname !== "/permits" && (
            <Link
              href="/permits"
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors hover:bg-white/10"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Dashboard</span>
            </Link>
          )}

          {currentUser.role === "worker" && pathname !== "/scan" && (
            <Link
              href="/scan"
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors hover:bg-white/10"
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Scan</span>
            </Link>
          )}

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-full pl-1.5 pr-2.5 py-1.5 transition-all active:scale-95 border border-white/10"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold border border-white/30 shadow-sm"
                style={{ backgroundColor: currentUser.avatarColor }}
              >
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-white/60 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 min-w-[220px] z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="px-4 py-2 mb-1 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Signed in as</p>
                  <p className="text-sm font-bold text-spark-navy truncate">{currentUser.name}</p>
                </div>

                <div className="max-h-[240px] overflow-y-auto">
                  {users.filter(u => u.id !== currentUser.id).map((u) => (
                    <button
                      key={u.id}
                      onClick={() => switchUser(u.id)}
                      className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm" style={{ backgroundColor: u.avatarColor }}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-700 truncate leading-tight">{u.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {u.role === "worker" ? `Worker #${u.workerId}` : "Staff User"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    onClick={() => { setUser(null); router.push("/"); setDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <span className="font-bold">Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
