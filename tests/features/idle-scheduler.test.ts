import { describe, expect, test } from "bun:test";
import { scheduleWhenIdle } from "../../src/features/map/idle-scheduler";

describe("scheduleWhenIdle", () => {
	test("defers work until the browser idle callback runs", () => {
		const originalWindow = globalThis.window;
		let idleTask: (() => void) | undefined;
		let ran = false;
		(globalThis as { window?: Window }).window = {
			requestIdleCallback: (callback: IdleRequestCallback) => {
				idleTask = () =>
					callback({ didTimeout: false, timeRemaining: () => 50 });
				return 1;
			},
			cancelIdleCallback: () => {},
		} as unknown as Window;

		const cancel = scheduleWhenIdle(() => {
			ran = true;
		});

		expect(ran).toBe(false);
		expect(idleTask).toBeDefined();
		idleTask?.();
		expect(ran).toBe(true);
		cancel();
		(globalThis as { window?: Window }).window = originalWindow;
	});
});
