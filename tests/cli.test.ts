/* eslint-disable @typescript-eslint/no-explicit-any */

import * as inquirerPrompts from "@inquirer/prompts";
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { WillhabenHunterMarketplaceCli } from "../src/cli/marketplace-cli";
import {
	WillhabenHunterArea,
	WillhabenHunterSortOrder,
	WillhabenHunterViennaDistrict,
} from "../src/scraper/scraper.const";

vi.mock("@inquirer/prompts", () => ({
	input: vi.fn(),
	checkbox: vi.fn(),
	select: vi.fn(),
}));

vi.mock("ora", () => ({
	default: vi.fn(() => ({
		start: vi.fn().mockReturnThis(),
		succeed: vi.fn().mockReturnThis(),
		fail: vi.fn().mockReturnThis(),
		warn: vi.fn().mockReturnThis(),
		info: vi.fn().mockReturnThis(),
		stop: vi.fn().mockReturnThis(),
		text: "",
	})),
}));

describe("WillhabenHunterCli - Marketplace Interactive Prompts & Inputs", () => {
	let app: any;

	beforeEach(() => {
		app = new WillhabenHunterMarketplaceCli();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should prompt for all missing inputs and parse them correctly", async () => {
		const inputMock = inquirerPrompts.input as Mock;
		const checkboxMock = inquirerPrompts.checkbox as Mock;

		inputMock
			.mockResolvedValueOnce("iphone") // query
			.mockResolvedValueOnce("100") // priceMin
			.mockResolvedValueOnce("500") // priceMax
			.mockResolvedValueOnce("10"); // limit

		checkboxMock
			.mockResolvedValueOnce([WillhabenHunterArea.WIEN]) // area
			.mockResolvedValueOnce([WillhabenHunterViennaDistrict.INNERE_STADT]); // wienDistricts

		const result = await app._handleMarketplaceInteractivePrompts({});

		expect(result.query).toBe("iphone");
		expect(result.priceMin).toBe(100);
		expect(result.priceMax).toBe(500);
		expect(result.area).toEqual([WillhabenHunterArea.WIEN]);
		expect(result.wienDistricts).toEqual([WillhabenHunterViennaDistrict.INNERE_STADT]);
		expect(result.limit).toBe(10);
	});

	it("should skip prompts if values are already provided via CLI flags", async () => {
		const result = await app._handleMarketplaceInteractivePrompts({
			query: "macbook",
			priceMin: 200,
			priceMax: 1000,
			area: [WillhabenHunterArea.KAERNTEN],
			limit: 5,
		});

		expect(inquirerPrompts.input).not.toHaveBeenCalled();
		expect(inquirerPrompts.checkbox).not.toHaveBeenCalled();
		expect(result.query).toBe("macbook");
		expect(result.priceMin).toBe(200);
		expect(result.priceMax).toBe(1000);
		expect(result.area).toEqual([WillhabenHunterArea.KAERNTEN]);
		expect(result.limit).toBe(5);
		expect(result.wienDistricts).toBeUndefined();
	});

	it("should handle empty/skipped inputs gracefully", async () => {
		const inputMock = inquirerPrompts.input as Mock;
		const checkboxMock = inquirerPrompts.checkbox as Mock;

		inputMock
			.mockResolvedValueOnce("laufband") // query
			.mockResolvedValueOnce("") // empty priceMin
			.mockResolvedValueOnce("   ") // empty priceMax
			.mockResolvedValueOnce(""); // empty limit

		checkboxMock.mockResolvedValueOnce([]); // empty area

		const result = await app._handleMarketplaceInteractivePrompts({});

		expect(result.query).toBe("laufband");
		expect(result.priceMin).toBeUndefined();
		expect(result.priceMax).toBeUndefined();
		expect(result.area).toBeUndefined();
		expect(result.wienDistricts).toBeUndefined();
		expect(result.limit).toBeUndefined();
	});

	it("should prompt for Vienna districts only if Wien is selected as area", async () => {
		const inputMock = inquirerPrompts.input as Mock;
		const checkboxMock = inquirerPrompts.checkbox as Mock;

		inputMock
			.mockResolvedValueOnce("fahrrad") // query
			.mockResolvedValueOnce("")
			.mockResolvedValueOnce("")
			.mockResolvedValueOnce("");

		checkboxMock
			.mockResolvedValueOnce([WillhabenHunterArea.WIEN]) // area is Wien
			.mockResolvedValueOnce([]); // User skipped specific districts

		const result = await app._handleMarketplaceInteractivePrompts({});

		expect(result.area).toEqual([WillhabenHunterArea.WIEN]);
		expect(result.wienDistricts).toBeUndefined(); // empty selection converts to undefined
		expect(inputMock).toHaveBeenCalledTimes(4);
		expect(checkboxMock).toHaveBeenCalledTimes(2);
	});

	describe("TTY and Interactive Modes", () => {
		let originalStdinTTY: boolean | undefined;
		let originalStdoutTTY: boolean | undefined;

		beforeEach(() => {
			originalStdinTTY = process.stdin.isTTY;
			originalStdoutTTY = process.stdout.isTTY;
			app._runMarketplaceScraperAndExport = vi.fn().mockResolvedValue(undefined);
		});

		afterEach(() => {
			process.stdin.isTTY = !!originalStdinTTY;
			process.stdout.isTTY = !!originalStdoutTTY;
		});

		it("should use interactive mode when both stdin and stdout are TTYs", async () => {
			process.stdin.isTTY = true;
			process.stdout.isTTY = true;
			app._handleMarketplaceInteractivePrompts = vi
				.fn()
				.mockResolvedValue({ query: "interactive" });

			await app._executeMarketplaceAction({});
			expect(app._handleMarketplaceInteractivePrompts).toHaveBeenCalled();
			expect(app._runMarketplaceScraperAndExport).toHaveBeenCalledWith(
				expect.objectContaining({ query: "interactive" }),
				expect.any(Object),
				expect.any(Object),
			);
		});

		it("should bypass interactive mode when stdin is not TTY (e.g., piped input)", async () => {
			process.stdin.isTTY = false;
			process.stdout.isTTY = true;
			app._handleMarketplaceInteractivePrompts = vi.fn();

			await app._executeMarketplaceAction({ query: "piped in" });
			expect(app._handleMarketplaceInteractivePrompts).not.toHaveBeenCalled();
			expect(app._runMarketplaceScraperAndExport).toHaveBeenCalledWith(
				expect.objectContaining({ query: "piped in" }),
				expect.any(Object),
				expect.any(Object),
			);
		});

		it("should bypass interactive mode when stdout is not TTY (e.g., piped output)", async () => {
			process.stdin.isTTY = true;
			process.stdout.isTTY = false;
			app._handleMarketplaceInteractivePrompts = vi.fn();

			await app._executeMarketplaceAction({ query: "piped out" });
			expect(app._handleMarketplaceInteractivePrompts).not.toHaveBeenCalled();
			expect(app._runMarketplaceScraperAndExport).toHaveBeenCalledWith(
				expect.objectContaining({ query: "piped out" }),
				expect.any(Object),
				expect.any(Object),
			);
		});

		it("should bypass interactive mode when --non-interactive flag is provided", async () => {
			process.stdin.isTTY = true;
			process.stdout.isTTY = true;
			app._handleMarketplaceInteractivePrompts = vi.fn();

			await app._executeMarketplaceAction({
				query: "forced non-interactive",
				nonInteractive: true,
			});
			expect(app._handleMarketplaceInteractivePrompts).not.toHaveBeenCalled();
		});
	});

	it("should forward format and output options to _runMarketplaceScraperAndExport", async () => {
		app._runMarketplaceScraperAndExport = vi.fn().mockResolvedValue(undefined);

		const originalIsTTY = process.stdin.isTTY;
		process.stdin.isTTY = false;

		await app._executeMarketplaceAction({
			query: "test",
			format: "csv",
			output: "results.csv",
		});

		expect(app._runMarketplaceScraperAndExport).toHaveBeenCalledWith(
			expect.objectContaining({ query: "test" }),
			expect.objectContaining({
				format: "csv",
				outputPath: "results.csv",
			}),
			expect.objectContaining({
				quiet: false,
				failOnEmpty: false,
			}),
		);

		process.stdin.isTTY = originalIsTTY;
	});

	it("should forward sort and skipDetails options to scrape options", async () => {
		app._runMarketplaceScraperAndExport = vi.fn().mockResolvedValue(undefined);

		const originalIsTTY = process.stdin.isTTY;
		process.stdin.isTTY = false;

		await app._executeMarketplaceAction({
			query: "monitor",
			sort: WillhabenHunterSortOrder.PREIS_AUFSTEIGEND,
			skipDetails: true,
		});

		expect(app._runMarketplaceScraperAndExport).toHaveBeenCalledWith(
			expect.objectContaining({
				query: "monitor",
				sort: WillhabenHunterSortOrder.PREIS_AUFSTEIGEND,
				skipDetails: true,
			}),
			expect.any(Object),
			expect.any(Object),
		);

		process.stdin.isTTY = originalIsTTY;
	});

	it("should forward quiet and failOnEmpty CLI flags", async () => {
		app._runMarketplaceScraperAndExport = vi.fn().mockResolvedValue(undefined);

		const originalIsTTY = process.stdin.isTTY;
		process.stdin.isTTY = false;

		await app._executeMarketplaceAction({
			query: "desk",
			quiet: true,
			failOnEmpty: true,
		});

		expect(app._runMarketplaceScraperAndExport).toHaveBeenCalledWith(
			expect.objectContaining({ query: "desk" }),
			expect.any(Object),
			expect.objectContaining({
				quiet: true,
				failOnEmpty: true,
			}),
		);

		process.stdin.isTTY = originalIsTTY;
	});

	describe("Coverage: _buildMarketplaceScrapeOptions & _runMarketplaceScraperAndExport", () => {
		it("should error if query is missing in non-interactive mode", () => {
			const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
			const mockConsole = vi.spyOn(console, "error").mockImplementation(() => {});
			app._buildMarketplaceScrapeOptions({} as any);
			expect(mockConsole).toHaveBeenCalled();
			expect(mockExit).toHaveBeenCalledWith(1);
			mockExit.mockRestore();
			mockConsole.mockRestore();
		});

		it("should execute _runMarketplaceScraperAndExport successfully (JSON mode, results found)", async () => {
			const mockScrape = vi.fn().mockResolvedValue([{ id: "1" }, { id: "2" }]);
			app["_marketplaceScraper"].scrape = mockScrape;

			const { WillhabenHunterExporter } = await import("../src/exporter/exporter");
			const exporterMock = vi
				.spyOn(WillhabenHunterExporter, "export")
				.mockResolvedValue("/some/path.json");

			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			const originalIsTTY = process.stderr.isTTY;
			process.stderr.isTTY = false; // JSON mode

			await app["_runMarketplaceScraperAndExport"](
				{ query: "macbook" },
				{ format: "json", outputPath: "out.json" },
				{ quiet: false, failOnEmpty: false },
			);

			expect(mockScrape).toHaveBeenCalled();
			expect(exporterMock).toHaveBeenCalled();
			expect(consoleErrorSpy).toHaveBeenCalled();

			const jsonCall = consoleErrorSpy.mock.calls.find(
				(call) => typeof call[0] === "string" && call[0].includes('"resultCount":2'),
			);
			expect(jsonCall).toBeDefined();

			process.stderr.isTTY = originalIsTTY;
			consoleErrorSpy.mockRestore();
		});

		it("should execute _runMarketplaceScraperAndExport successfully (TTY mode, results found, exportPath)", async () => {
			const mockScrape = vi.fn().mockResolvedValue([{ id: "1" }]);
			app["_marketplaceScraper"].scrape = mockScrape;

			const { WillhabenHunterExporter } = await import("../src/exporter/exporter");
			const exporterMock = vi
				.spyOn(WillhabenHunterExporter, "export")
				.mockResolvedValue("/absolute/test/path.json");

			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			const originalIsTTY = process.stderr.isTTY;
			const originalCursorTo = process.stderr.cursorTo;
			const originalClearLine = process.stderr.clearLine;

			process.stderr.isTTY = true; // TTY mode
			process.stderr.cursorTo = vi.fn() as any;
			process.stderr.clearLine = vi.fn() as any;

			await app["_runMarketplaceScraperAndExport"](
				{ query: "macbook" },
				{ format: "json", outputPath: "test.json" },
				{ quiet: false, failOnEmpty: false },
			);

			expect(mockScrape).toHaveBeenCalled();
			expect(consoleErrorSpy).toHaveBeenCalled();
			const ttyCall = consoleErrorSpy.mock.calls.find(
				(call) =>
					typeof call[0] === "string" && call[0].includes("/absolute/test/path.json"),
			);
			expect(ttyCall).toBeDefined();

			process.stderr.isTTY = originalIsTTY;
			process.stderr.cursorTo = originalCursorTo;
			process.stderr.clearLine = originalClearLine;
			consoleErrorSpy.mockRestore();
			exporterMock.mockRestore();
		});

		it("should execute _runMarketplaceScraperAndExport successfully (TTY mode, no results, failOnEmpty)", async () => {
			const mockScrape = vi.fn().mockResolvedValue([]);
			app["_marketplaceScraper"].scrape = mockScrape;

			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			const originalIsTTY = process.stderr.isTTY;
			const originalCursorTo = process.stderr.cursorTo;
			const originalClearLine = process.stderr.clearLine;

			process.stderr.isTTY = true;
			process.stderr.cursorTo = vi.fn() as any;
			process.stderr.clearLine = vi.fn() as any;

			await app["_runMarketplaceScraperAndExport"](
				{ query: "macbook" },
				{ format: "json" },
				{ quiet: false, failOnEmpty: true }, // Fail on empty
			);

			expect(process.exitCode).toBe(1);
			process.exitCode = 0; // Reset for other tests

			process.stderr.isTTY = originalIsTTY;
			process.stderr.cursorTo = originalCursorTo;
			process.stderr.clearLine = originalClearLine;
			consoleErrorSpy.mockRestore();
		});

		it("should handle scrape error gracefully", async () => {
			const mockScrape = vi.fn().mockRejectedValue(new Error("Scrape failed"));
			app["_marketplaceScraper"].scrape = mockScrape;

			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);

			const originalIsTTY = process.stderr.isTTY;
			const originalCursorTo = process.stderr.cursorTo;
			const originalClearLine = process.stderr.clearLine;

			process.stderr.isTTY = true;
			process.stderr.cursorTo = vi.fn() as any;
			process.stderr.clearLine = vi.fn() as any;

			await app["_runMarketplaceScraperAndExport"](
				{ query: "fail" },
				{ format: "json" },
				{ quiet: false, failOnEmpty: false },
			);

			expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Scrape failed"));
			expect(mockExit).toHaveBeenCalledWith(1);

			process.stderr.isTTY = originalIsTTY;
			process.stderr.cursorTo = originalCursorTo;
			process.stderr.clearLine = originalClearLine;
			mockExit.mockRestore();
			consoleErrorSpy.mockRestore();
		});
		describe("Coverage: Commander action callback", () => {
			it("should parse options and call execute action", async () => {
				const { Command } = await import("commander");
				const program = new Command();
				app.setupCommand(program);

				app._executeMarketplaceAction = vi.fn().mockResolvedValue(undefined);

				await program.parseAsync([
					"node",
					"test",
					"marketplace",
					"-q",
					"macbook",
					"--price-min",
					"100",
					"--limit",
					"10",
					"--skip-details",
					"--quiet",
					"--fail-on-empty",
					"--format",
					"json",
					"--output",
					"test.json",
					"--non-interactive",
				]);

				expect(app._executeMarketplaceAction).toHaveBeenCalled();
			});

			it("should parse multiple --area and --wien-districts correctly", async () => {
				const { Command } = await import("commander");
				const program = new Command();
				app.setupCommand(program);

				app._executeMarketplaceAction = vi.fn().mockResolvedValue(undefined);

				await program.parseAsync([
					"node",
					"test",
					"marketplace",
					"-q",
					"macbook",
					"--area",
					"wien",
					"--area",
					"burgenland",
					"--wien-districts",
					"1. Bezirk (Innere Stadt)",
					"--wien-districts",
					"2. Bezirk (Leopoldstadt)",
				]);
				expect(app._executeMarketplaceAction).toHaveBeenCalled();
			});
		});
	});
});
