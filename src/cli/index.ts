/**
 * Command Line Interface parser and router.
 */
import { Command, Option } from "commander";
import pc from "picocolors";
import ora from "ora";
import { prompt } from "enquirer";
import { scrapeWillhaben, Area, ScrapeOptions } from "../scraper";

/**
 * Initializes and runs the CLI commands.
 * @param argv - The raw process arguments.
 */
export async function runCLI(argv: string[]): Promise<void> {
	const program = new Command();

	program
		.name("willhaben-hunter")
		.description("A CLI to scrape items from willhaben.at")
		.version("1.0.0");

	program
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
		.option("-l, --limit <number>", "Maximum number of items to scrape", parseInt)
		.action(async (options) => {
			let { query, priceMin, priceMax, area, limit } = options;

			if (process.stdin.isTTY) {
				const steps = [];
				if (!options.query) steps.push("query");
				if (options.priceMin === undefined) steps.push("priceMin");
				if (options.priceMax === undefined) steps.push("priceMax");
				if (options.area === undefined) steps.push("area");
				if (options.limit === undefined) steps.push("limit");

				let currentStepIndex = 0;

				while (currentStepIndex < steps.length && currentStepIndex >= 0) {
					const step = steps[currentStepIndex];
					try {
						if (step === "query") {
							const { q } = await prompt<{ q: string }>({
								type: "input",
								name: "q",
								message: "Enter the item to search for:",
								initial: query || "",
								validate: (val) =>
									val.trim().length > 0 || "Search query is required",
							});
							query = q;
						} else if (step === "priceMin") {
							const { pMin } = await prompt<{ pMin: string }>({
								type: "input",
								name: "pMin",
								message: "Enter minimum price (or press enter to skip):",
								initial: priceMin?.toString() || "",
							});
							priceMin = pMin.trim() ? parseFloat(pMin) : undefined;
						} else if (step === "priceMax") {
							const { pMax } = await prompt<{ pMax: string }>({
								type: "input",
								name: "pMax",
								message: "Enter maximum price (or press enter to skip):",
								initial: priceMax?.toString() || "",
							});
							priceMax = pMax.trim() ? parseFloat(pMax) : undefined;
						} else if (step === "area") {
							const { a } = await prompt<{ a: string[] }>({
								type: "multiselect",
								name: "a",
								message:
									"Select areas to search in (use space to select, enter to confirm):",
								choices: Object.values(Area),
								initial: area || [],
							});
							area = a && a.length > 0 ? (a as Area[]) : undefined;
						} else if (step === "limit") {
							const { l } = await prompt<{ l: string }>({
								type: "input",
								name: "l",
								message: "Enter maximum items to scrape (or press enter to skip):",
								initial: limit?.toString() || "",
							});
							limit = l.trim() ? parseInt(l, 10) : undefined;
						}
						currentStepIndex++;
					} catch (err) {
						if (err === "") {
							// Escape was pressed
							currentStepIndex--;
							if (currentStepIndex < 0) {
								console.error(pc.yellow("Aborted by user."));
								process.exit(0);
							}
						} else {
							console.error(pc.red("Prompt error:"), err);
							process.exit(1);
						}
					}
				}
			} else {
				if (!query || !query.trim()) {
					console.error(pc.red("Error: Search query is required."));
					process.exit(1);
				}
			}

			const spinner = ora(pc.blue(`Searching willhaben for: ${query}`)).start();
			try {
				// Call scraper logic
				const scrapeOptions: ScrapeOptions = { query };
				if (limit !== undefined && !isNaN(limit)) scrapeOptions.limit = limit;
				if (priceMin !== undefined && !isNaN(priceMin)) scrapeOptions.priceMin = priceMin;
				if (priceMax !== undefined && !isNaN(priceMax)) scrapeOptions.priceMax = priceMax;
				if (area !== undefined) scrapeOptions.area = area as Area[];

				const results = await scrapeWillhaben(scrapeOptions);
				spinner.succeed(pc.green(`Successfully scraped ${results.length} items!`));

				// TODO: call CSV export logic here
			} catch (error) {
				spinner.fail(pc.red("Failed to scrape willhaben."));
				if (error instanceof Error) {
					console.error(pc.red(error.message));
				}
			}
		});

	await program.parseAsync(argv);
}
