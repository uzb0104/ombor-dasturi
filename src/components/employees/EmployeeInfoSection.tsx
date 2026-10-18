import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui-kit";
import { formatSom } from "@/lib/constants";
import {
  User,
  Phone,
  Briefcase,
  Calendar,
  Wallet,
  TrendingDown,
  HandCoins,
  DollarSign,
  CheckCircle,
  XCircle,
} from "lucide-react";
import type { Employee } from "@/lib/types";

interface EmployeeInfoSectionProps {
  employee: Employee;
  advanceThisMonth: number;
  salaryPaidThisMonth: number;
  remainingThisMonth: number;
  totalAdvanceAllTime: number;
  totalPaidAllTime: number;
  paymentsCount: number;
}

export function EmployeeInfoSection({
  employee,
  advanceThisMonth,
  salaryPaidThisMonth,
  remainingThisMonth,
  totalAdvanceAllTime,
  totalPaidAllTime,
  paymentsCount,
}: EmployeeInfoSectionProps) {
  return (
    <>
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Belgilangan oylik"
          value={formatSom(employee.salary)}
          icon={Wallet}
          accent="primary"
        />
        <StatCard
          label="Shu oygi avans"
          value={formatSom(advanceThisMonth)}
          icon={TrendingDown}
          accent="warning"
        />
        <StatCard
          label="Shu oygi oylik to'lovi"
          value={formatSom(salaryPaidThisMonth)}
          icon={HandCoins}
          accent="success"
        />
        <StatCard
          label="Qoldiq to'lov (shu oy)"
          value={formatSom(remainingThisMonth)}
          icon={DollarSign}
          accent="info"
        />
      </div>

      {/* Employee Info Card & Summary */}
      <Card className="rounded-2xl p-5 border-border/60">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Xodim haqida ma'lumot
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <User className="h-3.5 w-3.5" /> F.I.SH
            </div>
            <div className="font-semibold text-base">{employee.name}</div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Phone className="h-3.5 w-3.5" /> Telefon raqami
            </div>
            <div className="font-medium">{employee.phone || "—"}</div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Briefcase className="h-3.5 w-3.5" /> Lavozim
            </div>
            <div>
              <Badge variant="secondary" className="font-medium">
                {employee.role}
              </Badge>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5" /> Ishga kirgan sana
            </div>
            <div className="font-medium">{employee.hireDate || "—"}</div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">Holati</div>
            <div>
              {employee.status === "Faol" ? (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 border-none">
                  <CheckCircle className="h-3 w-3 mr-1" /> Faol
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-muted-foreground">
                  <XCircle className="h-3 w-3 mr-1" /> Nofaol
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              Jami berilgan avanslar (Barcha davr)
            </div>
            <div className="font-semibold text-amber-600 dark:text-amber-400">
              {formatSom(totalAdvanceAllTime)}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              Jami to'lovlar (Oylik + Avans)
            </div>
            <div className="font-semibold text-primary">{formatSom(totalPaidAllTime)}</div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              Barcha o'zgarishlar va to'lovlar soni
            </div>
            <div className="font-medium">{paymentsCount} ta yozuv</div>
          </div>
        </div>
      </Card>
    </>
  );
}
