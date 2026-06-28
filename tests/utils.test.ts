import { describe, expect, it } from "vitest";
import { chunkArray, formatExecutionTime } from "../src/utils/utils";

describe("Utils Suite", () => {
	describe("chunkArray", () => {
		it("should chunk an array correctly", () => {
			const arr = [1, 2, 3, 4, 5];
			const result = chunkArray(arr, 2);
			expect(result).toEqual([[1, 2], [3, 4], [5]]);
		});
	});

	describe("formatExecutionTime", () => {
		it("should format time under 60 seconds correctly", () => {
			expect(formatExecutionTime(4.52)).toBe("4.52s");
			expect(formatExecutionTime(59.99)).toBe("59.99s");
		});

		it("should format time over 60 seconds into minutes and seconds", () => {
			expect(formatExecutionTime(60)).toBe("1m 0s");
			expect(formatExecutionTime(110.77)).toBe("1m 51s");
			expect(formatExecutionTime(125)).toBe("2m 5s");
		});
	});
});
