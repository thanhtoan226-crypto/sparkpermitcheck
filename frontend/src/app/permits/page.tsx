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
import type { PermitType, PermitSummary } from "@/lib/types";
import { PERMIT_TYPE_LABELS } from "@/lib/constants";
import { Plus, ClipboardList } from "lucide-react";

const PERMIT_TYPES: PermitType[] = ["CMW", "CAP_NON_ISOLATION", "CAP_ISOLATION"];

export default function PermitsPage() {
  const router = useRouter();
  const currentUser = useStore((s) => s.currentUser);
  const hasHydrated = useStore((s) => s._hasHydrated);

  const [permits, setPermits] = useState<PermitSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<PermitType>("CMW");
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const loadedRef = useRef(false);

  async function loadPermits() {
    const res = await fetch("/api/permits?list=true");
    const data = await res.json();
    setPermits(data);
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
    }
  }, [currentUser, router, hasHydrated]);

  if (!currentUser || currentUser.role === "worker") return null;

  async function handleCreate() {
    if (!title.trim() || !currentUser) return;
    setCreating(true);
    await fetch("/api/permits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, title: title.trim(), holderId: currentUser.id }),
    });
    setCreating(false);
    setTitle("");
    setOpen(false);
    loadPermits();
  }

  const myPermits = permits.filter(
    (p) => currentUser.role === "worker" || p.permitHolderId === currentUser.id
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="px-4 py-6 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-spark-navy">Permits</h1>
          {currentUser.role === "permit_holder" && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button className="bg-spark-purple hover:bg-spark-purple/90 text-white gap-1.5" />}>
                <Plus className="w-4 h-4" />
                New
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Permit</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <Label>Permit Type</Label>
                    <div className="grid grid-cols-1 gap-2 mt-2">
                      {PERMIT_TYPES.map((pt) => (
                        <button
                          key={pt}
                          onClick={() => setType(pt)}
                          className={`text-left p-3 rounded-lg border text-sm transition-colors ${
                            type === pt ? "border-spark-blue bg-blue-50" : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <span className="font-medium">{pt}</span>
                          <span className="text-spark-gray block text-xs mt-0.5">
                            {PERMIT_TYPE_LABELS[pt]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="title">Permit Title</Label>
                    <Input
                      id="title"
                      placeholder="Enter permit title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <Button
                    onClick={handleCreate}
                    disabled={!title.trim() || creating}
                    className="w-full bg-spark-purple hover:bg-spark-purple/90 text-white"
                  >
                    {creating ? "Creating..." : "Create Permit"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {myPermits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="w-12 h-12 text-spark-gray mb-3" />
            <p className="text-spark-gray">No permits yet</p>
            {currentUser.role === "permit_holder" && (
              <p className="text-spark-gray text-sm mt-1">Tap &ldquo;New&rdquo; to create one</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {myPermits.map((p) => (
              <PermitCard key={p.id} permit={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
