import { describe, expect, it } from "vitest";

import { formatNumber, formatSom } from "./constants";
import { paymentLabel, roleLabel } from "./i18n/helpers";

describe("core formatting helpers", () => {
  it("formats money output in Uzbek style", () => {
    expect(formatSom(1234)).toBe("1 234 so'm");
    expect(formatNumber(9876543)).toBe("9 876 543");
  });

  it("maps payment and user roles through translations", () => {
    const t = (key: string) => key;

    expect(paymentLabel(t, "Naqd")).toBe("payment.cash");   
    expect(paymentLabel(t, "Karta")).toBe("payment.card");
    expect(roleLabel(t, "Admin")).toBe("role.admin");
    expect(roleLabel(t, "Omborchi")).toBe("role.warehouse");
  });
});
