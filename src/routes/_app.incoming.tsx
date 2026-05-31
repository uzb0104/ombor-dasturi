import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, useConfirm, usePagination, PaginationBar, useSelection, BulkBar, SelectCell } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Trash2, Plus, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/incoming")({ component: IncomingPage });

function IncomingPage() {
  const { incoming, products, suppliers, addIncoming, deleteIncoming } = useStore();
  const { confirm, confirmNode } = useConfirm();
  const sel = useSelection();
  
  // Dialog form state
  const [open, setOpen] = useState(false);
  const [invoice, setInvoice] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(1);
  const [buyPrice, setBuyPrice] = useState(0);

  // Combobox open states
  const [productComboOpen, setProductComboOpen] = useState(false);
  const [supplierComboOpen, setSupplierComboOpen] = useState(false);

  const sorted = useMemo(() => [...incoming].sort((a, b) => +new Date(b.date) - +new Date(a.date)), [incoming]);
  const pg = usePagination(sorted, 12);
  const pageIds = pg.paged.map(p => p.id);
  const allChecked = pageIds.length > 0 && pageIds.every(id => sel.has(id));

  const handleProductSelect = (pId: string) => {
    setProductId(pId);
    const p = products.find(x => x.id === pId);
    if (p) {
      setBuyPrice(p.buyPrice);
    }
  };

  const removeOne = async (id: string) => {
    const ok = await confirm({ title: "Kirimni o'chirish", description: "Kirim o'chiriladi va tovar miqdori kamayadi. Davom etilsinmi?", destructive: true, confirmText: "O'chirish" });
    if (ok) { deleteIncoming(id); toast.success("O'chirildi"); }
  };

  const removeBulk = async () => {
    const ok = await confirm({ title: "Tanlanganlarni o'chirish", description: `${sel.count} ta kirim o'chiriladi va mos tovar miqdorlari kamayadi.`, destructive: true, confirmText: "O'chirish" });
    if (!ok) return;
    const n = sel.count;
    sel.selected.forEach(id => deleteIncoming(id));
    sel.clear(); toast.success(`${n} ta kirim o'chirildi`);
  };

  const handleSubmit = () => {
    if (!invoice.trim()) { toast.error("Invoice raqamini kiriting"); return; }
    if (!supplierId) { toast.error("Yetkazib beruvchini tanlang"); return; }
    if (!productId) { toast.error("Tovarni tanlang"); return; }
    if (qty <= 0) { toast.error("Miqdor 1 dan kam bo'lishi mumkin emas"); return; }
    if (buyPrice < 0) { toast.error("Sotib olish narxi manfiy bo'lishi mumkin emas"); return; }

    addIncoming({
      id: `inc_${Math.random().toString(36).slice(2, 9)}`,
      date: new Date().toISOString(),
      supplierId,
      productId,
      qty,
      buyPrice,
      invoice: invoice.trim(),
    });

    toast.success("Kirim muvaffaqiyatli saqlandi");
    setOpen(false);
    // reset form
    setInvoice("");
    setSupplierId("");
    setProductId("");
    setQty(1);
    setBuyPrice(0);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {confirmNode}
      <PageHeader
        title="Kirimlar"
        subtitle={`${incoming.length} ta kirim yozuvi`}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Yangi kirim
          </Button>
        }
      />

      {/* New Incoming Stock Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-card border rounded-2xl shadow-elevated p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Yangi kirim qo'shish
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Invoice raqami *</Label>
              <Input
                placeholder="masalan: INV-1002"
                className="mt-1"
                value={invoice}
                onChange={(e) => setInvoice(e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Yetkazib beruvchi *</Label>
              <div className="mt-1">
                <Popover open={supplierComboOpen} onOpenChange={setSupplierComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={supplierComboOpen}
                      className="w-full justify-between font-normal text-left"
                    >
                      <span className="truncate">
                        {supplierId
                          ? suppliers.find(s => s.id === supplierId)?.name
                          : "Yetkazib beruvchini qidirish..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[340px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Yetkazib beruvchi nomini kiriting..." />
                      <CommandEmpty>Yetkazib beruvchi topilmadi.</CommandEmpty>
                      <CommandGroup>
                        <CommandList className="max-h-[200px]">
                          {suppliers.map(s => (
                            <CommandItem
                              key={s.id}
                              value={s.name}
                              onSelect={() => {
                                setSupplierId(s.id);
                                setSupplierComboOpen(false);
                              }}
                              className="cursor-pointer hover:bg-accent/40 flex items-center"
                            >
                              <Check className={cn("mr-2 h-4 w-4", supplierId === s.id ? "opacity-100" : "opacity-0")} />
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{s.name}</span>
                                <span className="text-xs text-muted-foreground">{s.phone}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandList>
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Tovar *</Label>
              <div className="mt-1">
                <Popover open={productComboOpen} onOpenChange={setProductComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={productComboOpen}
                      className="w-full justify-between font-normal text-left"
                    >
                      <span className="truncate">
                        {productId
                          ? products.find(p => p.id === productId)?.name
                          : "Tovarni qidirish..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[340px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Tovar nomini kiriting..." />
                      <CommandEmpty>Tovar topilmadi.</CommandEmpty>
                      <CommandGroup>
                        <CommandList className="max-h-[200px]">
                          {products.map(p => (
                            <CommandItem
                              key={p.id}
                              value={`${p.name} ${p.sku}`}
                              onSelect={() => {
                                handleProductSelect(p.id);
                                setProductComboOpen(false);
                              }}
                              className="cursor-pointer hover:bg-accent/40 flex items-center justify-between"
                            >
                              <div className="flex items-center">
                                <Check className={cn("mr-2 h-4 w-4", productId === p.id ? "opacity-100" : "opacity-0")} />
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm">{p.name}</span>
                                  <span className="text-[10px] text-muted-foreground">SKU: {p.sku} · Model: {p.vehicle}</span>
                                </div>
                              </div>
                              <span className="text-[10px] text-muted-foreground font-semibold shrink-0">{p.quantity} ta bor</span>
                            </CommandItem>
                          ))}
                        </CommandList>
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Miqdor</Label>
                <Input
                  type="number"
                  min={1}
                  className="mt-1"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, +e.target.value))}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Kirim narxi</Label>
                <Input
                  type="number"
                  min={0}
                  className="mt-1"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(Math.max(0, +e.target.value))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Orqaga</Button>
            <Button onClick={handleSubmit}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="rounded-2xl p-3 md:p-4 card-elevated border-border/60">
        <BulkBar count={sel.count} onDelete={removeBulk} onClear={sel.clear} label="kirim tanlandi" />
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-10"><Checkbox checked={allChecked} onCheckedChange={(v) => sel.toggleAll(pageIds, !!v)} /></TableHead>
                <TableHead>Sana</TableHead>
                <TableHead className="hidden sm:table-cell">Invoice</TableHead>
                <TableHead className="hidden md:table-cell">Yetkazib beruvchi</TableHead>
                <TableHead>Tovar</TableHead>
                <TableHead className="text-right">Miqdor</TableHead>
                <TableHead className="hidden sm:table-cell text-right">Narx</TableHead>
                <TableHead className="text-right">Jami</TableHead>
                <TableHead className="text-right pr-4">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pg.paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    Kirimlar topilmadi.
                  </TableCell>
                </TableRow>
              ) : (
                pg.paged.map(i => {
                  const p = products.find(x => x.id === i.productId);
                  const s = suppliers.find(x => x.id === i.supplierId);
                  return (
                    <TableRow key={i.id} className="hover:bg-muted/40" data-state={sel.has(i.id) ? "selected" : undefined}>
                      <TableCell><SelectCell checked={sel.has(i.id)} onChange={() => sel.toggle(i.id)} /></TableCell>
                      <TableCell className="text-sm font-medium tabular-nums">{new Date(i.date).toLocaleDateString("uz-UZ")}</TableCell>
                      <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="font-mono text-xs">{i.invoice}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell font-medium">{s?.name}</TableCell>
                      <TableCell>
                        <span className="font-semibold text-foreground">{p?.name}</span>
                        <div className="md:hidden text-xs text-muted-foreground">{s?.name}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{i.qty}</TableCell>
                      <TableCell className="hidden sm:table-cell text-right tabular-nums text-sm">{formatSom(i.buyPrice)}</TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-foreground">{formatSom(i.buyPrice * i.qty)}</TableCell>
                      <TableCell className="text-right pr-4">
                        <Button variant="ghost" size="icon" onClick={() => removeOne(i.id)} className="h-8 w-8 hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <PaginationBar {...pg} />
      </Card>
    </div>
  );
}
