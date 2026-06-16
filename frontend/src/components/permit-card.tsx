"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PERMIT_TYPE_LABELS, PERMIT_STATUS_LABELS } from "@/lib/constants";
import { ChevronRight } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  CMW: "bg-spark-blue text-white",
  CAP_NON_ISOLATION: "bg-spark-purple text-white",
  CAP_ISOLATION: "bg-spark-yellow text-spark-navy",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-200 text-gray-700",
  isolation_pending: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  shift_open: "bg-blue-100 text-blue-800",
  shift_closed: "bg-orange-100 text-orange-800",
  closed: "bg-red-100 text-red-800",
};

type PermitCardProps = {
  permit: {
    id: string;
    type: string;
    title: string;
    status: string;
  };
};

export default function PermitCard({ permit }: PermitCardProps) {
  return (
    <Link href={`/permits/${permit.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={TYPE_COLORS[permit.type]}>{permit.type}</Badge>
              <Badge variant="outline" className={STATUS_COLORS[permit.status]}>
                {PERMIT_STATUS_LABELS[permit.status as keyof typeof PERMIT_STATUS_LABELS] ?? permit.status}
              </Badge>
            </div>
            <p className="font-medium text-spark-navy truncate">{permit.title}</p>
            <p className="text-xs text-spark-gray mt-0.5">
              {PERMIT_TYPE_LABELS[permit.type as keyof typeof PERMIT_TYPE_LABELS] ?? permit.type}
            </p>
          </div>
          <ChevronRight className="text-spark-gray flex-shrink-0 ml-2" />
        </CardContent>
      </Card>
    </Link>
  );
}
