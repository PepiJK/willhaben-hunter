/**
 * Command Line Interface parser and router.
 */
import { Command, Option } from "commander";
import { checkbox, input } from "@inquirer/prompts";
import * as fs from "fs";
import ora from "ora";
import * as path from "path";
import pc from "picocolors";
import { CsvExporter } from "../exporter/csv-exporter";
import { WillhabenScraper } from "../scraper/scraper";
import { Area, ViennaDistrict } from "../scraper/scraper.const";
import { ScrapeOptions } from "../scraper/scraper.interface";
import { CliPromptStep, CliSearchOptions } from "./cli.interface";
import { formatExecutionTime } from "../utils/utils";

/**
 * Main application class handling the CLI interface and orchestrating the scraping process.
 */
export class CliApp {
	private _program: Command;
	private _scraper: WillhabenScraper;

	constructor() {
		this._program = new Command();
		this._scraper = new WillhabenScraper();
	}

	/**
	 * Initializes and parses the command-line arguments.
	 *
	 * @param argv - The raw process arguments.
	 */
	public async run(argv: string[]): Promise<void> {
		this._setupCommands();
		await this._program.parseAsync(argv);
	}

	/**
	 * Configures the commander program options and actions.
	 */
	private _setupCommands(): void {
		this._program
			.name("willhaben-hunter")
			.description("A CLI to scrape items from willhaben.at")
			.version("1.0.0");

		this._program
			.command("search")
			.description("Search for items on willhaben")
			.option("-q, --query <string>", 'Search query (e.g., "iphone")')
			.option("--price-min <number>", "Minimum price", parseFloat)
			.option("--price-max <number>", "Maximum price", parseFloat)
			.addOption(
				new Option(
					"-a, --area <areas...>",
					"Area (Bundesland) to search in. Can be specified multiple times.",
				)
					.choices(Object.values(Area))
					.argParser((val, prev: string[]) => {
						const lower = val.toLowerCase();
						return prev ? prev.concat([lower]) : [lower];
					}),
			)
			.addOption(
				new Option(
					"--wien-districts <districts...>",
					"Vienna districts to search in if Wien is selected.",
				).choices(Object.values(ViennaDistrict)),
			)
			.option("-l, --limit <number>", "Maximum number of items to scrape", parseInt)
			.action(async (options: CliSearchOptions) => {
				await this._executeSearchAction(options);
			});
	}

	/**
	 * Executes the search action, handling prompts and scraping.
	 *
	 * @param options - The parsed command-line options.
	 */
	private async _executeSearchAction(options: CliSearchOptions): Promise<void> {
		let scrapeOptions: ScrapeOptions;

		if (process.stdin.isTTY) {
			scrapeOptions = await this._handleInteractivePrompts(options);
		} else {
			if (!options.query || !options.query.trim()) {
				console.error(pc.red("Error: Search query is required."));
				process.exit(1);
			}
			scrapeOptions = { query: options.query };
			if (options.limit !== undefined) scrapeOptions.limit = options.limit;
			if (options.priceMin !== undefined) scrapeOptions.priceMin = options.priceMin;
			if (options.priceMax !== undefined) scrapeOptions.priceMax = options.priceMax;
			if (options.area !== undefined) scrapeOptions.area = options.area;
			if (options.wienDistricts !== undefined)
				scrapeOptions.wienDistricts = options.wienDistricts;
		}

		await this._runScraperAndExport(scrapeOptions);
	}

