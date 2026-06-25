/**
 * Command Line Interface parser and router.
 */
import { Command } from "commander";
import pc from "picocolors";
import ora from "ora";
import { scrapeWillhaben } from "../scraper";

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
		.requiredOption("-q, --query <string>", 'Search query (e.g., "iphone")')
		.option("-l, --limit <number>", "Maximum number of items to scrape", "50")
		.action(async (options) => {
			const spinner = ora(pc.blue(`Searching willhaben for: ${options.query}`)).start();
			try {
				// Call scraper logic
				const results = await scrapeWillhaben(options.query, parseInt(options.limit, 10));
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
