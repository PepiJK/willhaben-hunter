import { describe, expect, it, vi, beforeEach, Mock, afterEach } from "vitest";
import { WillhabenHunterJobsCli } from "../src/cli/jobs-cli";
import { Command } from "commander";
import * as inquirerPrompts from "@inquirer/prompts";
import { WillhabenHunterArea } from "../src/scraper/scraper.const";

vi.mock("../src/scraper/jobs-scraper", () => {
	return {
		WillhabenHunterJobsScraper: class {
			scrape = vi.fn().mockResolvedValue([
				{
					id: "1",
					title: "Test Job",
					url: "test-url",
					company: "Test Company",
					location: "Test Location",
				},
			]);
		},
	};
});

vi.mock("@inquirer/prompts", () => ({
	input: vi.fn(),
	checkbox: vi.fn(),
	select: vi.fn(),
}));

vi.mock("../src/exporter/exporter", () => {
	return {
		WillhabenHunterExporter: class {
			public static readonly export = vi.fn().mockResolvedValue(undefined);
			public static readonly exportImmo = vi.fn().mockResolvedValue(undefined);
			public static readonly exportJobs = vi.fn().mockResolvedValue(undefined);
		},
	};
});

vi.mock("ora", () => ({
	default: vi.fn(() => ({
		start: vi.fn().mockReturnThis(),
		succeed: vi.fn().mockReturnThis(),
		fail: vi.fn().mockReturnThis(),
		stop: vi.fn().mockReturnThis(),
		text: "",
	})),
}));