	/**
	 * Handles interactive prompts for missing options.
	 *
	 * @param options - The initial options provided via CLI arguments.
	 * @returns The complete scrape options.
	 */
	private async _handleInteractivePrompts(options: CliSearchOptions): Promise<ScrapeOptions> {
		let { query, priceMin, priceMax, area, limit, wienDistricts } = options;

		const steps: CliPromptStep[] = [];
		if (!query) steps.push(CliPromptStep.QUERY);
		if (priceMin === undefined) steps.push(CliPromptStep.PRICE_MIN);
		if (priceMax === undefined) steps.push(CliPromptStep.PRICE_MAX);
		if (area === undefined) steps.push(CliPromptStep.AREA);
		if (limit === undefined) steps.push(CliPromptStep.LIMIT);

		let currentStepIndex = 0;

		while (currentStepIndex < steps.length && currentStepIndex >= 0) {
			const step = steps[currentStepIndex];
			try {
				switch (step) {
					case CliPromptStep.QUERY: {
						const q = await input({
							message: "Enter the item to search for:",
							default: query || "",
							validate: (val: string) =>
								val.trim().length > 0 || "Search query is required",
						});
						query = q;
						break;
					}
					case CliPromptStep.PRICE_MIN: {
						const pMin = await input({
							message: "Enter minimum price (or press enter to skip):",
							default: priceMin?.toString() || "",
						});
						priceMin = pMin.trim() ? parseFloat(pMin) : undefined;
						break;
					}
					case CliPromptStep.PRICE_MAX: {
						const pMax = await input({
							message: "Enter maximum price (or press enter to skip):",
							default: priceMax?.toString() || "",
						});
						priceMax = pMax.trim() ? parseFloat(pMax) : undefined;
						break;
					}
					case CliPromptStep.AREA: {
						const a = await checkbox({
							message:
								"Select areas to search in (use space to select, enter to confirm):",
							choices: Object.values(Area).map((val) => ({
								name: val,
								value: val,
								checked: area?.includes(val as Area) || false,
							})),
						});
						area = a && a.length > 0 ? (a as Area[]) : undefined;

						// If Wien is selected, we prompt for districts next
						if (area && area.includes(Area.WIEN) && !wienDistricts) {
							if (!steps.includes(CliPromptStep.WIEN_DISTRICTS)) {
								steps.splice(currentStepIndex + 1, 0, CliPromptStep.WIEN_DISTRICTS);
							}
						}
						break;
					}
					case CliPromptStep.WIEN_DISTRICTS: {
						const wd = await checkbox({
							message: "Select Vienna districts (or none for all of Vienna):",
							choices: Object.values(ViennaDistrict).map((val) => ({
								name: val,
								value: val,
								checked: wienDistricts?.includes(val as ViennaDistrict) || false,
							})),
						});
						wienDistricts = wd && wd.length > 0 ? (wd as ViennaDistrict[]) : undefined;
						break;
					}
					case CliPromptStep.LIMIT: {
						const l = await input({
							message: "Enter maximum items to scrape (or press enter to skip):",
							default: limit?.toString() || "",
						});
						limit = l.trim() ? parseInt(l, 10) : undefined;
						break;
					}
				}
				currentStepIndex++;
			} catch (err: unknown) {
				if (err instanceof Error && err.name === "ExitPromptError") {
					console.error(pc.yellow("Aborted by user."));
					process.exit(0);
				} else if (err === "") {
					// Fallback for unexpected empty throw
					console.error(pc.yellow("Aborted by user."));
					process.exit(0);
				} else {
					console.error(pc.red("Prompt error:"), err);
					process.exit(1);
				}
			}
		}

		const result: ScrapeOptions = { query: query! };
		if (limit !== undefined && !isNaN(limit)) result.limit = limit;
		if (priceMin !== undefined && !isNaN(priceMin)) result.priceMin = priceMin;
		if (priceMax !== undefined && !isNaN(priceMax)) result.priceMax = priceMax;
		if (area) result.area = area;
		if (wienDistricts) result.wienDistricts = wienDistricts;

		return result;
	}

	/**
	 * Orchestrates the scraper and the exporter.
	 *
	 * @param scrapeOptions - The options for scraping.
	 */
	private async _runScraperAndExport(scrapeOptions: ScrapeOptions): Promise<void> {
		const startTime = performance.now();
		const spinner = ora(pc.blue(`Searching willhaben for: ${scrapeOptions.query}`)).start();

		// Attach progress callback
		scrapeOptions.onProgress = (message: string) => {
			spinner.text = pc.blue(`Searching willhaben for: ${scrapeOptions.query} (${message})`);
		};

		try {
			const results = await this._scraper.scrape(scrapeOptions);
			spinner.succeed(pc.green(`Successfully scraped ${results.length} items!`));

			let exportPath = "";

			if (results.length > 0) {
				const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

				// Ensure output directory exists
				const outputDir = path.join(process.cwd(), "output");
				if (!fs.existsSync(outputDir)) {
					fs.mkdirSync(outputDir, { recursive: true });
				}

				const filename = path.join("output", `willhaben-results-${timestamp}.csv`);
				await CsvExporter.export(results, filename);
				exportPath = path.resolve(filename);
			}

			const endTime = performance.now();
			const elapsedSeconds = (endTime - startTime) / 1000;
			const formattedTime = formatExecutionTime(elapsedSeconds);

			console.log("");
			console.log(`  🎯 ${pc.bold("Suche:")}       ${scrapeOptions.query}`);
			console.log(`  📦 ${pc.bold("Gefunden:")}    ${results.length} Einträge`);

			if (exportPath) {
				console.log(`  💾 ${pc.bold("Datei:")}       ${pc.bold(pc.underline(exportPath))}`);
			} else {
				console.log(`  💾 ${pc.bold("Datei:")}       ${pc.yellow("Keine (0 Ergebnisse)")}`);
			}

			console.log(`  ⏱️ ${pc.bold("Dauer:")}       ${formattedTime}`);
			console.log("");
		} catch (error) {
			spinner.fail(pc.red("Failed to scrape willhaben."));
			if (error instanceof Error) {
				console.error(pc.red(error.message));
			}
		}
	}
}
