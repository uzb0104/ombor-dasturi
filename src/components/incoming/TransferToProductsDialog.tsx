import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowDownToLine, CheckCircle2 } from "lucide-react";
import { formatSom, formatUsd, formatDate } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { IncomingStock, Product } from "@/lib/types";

interface TransferToProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingIncomings: IncomingStock[];
  selectedPendingIds: string[];
  setSelectedPendingIds: React.Dispatch<React.SetStateAction<string[]>>;
  onApplyBatch: () => void;
  products: Product[];
  usdRate: number;
  isRu: boolean;
}

export function TransferToProductsDialog({
  open,
  onOpenChange,
  pendingIncomings,
  selectedPendingIds,
  setSelectedPendingIds,
  onApplyBatch,
  products,
  usdRate,
  isRu,
}: TransferToProductsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-card border rounded-2xl shadow-elevated p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5 text-emerald-600" />
            {isRu ? "Добавление поступлений в базу товаров" : "Kirim tovarlarini bazaga qo'shish"}
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          {isRu
            ? "Эти товары были приняты в ожидание. При добавлении в базу количество каждого товара автоматически увеличится на складе."
            : "Ushbu tovarlar kutilmoqda sifatida kiritilgan. \"Bazaga qo'shish\" tugmasini bosganingizdan so'ng, tovarlarning ombordagi qoldig'i aniq o'z joyiga borib qo'shiladi."}
        </p>

        {pendingIncomings.length === 0 ? (
          <div className="p-8 text-center space-y-2 border rounded-xl bg-muted/20 my-3">
            <CheckCircle2 className="h-9 w-9 text-emerald-600 mx-auto" />
            <div className="font-semibold text-foreground text-sm">
              {isRu ? "Нет ожидающих поступлений" : "Kutilayotgan kirimlar yo'q"}
            </div>
            <div className="text-xs text-muted-foreground max-w-sm mx-auto">
              {isRu
                ? "Все поступившие товары уже успешно внесены в остатки базы товаров."
                : "Barcha kirimlar allaqachon tovarlar bazasidagi qoldiqqa to'liq qo'shilgan."}
            </div>
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                {isRu ? "Закрыть" : "Yopish"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 my-2">
            {/* Select all bar */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all-pending"
                  checked={
                    selectedPendingIds.length > 0 &&
                    selectedPendingIds.length === pendingIncomings.length
                  }
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedPendingIds(pendingIncomings.map((x) => x.id));
                    } else {
                      setSelectedPendingIds([]);
                    }
                  }}
                />
                <Label htmlFor="select-all-pending" className="font-semibold cursor-pointer">
                  {isRu ? "Выбрать все" : "Barchasini tanlash"} ({selectedPendingIds.length} /{" "}
                  {pendingIncomings.length})
                </Label>
              </div>
              <div className="text-muted-foreground">
                {isRu ? "Ожидают добавления:" : "Kutilmoqda:"}{" "}
                <strong className="text-foreground">{pendingIncomings.length}</strong>{" "}
                {isRu ? "позиций" : "ta kirim"}
              </div>
            </div>

            {/* Items List Table */}
            <div className="border border-border/60 rounded-xl overflow-hidden max-h-[360px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/40 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>{isRu ? "Товар" : "Tovar nomi"}</TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      {isRu ? "Текущий остаток" : "Hozirgi qoldiq"}
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      {isRu ? "+ Приход" : "+ Kirim soni"}
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      {isRu ? "= Новый остаток" : "= Yangi qoldiq"}
                    </TableHead>
                    <TableHead className="text-right">{isRu ? "Цена" : "Narxi"}</TableHead>
                    <TableHead className="hidden sm:table-cell">{isRu ? "Дата" : "Sana"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingIncomings.map((item) => {
                    const prod = products.find((p) => p.id === item.productId);
                    const currentQty = prod?.quantity || 0;
                    const newQty = currentQty + item.qty;
                    const isSelected = selectedPendingIds.includes(item.id);

                    return (
                      <TableRow
                        key={item.id}
                        className={cn(
                          "hover:bg-muted/30 cursor-pointer",
                          isSelected && "bg-muted/20",
                        )}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedPendingIds(selectedPendingIds.filter((x) => x !== item.id));
                          } else {
                            setSelectedPendingIds([...selectedPendingIds, item.id]);
                          }
                        }}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedPendingIds([...selectedPendingIds, item.id]);
                              } else {
                                setSelectedPendingIds(
                                  selectedPendingIds.filter((x) => x !== item.id),
                                );
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-sm">
                            {prod?.name || "Noma'lum tovar"}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            {prod?.vehicle && <span>🚗 {prod.vehicle}</span>}
                            {item.region && <span>· {item.region}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs text-muted-foreground font-medium">
                          {currentQty} dona
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs font-bold text-primary">
                          +{item.qty} dona
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          = {newQty} dona
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs font-medium">
                          {item.currency === "USD" ||
                          (item.buyPriceUsd !== undefined && item.buyPriceUsd > 0) ? (
                            <div>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {formatUsd(
                                  item.buyPriceUsd || (usdRate > 0 ? item.buyPrice / usdRate : 0),
                                )}
                              </span>
                              <span className="text-[10px] text-muted-foreground block">
                                ({formatSom(item.buyPrice)})
                              </span>
                            </div>
                          ) : (
                            formatSom(item.buyPrice)
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                          {formatDate(item.date)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Summary calculations */}
            {(() => {
              const selectedItems = pendingIncomings.filter((x) =>
                selectedPendingIds.includes(x.id),
              );
              const totalUnits = selectedItems.reduce((acc, x) => acc + x.qty, 0);
              const totalAmount = selectedItems.reduce((acc, x) => acc + x.qty * x.buyPrice, 0);

              return (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs gap-3">
                  <div>
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                      {isRu ? "Будет добавлено:" : "Bazaga qo'shiladi:"}
                    </span>{" "}
                    <span className="text-foreground">
                      {selectedItems.length} {isRu ? "наименований" : "ta tovar"} (
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        {totalUnits} dona
                      </strong>
                      )
                    </span>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {isRu ? "Общая сумма прихода:" : "Jami kirim qiymati:"}{" "}
                      <strong>{formatSom(totalAmount)}</strong>
                      {usdRate > 0 && (
                        <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                          ({formatUsd(totalAmount / usdRate)})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenChange(false)}
                    >
                      {isRu ? "Отмена" : "Bekor qilish"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={selectedItems.length === 0}
                      onClick={onApplyBatch}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                    >
                      <ArrowDownToLine className="h-4 w-4 mr-1.5" />
                      {isRu ? "Добавить на склад" : "Bazaga qo'shish"} ({selectedItems.length})
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
