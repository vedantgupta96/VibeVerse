import { expect, test } from "@playwright/test";
import {
  createRoom,
  expectNoSeriousAxeViolations,
  signUp,
  uniqueUser,
} from "./helpers";

test.describe.serial("automated accessibility gates", () => {
  test("desktop auth, home, rooms, and joined room have no serious axe violations", async ({
    page,
  }) => {
    await page.goto("/login");
    await expectNoSeriousAxeViolations(page);
    await page.goto("/signup");
    await expectNoSeriousAxeViolations(page);

    await signUp(page, uniqueUser("AxeDesktop"));
    await expectNoSeriousAxeViolations(page);
    await page.goto("/rooms");
    await expectNoSeriousAxeViolations(page);
    await createRoom(page, `Axe desktop ${crypto.randomUUID().slice(0, 6)}`);
    await expectNoSeriousAxeViolations(page);
  });

  test("mobile login, home, navigation, and room have no serious axe violations", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");
    await expectNoSeriousAxeViolations(page);

    await signUp(page, uniqueUser("AxeMobile"));
    await expect(
      page.getByRole("navigation", { name: "Primary navigation" }),
    ).toBeVisible();
    await expectNoSeriousAxeViolations(page);

    const more = page.getByRole("button", { name: "More" });
    await more.click();
    await expect(more).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("link", { name: "Journal" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(more).toHaveAttribute("aria-expanded", "false");

    await createRoom(page, `Axe mobile ${crypto.randomUUID().slice(0, 6)}`);
    await expectNoSeriousAxeViolations(page);
  });
});
