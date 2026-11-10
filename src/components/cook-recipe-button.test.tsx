/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { LocaleProvider } from "./locale-provider";
import { CookRecipeButton } from "./cook-recipe-button";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe("CookRecipeButton", () => {
  it("caps the initial deduction at inventory and allows decreasing it", () => {
    render(
      <LocaleProvider locale="en" dictionary={dictionaries.en}>
        <CookRecipeButton ingredients={[{
          name: "Milk",
          quantity: 0.5,
          requiredQuantity: 1,
          unit: "litre",
          inventoryItemId: "8b70715e-5c1b-4b6f-b899-ac3bce532ba0",
          availableQuantity: 0.5,
        }]} />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cook this recipe" }));
    expect(screen.getByRole("button", { name: "Increase Milk" })).toHaveProperty("disabled", true);
    expect(screen.getByText("0.5 litres")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Decrease Milk" }));
    expect(screen.getByText("0.4 litres")).toBeTruthy();
    expect(screen.getByText(/you can subtract the available amount/i)).toBeTruthy();
  });
});
