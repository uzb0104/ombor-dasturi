import React from "react";
import { Sparkles } from "lucide-react";
import { formatSom } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface LiveComparisonData {
  byRegion: Record<string, number>;
  min: number;
  max: number;
}

interface IncomingLiveComparisonProps {
  comparison: LiveComparisonData | null;
  isRu: boolean;
}

export function IncomingLiveComparison({ comparison, isRu }: IncomingLiveComparisonProps) {
  if (!comparison) return null;

  return (
    <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs space-y-1.5 animate-fade-in">
      <div className="font-semibold text-primary flex items-center gap-1.5">
        <Sparkles className="h-4 w-4" />
        <span>
          {isRu
            ? "Цены этого товара в других регионах:"
            : "Ushbu tovarning boshqa viloyatlardagi narxlari:"}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
        {Object.entries(comparison.byRegion).map(([r, pr]) => (
          <div
            key={r}
            className={cn(
              "p-1.5 rounded-lg border flex items-center justify-between text-[11px]",
              pr === comparison.min
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold"
                : "bg-background border-border/60 text-muted-foreground",
            )}
          >
            <span className="truncate">{r}:</span>
            <span className="tabular-nums font-medium">{formatSom(pr)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
