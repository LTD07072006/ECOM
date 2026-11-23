export function json<T>(data: T, init?: ResponseInit) {
	return Response.json(data, init);
}

export function error(message: string, status: number) {
	return json({ error: message }, { status });
}

export function csvDownload(csv: string, filename: string) {
	const safeFilename =
		filename.replace(/[^A-Za-z0-9._-]/g, "_") || "export.csv";
	// Excel detects UTF-8 on direct open when the download includes a BOM.
	return new Response(`\uFEFF${csv}`, {
		headers: {
			"Content-Type": "text/csv; charset=utf-8",
			"Content-Disposition": `attachment; filename="${safeFilename}"`,
		},
	});
}

export async function readBoundedJson(request: Request, maxBytes: number) {
	const contentType = request.headers
		.get("content-type")
		?.split(";")[0]
		.trim()
		.toLowerCase();
	if (contentType !== "application/json") {
		return {
			ok: false as const,
			status: 415,
			message: "A JSON request is required.",
		};
	}

	const declaredSize = request.headers.get("content-length");
	if (declaredSize !== null && !/^\d+$/.test(declaredSize)) {
		return {
			ok: false as const,
			status: 400,
			message: "Invalid request length.",
		};
	}
	const tooLarge = {
		ok: false as const,
		status: 413,
		message: "The request body is too large.",
	};
	if (declaredSize !== null && Number(declaredSize) > maxBytes) return tooLarge;

	const reader = request.body?.getReader();
	const invalid = {
		ok: false as const,
		status: 400,
		message: "Invalid JSON request.",
	};
	if (!reader) return invalid;
	const decoder = new TextDecoder("utf-8", { fatal: true });
	let size = 0;
	let text = "";
	try {
		for (;;) {
			const { value, done } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > maxBytes) {
				void reader.cancel().catch(() => {});
				return tooLarge;
			}
			text += decoder.decode(value, { stream: true });
		}
		if (declaredSize !== null && Number(declaredSize) !== size) return invalid;
		return {
			ok: true as const,
			value: JSON.parse(text + decoder.decode()) as unknown,
		};
	} catch {
		void reader.cancel().catch(() => {});
		return invalid;
	} finally {
		reader.releaseLock();
	}
}
