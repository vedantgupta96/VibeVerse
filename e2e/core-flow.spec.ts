import { expect, test } from "@playwright/test";
import { createRoom, signUp, uniqueUser } from "./helpers";

test("unauthenticated app routes redirect to sign in", async ({ page }) => {
  await page.goto("/rooms");
  await expect(page).toHaveURL(/\/login\?next=%2Frooms$/);
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
});

test("two listeners create, join, react, leave, and recover through the UI", async ({
  browser,
}) => {
  const ownerContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  const guestPage = await guestContext.newPage();
  const owner = uniqueUser("Owner");
  const guest = uniqueUser("Guest");

  try {
    await signUp(ownerPage, owner);
    await signUp(guestPage, guest);

    const roomName = `Beta room ${crypto.randomUUID().slice(0, 6)}`;
    const room = await createRoom(ownerPage, roomName);

    await guestPage.goto("/rooms");
    await guestPage.getByLabel("Join with a code").fill(room.code);
    await guestPage.getByRole("button", { name: "Join by code" }).click();
    await expect(guestPage).toHaveURL(room.url);
    await expect(
      guestPage.getByRole("heading", { name: roomName }),
    ).toBeVisible();

    const ownerRoster = ownerPage.getByRole("region", {
      name: /Listening now/,
    });
    const guestRoster = guestPage.getByRole("region", {
      name: /Listening now/,
    });
    await expect(ownerRoster.getByText(guest.name)).toBeVisible();
    await expect(guestRoster.getByText(owner.name)).toBeVisible();

    await guestPage.getByRole("button", { name: "Calm" }).click();
    await expect(
      ownerPage.getByText(`${guest.name.split(" ")[0]} · Calm`),
    ).toBeVisible();

    const reaction = guestPage.getByRole("button", { name: "Dreamy" });
    for (let index = 0; index < 6; index += 1) await reaction.click();
    await expect(
      guestPage.getByRole("status").filter({
        hasText: "Slow down a moment before reacting again.",
      }),
    ).toBeVisible();

    await guestPage.getByRole("button", { name: "Leave room" }).click();
    await expect(guestPage).toHaveURL(/\/rooms$/);
    await expect(ownerRoster.getByText(guest.name)).toHaveCount(0);

    await guestPage.getByLabel("Join with a code").fill(room.code);
    await guestPage.getByRole("button", { name: "Join by code" }).click();
    await expect(guestPage).toHaveURL(room.url);
    await expect(ownerRoster.getByText(guest.name)).toBeVisible();
  } finally {
    await ownerContext.close();
    await guestContext.close();
  }
});
