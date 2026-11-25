import { expect, test } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

test("missing site evidence opens an editable inquiry without enabling compare", async ({
	page,
}) => {
	await page.goto(`${baseUrl}/decision`);
	const wizard = page.locator("section").filter({
		has: page.getByRole("heading", {
			name: "Find candidate sites",
			exact: true,
		}),
	});
	await wizard
		.getByRole("combobox", { name: "Wage region", exact: true })
		.selectOption("I");
	await wizard.getByRole("button", { name: "Screen sites" }).click();
	await expect(
		wizard.getByRole("heading", { name: "Needs verification" }),
	).toBeVisible();
	await expect(
		wizard.getByRole("button", { name: "Compare top matching provinces" }),
	).toBeDisabled();
	const draft = wizard
		.getByText("Open verification checklist and draft inquiry", { exact: true })
		.first();
	await draft.click();
	const form = wizard.locator("details[open] form");
	const message = form.locator('textarea[name="message"]');
	await expect(message).toHaveValue(/Which wage region applies/);
	await expect(form.locator('input[name="consent"]')).not.toBeChecked();
	await message.fill(
		"Please verify the worksite address and applicable wage region.",
	);
	await expect(message).toHaveValue(
		"Please verify the worksite address and applicable wage region.",
	);
});
