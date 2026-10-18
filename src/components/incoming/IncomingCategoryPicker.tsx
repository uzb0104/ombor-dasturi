import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface IncomingCategoryPickerProps {
  categories: string[];
  category: string;
  onChange: (cat: string) => void;
  isRu: boolean;
}

export function IncomingCategoryPicker({
  categories,
  category,
  onChange,
  isRu,
}: IncomingCategoryPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-muted-foreground uppercase">
          {isRu ? "Категория" : "Kategoriya"}
        </Label>
        {category && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[11px] text-primary hover:underline font-medium"
          >
            {isRu ? "Сбросить категорию" : "Barcha kategoriyalar"}
          </button>
        )}
      </div>
      <div className="mt-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between h-10 px-3 font-normal text-left"
            >
              <span className="truncate">
                {category || (isRu ? "Все категории (не выбрано)" : "Barcha kategoriyalar")}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[--radix-popover-trigger-width] min-w-[240px] p-0"
            align="start"
          >
            <Command>
              <CommandInput placeholder={isRu ? "Поиск категории..." : "Kategoriya qidirish..."} />
              <CommandList className="max-h-56 overflow-y-auto">
                <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                  {isRu ? "Категория не найдена" : "Kategoriya topilmadi"}
                </CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all"
                    onSelect={() => {
                      onChange("");
                      setOpen(false);
                    }}
                    className="cursor-pointer font-semibold text-primary"
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", !category ? "opacity-100" : "opacity-0")}
                    />
                    {isRu ? "Все категории" : "Barcha kategoriyalar"}
                  </CommandItem>
                  {categories.map((c) => (
                    <CommandItem
                      key={c}
                      value={c}
                      onSelect={() => {
                        onChange(c);
                        setOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn("mr-2 h-4 w-4", category === c ? "opacity-100" : "opacity-0")}
                      />
                      {c}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
