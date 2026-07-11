import { checkbox, input } from "@inquirer/prompts";
import pc from "picocolors";
import { WillhabenHunterArea, WillhabenHunterViennaDistrict } from "../scraper/scraper.const";

//#region Shared prompt helpers

/** Prompts for a required search query (with validation). */
export async function willhabenHunterPromptRequiredQuery(current?: string): Promise<string> {
	if (current) return current;
	return input({
		message: "Enter the item to search for:",
		validate: (val: string) => val.trim().length > 0 || "Search query is required",
	});
}

/** Prompts for an optional floating-point value; returns undefined if skipped. */
export async function willhabenHunterPromptOptionalNumber(
	message: string,
	current: number | undefined,
): Promise<number | undefined> {
	if (current !== undefined) return current;
	const raw = await input({ message, default: "" });
	return raw.trim() ? parseFloat(raw) : undefined;
}

/** Prompts for an optional integer value; returns undefined if skipped. */
export async function willhabenHunterPromptOptionalInt(
	message: string,
	current: number | undefined,
): Promise<number | undefined> {
	if (current !== undefined) return current;
	const raw = await input({ message, default: "" });
	return raw.trim() ? parseInt(raw, 10) : undefined;
}

/** Prompts for an optional text value; returns undefined if skipped. */
export async function willhabenHunterPromptOptionalText(
	message: string,
	current: string | undefined,
): Promise<string | undefined> {
	if (current !== undefined) return current;
	const raw = await input({ message, default: "" });
	return raw.trim() || undefined;
}

/** Prompts for Bundesland area selection via a checkbox list. */
export async function willhabenHunterPromptArea(
	current: WillhabenHunterArea[] | undefined,
): Promise<WillhabenHunterArea[] | undefined> {
	if (current !== undefined) return current;
	const a = await checkbox({
		message: "Select areas to search in (use space to select, enter to confirm):",
		choices: Object.values(WillhabenHunterArea).map((val) => ({
			name: val,
			value: val,
			checked: false,
		})),
	});
	return a && a.length > 0 ? (a as WillhabenHunterArea[]) : undefined;
}

/** Prompts for Vienna district selection via a checkbox list. */
export async function willhabenHunterPromptWienDistricts(
	current: WillhabenHunterViennaDistrict[] | undefined,
): Promise<WillhabenHunterViennaDistrict[] | undefined> {
	if (current !== undefined) return current;
	const wd = await checkbox({
		message: "Select Vienna districts (or none for all of Vienna):",
		choices: Object.values(WillhabenHunterViennaDistrict).map((val) => ({
			name: val,
			value: val,
			checked: false,
		})),
	});
	return wd && wd.length > 0 ? (wd as WillhabenHunterViennaDistrict[]) : undefined;
}

//#endregion

//#region Error reporting

/**
 * Centralised handler for prompt errors.
 * Exits cleanly on user abort, re-throws unexpected errors.
 *
 * @param err - The caught error from an @inquirer/prompts call.
 */
export function willhabenHunterHandlePromptError(err: unknown): never {
	if ((err instanceof Error && err.name === "ExitPromptError") || err === "") {
		console.error(pc.yellow("Aborted by user."));
		process.exit(0);
	}
	console.error(pc.red("Prompt error:"), err);
	process.exit(1);
}

/**
 * Reports an error and exits. Uses colored text for TTY, structured JSON for non-TTY.
 *
 * @param message - The error message.
 */
export function willhabenHunterReportError(message: string): never {
	if (process.stderr.isTTY) {
		console.error(pc.red(`Error: ${message}`));
	} else {
		console.error(JSON.stringify({ error: message }));
	}
	process.exit(1);
}

//#endregion