describe("WillhabenHunterJobsCli", () => {
	let jobsCli: WillhabenHunterJobsCli;
	let program: Command;

	beforeEach(() => {
		vi.clearAllMocks();
		jobsCli = new WillhabenHunterJobsCli();
		program = new Command();

		// Catch exits
		vi.spyOn(process, "exit").mockImplementation(
			(() => undefined) as unknown as typeof process.exit,
		);
		vi.spyOn(console, "error").mockImplementation(() => {});

		// Silence commander's internal stderr output during tests
		program.configureOutput({
			writeOut: () => {},
			writeErr: () => {},
		});
	});

	it("should parse arguments correctly", async () => {
		jobsCli.setupCommand(program);

		// Run with multiple array arguments
		await program.parseAsync([
			"node",
			"test",
			"jobs",
			"--query",
			"software",
			"--employment-type",
			"vollzeit",
			"--employment-type",
			"teilzeit",
			"--position",
			"gruppen-/teamleitung",
			"--area",
			"wien",
			"--company-type",
			"personalberatung",
			"--time-limit",
			"letzte_24_stunden",
			"--limit",
			"5",
			"--format",
			"csv",
			"--wien-districts",
			"1",
			"--wien-districts",
			"2",
			"--non-interactive",
		]);

		// Since we run program.parseAsync, the action will execute. We just test it doesn't throw and parses properly.
		// The execute logic will call WillhabenHunterJobsScraper internally.
		expect(process.exit).not.toHaveBeenCalled();
	});

	it("should throw InvalidArgumentError for invalid wien-districts", async () => {
		jobsCli.setupCommand(program);
		let thrownError: Error | undefined;

		try {
			await program.parseAsync([
				"node",
				"test",
				"jobs",
				"--query",
				"test",
				"--wien-districts",
				"invalid",
			]);
		} catch (err) {
			thrownError = err;
		}
		expect(thrownError).toBeDefined();
		expect(thrownError.message).toContain("District must be a number");
	});

	it("should throw InvalidArgumentError for out of bounds wien-districts", async () => {
		jobsCli.setupCommand(program);
		let thrownError: Error | undefined;

		try {
			await program.parseAsync([
				"node",
				"test",
				"jobs",
				"--query",
				"test",
				"--wien-districts",
				"24",
			]);
		} catch (err) {
			thrownError = err;
		}
		expect(thrownError).toBeDefined();
		expect(thrownError.message).toContain("District must be a number");
	});

	it("should fail on missing query in non-interactive mode", async () => {
		jobsCli.setupCommand(program);

		await program.parseAsync(["node", "test", "jobs", "--non-interactive"]);

		expect(console.error).toHaveBeenCalled();
	});

	it("should prompt for required options in interactive mode", async () => {
		const inputMock = inquirerPrompts.input as Mock;
		const checkboxMock = inquirerPrompts.checkbox as Mock;

		inputMock
			.mockResolvedValueOnce("developer") // query
			.mockResolvedValueOnce("5"); // limit

		checkboxMock
			.mockResolvedValueOnce([WillhabenHunterArea.WIEN]) // area
			.mockResolvedValueOnce([]); // wienDistricts

		const result = await jobsCli["_promptMissingOptions"]({} as never);

		expect(result.query).toBe("developer");
		expect(result.area).toEqual([WillhabenHunterArea.WIEN]);
		expect(result.limit).toBe(5);
	});

	describe("Coverage: _executeJobsAction", () => {
		afterEach(() => {
			process.exitCode = 0;
		});

		it("should execute action with quiet mode and failOnEmpty without results", async () => {
			// Mock scraper to return empty
			jobsCli["_jobsScraper"].scrape = vi.fn().mockResolvedValue([]);
			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			await jobsCli["_executeJobsAction"]({
				query: "test query",
				nonInteractive: true,
				quiet: true,
				failOnEmpty: true,
			});

			expect(process.exitCode).toBe(1);
			expect(consoleErrorSpy).not.toHaveBeenCalled(); // quiet suppresses output
			consoleErrorSpy.mockRestore();
		});

		it("should print TTY summary when stderr is TTY and exportPath is provided", async () => {
			jobsCli["_jobsScraper"].scrape = vi.fn().mockImplementation(async (opts) => {
				if (opts.onProgress) opts.onProgress("loading");
				return [{ id: "1" }, { id: "2" }];
			});
			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			const originalIsTTY = process.stderr.isTTY;
			process.stderr.isTTY = true;

			const { WillhabenHunterExporter } = await import("../src/exporter/exporter");
			const exporterMock = vi
				.spyOn(WillhabenHunterExporter, "exportJobs")
				.mockResolvedValue("dummy.json");

			await jobsCli["_executeJobsAction"]({
				query: "test query",
				nonInteractive: true,
				format: "json",
				output: "dummy.json",
			});

			expect(consoleErrorSpy).toHaveBeenCalled();
			const calls = consoleErrorSpy.mock.calls.map((c) => c[0]).join(" ");
			expect(calls).toContain("dummy.json");

			process.stderr.isTTY = originalIsTTY;
			consoleErrorSpy.mockRestore();
			exporterMock.mockRestore();
		});

		it("should print TTY summary when stderr is TTY, no exportPath, results > 0", async () => {
			jobsCli["_jobsScraper"].scrape = vi.fn().mockResolvedValue([{ id: "1" }]);
			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			const originalIsTTY = process.stderr.isTTY;
			process.stderr.isTTY = true;

			await jobsCli["_executeJobsAction"]({
				query: "test query",
				nonInteractive: true,
			});

			const calls = consoleErrorSpy.mock.calls.map((c) => c[0]).join(" ");
			expect(calls).toContain("Console (stdout)");

			process.stderr.isTTY = originalIsTTY;
			consoleErrorSpy.mockRestore();
		});

		it("should print TTY summary when stderr is TTY, no exportPath, 0 results", async () => {
			jobsCli["_jobsScraper"].scrape = vi.fn().mockResolvedValue([]);
			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			const originalIsTTY = process.stderr.isTTY;
			process.stderr.isTTY = true;

			await jobsCli["_executeJobsAction"]({
				query: "test query",
				nonInteractive: true,
			});

			const calls = consoleErrorSpy.mock.calls.map((c) => c[0]).join(" ");
			expect(calls).toContain("None (0 results)");

			process.stderr.isTTY = originalIsTTY;
			consoleErrorSpy.mockRestore();
		});

		it("should print JSON summary when stderr is not TTY", async () => {
			jobsCli["_jobsScraper"].scrape = vi.fn().mockResolvedValue([{ id: "1" }]);
			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			const originalIsTTY = process.stderr.isTTY;
			process.stderr.isTTY = false;

			await jobsCli["_executeJobsAction"]({
				query: "test query",
				nonInteractive: true,
				format: "csv",
			});

			expect(consoleErrorSpy).toHaveBeenCalled();
			const jsonCall = consoleErrorSpy.mock.calls.find(
				(call) => typeof call[0] === "string" && call[0].includes('"resultCount":1'),
			);
			expect(jsonCall).toBeDefined();

			process.stderr.isTTY = originalIsTTY;
			consoleErrorSpy.mockRestore();
		});

		it("should handle error during executeJobsAction", async () => {
			jobsCli["_jobsScraper"].scrape = vi
				.fn()
				.mockRejectedValue(new Error("Scraping failed"));
			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			await jobsCli["_executeJobsAction"]({
				query: "test query",
				nonInteractive: true,
			});

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("Scraping failed"),
			);
			consoleErrorSpy.mockRestore();
		});

		it("should handle prompt User force closed error", async () => {
			const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);
			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			const inputMock = inquirerPrompts.input as Mock;
			const exitError = new Error("User force closed the prompt");
			exitError.name = "ExitPromptError";
			inputMock.mockRejectedValueOnce(exitError);

			await jobsCli["_executeJobsAction"]({
				nonInteractive: false,
			});

			expect(mockExit).toHaveBeenCalledWith(0);
			mockExit.mockRestore();
			consoleErrorSpy.mockRestore();
		});
	});
});
