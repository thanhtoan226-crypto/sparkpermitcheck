"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import useStore from "@/lib/store";
import type { SessionUser } from "@/lib/types";
import { ScanLine, ChevronDown, LogOut } from "lucide-react";
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
    const res = await fetch("/api/users");
    const all = await res.json();
    const user = all.find((u: { id: string }) => u.id === userId);
    if (user) {
      setUser(user);
      router.push(user.role === "worker" ? "/scan" : "/permits");
    }
    setDropdownOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="px-4 py-3 flex items-center justify-between max-w-[680px] mx-auto">
        <div className="flex items-center gap-2">
          <Image src="/spark-nel-logo.png" alt="Spark NEL" width={40} height={40} className="rounded" />
          <span className="font-semibold text-spark-navy text-sm">Spark Permit Check</span>
        </div>
        <div className="flex items-center gap-2">
          {currentUser.role === "worker" && !pathname.startsWith("/scan") && (
            <Link href="/scan" className="flex items-center gap-1 text-spark-blue text-sm font-medium px-3 py-2 rounded-lg min-h-[44px]">
              <ScanLine className="w-4 h-4" />
              Scan
            </Link>
          )}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1 min-h-[44px]"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: currentUser.avatarColor }}
              >
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px] z-50">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => switchUser(u.id)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 ${u.id === currentUser.id ? "bg-blue-50" : ""}`}
                  >
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: u.avatarColor }}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">{u.name}</span>
                    {u.workerId && <span className="text-spark-gray ml-auto">#{u.workerId}</span>}
                    <span className="text-spark-gray text-xs">{u.role === "permit_holder" ? "Holder" : "Worker"}</span>
                  </button>
                ))}
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={() => { setUser(null); router.push("/"); setDropdownOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
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
