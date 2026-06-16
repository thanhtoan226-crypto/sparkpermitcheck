"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import useStore from "@/lib/store";
import { PERMIT_TYPE_LABELS } from "@/lib/constants";
import type { PermitData } from "@/lib/types";
import {
  Shield,
  CheckCircle2,
  Circle,
  ArrowLeft,
  ClipboardList,
} from "lucide-react";

export default function ScanTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ permitId?: string; mode?: string }>;
}) {
  const { permitId, mode } = use(searchParams);
  const isReconfirm = mode === "reconfirm";
  const router = useRouter();
  const currentUser = useStore((s) => s.currentUser);
  const hasHydrated = useStore((s) => s._hasHydrated);

  const [permit, setPermit] = useState<PermitData | null>(null);
  const [signedTaskId, setSignedTaskId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!currentUser || currentUser.role !== "worker") {
      router.push("/");
      return;
    }
    if (!loadedRef.current && permitId) {
      loadedRef.current = true;
      loadPermit();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, router, permitId, hasHydrated]);

  if (!currentUser || currentUser.role !== "worker") return null;

  async function loadPermit() {
    const res = await fetch(`/api/permits/${permitId}`);
    if (res.ok) {
      const data = await res.json();
      setPermit(data);
    }
  }

  // Initial isolation point signing (isolation_pending)
  async function handleSignTask(taskId: string) {
    if (!currentUser) return;
    setError("");
    const res = await fetch(`/api/permits/${permitId}/isolation-tasks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, workerId: currentUser.id }),
    });
    if (res.ok) {
      setSignedTaskId(taskId);
      loadPermit();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to sign task");
    }
  }

  // Per-shift re-confirmation signing (shift_closed)
  async function handleReconfirmTask(taskId: string, cycleNumber: number) {
    if (!currentUser) return;
    setError("");
    const res = await fetch(`/api/permits/${permitId}/shift-isolation`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, cycleNumber, workerId: currentUser.id }),
    });
    if (res.ok) {
      setSignedTaskId(taskId);
      loadPermit();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to confirm task");
    }
  }

  if (!permit) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <p className="text-spark-gray">Loading...</p>
        </div>
      </div>
    );
  }

  // Derive current cycle number from closed shifts
  const closedShiftCount = permit.shifts.filter((s) => s.status === "closed").length;
  const currentCycle = closedShiftCount;

  // Per-shift confirmations for the current cycle
  const cycleConfirmations = permit.shiftIsolationConfirmations?.filter(
    (c) => c.cycleNumber === currentCycle
  ) ?? [];
  const pendingCycleConfirmations = cycleConfirmations.filter((c) => c.signedBy === null);

  // Initial unsigned tasks (for isolation_pending mode)
  const unsignedTasks = permit.isolationTasks.filter((t) =>
    t.isolationPoints.some((pt) => pt.signedBy === null)
  );

  const pageTitle = isReconfirm ? "Re-confirm Isolation" : "Sign Isolation Tasks";
  const badgeLabel = isReconfirm ? "Re-confirmation" : "Isolation";

  // --- Re-confirmation mode (shift_closed) ---
  if (isReconfirm) {
    const allReconfirmed = pendingCycleConfirmations.length === 0 && cycleConfirmations.length > 0;
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="px-4 py-6 max-w-lg mx-auto">
          <button
            onClick={() => router.push("/scan")}
            className="flex items-center gap-1 text-spark-blue text-sm font-medium mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-spark-blue text-white">{permit.type}</Badge>
              <Badge variant="outline" className="bg-orange-100 text-orange-800">
                {badgeLabel} (Cycle {currentCycle})
              </Badge>
            </div>
            <h1 className="text-lg font-bold text-spark-navy">{permit.title}</h1>
            <p className="text-xs text-spark-gray">
              {PERMIT_TYPE_LABELS[permit.type as keyof typeof PERMIT_TYPE_LABELS] ?? permit.type}
            </p>
          </div>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          {allReconfirmed ? (
            <Card>
              <CardContent className="py-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-spark-gray font-medium">All tasks re-confirmed for this cycle</p>
                <p className="text-xs text-spark-gray mt-1">Permit holder can now start the next revalidation.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {permit.isolationTasks.map((task) => {
                const confirmation = cycleConfirmations.find((c) => c.isolationTaskId === task.id);
                const confirmed = confirmation?.signedBy != null;
                const wasJustSigned = signedTaskId === task.id;
                return (
                  <Card key={task.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Shield className="w-4 h-4 text-spark-blue" />
                          {task.name}
                        </CardTitle>
                        {confirmed && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Confirmed
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {confirmed ? (
                        <p className="text-xs text-spark-gray">
                          Confirmed by {confirmation?.signer?.name ?? confirmation?.signedBy}
                        </p>
                      ) : wasJustSigned ? (
                        <p className="text-xs text-green-700">Just confirmed ✓</p>
                      ) : (
                        <Button
                          onClick={() => handleReconfirmTask(task.id, currentCycle)}
                          className="w-full mt-2 bg-spark-blue hover:bg-spark-blue/90 text-white gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Confirm Task
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Initial signing mode (isolation_pending) ---
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="px-4 py-6 max-w-lg mx-auto">
        <button
          onClick={() => router.push("/scan")}
          className="flex items-center gap-1 text-spark-blue text-sm font-medium mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-spark-blue text-white">{permit.type}</Badge>
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
              {badgeLabel}
            </Badge>
          </div>
          <h1 className="text-lg font-bold text-spark-navy">{permit.title}</h1>
          <p className="text-xs text-spark-gray">
            {PERMIT_TYPE_LABELS[permit.type as keyof typeof PERMIT_TYPE_LABELS] ?? permit.type}
          </p>
        </div>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        {unsignedTasks.length === 0 && !signedTaskId ? (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-spark-gray">All isolation tasks are already signed</p>
              <Button
                onClick={() => router.push(`/scan/permit?permitId=${permit.id}`)}
                className="mt-4 bg-spark-purple hover:bg-spark-purple/90 text-white gap-2"
              >
                <ClipboardList className="w-4 h-4" />
                Go to Permit
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {permit.isolationTasks.map((task) => {
              const allSigned = task.isolationPoints.every((pt) => pt.signedBy !== null);
              const wasJustSigned = signedTaskId === task.id;

              return (
                <Card key={task.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="w-4 h-4 text-spark-blue" />
                        {task.name}
                      </CardTitle>
                      {allSigned && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Signed
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {task.isolationPoints.map((pt) => (
                      <div
                        key={pt.id}
                        className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          {pt.signedBy ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-400" />
                          )}
                          <span>{pt.name}</span>
                        </div>
                        {pt.signedBy && (
                          <span className="text-xs text-spark-gray">
                            Signed by {pt.signer?.name ?? "Worker"}
                          </span>
                        )}
                      </div>
                    ))}

                    {wasJustSigned && (
                      <div className="pt-2">
                        <Button
                          onClick={() => router.push(`/scan/permit?permitId=${permit.id}`)}
                          className="w-full bg-spark-purple hover:bg-spark-purple/90 text-white gap-2"
                        >
                          <ClipboardList className="w-4 h-4" />
                          Go to Permit
                        </Button>
                      </div>
                    )}

                    {!allSigned && !wasJustSigned && (
                      <Button
                        onClick={() => handleSignTask(task.id)}
                        className="w-full mt-2 bg-spark-blue hover:bg-spark-blue/90 text-white gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Sign Off
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
