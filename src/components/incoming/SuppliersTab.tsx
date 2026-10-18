import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, ChevronRight, Phone, MapPin, Edit, Trash2 } from "lucide-react";
import { formatSom, formatDate } from "@/lib/constants";
import type { IncomingStock, Product, Supplier } from "@/lib/types";

interface SuppliersTabProps {
  suppliers: Supplier[];
  incoming: IncomingStock[];
  products: Product[];
  isRu: boolean;
  onEditSupplier: (id: string) => void;
  onDeleteSupplier: (id: string, name: string) => void;
}

export function SuppliersTab({
  suppliers,
  incoming,
  products,
  isRu,
  onEditSupplier,
  onDeleteSupplier,
}: SuppliersTabProps) {
  const [supSearch, setSupSearch] = useState("");
  const [expandedSupplierId, setExpandedSupplierId] = useState<string | null>(null);

  const filteredSuppliers = useMemo(() => {
    const s = supSearch.toLowerCase().trim();
    return suppliers.filter((x) => !s || x.name.toLowerCase().includes(s) || x.phone?.includes(s));
  }, [suppliers, supSearch]);

  return (
    <Card className="rounded-2xl p-3 md:p-4 card-elevated border-border/60">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={isRu ? "Поиск поставщика..." : "Yetkazuvchini qidirish..."}
            value={supSearch}
            onChange={(e) => setSupSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>{isRu ? "Имя поставщика" : "Yetkazuvchi nomi"}</TableHead>
              <TableHead>{isRu ? "Телефон" : "Telefon"}</TableHead>
              <TableHead className="hidden md:table-cell">
                {isRu ? "Адрес / Регион" : "Manzil / Viloyat"}
              </TableHead>
              <TableHead className="text-right">{isRu ? "Задолженность" : "Qarzdorlik"}</TableHead>
              <TableHead className="text-right pr-4">{isRu ? "Действия" : "Amallar"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {isRu ? "Поставщики не найдены" : "Yetkazuvchilar topilmadi"}
                </TableCell>
              </TableRow>
            ) : (
              filteredSuppliers.map((s) => {
                const isExpanded = expandedSupplierId === s.id;
                const supIncomings = incoming.filter((i) => i.supplierId === s.id);

                return (
                  <React.Fragment key={s.id}>
                    <TableRow className="hover:bg-muted/40">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setExpandedSupplierId(isExpanded ? null : s.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-semibold">{s.name}</TableCell>
                      <TableCell className="text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {s.phone || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {s.address ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-primary" />
                            {s.address}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums">
                        {formatSom(s.debt || 0)}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEditSupplier(s.id)}
                            className="h-8 w-8 hover:bg-muted"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDeleteSupplier(s.id, s.name)}
                            className="h-8 w-8 hover:bg-muted text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded details */}
                    {isExpanded && (
                      <TableRow className="bg-muted/20">
                        <TableCell colSpan={6} className="p-4">
                          <div className="space-y-2">
                            <div className="text-xs font-semibold uppercase text-muted-foreground">
                              {isRu ? "История поставок:" : "Ushbu ta'minotchi kirimlari:"} (
                              {supIncomings.length} {isRu ? "партий" : "ta"})
                            </div>
                            {supIncomings.length === 0 ? (
                              <div className="text-xs text-muted-foreground italic">
                                {isRu ? "Поставок ещё не было" : "Hozircha kirimlar mavjud emas"}
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {supIncomings.map((inc) => {
                                  const p = products.find((x) => x.id === inc.productId);
                                  return (
                                    <div
                                      key={inc.id}
                                      className="p-2.5 rounded-xl border border-border/50 bg-background text-xs space-y-1"
                                    >
                                      <div className="font-semibold text-foreground truncate">
                                        {p?.name}
                                      </div>
                                      <div className="flex justify-between text-muted-foreground text-[11px]">
                                        <span>{formatDate(inc.date)}</span>
                                        {inc.region && (
                                          <Badge
                                            variant="outline"
                                            className="text-[10px] px-1 py-0"
                                          >
                                            {inc.region}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex justify-between font-medium">
                                        <span>{inc.qty} dona</span>
                                        <span>{formatSom(inc.buyPrice)}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
