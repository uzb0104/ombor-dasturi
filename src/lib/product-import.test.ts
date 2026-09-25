import { describe, expect, it } from "vitest";

import { resolveProductImportRows } from "./product-import";

describe("product import resolution", () => {
  it("reads CSV content and resolves rows before import", async () => {
    const file = new File(
      [
        "nom,kod,brend,kategoriya,miqdor,sotib,sotuv,min\n",
        "Tormoz kolodkasi,B7RTC,Chevrolet,Tormoz tizimi,10,50000,75000,5\n",
        "Havo filtri,HF-01,Chevrolet,Filtrlar,4,15000,22000,2\n",
      ],
      "products.csv",
      { type: "text/csv" },
    );

    const rows = await resolveProductImportRows(file, ["Tormoz tizimi", "Filtrlar"], ["Chevrolet"]);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ name: "Tormoz kolodkasi", quantity: 10, sellPrice: 75000 });
    expect(rows[1]).toMatchObject({ name: "Havo filtri", quantity: 4, sellPrice: 22000 });
  });
});
