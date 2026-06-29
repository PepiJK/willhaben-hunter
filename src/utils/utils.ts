/**
 * Splits an array into smaller chunks of a specified size.
 *
 * @param array - The array to chunk.
 * @param size - The maximum size of each chunk.
 * @returns An array of chunks.
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
	const result: T[][] = [];
	for (let i = 0; i < array.length; i += size) {
		result.push(array.slice(i, i + size));
	}
	return result;
}

/**
 * Formats seconds into a human readable string (e.g., "1m 50s").
 *
 * @param seconds - The execution time in seconds.
 * @returns A formatted string.
 */
export function formatExecutionTime(seconds: number): string {
	if (seconds < 60) {
		return `${seconds.toFixed(2)}s`;
	}
	const mins = Math.floor(seconds / 60);
	const secs = Math.round(seconds % 60);
	return `${mins}m ${secs}s`;
}
