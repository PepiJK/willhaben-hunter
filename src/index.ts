import { CliApp } from "./cli/cli";

// Handle EPIPE errors gracefully when piping to commands that close early (like jq or head)
process.stdout.on("error", (err: NodeJS.ErrnoException) => {
	if (err.code === "EPIPE") {
		process.exit(0);
	}
});

// Execute the CLI
const app = new CliApp();
app.run(process.argv).catch((error) => {
	console.error("Fatal Error:", error);
	process.exit(1);
});
