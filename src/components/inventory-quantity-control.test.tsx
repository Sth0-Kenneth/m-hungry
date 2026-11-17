/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { LocaleProvider } from "./locale-provider";
import { InventoryQuantityControl } from "./inventory-quantity-control";

const { adjustMock, refreshMock } = vi.hoisted(() => ({
  adjustMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("@/app/(app)/inventory/actions", () => ({
  adjustInventoryQuantity: adjustMock,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("InventoryQuantityControl", () => {
  afterEach(() => {
    adjustMock.mockReset();
    refreshMock.mockReset();
  });

  it("requires confirmation before saving a plus adjustment", async () => {
    adjustMock.mockResolvedValue({ ok: true, quantity: 3 });
    render(
      <LocaleProvider locale="en" dictionary={dictionaries.en}>
        <InventoryQuantityControl item={{
          id: "8b70715e-5c1b-4b6f-b899-ac3bce532ba0",
          name: "Bread",
          quantity: 2,
          unit: "slice",
        }} />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Increase Bread" }));
    expect(screen.getByText("3 slices")).toBeTruthy();
    expect(adjustMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(adjustMock).toHaveBeenCalledWith(
      "8b70715e-5c1b-4b6f-b899-ac3bce532ba0",
      1,
    ));
    expect(refreshMock).toHaveBeenCalledOnce();
  });

  it("cancels an unconfirmed minus adjustment", () => {
    render(
      <LocaleProvider locale="en" dictionary={dictionaries.en}>
        <InventoryQuantityControl item={{
          id: "8b70715e-5c1b-4b6f-b899-ac3bce532ba0",
          name: "Milk",
          quantity: 1,
          unit: "litre",
        }} compact />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Decrease Milk" }));
    expect(screen.getByText("0.9 litres")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("1 litre")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Confirm" })).toBeNull();
  });
});
