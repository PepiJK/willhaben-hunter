/**
 * Shared types for the exporter layer.
 */

/**
 * Supported output formats.
 */
export type OutputFormat = "json" | "csv";

/**
 * Options controlling how and where results are exported.
 */
export interface ExportOptions {
	format: OutputFormat;
	outputPath?: string | undefined;
}
