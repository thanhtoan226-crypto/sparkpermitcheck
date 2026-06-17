"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import PermitCard from "@/components/permit-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useStore from "@/lib/store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PermitType, PermitSummary, SessionUser } from "@/lib/types";
import { PERMIT_TYPE_LABELS } from "@/lib/constants";
import { Plus, ClipboardList, Filter, Search, PlusCircle } from "lucide-react";

const PERMIT_TYPES: PermitType[] = ["CMW", "CAP_NON_ISOLATION", "CAP_ISOLATION"];

export default function PermitsPage() {
  const router = useRouter();
  const currentUser = useStore((s) => s.currentUser);
  const hasHydrated = useStore((s) => s._hasHydrated);

  const [permits, setPermits] = useState<PermitSummary[]>([]);
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<PermitType>("CMW");
  const [title, setTitle] = useState("");
  const [holderId, setHolderId] = useState("");
  const [acceptorId, setAcceptorId] = useState("");
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const loadedRef = useRef(false);

  async function loadPermits() {
    const res = await fetch("/api/permits?list=true");
    const data = await res.json();
    setPermits(data);
  }

  async function loadUsers() {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data.filter((u: SessionUser) => u.role === "spark_user"));
  }

  useEffect(() => {
    if (!hasHydrated) return;
    if (!currentUser) {
      router.push("/");
      return;
    }
    if (currentUser.role === "worker") {
      router.push("/scan");
      return;
    }
    if (!loadedRef.current) {
      loadedRef.current = true;
      loadPermits();
      loadUsers();
    }
  }, [currentUser, router, hasHydrated]);

  if (!currentUser || currentUser.role === "worker") return null;

  async function handleCreate() {
    if (!title.trim() || !currentUser || !holderId || !acceptorId) return;
    setCreating(true);
    await fetch("/api/permits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, title: title.trim(), holderId, acceptorId, issuerId: currentUser.id }),
    });
    setCreating(false);
    setTitle("");
    setHolderId("");
    setAcceptorId("");
    setOpen(false);
    loadPermits();
  }

  const filteredPermits = permits.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-shell">
      <Header />
      <div className="page-content">
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-spark-navy flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-spark-blue" />
              Permits
            </h1>

            {currentUser.role === "spark_user" && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger render={<Button className="bg-spark-purple hover:bg-spark-purple/90 text-white rounded-xl font-bold shadow-lg shadow-spark-purple/20 gap-2 px-5" />}>
                  <PlusCircle className="w-5 h-5" />
                  <span className="hidden sm:inline">New Permit</span>
                  <span className="sm:hidden">New</span>
                </Button>
                <DialogContent className="sm:max-w-[425px] rounded-3xl p-6">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-spark-navy">Create New Permit</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Permit Type</Label>
                      <div className="grid grid-cols-1 gap-2 mt-1">
                        {PERMIT_TYPES.map((pt) => (
                          <button
                            key={pt}
                            onClick={() => setType(pt)}
                            className={`text-left p-3 rounded-xl border-2 transition-all active:scale-[0.98] ${
                              type === pt
                                ? "border-spark-blue bg-blue-50/50 ring-2 ring-spark-blue/10"
                                : "border-slate-100 hover:border-slate-200"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`font-bold text-sm ${type === pt ? "text-spark-blue" : "text-slate-700"}`}>{pt}</span>
                              {type === pt && <div className="w-2 h-2 rounded-full bg-spark-blue animate-pulse" />}
                            </div>
                            <span className="text-slate-500 block text-[10px] font-medium uppercase tracking-tight">
                              {PERMIT_TYPE_LABELS[pt]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Permit Title</Label>
                      <Input
                        id="title"
                        placeholder="e.g. Zone A Lighting Installation"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="h-11 rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Holder</Label>
                        <Select value={holderId} onValueChange={(val) => setHolderId(val || "")}>
                          <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-100">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id} className="rounded-lg m-1">
                                {u.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Acceptor</Label>
                        <Select value={acceptorId} onValueChange={(val) => setAcceptorId(val || "")}>
                          <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-100">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id} className="rounded-lg m-1">
                                {u.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      onClick={handleCreate}
                      disabled={!title.trim() || !holderId || !acceptorId || creating}
                      className="w-full h-12 bg-spark-purple hover:bg-spark-purple/90 text-white rounded-xl font-bold text-lg shadow-xl shadow-spark-purple/20 transition-all active:scale-[0.98] mt-2"
                    >
                      {creating ? "Creating..." : "Create Permit"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search permits by name or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 rounded-2xl bg-slate-50 border-none shadow-sm focus:bg-white transition-all ring-offset-background focus-visible:ring-2 focus-visible:ring-spark-blue/20"
              />
            </div>
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-slate-50 hover:bg-slate-100 border-none text-slate-500">
              <Filter className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {filteredPermits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center glass-card border-none bg-slate-50/50 rounded-3xl">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
              <Search className="w-10 h-10 text-slate-300" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">No permits found</h2>
            <p className="text-slate-500 max-w-xs mx-auto mb-8">
              {searchTerm
                ? `We couldn't find any permits matching "${searchTerm}"`
                : "Your workspace is empty. Create your first permit to get started."}
            </p>
            {currentUser.role === "spark_user" && !searchTerm && (
              <Button
                onClick={() => setOpen(true)}
                variant="outline"
                className="rounded-xl border-slate-200 text-spark-navy font-bold hover:bg-white"
              >
                Create First Permit
              </Button>
            )}
            {searchTerm && (
              <Button
                onClick={() => setSearchTerm("")}
                variant="ghost"
                className="text-spark-blue font-bold hover:bg-transparent"
              >
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.15em] pl-1">
              {searchTerm ? `Found ${filteredPermits.length} matching permits` : "Active Permits"}
            </p>
            <div className="space-y-3">
              {filteredPermits.map((p) => (
                <PermitCard key={p.id} permit={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
