export function scheduleWhenIdle(task: () => void, timeout = 1200): () => void {
	if (typeof window === "undefined") return () => {};
	const idleWindow = window as Window & {
		requestIdleCallback?: Window["requestIdleCallback"];
		cancelIdleCallback?: Window["cancelIdleCallback"];
	};
	if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
		const idleId = idleWindow.requestIdleCallback(() => task(), { timeout });
		return () => idleWindow.cancelIdleCallback?.(idleId);
	}
	const timerId = window.setTimeout(task, 0);
	return () => window.clearTimeout(timerId);
}
