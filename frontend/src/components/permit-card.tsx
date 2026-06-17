"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PERMIT_TYPE_LABELS, PERMIT_STATUS_LABELS } from "@/lib/constants";
import { ChevronRight, Shield, Activity, Clock, FileText } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  CMW: "bg-[#209dd7] text-white",
  CAP_NON_ISOLATION: "bg-[#753991] text-white",
  CAP_ISOLATION: "bg-[#ecad0a] text-[#032147]",
};

const STATUS_STYLING: Record<string, { color: string, icon: any }> = {
  draft: { color: "bg-slate-100 text-slate-600 border-slate-200", icon: FileText },
  isolation_pending: { color: "bg-amber-50 text-amber-700 border-amber-200", icon: Shield },
  active: { color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: Activity },
  shift_open: { color: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
  shift_closed: { color: "bg-orange-50 text-orange-700 border-orange-200", icon: Clock },
  closed: { color: "bg-slate-200 text-slate-700 border-slate-300", icon: FileText },
};

type PermitCardProps = {
  permit: {
    id: string;
    type: string;
    title: string;
    status: string;
    permitHolder?: { name: string };
  };
};

export default function PermitCard({ permit }: PermitCardProps) {
  const statusInfo = STATUS_STYLING[permit.status] || { color: "bg-slate-100 text-slate-600 border-slate-200", icon: FileText };
  const StatusIcon = statusInfo.icon;

  return (
    <Link href={`/permits/${permit.id}`} className="block group">
      <Card className="overflow-hidden border-slate-200 hover:border-spark-blue hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 active:scale-[0.99] cursor-pointer">
        <CardContent className="p-0 flex items-stretch">
          <div className={`w-1.5 shrink-0 ${TYPE_COLORS[permit.type]?.split(' ')[0]}`} />
          <div className="flex-1 p-4 flex items-center justify-between min-w-0">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`${TYPE_COLORS[permit.type]} text-[10px] uppercase tracking-wider font-bold h-5`}>
                  {permit.type}
                </Badge>
                <Badge variant="outline" className={`${statusInfo.color} text-[10px] uppercase tracking-wider font-bold h-5 flex items-center gap-1`}>
                  <StatusIcon className="w-2.5 h-2.5" />
                  {PERMIT_STATUS_LABELS[permit.status as keyof typeof PERMIT_STATUS_LABELS] ?? permit.status}
                </Badge>
              </div>

              <div className="space-y-0.5">
                <h3 className="font-bold text-slate-900 truncate group-hover:text-spark-blue transition-colors">
                  {permit.title}
                </h3>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium uppercase tracking-tight">
                  <span>{PERMIT_TYPE_LABELS[permit.type as keyof typeof PERMIT_TYPE_LABELS] ?? permit.type}</span>
                  {permit.permitHolder && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="truncate">Holder: {permit.permitHolder.name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-spark-blue/10 transition-colors">
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-spark-blue transition-colors" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
