import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import {
  parseProductCsv,
  parseProductSpreadsheet,
  downloadImportTemplate,
} from "@/lib/product-import";
import { productsApi } from "@/lib/api";
import { useStore } from "@/lib/store";

export function ProductImportDialog() {
  const t = useT();
  const { categories, vehicleBrands, loadFromBackend } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    setLoading(true);
    try {
      const items =
        file.name.endsWith(".csv") || file.name.endsWith(".txt")
          ? parseProductCsv(await file.text(), categories, vehicleBrands)
          : parseProductSpreadsheet(await file.arrayBuffer(), categories, vehicleBrands);

      if (!items.length) {
        toast.error(t("products.importNoProducts"));
        return;
      }

      const result = await productsApi.importBulk(items);
      await loadFromBackend();
      toast.success(`${result.created} ${t("products.importSuccess")}`, {
        description: result.failed ? `${result.failed} ${t("products.importFailed")}` : undefined,
      });
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import xatosi");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-1" />
          {t("products.import")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("products.import")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t("products.importHint")}</p>
        <div className="flex flex-col gap-2 py-2">
          <Button type="button" variant="secondary" onClick={downloadImportTemplate}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {t("products.importTemplate")}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <Button type="button" disabled={loading} onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            {loading ? t("common.loading") : t("products.importSelect")}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
