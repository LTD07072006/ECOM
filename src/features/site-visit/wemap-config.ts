// Read at request time so the Docker image can be built without a token.
function configuredToken(name: string) {
	return process.env[name]?.trim() || undefined;
}

export function wemapBrowserToken() {
	return configuredToken("NEXT_PUBLIC_WEMAP_TOKEN");
}

export function wemapRoutingToken() {
	return configuredToken("WEMAP_SERVER_TOKEN") ?? wemapBrowserToken();
}

export function wemapMapToken() {
	return configuredToken("WEMAP_MAP_TOKEN") ?? wemapBrowserToken();
}
