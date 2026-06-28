/**
 * Entry point for the Willhaben Hunter CLI application.
 */
import { CliApp } from "./cli/cli";

// Execute the CLI
const app = new CliApp();
app.run(process.argv).catch((error) => {
	console.error("Fatal Error:", error);
	process.exit(1);
});
