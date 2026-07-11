/* eslint-disable @typescript-eslint/no-explicit-any */

import * as inquirerPrompts from "@inquirer/prompts";
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { WillhabenHunterImmoCli } from "../src/cli/immo-cli";
import {
	WillhabenHunterArea,
	WillhabenHunterImmoType,
	WillhabenHunterViennaDistrict,
} from "../src/scraper/scraper.const";

vi.mock("@inquirer/prompts", () => ({
	input: vi.fn(),
	checkbox: vi.fn(),
	select: vi.fn(),
}));

describe("WillhabenHunterCli - Immo Interactive Prompts & Inputs", () => {
	let app: any;

	beforeEach(() => {
		app = new WillhabenHunterImmoCli();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should prompt for all missing immo inputs and parse them correctly", async () => {
		const inputMock = inquirerPrompts.input as Mock;
		const checkboxMock = inquirerPrompts.checkbox as Mock;
		const selectMock = inquirerPrompts.select as Mock;

		selectMock.mockResolvedValueOnce(WillhabenHunterImmoType.WOHNUNG_MIETEN); // type

		inputMock
			.mockResolvedValueOnce("altbau") // query
			.mockResolvedValueOnce("500") // priceMin
			.mockResolvedValueOnce("1500") // priceMax
			.mockResolvedValueOnce("3") // rooms
			.mockResolvedValueOnce("60") // sizeMin
			.mockResolvedValueOnce("120") // sizeMax
			.mockResolvedValueOnce("10"); // limit

		checkboxMock
			.mockResolvedValueOnce([WillhabenHunterArea.WIEN]) // area
			.mockResolvedValueOnce([WillhabenHunterViennaDistrict.MARIAHILF]); // wienDistricts

		const result = await app._handleImmoInteractivePrompts({});

		expect(result.type).toBe(WillhabenHunterImmoType.WOHNUNG_MIETEN);
		expect(result.query).toBe("altbau");
		expect(result.priceMin).toBe(500);
		expect(result.priceMax).toBe(1500);
		expect(result.rooms).toBe(3);
		expect(result.sizeMin).toBe(60);
		expect(result.sizeMax).toBe(120);
		expect(result.area).toEqual([WillhabenHunterArea.WIEN]);
		expect(result.wienDistricts).toEqual([WillhabenHunterViennaDistrict.MARIAHILF]);
		expect(result.limit).toBe(10);
	});

	it("should skip prompts if values are already provided via CLI flags", async () => {
		const result = await app._handleImmoInteractivePrompts({
			type: WillhabenHunterImmoType.HAUS_KAUFEN,
			query: "einfamilienhaus",
			priceMin: 200000,
			priceMax: 500000,
			rooms: 4,
			sizeMin: 100,
			sizeMax: 200,
			area: [WillhabenHunterArea.NIEDEROESTERREICH],
			limit: 20,
		});

		expect(inquirerPrompts.input).not.toHaveBeenCalled();
		expect(inquirerPrompts.checkbox).not.toHaveBeenCalled();
		expect(inquirerPrompts.select).not.toHaveBeenCalled();
		expect(result.type).toBe(WillhabenHunterImmoType.HAUS_KAUFEN);
		expect(result.query).toBe("einfamilienhaus");
		expect(result.priceMin).toBe(200000);
		expect(result.priceMax).toBe(500000);
		expect(result.rooms).toBe(4);
		expect(result.sizeMin).toBe(100);
		expect(result.sizeMax).toBe(200);
		expect(result.area).toEqual([WillhabenHunterArea.NIEDEROESTERREICH]);
		expect(result.limit).toBe(20);
	});

	it("should handle empty/skipped optional immo inputs gracefully", async () => {
		const inputMock = inquirerPrompts.input as Mock;
		const checkboxMock = inquirerPrompts.checkbox as Mock;
		const selectMock = inquirerPrompts.select as Mock;

		selectMock.mockResolvedValueOnce(WillhabenHunterImmoType.WOHNUNG_MIETEN);

		inputMock
			.mockResolvedValueOnce("") // empty query
			.mockResolvedValueOnce("") // empty priceMin
			.mockResolvedValueOnce("") // empty priceMax
			.mockResolvedValueOnce("") // empty rooms
			.mockResolvedValueOnce("") // empty sizeMin
			.mockResolvedValueOnce("") // empty sizeMax
			.mockResolvedValueOnce(""); // empty limit

		checkboxMock.mockResolvedValueOnce([]); // no area

		const result = await app._handleImmoInteractivePrompts({});

		expect(result.type).toBe(WillhabenHunterImmoType.WOHNUNG_MIETEN);
		expect(result.query).toBeUndefined();
		expect(result.priceMin).toBeUndefined();
		expect(result.priceMax).toBeUndefined();
		expect(result.rooms).toBeUndefined();
		expect(result.sizeMin).toBeUndefined();
		expect(result.sizeMax).toBeUndefined();
		expect(result.area).toBeUndefined();
		expect(result.limit).toBeUndefined();
	});

	it("should prompt for Vienna districts when Wien is selected", async () => {
		const inputMock = inquirerPrompts.input as Mock;
		const checkboxMock = inquirerPrompts.checkbox as Mock;
		const selectMock = inquirerPrompts.select as Mock;

		selectMock.mockResolvedValueOnce(WillhabenHunterImmoType.WOHNUNG_MIETEN);

		inputMock
			.mockResolvedValueOnce("") // query
			.mockResolvedValueOnce("") // priceMin
			.mockResolvedValueOnce("") // priceMax
			.mockResolvedValueOnce("") // rooms
			.mockResolvedValueOnce("") // sizeMin
			.mockResolvedValueOnce("") // sizeMax
			.mockResolvedValueOnce(""); // limit

		checkboxMock
			.mockResolvedValueOnce([WillhabenHunterArea.WIEN]) // area
			.mockResolvedValueOnce([WillhabenHunterViennaDistrict.NEUBAU]); // districts

		const result = await app._handleImmoInteractivePrompts({});

		expect(result.area).toEqual([WillhabenHunterArea.WIEN]);
		expect(result.wienDistricts).toEqual([WillhabenHunterViennaDistrict.NEUBAU]);
		expect(checkboxMock).toHaveBeenCalledTimes(2);
	});

	describe("Immo TTY and Interactive Modes", () => {
		let originalStdinTTY: boolean | undefined;
		let originalStdoutTTY: boolean | undefined;

		beforeEach(() => {
			originalStdinTTY = process.stdin.isTTY;
			originalStdoutTTY = process.stdout.isTTY;
			app._runImmoScraperAndExport = vi.fn().mockResolvedValue(undefined);
		});

		afterEach(() => {
			process.stdin.isTTY = !!originalStdinTTY;
			process.stdout.isTTY = !!originalStdoutTTY;
		});

		it("should use interactive mode when both stdin and stdout are TTYs", async () => {
			process.stdin.isTTY = true;
			process.stdout.isTTY = true;
			app._handleImmoInteractivePrompts = vi.fn().mockResolvedValue({
				type: WillhabenHunterImmoType.WOHNUNG_MIETEN,
			});

			await app._executeImmoAction({});
			expect(app._handleImmoInteractivePrompts).toHaveBeenCalled();
			expect(app._runImmoScraperAndExport).toHaveBeenCalledWith(
				expect.objectContaining({ type: WillhabenHunterImmoType.WOHNUNG_MIETEN }),
				expect.any(Object),
				expect.any(Object),
			);
		});

		it("should bypass interactive mode when stdin is not TTY", async () => {
			process.stdin.isTTY = false;
			process.stdout.isTTY = true;
			app._handleImmoInteractivePrompts = vi.fn();

			await app._executeImmoAction({ type: WillhabenHunterImmoType.HAUS_KAUFEN });
			expect(app._handleImmoInteractivePrompts).not.toHaveBeenCalled();
			expect(app._runImmoScraperAndExport).toHaveBeenCalledWith(
				expect.objectContaining({ type: WillhabenHunterImmoType.HAUS_KAUFEN }),
				expect.any(Object),
				expect.any(Object),
			);
		});

		it("should bypass interactive mode with --non-interactive flag", async () => {
			process.stdin.isTTY = true;
			process.stdout.isTTY = true;
			app._handleImmoInteractivePrompts = vi.fn();

			await app._executeImmoAction({
				type: WillhabenHunterImmoType.WOHNUNG_KAUFEN,
				nonInteractive: true,
			});
			expect(app._handleImmoInteractivePrompts).not.toHaveBeenCalled();
		});
	});

	it("should forward all immo options to _runImmoScraperAndExport", async () => {
		app._runImmoScraperAndExport = vi.fn().mockResolvedValue(undefined);

		const originalIsTTY = process.stdin.isTTY;
		process.stdin.isTTY = false;

		await app._executeImmoAction({
			type: WillhabenHunterImmoType.WOHNUNG_MIETEN,
			query: "altbau",
			priceMin: 500,
			priceMax: 2000,
			rooms: 2,
			sizeMin: 50,
			sizeMax: 90,
			area: [WillhabenHunterArea.WIEN],
			limit: 5,
			format: "csv",
			output: "immo.csv",
			skipDetails: true,
		});

		expect(app._runImmoScraperAndExport).toHaveBeenCalledWith(
			expect.objectContaining({
				type: WillhabenHunterImmoType.WOHNUNG_MIETEN,
				query: "altbau",
				priceMin: 500,
				priceMax: 2000,
				rooms: 2,
				sizeMin: 50,
				sizeMax: 90,
				skipDetails: true,
			}),
			expect.objectContaining({
				format: "csv",
				outputPath: "immo.csv",
			}),
			expect.objectContaining({
				quiet: false,
				failOnEmpty: false,
			}),
		);

		process.stdin.isTTY = originalIsTTY;
	});

	it("should forward quiet and failOnEmpty flags for immo", async () => {
		app._runImmoScraperAndExport = vi.fn().mockResolvedValue(undefined);

		const originalIsTTY = process.stdin.isTTY;
		process.stdin.isTTY = false;

		await app._executeImmoAction({
			type: WillhabenHunterImmoType.HAUS_MIETEN,
			quiet: true,
			failOnEmpty: true,
		});

		expect(app._runImmoScraperAndExport).toHaveBeenCalledWith(
			expect.any(Object),
			expect.any(Object),
			expect.objectContaining({
				quiet: true,
				failOnEmpty: true,
			}),
		);

		process.stdin.isTTY = originalIsTTY;
	});

	describe("Coverage: _buildImmoScrapeOptions & _runImmoScraperAndExport", () => {
		it("should error if type is missing in non-interactive mode", () => {
			const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
			const mockConsole = vi.spyOn(console, "error").mockImplementation(() => {});
			app._buildImmoScrapeOptions({} as any);
			expect(mockConsole).toHaveBeenCalled();
			expect(mockExit).toHaveBeenCalledWith(1);
			mockExit.mockRestore();
			mockConsole.mockRestore();
		});

		it("should execute _runImmoScraperAndExport successfully (JSON mode, results found)", async () => {
			const mockScrape = vi.fn().mockResolvedValue([{ id: "1" }, { id: "2" }]);
			app["_immoScraper"].scrape = mockScrape;

			const { WillhabenHunterExporter } = await import("../src/exporter/exporter");
			const exporterMock = vi
				.spyOn(WillhabenHunterExporter, "exportImmo")
				.mockResolvedValue("/some/path.json");

			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			const originalIsTTY = process.stderr.isTTY;
			process.stderr.isTTY = false; // JSON mode

			await app["_runImmoScraperAndExport"](
				{ type: WillhabenHunterImmoType.WOHNUNG_MIETEN, query: "altbau" },
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

		it("should execute _runImmoScraperAndExport successfully (TTY mode, results found, exportPath)", async () => {
			const mockScrape = vi.fn().mockResolvedValue([{ id: "1" }]);
			app["_immoScraper"].scrape = mockScrape;

			const { WillhabenHunterExporter } = await import("../src/exporter/exporter");
			const exporterMock = vi
				.spyOn(WillhabenHunterExporter, "exportImmo")
				.mockResolvedValue("/absolute/test/path.json");

			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			const originalIsTTY = process.stderr.isTTY;
			const originalCursorTo = process.stderr.cursorTo;
			const originalClearLine = process.stderr.clearLine;

			process.stderr.isTTY = true; // TTY mode
			process.stderr.cursorTo = vi.fn() as any;
			process.stderr.clearLine = vi.fn() as any;

			await app["_runImmoScraperAndExport"](
				{ type: WillhabenHunterImmoType.HAUS_KAUFEN, rooms: 3, sizeMin: 100 },
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

		it("should execute _runImmoScraperAndExport successfully (TTY mode, no results, failOnEmpty)", async () => {
			const mockScrape = vi.fn().mockResolvedValue([]);
			app["_immoScraper"].scrape = mockScrape;

			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			const originalIsTTY = process.stderr.isTTY;
			const originalCursorTo = process.stderr.cursorTo;
			const originalClearLine = process.stderr.clearLine;

			process.stderr.isTTY = true;
			process.stderr.cursorTo = vi.fn() as any;
			process.stderr.clearLine = vi.fn() as any;

			await app["_runImmoScraperAndExport"](
				{ type: WillhabenHunterImmoType.WOHNUNG_MIETEN },
				{ format: "json" },
				{ quiet: false, failOnEmpty: true }, // Fail on empty
			);

			expect(process.exitCode).toBe(1);
			process.exitCode = 0; // Reset

			process.stderr.isTTY = originalIsTTY;
			process.stderr.cursorTo = originalCursorTo;
			process.stderr.clearLine = originalClearLine;
			consoleErrorSpy.mockRestore();
		});

		it("should handle scrape error gracefully", async () => {
			const mockScrape = vi.fn().mockRejectedValue(new Error("Scrape failed"));
			app["_immoScraper"].scrape = mockScrape;

			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);

			const originalIsTTY = process.stderr.isTTY;
			const originalCursorTo = process.stderr.cursorTo;
			const originalClearLine = process.stderr.clearLine;

			process.stderr.isTTY = true;
			process.stderr.cursorTo = vi.fn() as any;
			process.stderr.clearLine = vi.fn() as any;

			await app["_runImmoScraperAndExport"](
				{ type: WillhabenHunterImmoType.WOHNUNG_MIETEN },
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

				app._executeImmoAction = vi.fn().mockResolvedValue(undefined);

				await program.parseAsync([
					"node",
					"test",
					"immo",
					"--type",
					"wohnung-mieten",
					"-q",
					"altbau",
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

				expect(app._executeImmoAction).toHaveBeenCalled();
			});

			it("should parse multiple --area and --wien-districts correctly", async () => {
				const { Command } = await import("commander");
				const program = new Command();
				app.setupCommand(program);

				app._executeImmoAction = vi.fn().mockResolvedValue(undefined);

				await program.parseAsync([
					"node",
					"test",
					"immo",
					"--type",
					"wohnung-mieten",
					"--area",
					"wien",
					"--area",
					"burgenland",
					"--wien-districts",
					"1. Bezirk (Innere Stadt)",
					"--wien-districts",
					"2. Bezirk (Leopoldstadt)",
				]);
				expect(app._executeImmoAction).toHaveBeenCalled();
			});
		});
	});
});
