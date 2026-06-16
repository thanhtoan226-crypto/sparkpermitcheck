import { test, expect, Page } from "@playwright/test";

async function resetAndGoto(page: Page, url = "/") {
  await page.request.post("/api/test");
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
}

async function loginAsHolder(page: Page, name: string) {
  await page.request.post("/api/test");
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  await page.locator('input[id="name"]').fill(name);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/users") && r.request().method() === "POST"),
    page.getByRole("button", { name: "Login" }).click(),
  ]);
  await expect(page).toHaveURL(/\/permits/, { timeout: 10000 });
}

async function loginAsWorker(page: Page, workerId: string) {
  await page.request.post("/api/test");
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  await page.getByRole("button", { name: "Worker" }).click();
  await page.locator('input[id="name"]').fill(workerId);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/users") && r.request().method() === "POST"),
    page.getByRole("button", { name: "Login" }).click(),
  ]);
  await expect(page).toHaveURL(/\/scan/, { timeout: 10000 });
}

test.describe("Login", () => {
  test("permit holder can login", async ({ page }) => {
    await resetAndGoto(page);
    await page.locator('input[id="name"]').fill("Holder1");
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/users") && r.request().method() === "POST"),
      page.getByRole("button", { name: "Login" }).click(),
    ]);
    await expect(page).toHaveURL(/\/permits/, { timeout: 10000 });
  });

  test("worker can login with 6-digit ID", async ({ page }) => {
    await resetAndGoto(page);
    await page.getByRole("button", { name: "Worker" }).click();
    await page.locator('input[id="name"]').fill("111222");
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/users") && r.request().method() === "POST"),
      page.getByRole("button", { name: "Login" }).click(),
    ]);
    await expect(page).toHaveURL(/\/scan/, { timeout: 10000 });
  });

  test("shows error for invalid worker ID", async ({ page }) => {
    await resetAndGoto(page);
    await page.getByRole("button", { name: "Worker" }).click();
    await page.locator('input[id="name"]').fill("abc");
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page.getByText("6-digit")).toBeVisible();
  });

  test("shows quick login for returning users", async ({ page }) => {
    await resetAndGoto(page);
    await page.locator('input[id="name"]').fill("Returning");
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/users") && r.request().method() === "POST"),
      page.getByRole("button", { name: "Login" }).click(),
    ]);
    await expect(page).toHaveURL(/\/permits/, { timeout: 10000 });

    await page.evaluate(() => localStorage.clear());
    await page.goto("/");
    await expect(page.getByText("Quick login")).toBeVisible();
    await expect(page.getByText("Returning")).toBeVisible();
  });
});

