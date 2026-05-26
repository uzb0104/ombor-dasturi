import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Lang = "uz" | "ru" | "uz_cyr";

export const LANG_LABELS: Record<Lang, string> = {
  uz: "O'zbekcha",
  uz_cyr: "Ўзбекча",
  ru: "Русский",
};

const dict: Record<Lang, Record<string, string>> = {
  uz: {
    "crm.title": "Mijozlar (CRM)",
    "crm.count": "ta mijoz",
    "crm.new": "Yangi mijoz",
    "crm.edit": "Mijozni tahrirlash",
    "crm.search": "Ism yoki telefon...",
    "crm.name": "F.I.SH",
    "crm.phone": "Telefon",
    "crm.address": "Manzil",
    "crm.vehicle": "Avtomobil",
    "crm.purchases": "Jami xaridlar",
    "crm.debt": "Qarz",
    "crm.actions": "Amallar",
    "crm.bulk.label": "mijoz tanlandi",
    "crm.deleted": "ta mijoz o'chirildi",
    "crm.deleted_one": "O'chirildi",
    "crm.undo": "Qaytarish",
    "crm.required.name": "Ism majburiy",
    "crm.created": "Mijoz qo'shildi",
    "crm.updated": "Yangilandi",
    "common.save": "Saqlash",
    "common.cancel": "Bekor qilish",
    "common.delete": "O'chirish",
    "common.details": "Batafsil",
  },
  uz_cyr: {
    "crm.title": "Мижозлар (CRM)",
    "crm.count": "та мижоз",
    "crm.new": "Янги мижоз",
    "crm.edit": "Мижозни таҳрирлаш",
    "crm.search": "Исм ёки телефон...",
    "crm.name": "Ф.И.Ш",
    "crm.phone": "Телефон",
    "crm.address": "Манзил",
    "crm.vehicle": "Автомобиль",
    "crm.purchases": "Жами харидлар",
    "crm.debt": "Қарз",
    "crm.actions": "Амаллар",
    "crm.bulk.label": "мижоз танланди",
    "crm.deleted": "та мижоз ўчирилди",
    "crm.deleted_one": "Ўчирилди",
    "crm.undo": "Қайтариш",
    "crm.required.name": "Исм мажбурий",
    "crm.created": "Мижоз қўшилди",
    "crm.updated": "Янгиланди",
    "common.save": "Сақлаш",
    "common.cancel": "Бекор қилиш",
    "common.delete": "Ўчириш",
    "common.details": "Батафсил",
  },
  ru: {
    "crm.title": "Клиенты (CRM)",
    "crm.count": "клиентов",
    "crm.new": "Новый клиент",
    "crm.edit": "Редактировать клиента",
    "crm.search": "Имя или телефон...",
    "crm.name": "Ф.И.О",
    "crm.phone": "Телефон",
    "crm.address": "Адрес",
    "crm.vehicle": "Автомобиль",
    "crm.purchases": "Всего покупок",
    "crm.debt": "Долг",
    "crm.actions": "Действия",
    "crm.bulk.label": "клиентов выбрано",
    "crm.deleted": "клиентов удалено",
    "crm.deleted_one": "Удалено",
    "crm.undo": "Отменить",
    "crm.required.name": "Имя обязательно",
    "crm.created": "Клиент добавлен",
    "crm.updated": "Обновлено",
    "common.save": "Сохранить",
    "common.cancel": "Отмена",
    "common.delete": "Удалить",
    "common.details": "Подробнее",
  },
};

export const useLang = create<{ lang: Lang; setLang: (l: Lang) => void }>()(
  persist(
    (set) => ({ lang: "uz", setLang: (l) => set({ lang: l }) }),
    { name: "autoerp-lang-v1" }
  )
);

export function useT() {
  const lang = useLang((s) => s.lang);
  return (key: string) => dict[lang]?.[key] ?? dict.uz[key] ?? key;
}
