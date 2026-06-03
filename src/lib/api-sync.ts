import { toast } from "sonner";

/** API xabarlarini foydalanuvchiga tushunarli qilib chiqarish */
export function formatApiError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;
    if (msg.includes("foreign key constraint")) {
      if (msg.includes("customers_vehicle")) return "Avtomobil brendi ro'yxatda yo'q. Sozlamalardan brend qo'shing.";
      if (msg.includes("products_vehicle")) return "Tovar brendi noto'g'ri. Ro'yxatdan tanlang.";
      if (msg.includes("products_category")) return "Kategoriya noto'g'ri. Ro'yxatdan tanlang.";
      if (msg.includes("supplier")) return "Yetkazib beruvchi topilmadi.";
      return "Bog'langan ma'lumot topilmadi (foreign key).";
    }
    if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
      return "Bu kod yoki nom allaqachon mavjud.";
    }
    return msg;
  }
  return "Server bilan bog'lanishda xatolik";
}

type SyncOptions = {
  /** Xato toast ko'rsatilmasin (masalan, audit log) */
  silent?: boolean;
  /** Xato bo'lganda chaqiriladi (masalan, ma'lumotlarni qayta yuklash) */
  onFail?: () => void;
};

/** Backendga yozish — xatoda toast va ixtiyoriy resync */
export function syncApi<T>(promise: Promise<T>, options?: SyncOptions): void {
  promise.catch((err) => {
    if (!options?.silent) {
      toast.error(formatApiError(err));
    }
    options?.onFail?.();
  });
}