test.describe("CMW Permit Lifecycle", () => {
  test("full CMW lifecycle from creation to closure", async ({ page }) => {
    await loginAsHolder(page, "CMWUser");

    await page.getByRole("button", { name: "New" }).click();
    await page.getByRole("button", { name: "CMW" }).click();
    await page.locator('input[id="title"]').fill("E2E CMW Permit");
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/permits") && r.request().method() === "POST"),
      page.getByRole("button", { name: /Create Permit/ }).click(),
    ]);
    await expect(page.getByText("E2E CMW Permit")).toBeVisible({ timeout: 5000 });

    await page.getByRole("link", { name: /E2E CMW Permit/ }).click();
    await expect(page.getByText("Draft")).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: /Add Task/ }).click();
    await page.locator('input[id="taskName"]').fill("Task 1");
    await page.getByRole("button", { name: /Add Point/ }).click();
    await page.locator('input[id="isolationPoint-0"]').fill("Point A");
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/isolation-tasks") && r.request().method() === "POST"),
      page.getByRole("button", { name: "Save Task" }).click(),
    ]);
    await expect(page.getByText("Task 1")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Isolation Pending")).toBeVisible();

    const permitId = page.url().split("/permits/")[1];

    const userId = await page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem("spark-session") || "{}");
      return session?.state?.currentUser?.id;
    });

    const permitRes = await page.request.get(`/api/permits/${permitId}`);
    const permitData = await permitRes.json();
    const taskId = permitData.isolationTasks[0]?.id;

    await page.request.patch(`/api/permits/${permitId}/isolation-tasks`, {
      data: { taskId, workerId: userId },
    });

    await page.goto(page.url());
    await expect(page.getByText("Active")).toBeVisible({ timeout: 5000 });

    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/shifts") && r.request().method() === "POST"),
      page.getByRole("button", { name: /Start Daily Revalidation/ }).click(),
    ]);

    await page.waitForTimeout(500);

    await expect(page.getByText("Awaiting Holder")).toBeVisible({ timeout: 10000 });

    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/shifts") && r.request().method() === "POST"),
      page.getByRole("button", { name: /Sign On.*Revalidation/ }).click(),
    ]);
    await expect(page.getByRole("button", { name: /Sign Off.*Relinquishment/ })).toBeVisible({ timeout: 5000 });

    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/shifts") && r.request().method() === "POST"),
      page.getByRole("button", { name: /Sign Off.*Relinquishment/ }).click(),
    ]);
    await expect(page.getByText("Daily Relinquished")).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: /Close Permit/ }).click();
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/close") && r.request().method() === "POST"),
      page.getByRole("button", { name: "Close Permit", exact: true }).click(),
    ]);
    await expect(page.getByText("Closed", { exact: true })).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Revalidation after Relinquishment", () => {
  test("permit holder can start a new shift after relinquishing", async ({ page }) => {
    await loginAsHolder(page, "RevalUser");

    // Create a CAP permit (simpler, no isolation needed)
    await page.getByRole("button", { name: "New" }).click();
    await page.getByRole("button", { name: "Non-Isolation" }).click();
    await page.locator('input[id="title"]').fill("Reval Test Permit");
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/permits") && r.request().method() === "POST"),
      page.getByRole("button", { name: /Create Permit/ }).click(),
    ]);
    await page.getByRole("link", { name: /Reval Test Permit/ }).click();
    await expect(page.getByText("Active")).toBeVisible({ timeout: 5000 });

    // First shift: start revalidation -> sign on -> sign off (relinquish)
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/shifts") && r.request().method() === "POST"),
      page.getByRole("button", { name: /Start Daily Revalidation/ }).click(),
    ]);
    await expect(page.getByText("Awaiting Holder")).toBeVisible({ timeout: 5000 });

    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/shifts") && r.request().method() === "POST"),
      page.getByRole("button", { name: /Sign On.*Revalidation/ }).click(),
    ]);
    await expect(page.getByRole("button", { name: /Sign Off.*Relinquishment/ })).toBeVisible({ timeout: 5000 });

    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/shifts") && r.request().method() === "POST"),
      page.getByRole("button", { name: /Sign Off.*Relinquishment/ }).click(),
    ]);
    await expect(page.getByText("Daily Relinquished")).toBeVisible({ timeout: 5000 });

    // Key assertion: "Start Daily Revalidation" button must appear again
    await expect(page.getByRole("button", { name: /Start Daily Revalidation/ })).toBeVisible({ timeout: 5000 });

    // Start second shift
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/shifts") && r.request().method() === "POST"),
      page.getByRole("button", { name: /Start Daily Revalidation/ }).click(),
    ]);
    await expect(page.getByText("Awaiting Holder")).toBeVisible({ timeout: 5000 });

    // Sign on to second shift
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/shifts") && r.request().method() === "POST"),
      page.getByRole("button", { name: /Sign On.*Revalidation/ }).click(),
    ]);
    await expect(page.getByRole("button", { name: /Sign Off.*Relinquishment/ })).toBeVisible({ timeout: 5000 });
  });
});

