"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import useStore from "@/lib/store";
import { PERMIT_TYPE_LABELS } from "@/lib/constants";
import type { ShiftData } from "@/lib/types";
import {
  LogIn,
  LogOut,
  ArrowLeft,
  FileText,
  CheckCircle2,
  XCircle,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type PermitData = {
  id: string;
  type: string;
  title: string;
  status: string;
  shifts: ShiftData[];
};

const RELATED_DOCUMENTS = [
  { name: "Safety Procedure SP-001", url: "#" },
  { name: "Isolation Procedure IP-042", url: "#" },
  { name: "Emergency Response Plan ERP-003", url: "#" },
  { name: "Work Method Statement WMS-018", url: "#" },
  { name: "Risk Assessment RA-055", url: "#" },
];

export default function ScanPermitPage({
  searchParams,
}: {
  searchParams: Promise<{ permitId?: string }>;
}) {
  const { permitId } = use(searchParams);
  const router = useRouter();
  const currentUser = useStore((s) => s.currentUser);
  const hasHydrated = useStore((s) => s._hasHydrated);

  const [permit, setPermit] = useState<PermitData | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
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

  async function handleSignOn() {
    if (!currentUser || !permit) return;
    setResult(null);
    const currentShift = permit.shifts[permit.shifts.length - 1];
    if (!currentShift) return;

    const res = await fetch(`/api/permits/${permit.id}/shifts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "worker_sign_on",
        shiftId: currentShift.id,
        workerId: currentUser.id,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setResult({ success: false, message: data.error || "Sign-on failed" });
    } else {
      setResult({ success: true, message: "Signed on to shift successfully" });
      loadPermit();
    }
  }

  async function handleSignOff() {
    if (!currentUser || !permit) return;
    setResult(null);
    const currentShift = permit.shifts[permit.shifts.length - 1];
    if (!currentShift) return;

    const res = await fetch(`/api/permits/${permit.id}/shifts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "worker_sign_off",
        shiftId: currentShift.id,
        workerId: currentUser.id,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setResult({ success: false, message: data.error || "Sign-off failed" });
    } else {
      setResult({ success: true, message: "Signed off from shift successfully" });
      loadPermit();
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

  const currentShift = permit.shifts[permit.shifts.length - 1];
  const pastShifts = permit.shifts.slice(0, -1);
  const shiftOpen = currentShift?.status === "open";

  // Get latest state per worker for current shift
  function getLatestWorkers(shift: PermitData["shifts"][0]) {
    const latestMap = new Map<string, PermitData["shifts"][0]["workers"][0]>();
    for (const w of shift.workers) {
      latestMap.set(w.userId, w);
    }
    return Array.from(latestMap.values());
  }

  // Check if current worker is currently signed on
  const myLatestRecord = currentShift
    ? [...currentShift.workers]
        .filter((w) => w.userId === currentUser.id)
        .pop()
    : null;
  const isCurrentlySignedOn = !!(myLatestRecord && !myLatestRecord.signedOffAt);

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
            <Badge
              variant="outline"
              className={
                permit.status === "closed"
                  ? "bg-red-100 text-red-800"
                  : permit.status === "shift_open"
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }
            >
              {permit.status === "shift_open" ? "Daily Revalidated" : permit.status === "shift_closed" ? "Daily Relinquished" : permit.status}
            </Badge>
          </div>
          <h1 className="text-lg font-bold text-spark-navy">{permit.title}</h1>
          <p className="text-xs text-spark-gray">
            {PERMIT_TYPE_LABELS[permit.type as keyof typeof PERMIT_TYPE_LABELS] ?? permit.type}
          </p>
        </div>

        {/* Sign On / Sign Off */}
        {currentShift && (
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <LogIn className="w-4 h-4 text-spark-blue" />
                Current Shift
                <Badge
                  variant="outline"
                  className={
                    currentShift.status === "open"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }
                >
                  {currentShift.status === "open" ? "Open" : "Awaiting Holder"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {shiftOpen && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleSignOn}
                    disabled={isCurrentlySignedOn}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign On
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSignOff}
                    disabled={!isCurrentlySignedOn}
                    className="flex-1 gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Off
                  </Button>
                </div>
              )}
              {!shiftOpen && (
                <p className="text-sm text-spark-gray text-center py-2">
                  Waiting for Permit Holder to sign on
                </p>
              )}

              {/* Result message */}
              {result && (
                <div className="flex items-start gap-2 text-sm">
                  {result.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  )}
                  <p className={result.success ? "text-green-800" : "text-red-700"}>
                    {result.message}
                  </p>
                </div>
              )}

              {/* Worker list */}
              {currentShift.workers.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-spark-navy mb-2">
                    Workers ({getLatestWorkers(currentShift).length})
                  </p>
                  <div className="space-y-1.5">
                    {getLatestWorkers(currentShift).map((w) => {
                      const history = currentShift.workers.filter(
                        (rec) => rec.userId === w.userId
                      );
                      const isExpanded = expandedHistory === w.userId;
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
                              {w.user.workerId && (
                                <span className="text-spark-gray text-xs">#{w.user.workerId}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {w.signedOffAt ? (
                                <Badge className="bg-gray-100 text-gray-600">Signed off</Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-800">Signed on</Badge>
                              )}
                              {history.length > 1 && (
                                <button
                                  onClick={() =>
                                    setExpandedHistory(isExpanded ? null : w.userId)
                                  }
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
                                <div
                                  key={rec.id}
                                  className="text-xs text-spark-gray flex items-center gap-2 py-0.5"
                                >
                                  <span>On: {new Date(rec.signedOnAt).toLocaleTimeString()}</span>
                                  {rec.signedOffAt && (
                                    <span>Off: {new Date(rec.signedOffAt).toLocaleTimeString()}</span>
                                  )}
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
            </CardContent>

            {/* Past shifts */}
            {pastShifts.length > 0 && (
              <div className="border-t px-6 pt-3 pb-4">
                <button
                  onClick={() =>
                    setExpandedHistory(expandedHistory === "past" ? null : "past")
                  }
                  className="flex items-center gap-1.5 text-sm font-medium text-spark-navy w-full"
                >
                  <History className="w-4 h-4" />
                  Past Shifts ({pastShifts.length})
                  {expandedHistory === "past" ? (
                    <ChevronUp className="w-4 h-4 ml-auto" />
                  ) : (
                    <ChevronDown className="w-4 h-4 ml-auto" />
                  )}
                </button>
                {expandedHistory === "past" && (
                  <div className="mt-2 space-y-2">
                    {pastShifts.map((shift) => {
                      const workers = getLatestWorkers(shift);
                      return (
                        <div key={shift.id} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-spark-navy">
                              {shift.date}
                            </span>
                            <Badge variant="outline" className="bg-gray-100 text-gray-600">
                              Closed
                            </Badge>
                          </div>
                          {workers.length > 0 && (
                            <div className="text-xs text-spark-gray">
                              {workers.length} worker{workers.length > 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {!currentShift && (
          <Card className="mb-4">
            <CardContent className="py-6 text-center">
              <p className="text-spark-gray text-sm">No active shift for this permit</p>
            </CardContent>
          </Card>
        )}

        {/* Related Documents */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-spark-blue" />
              Related Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {RELATED_DOCUMENTS.map((doc) => (
                <a
                  key={doc.name}
                  href={doc.url}
                  className="block text-sm text-spark-blue hover:underline py-1.5 px-2 rounded hover:bg-blue-50"
                >
                  {doc.name}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
