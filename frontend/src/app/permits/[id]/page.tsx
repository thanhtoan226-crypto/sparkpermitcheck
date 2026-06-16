"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import useStore from "@/lib/store";
import { PERMIT_TYPE_LABELS, PERMIT_STATUS_LABELS } from "@/lib/constants";
import { encodeQR } from "@/lib/qr-utils";
import type { QRCodeData, PermitData, ShiftIsolationConfirmationData } from "@/lib/types";
import { QRCodeSVG } from "qrcode.react";
import {
  Shield,
  CheckCircle2,
  Circle,
  Plus,
  X,
  QrCode,
  LogIn,
  LogOut,
  Lock,
  History,
  ArrowLeft,
  ClipboardCheck,
} from "lucide-react";

export default function PermitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const currentUser = useStore((s) => s.currentUser);
  const hasHydrated = useStore((s) => s._hasHydrated);

  const [permit, setPermit] = useState<PermitData | null>(null);
  const loadedRef = useRef(false);

  async function loadPermit() {
    const res = await fetch(`/api/permits/${id}`);
    if (res.ok) {
      const data = await res.json();
      setPermit(data);
    }
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
      loadPermit();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, router, id, hasHydrated]);

  if (!currentUser || currentUser.role === "worker") return null;
  if (!permit) {
    return (
      <div className="page-shell">
        <Header />
        <div className="flex items-center justify-center py-20">
          <p className="text-spark-gray">Loading...</p>
        </div>
      </div>
    );
  }

  const readOnly = permit.status === "closed";
  const isHolder =
    currentUser.role === "spark_user" &&
    permit.permitHolderId === currentUser.id;
  const isIssuer =
    currentUser.role === "spark_user" &&
    permit.permitIssuerId === currentUser.id;

  return (
    <div className="page-shell">
      <Header />
      <div className="page-content space-y-4">
        <button
          onClick={() => router.push("/permits")}
          className="flex items-center gap-1 text-spark-blue text-sm font-medium mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Permits
        </button>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-spark-blue text-white">{permit.type}</Badge>
            <Badge
              variant="outline"
              className={
                permit.status === "closed"
                  ? "bg-red-100 text-red-800"
                  : "bg-green-100 text-green-800"
              }
            >
              {PERMIT_STATUS_LABELS[permit.status as keyof typeof PERMIT_STATUS_LABELS] ?? permit.status}
            </Badge>
          </div>
          <h1 className="text-lg font-bold text-spark-navy">{permit.title}</h1>
          <p className="text-sm text-spark-gray mt-0.5">Permit Holder: {permit.permitHolder.name}</p>
          <p className="text-sm text-spark-gray mt-0.5">Permit Issuer: {permit.permitIssuer?.name}</p>
          <p className="text-xs text-spark-gray">
            {PERMIT_TYPE_LABELS[permit.type as keyof typeof PERMIT_TYPE_LABELS] ?? permit.type}
          </p>
        </div>

        <Separator />

        <IsolationSection permit={permit} isHolder={isHolder} readOnly={readOnly} onRefresh={loadPermit} />
        <ShiftSection permit={permit} isHolder={isHolder} isIssuer={isIssuer} readOnly={readOnly} onRefresh={loadPermit} />
        <ShiftHistorySection permit={permit} />
        {permit.shifts.length > 0 && <PermitQRSection permitId={permit.id} />}
        <ClosureSection permit={permit} isHolder={isHolder} isIssuer={isIssuer} readOnly={readOnly} onRefresh={loadPermit} />
        <QRDisplay />
      </div>
    </div>
  );
}

// --- Isolation Task Section (CMW only) ---

