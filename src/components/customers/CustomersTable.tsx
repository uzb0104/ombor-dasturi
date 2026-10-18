import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  usePagination,
  PaginationBar,
  BulkBar,
  SelectCell,
  SortButton,
  type useSelection,
  type useSortableData,
} from "@/components/ui-kit";
import { formatSom } from "@/lib/constants";
import { useT } from "@/lib/i18n";
import { Phone, MapPin, Edit, Trash2, Search, DollarSign } from "lucide-react";
import type { Customer } from "@/lib/types";

interface CustomersTableProps {
  customers: Customer[];
  search: string;
  setSearch: (s: string) => void;
  sel: ReturnType<typeof useSelection>;
  sortConfig: ReturnType<typeof useSortableData<Customer>>["sortConfig"];
  requestSort: ReturnType<typeof useSortableData<Customer>>["requestSort"];
  onOpenPayment: (id: string, name: string, debt: number) => void;
  onEdit: (id: string) => void;
  onDeleteOne: (id: string, name: string) => void;
  onDeleteBulk: () => void;
}

export function CustomersTable({
  customers,
  search,
  setSearch,
  sel,
  sortConfig,
  requestSort,
  onOpenPayment,
  onEdit,
  onDeleteOne,
  onDeleteBulk,
}: CustomersTableProps) {
  const t = useT();
  const pg = usePagination(customers, 50);
  const pageIds = pg.paged.map((p) => p.id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => sel.has(id));

  return (
    <Card className="p-4 rounded-2xl card-elevated border-border/60">
      <div className="relative max-w-md mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("crm.search")}
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <BulkBar
        count={sel.count}
        onDelete={onDeleteBulk}
        onClear={sel.clear}
        label={t("crm.bulk.label")}
      />

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allChecked}
                  onCheckedChange={(v) => sel.toggleAll(pageIds, !!v)}
                  aria-label="Hammasi"
                />
              </TableHead>
              <TableHead>
                <SortButton
                  label={t("crm.name")}
                  sortKey="name"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                <SortButton
                  label={t("crm.phone")}
                  sortKey="phone"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />
              </TableHead>
              <TableHead className="hidden md:table-cell">
                <SortButton
                  label={t("crm.address")}
                  sortKey="address"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                <SortButton
                  label={t("crm.vehicle")}
                  sortKey="vehicle"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />
              </TableHead>
              <TableHead className="hidden md:table-cell text-right">
                <SortButton
                  label={t("crm.purchases")}
                  sortKey="totalPurchases"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />
              </TableHead>
              <TableHead className="text-right">
                <SortButton
                  label={t("crm.debt")}
                  sortKey="debt"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />
              </TableHead>
              <TableHead className="text-right pr-4">{t("crm.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pg.paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  {t("crm.notFound")}
                </TableCell>
              </TableRow>
            )}
            {pg.paged.map((c) => (
              <TableRow
                key={c.id}
                className="hover:bg-muted/40 transition-colors"
                data-state={sel.has(c.id) ? "selected" : undefined}
              >
                <TableCell>
                  <SelectCell checked={sel.has(c.id)} onChange={() => sel.toggle(c.id)} />
                </TableCell>
                <TableCell className="font-semibold">
                  {c.name}
                  <div className="sm:hidden text-xs text-muted-foreground font-normal mt-0.5">
                    {c.phone} · {c.vehicle}
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm font-medium">
                  <Phone className="h-3 w-3 inline mr-1 opacity-60 text-muted-foreground" />
                  {c.phone}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3 inline mr-1 opacity-60" />
                  {c.address}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="secondary" className="font-medium">
                    {c.vehicle}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-right tabular-nums font-bold text-foreground">
                  {formatSom(c.totalPurchases)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.debt > 0 ? (
                    <span className="text-destructive font-bold">{formatSom(c.debt)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap pr-4">
                  {c.debt > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onOpenPayment(c.id, c.name, c.debt)}
                      className="h-8 w-8 hover:bg-success/10"
                      title={t("debts.payDebt")}
                    >
                      <DollarSign className="h-4 w-4 text-success" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(c.id)}
                    className="h-8 w-8"
                  >
                    <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteOne(c.id, c.name)}
                    className="h-8 w-8 hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <PaginationBar {...pg} />
    </Card>
  );
}