test.describe("CAP Permit Lifecycle", () => {
  test("CAP Non-Isolation skips isolation and goes to shift", async ({ page }) => {
    await loginAsHolder(page, "CAPUser");

    await page.getByRole("button", { name: "New" }).click();
    await page.getByRole("button", { name: "Non-Isolation" }).click();
    await page.locator('input[id="title"]').fill("E2E CAP Permit");
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/permits") && r.request().method() === "POST"),
      page.getByRole("button", { name: /Create Permit/ }).click(),
    ]);
    await expect(page.getByText("E2E CAP Permit")).toBeVisible({ timeout: 5000 });

    await page.getByRole("link", { name: /E2E CAP Permit/ }).click();
    await expect(page.getByText("Active")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Isolation Tasks")).not.toBeVisible();

    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/shifts") && r.request().method() === "POST"),
      page.getByRole("button", { name: /Start Daily Revalidation/ }).click(),
    ]);
    await expect(page.getByText("Awaiting Holder")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Worker Flow", () => {
  test("worker can sign on and off a shift", async ({ page }) => {
    await page.request.post("/api/test");
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/");

    await page.locator('input[id="name"]').fill("ShiftHolder");
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/users") && r.request().method() === "POST"),
      page.getByRole("button", { name: "Login" }).click(),
    ]);
    await expect(page).toHaveURL(/\/permits/, { timeout: 10000 });

    await page.getByRole("button", { name: "New" }).click();
    await page.getByRole("button", { name: "Non-Isolation" }).click();
    await page.locator('input[id="title"]').fill("Worker Shift Permit");
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/permits") && r.request().method() === "POST"),
      page.getByRole("button", { name: /Create Permit/ }).click(),
    ]);

    await page.getByRole("link", { name: /Worker Shift Permit/ }).click();
    await expect(page.getByText("Active")).toBeVisible({ timeout: 5000 });

    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/shifts") && r.request().method() === "POST"),
      page.getByRole("button", { name: /Start Daily Revalidation/ }).click(),
    ]);

    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/shifts") && r.request().method() === "POST"),
      page.getByRole("button", { name: /Sign On.*Revalidation/ }).click(),
    ]);
    await expect(page.getByRole("button", { name: /Sign Off.*Relinquishment/ })).toBeVisible({ timeout: 5000 });

    const permitId = page.url().split("/permits/")[1];

    const permitRes = await page.request.get(`/api/permits/${permitId}`);
    const permitData = await permitRes.json();
    const shiftId = permitData.shifts[permitData.shifts.length - 1]?.id;

    await page.request.post("/api/users", {
      data: { role: "worker", name: "333444" },
    });

    const usersRes = await page.request.get("/api/users");
    const users = await usersRes.json();
    const worker = users.find((u: { workerId: string }) => u.workerId === "333444");

    if (worker && shiftId) {
      await page.request.post(`/api/permits/${permitId}/shifts`, {
        data: { action: "worker_sign_on", shiftId, workerId: worker.id },
      });
      await page.request.post(`/api/permits/${permitId}/shifts`, {
        data: { action: "worker_sign_off", shiftId, workerId: worker.id },
      });
    }

    await page.evaluate(() => localStorage.clear());
    await page.goto("/");

    await page.getByRole("button", { name: "Worker" }).click();
    await page.locator('input[id="name"]').fill("333444");
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/users") && r.request().method() === "POST"),
      page.getByRole("button", { name: "Login" }).click(),
    ]);
    await expect(page).toHaveURL(/\/scan/, { timeout: 10000 });

    await page.getByRole("button", { name: /Permit Worker Shift Permit/ }).click();
    await expect(page).toHaveURL(/\/scan\/permit/, { timeout: 10000 });
    await expect(page.getByText("Worker Shift Permit")).toBeVisible({ timeout: 5000 });
  });

  test("worker redirected from /permits to /scan", async ({ page }) => {
    await loginAsWorker(page, "999888");
    await page.goto("/permits");
    await expect(page).toHaveURL(/\/scan/, { timeout: 10000 });
  });
});