function formatDateTime(ts: string | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function IsolationSection({
  permit,
  isHolder,
  readOnly,
  onRefresh,
}: {
  permit: PermitData;
  isHolder: boolean;
  readOnly: boolean;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [pointNames, setPointNames] = useState([""]);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const setActiveQR = useStore((s) => s.setActiveQR);

  if (permit.type !== "CMW") return null;

  const isDraft = permit.status === "draft";
  const closedShiftCount = permit.shifts.filter((s) => s.status === "closed").length;
  const currentCycle = closedShiftCount; // cycle N is created after shift N closes

  // Per-shift confirmations for the current pending cycle
  const pendingConfirmations: ShiftIsolationConfirmationData[] =
    permit.shiftIsolationConfirmations?.filter((c) => c.cycleNumber === currentCycle) ?? [];
  const allCycleConfirmed =
    pendingConfirmations.length > 0 &&
    pendingConfirmations.every((c) => c.isolatedById !== null && c.verifiedById !== null);

  // After a shift closes, isolation signatures must be re-collected before next revalidation.
  // "collecting" = confirmations exist for current cycle (started). "not started" = no confirmations yet.
  const isReconfirmationPhase = closedShiftCount > 0 && permit.status !== "closed";
  const reconfirmationStarted = pendingConfirmations.length > 0;

  async function handleStartCollectSignatures() {
    // Creates ShiftIsolationConfirmation rows for the current cycle by triggering
    // the same mechanism — we do a PUT to a new action on isolation-tasks endpoint.
    setConfirming(true);
    setError("");
    const res = await fetch(`/api/permits/${permit.id}/isolation-tasks`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start_collect_signatures", cycleNumber: currentCycle }),
    });
    setConfirming(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to start signature collection");
      return;
    }
    onRefresh();
  }

  async function handleAddTask() {
    if (!taskName.trim()) return;
    const points = pointNames.map((n) => n.trim()).filter(Boolean);
    if (points.length === 0) return;
    setSubmitting(true);
    setError("");
    const res = await fetch(`/api/permits/${permit.id}/isolation-tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskName: taskName.trim(), pointNames: points }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to add task");
      return;
    }
    setTaskName("");
    setPointNames([""]);
    setShowForm(false);
    onRefresh();
  }

  async function handleConfirmTasks() {
    setConfirming(true);
    setError("");
    const res = await fetch(`/api/permits/${permit.id}/isolation-tasks`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm_tasks" }),
    });
    setConfirming(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to confirm tasks");
      return;
    }
    onRefresh();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-spark-blue" />
            Isolation Tasks
          </CardTitle>
          {/* Add Task — only available in draft */}
          {isHolder && !readOnly && isDraft && (
            <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)} className="gap-1">
              <Plus className="w-3 h-3" />
              Add Task
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add Task Form (draft only) */}
        {showForm && isDraft && (
          <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
            <div>
              <Label htmlFor="taskName">Task Name</Label>
              <Input id="taskName" value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="Enter task name" className="mt-1" />
            </div>
            <div>
              <Label>Isolation Points</Label>
              <div className="space-y-2 mt-1">
                {pointNames.map((pn, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={pn}
                      onChange={(e) => { const next = [...pointNames]; next[i] = e.target.value; setPointNames(next); }}
                      placeholder={`Point ${i + 1}`}
                      id={`isolationPoint-${i}`}
                    />
                    {pointNames.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => setPointNames(pointNames.filter((_, j) => j !== i))}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => setPointNames([...pointNames, ""])} className="mt-2 gap-1">
                <Plus className="w-3 h-3" />
                Add Point
              </Button>
            </div>
            <Button
              onClick={handleAddTask}
              disabled={!taskName.trim() || pointNames.every((n) => !n.trim()) || submitting}
              className="w-full bg-spark-purple hover:bg-spark-purple/90 text-white"
            >
              {submitting ? "Saving..." : "Save Task"}
            </Button>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
        )}

        {permit.isolationTasks.length === 0 && !showForm && (
          <p className="text-spark-gray text-sm text-center py-4">No isolation tasks yet</p>
        )}

        {/* Reconfirmation phase: after a shift is relinquished, signatures are cleared */}
        {isReconfirmationPhase ? (
          <>
            {!reconfirmationStarted ? (
              /* Not started yet — show tasks as unsigned, prompt to collect signatures */
              <>
                <div className="space-y-2">
                  {permit.isolationTasks.map((task) => (
                    <div key={task.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm text-spark-navy">{task.name}</span>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700">
                          <Circle className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      </div>
                      <div className="space-y-1.5">
                        {task.isolationPoints.map((pt) => (
                          <div key={pt.id} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded bg-gray-50">
                            <Circle className="w-4 h-4 text-gray-400" />
                            <span>{pt.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {isHolder && !readOnly && (
                  <div className="pt-1">
                    {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                    <p className="text-xs text-spark-gray mb-2">
                      Shift relinquished. Collect isolation task signatures before next revalidation.
                    </p>
                    <Button
                      onClick={handleStartCollectSignatures}
                      disabled={confirming}
                      className="w-full bg-spark-blue hover:bg-spark-blue/90 text-white gap-2"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      {confirming ? "Starting..." : "Start collect signatures"}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              /* Reconfirmation in progress — show per-task confirmation status */
              <>
                {allCycleConfirmed ? (
                  <p className="text-xs text-green-700 bg-green-50 rounded px-2 py-1">
                    All tasks confirmed — holder can start next revalidation.
                  </p>
                ) : (
                  <p className="text-xs text-orange-700 bg-orange-50 rounded px-2 py-1">
                    Workers must confirm all isolation tasks before next revalidation.
                  </p>
                )}
                <div className="space-y-2">
                  {permit.isolationTasks.map((task) => {
                    const confirmation = pendingConfirmations.find((c) => c.isolationTaskId === task.id);
                    const confirmed = confirmation?.isolatedById != null && confirmation?.verifiedById != null;
                    return (
                      <div key={task.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-spark-navy">{task.name}</span>
                          <div className="flex items-center gap-2">
                            {confirmed ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Confirmed
                              </Badge>
                            ) : isHolder && !readOnly ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 text-xs"
                                onClick={() => {
                                  const data: QRCodeData = {
                                    permitId: permit.id,
                                    action: "shift_isolation_confirmation",
                                    targetId: JSON.stringify({ taskId: task.id, cycleNumber: currentCycle }),
                                  };
                                  setActiveQR(data);
                                }}
                              >
                                <QrCode className="w-3 h-3" />
                                Show QR
                              </Button>
                            ) : null}
                          </div>
                        </div>
                        {confirmation && (confirmation.isolatedById || confirmation.verifiedById) && (
                          <div className="text-xs text-spark-gray mt-1 space-y-1">
                            {confirmation.isolatedById && (
                              <p>Isolated by {confirmation.isolatedBy?.name ?? confirmation.isolatedById}{confirmation.isolatedAt ? ` · ${formatDateTime(confirmation.isolatedAt)}` : ""}</p>
                            )}
                            {confirmation.verifiedById && (
                              <p>Verified by {confirmation.verifiedBy?.name ?? confirmation.verifiedById}{confirmation.verifiedAt ? ` · ${formatDateTime(confirmation.verifiedAt)}` : ""}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        ) : (
          /* Initial phase — show original isolation point signatures */
          <>
            {permit.isolationTasks.map((task) => {
              const allSigned = task.isolatedById !== null && task.verifiedById !== null;
              return (
                <div key={task.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-spark-navy">{task.name}</span>
                    <div className="flex items-center gap-2">
                      {allSigned ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Signed
                        </Badge>
                      ) : isHolder && !readOnly && permit.status === "isolation_pending" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={() => {
                            const data: QRCodeData = { permitId: permit.id, action: "task_signature", targetId: task.id };
                            setActiveQR(data);
                          }}
                        >
                          <QrCode className="w-3 h-3" />
                          Show QR
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {task.isolationPoints.map((pt) => (
                      <div key={pt.id} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded bg-gray-50">
                        <Circle className="w-4 h-4 text-gray-400" />
                        <span>{pt.name}</span>
                      </div>
                    ))}
                  </div>
                  {(task.isolatedById || task.verifiedById) && (
                    <div className="text-xs text-spark-gray mt-2 space-y-1 border-t pt-2">
                      {task.isolatedById && (
                        <p>Isolated by {task.isolatedBy?.name ?? task.isolatedById}{task.isolatedAt ? ` · ${formatDateTime(task.isolatedAt)}` : ""}</p>
                      )}
                      {task.verifiedById && (
                        <p>Verified by {task.verifiedBy?.name ?? task.verifiedById}{task.verifiedAt ? ` · ${formatDateTime(task.verifiedAt)}` : ""}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Confirm Tasks button — draft only, after at least one task exists */}
            {isHolder && !readOnly && isDraft && permit.isolationTasks.length > 0 && (
              <div className="pt-1">
                {error && !showForm && <p className="text-red-500 text-sm mb-2">{error}</p>}
                <p className="text-xs text-spark-gray mb-2">
                  Add all tasks, then confirm to proceed to isolation signing.
                </p>
                <Button
                  onClick={handleConfirmTasks}
                  disabled={confirming}
                  className="w-full bg-spark-blue hover:bg-spark-blue/90 text-white gap-2"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  {confirming ? "Confirming..." : "Confirm Tasks"}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// --- Shift Section ---

function ShiftSection({
  permit,
  isHolder,
  isIssuer,
  readOnly,
  onRefresh,
}: {
  permit: PermitData;
  isHolder: boolean;
  isIssuer: boolean;
  readOnly: boolean;
  onRefresh: () => void;
}) {
  const [relinquishError, setRelinquishError] = useState("");
  const [actionError, setActionError] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedWorkerHistory, setExpandedWorkerHistory] = useState<string | null>(null);
  const setActiveQR = useStore((s) => s.setActiveQR);

  const currentShift = permit.shifts[permit.shifts.length - 1];

  function getLatestWorkers(shift: PermitData["shifts"][0]) {
    const latestMap = new Map<string, PermitData["shifts"][0]["workers"][0]>();
    for (const w of shift.workers) {
      latestMap.set(w.userId, w);
    }
    return Array.from(latestMap.values());
  }

  function getWorkerHistory(shift: PermitData["shifts"][0], userId: string) {
    return shift.workers.filter((w) => w.userId === userId);
  }

  async function handleIssuerSignOn() {
    setLoading(true);
    setActionError("");
    const res = await fetch(`/api/permits/${permit.id}/shifts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "issuer_sign_on" }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setActionError(data.error || "Failed to sign on");
    } else {
      onRefresh();
    }
  }

  async function handleHolderSignOn() {
    if (!currentShift) return;
    setLoading(true);
    setActionError("");
    const res = await fetch(`/api/permits/${permit.id}/shifts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "holder_sign_on", shiftId: currentShift.id }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setActionError(data.error || "Failed to sign on");
    } else {
      onRefresh();
    }
  }

  async function handleIssuerSignOff() {
    if (!currentShift) return;
    setLoading(true);
    setRelinquishError("");
    const res = await fetch(`/api/permits/${permit.id}/shifts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "issuer_sign_off", shiftId: currentShift.id }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setRelinquishError(data.error || "Failed to sign off");
    } else {
      onRefresh();
    }
  }

  async function handleHolderSignOff() {
    if (!currentShift) return;
    setLoading(true);
    setRelinquishError("");
    const res = await fetch(`/api/permits/${permit.id}/shifts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "holder_sign_off", shiftId: currentShift.id }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setRelinquishError(data.error || "Failed to sign off");
    } else {
      onRefresh();
    }
  }

  // No open shift — show Sign On button
  if (!currentShift || currentShift.status === "closed") {
    if ((isHolder || isIssuer) && !readOnly) {
      const closedShiftCount = permit.shifts.filter((s) => s.status === "closed").length;
      let canStart: boolean;
      if (permit.type !== "CMW") {
        canStart = true;
      } else if (closedShiftCount === 0) {
        canStart =
          permit.isolationTasks.length > 0 &&
          permit.isolationTasks.every((t) => t.isolatedById !== null && t.verifiedById !== null);
      } else {
        const cycleConfirmations = permit.shiftIsolationConfirmations?.filter(
          (c) => c.cycleNumber === closedShiftCount
        ) ?? [];
        canStart =
          cycleConfirmations.length > 0 &&
          cycleConfirmations.every((c) => c.isolatedById !== null && c.verifiedById !== null);
      }
      return (
        <Card>
          <CardContent className="py-6 text-center">
            {actionError && <p className="text-red-500 text-sm mb-2">{actionError}</p>}
            {isIssuer && (
              <Button
                onClick={handleIssuerSignOn}
                disabled={!canStart || loading}
                className="bg-spark-purple hover:bg-spark-purple/90 text-white gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                {loading ? "Signing On..." : "Issuer Sign On"}
              </Button>
            )}
            {!isIssuer && isHolder && (
              <p className="text-sm text-spark-gray">Waiting for Permit Issuer to sign on...</p>
            )}
            {!canStart && (
              <p className="text-xs text-spark-gray mt-2">Complete all isolation tasks first</p>
            )}
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  // Shift is pending holder sign on (revalidation_pending)
  if (currentShift.status === "revalidation_pending") {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          {actionError && <p className="text-red-500 text-sm mb-2">{actionError}</p>}
          {isHolder ? (
            <Button
              onClick={handleHolderSignOn}
              disabled={loading}
              className="bg-spark-blue hover:bg-spark-blue/90 text-white gap-1.5"
            >
              <LogIn className="w-4 h-4" />
              {loading ? "Signing On..." : "Holder Sign On (Daily Revalidation)"}
            </Button>
          ) : isIssuer ? (
            <p className="text-sm text-spark-gray">Waiting for Permit Holder to sign on...</p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const latestWorkers = getLatestWorkers(currentShift);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <LogIn className="w-4 h-4 text-spark-blue" />
          Current Shift
          <Badge variant="outline" className="bg-green-100 text-green-800">
            Open
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isHolder && !readOnly && (
          <Button
            onClick={() => {
              const data: QRCodeData = { permitId: permit.id, action: "shift", targetId: currentShift.id };
              setActiveQR(data);
            }}
            className="w-full bg-spark-purple hover:bg-spark-purple/90 text-white gap-1.5"
          >
            <QrCode className="w-4 h-4" />
            Show Shift QR
          </Button>
        )}

        {latestWorkers.length > 0 && (
          <div>
            <p className="text-sm font-medium text-spark-navy mb-2">
              Workers ({latestWorkers.length})
            </p>
            <div className="space-y-1.5">
              {latestWorkers.map((w) => {
                const isExpanded = expandedWorkerHistory === w.userId;
                const history = getWorkerHistory(currentShift, w.userId);
                return (
                  <div key={w.userId}>
                    <div className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-gray-50">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: w.user.avatarColor }}
                        >
                          {w.user.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{w.user.name}</span>
                        {w.user.workerId && <span className="text-spark-gray text-xs">#{w.user.workerId}</span>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {w.signedOffAt ? (
                          <Badge className="bg-gray-100 text-gray-600">Signed off</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">Signed on</Badge>
                        )}
                        {history.length > 1 && (
                          <button
                            onClick={() => setExpandedWorkerHistory(isExpanded ? null : w.userId)}
                            className="p-1 rounded hover:bg-gray-200"
                          >
                            <History className="w-3.5 h-3.5 text-spark-gray" />
                          </button>
                        )}
                      </div>
                    </div>
                    {isExpanded && history.length > 1 && (
                      <div className="ml-8 mt-1 space-y-0.5">
                        {history.map((rec) => (
                          <div key={rec.id} className="text-xs text-spark-gray flex items-center gap-2 py-0.5">
                            <span>On: {new Date(rec.signedOnAt).toLocaleTimeString()}</span>
                            {rec.signedOffAt && <span>Off: {new Date(rec.signedOffAt).toLocaleTimeString()}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {currentShift.status === "open" && !readOnly && (
          <div className="pt-2">
            {relinquishError && <p className="text-red-500 text-sm mb-2">{relinquishError}</p>}

            {!currentShift.permitIssuerSignedOff ? (
              isIssuer ? (
                <Button
                  variant="outline"
                  className="w-full gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-50"
                  onClick={handleIssuerSignOff}
                  disabled={loading}
                >
                  <LogOut className="w-4 h-4" />
                  {loading ? "Signing Off..." : "Issuer Sign Off"}
                </Button>
              ) : isHolder ? (
                <p className="text-sm text-spark-gray text-center">Waiting for Permit Issuer to sign off...</p>
              ) : null
            ) : (
              isHolder ? (
                <Button
                  variant="outline"
                  className="w-full gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-50"
                  onClick={handleHolderSignOff}
                  disabled={loading}
                >
                  <LogOut className="w-4 h-4" />
                  {loading ? "Signing Off..." : "Holder Sign Off (Daily Relinquishment)"}
                </Button>
              ) : isIssuer ? (
                <p className="text-sm text-spark-gray text-center">Waiting for Permit Holder to sign off...</p>
              ) : null
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Shift History Section ---

function ShiftHistorySection({ permit }: { permit: PermitData }) {
  const closedShifts = permit.shifts.filter((s) => s.status === "closed");
  if (closedShifts.length === 0) return null;

  function formatTime(ts: string | null) {
    if (!ts) return "—";
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function uniqueWorkerCount(shift: PermitData["shifts"][0]) {
    return new Set(shift.workers.map((w) => w.userId)).size;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="w-4 h-4 text-spark-blue" />
          Shift History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {closedShifts.map((shift) => {
            const shiftNumber = permit.shifts.indexOf(shift) + 1;
            const workerCount = uniqueWorkerCount(shift);
            return (
              <div key={shift.id} className="px-6 py-3 flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-spark-navy text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  {shiftNumber}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-spark-navy">{shift.date}</p>
                  <p className="text-xs text-spark-gray mt-0.5">
                    {formatTime(shift.startedAt)} &ndash; {formatTime(shift.endedAt)}
                    {workerCount > 0 && (
                      <span className="ml-2">&middot; {workerCount} worker{workerCount > 1 ? "s" : ""}</span>
                    )}
                  </p>
                </div>
                <Badge variant="outline" className="bg-gray-100 text-gray-600 shrink-0">Closed</Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Closure Section ---

function ClosureSection({
  permit,
  isHolder,
  readOnly,
  onRefresh,
}: {
  permit: PermitData;
  isHolder: boolean;
  isIssuer: boolean;
  readOnly: boolean;
  onRefresh: () => void;
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState("");

  if (!isHolder || readOnly) return null;

  const hasOpenShift = permit.shifts.some((s) => s.status !== "closed");
  const canClose = (permit.status === "active" || permit.status === "shift_closed") && !hasOpenShift;

  async function handleClose() {
    setClosing(true);
    setCloseError("");
    const res = await fetch(`/api/permits/${permit.id}/close`, { method: "POST" });
    setClosing(false);
    if (!res.ok) {
      const data = await res.json();
      setCloseError(data.error || "Failed to close permit");
      return;
    }
    setShowDialog(false);
    onRefresh();
  }

  return (
    <Card>
      <CardContent className="py-6 text-center">
        <Button onClick={() => setShowDialog(true)} disabled={!canClose} variant="destructive" className="gap-1.5">
          <Lock className="w-4 h-4" />
          Close Permit
        </Button>
        {!canClose && (
          <p className="text-xs text-spark-gray mt-2">
            {hasOpenShift ? "All shifts must be closed first" : "Permit must be active or shift closed to close"}
          </p>
        )}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Close Permit</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-spark-gray">
              Are you sure you want to close this permit? This action cannot be undone. The permit will become view-only.
            </p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={handleClose} disabled={closing}>
                {closing ? "Closing..." : "Close Permit"}
              </Button>
            </div>
            {closeError && <p className="text-red-500 text-sm mt-2">{closeError}</p>}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// --- Permit QR Code Section ---

function PermitQRSection({ permitId }: { permitId: string }) {
  const qrValue = JSON.stringify({ permitId, action: "permit_access", targetId: permitId });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <QrCode className="w-4 h-4 text-spark-blue" />
          QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="bg-white p-4 rounded-lg border">
          <QRCodeSVG value={qrValue} size={180} fgColor="#032147" bgColor="#ffffff" />
        </div>
        <p className="text-xs text-spark-gray mt-3">Scan to access this permit</p>
      </CardContent>
    </Card>
  );
}

// --- QR Display Overlay ---

function QRDisplay() {
  const activeQR = useStore((s) => s.activeQRData);
  const setActiveQR = useStore((s) => s.setActiveQR);

  if (!activeQR) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 flex flex-col items-center">
          <div className="bg-white p-4 rounded-lg mb-4">
            <QRCodeSVG value={encodeQR(activeQR)} size={200} fgColor="#032147" bgColor="#ffffff" />
          </div>
          <p className="text-sm font-medium text-spark-navy mb-1">
            {activeQR.action === "task_signature" && "Task Signature"}
            {activeQR.action === "shift" && "Worker Shift Sign-On / Sign-Off"}
            {activeQR.action === "shift_isolation_confirmation" && "Isolation Re-confirmation"}
          </p>
          <p className="text-xs text-spark-gray mb-4">Show this QR code to the worker to scan</p>
          <Button variant="outline" onClick={() => setActiveQR(null)} className="w-full">Close</Button>
        </CardContent>
      </Card>
    </div>
  );
}
