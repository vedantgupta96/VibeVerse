import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export type TestUser = { name: string; email: string; password: string };

export function uniqueUser(label: string): TestUser {
  const nonce = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  return {
    name: `${label} Listener`,
    email: `e2e-${label.toLowerCase()}-${nonce}@example.test`,
    password: "E2e-password-123!",
  };
}

export async function signUp(page: Page, user: TestUser) {
  await page.goto("/signup");
  await page.getByLabel("Name").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(
    page.getByRole("heading", {
      name: new RegExp(`Welcome back, ${user.name.split(" ")[0]}`),
    }),
  ).toBeVisible();
}

export async function createRoom(page: Page, roomName: string) {
  await page.goto("/rooms");
  await page.getByLabel("Start a room").fill(roomName);
  await page.getByRole("button", { name: "Create room" }).click();
  await expect(page).toHaveURL(/\/rooms\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: roomName })).toBeVisible();
  const codeLabel = await page
    .locator('[aria-label^="Room code "]')
    .getAttribute("aria-label");
  const code = codeLabel?.replace("Room code ", "");
  expect(code).toMatch(/^[A-HJ-KM-NP-Z2-9]{6}$/);
  return { code: code!, url: page.url() };
}

export async function expectNoSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (violation) =>
      violation.impact === "critical" || violation.impact === "serious",
  );
  expect(
    blocking.map(({ id, impact, help, nodes }) => ({
      id,
      impact,
      help,
      targets: nodes.map((node) => node.target),
    })),
  ).toEqual([]);
}
