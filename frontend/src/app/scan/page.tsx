"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import useStore from "@/lib/store";
import { PERMIT_TYPE_LABELS } from "@/lib/constants";
import type { IsolationTaskData, ShiftIsolationConfirmationData } from "@/lib/types";
import { Shield, ClipboardList, ScanLine } from "lucide-react";

type ScanPermitSummary = {
  id: string;
  type: string;
  title: string;
  status: string;
  isolationTasks: IsolationTaskData[];
  shiftIsolationConfirmations: ShiftIsolationConfirmationData[];
};

export default function ScanPage() {
  const router = useRouter();
  const currentUser = useStore((s) => s.currentUser);
  const hasHydrated = useStore((s) => s._hasHydrated);

  const [permits, setPermits] = useState<ScanPermitSummary[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const loadedRef = useRef(false);

  async function loadPermits() {
    const res = await fetch("/api/permits");
    const data = await res.json();
    setPermits(data);
  }

  useEffect(() => {
    if (!hasHydrated) return;
    if (!currentUser || currentUser.role !== "worker") {
      router.push("/");
      return;
    }
    if (!loadedRef.current) {
      loadedRef.current = true;
      loadPermits();
    }
  }, [currentUser, router, hasHydrated]);

  if (!currentUser || currentUser.role !== "worker") return null;

  function handlePermitClick(permit: ScanPermitSummary) {
    const { status, id } = permit;
    if (status === "draft") {
      setErrors((prev) => ({ ...prev, [id]: "Permit is not ready. Isolation tasks have not been set up yet." }));
      return;
    }
    if (status === "closed") {
      setErrors((prev) => ({ ...prev, [id]: "This permit is closed." }));
      return;
    }
    if (status === "isolation_pending") {
      router.push(`/scan/task?permitId=${id}`);
      return;
    }
    // shift_closed for CMW: route to re-confirmation page
    if (status === "shift_closed" && permit.type === "CMW") {
      router.push(`/scan/task?permitId=${id}&mode=reconfirm`);
      return;
    }
    if (status === "shift_closed") {
      setErrors((prev) => ({ ...prev, [id]: "Shift has been relinquished. No access until next revalidation." }));
      return;
    }
    // active, shift_open
    router.push(`/scan/permit?permitId=${id}`);
  }

  return (
    <div className="page-shell">
      <Header />
      <div className="page-content">
        <h1 className="text-xl font-bold text-spark-navy mb-6">Scan QR Code</h1>

        {permits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ScanLine className="w-12 h-12 text-spark-gray mb-3" />
            <p className="text-spark-gray">No permits available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {permits.map((permit) => {
              const inaccessible =
                permit.status === "draft" ||
                permit.status === "closed" ||
                (permit.status === "shift_closed" && permit.type !== "CMW");
              // Show isolation button for initial sign-off (isolation_pending) OR per-shift re-confirmation (shift_closed CMW)
              const closedShiftCount = permit.shiftIsolationConfirmations
                ? Math.max(0, ...permit.shiftIsolationConfirmations.map((c) => c.cycleNumber))
                : 0;
              const pendingConfirmations = permit.shiftIsolationConfirmations?.filter(
                (c) => c.cycleNumber === closedShiftCount && (c.isolatedById === null || c.verifiedById === null)
              ) ?? [];
              const hasUnsignedInitialTasks =
                permit.type === "CMW" &&
                permit.isolationTasks.some((t) =>
                  t.isolatedById === null || t.verifiedById === null
                );
              const showIsolationButton =
                (hasUnsignedInitialTasks && permit.status === "isolation_pending") ||
                (permit.status === "shift_closed" && permit.type === "CMW" && pendingConfirmations.length > 0);

              return (
                <Card key={permit.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-spark-blue text-white text-xs">{permit.type}</Badge>
                      <span className="font-medium text-sm text-spark-navy truncate">
                        {permit.title}
                      </span>
                    </div>
                    <p className="text-xs text-spark-gray">
                      {PERMIT_TYPE_LABELS[permit.type as keyof typeof PERMIT_TYPE_LABELS] ?? permit.type}
                    </p>
                    <div className="space-y-2">
                      {showIsolationButton && (
                        <Button
                          onClick={() => {
                            const mode = permit.status === "shift_closed" ? "&mode=reconfirm" : "";
                            router.push(`/scan/task?permitId=${permit.id}${mode}`);
                          }}
                          className="w-full bg-spark-blue hover:bg-spark-blue/90 text-white gap-2"
                        >
                          <Shield className="w-4 h-4" />
                          {permit.status === "shift_closed" ? "Re-confirm isolation" : "Isolation task"} for {permit.title}
                        </Button>
                      )}
                      <Button
                        onClick={() => {
                          setErrors((prev) => ({ ...prev, [permit.id]: "" }));
                          handlePermitClick(permit);
                        }}
                        className={`w-full gap-2 ${
                          inaccessible
                            ? "bg-gray-200 text-gray-400 hover:bg-gray-200 cursor-default"
                            : "bg-spark-purple hover:bg-spark-purple/90 text-white"
                        }`}
                      >
                        <ClipboardList className="w-4 h-4" />
                        Permit {permit.title}
                      </Button>
                      {errors[permit.id] && (
                        <p className="text-xs text-red-500">{errors[permit.id]}</p>
                      )}
                    </div>
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
