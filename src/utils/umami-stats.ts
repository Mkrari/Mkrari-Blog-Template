import { umamiConfig } from "../config";

export type UmamiStats = {
	pageviews: number;
	visitors: number;
	visits: number;
};

type UmamiShare = {
	token?: string;
	websiteId?: string;
};

const statsCache = new Map<string, Promise<UmamiStats | null>>();
let shareCache: Promise<UmamiShare | null> | undefined;

function getShareId(value: string): string {
	try {
		const pathname = new URL(value).pathname;
		return pathname.split("/").filter(Boolean).at(-1) || "";
	} catch {
		return (
			value
				.trim()
				.replace(/^\/+|\/+$/g, "")
				.split("/")
				.at(-1) || ""
		);
	}
}

function readStatValue(value: unknown): number {
	if (typeof value === "number") {
		return value;
	}

	if (
		value &&
		typeof value === "object" &&
		"value" in value &&
		typeof value.value === "number"
	) {
		return value.value;
	}

	return 0;
}

async function getShare(): Promise<UmamiShare | null> {
	if (shareCache) {
		return shareCache;
	}

	shareCache = (async () => {
		const shareId = getShareId(umamiConfig.shareId);
		if (!shareId) {
			return null;
		}

		try {
			const response = await fetch(
				`${umamiConfig.apiBaseUrl}/share/${encodeURIComponent(shareId)}`,
			);
			if (!response.ok) {
				throw new Error(`Share request failed with ${response.status}`);
			}

			const share = (await response.json()) as UmamiShare;
			return share.token && share.websiteId ? share : null;
		} catch (error) {
			console.warn("Unable to load the Umami public share:", error);
			return null;
		}
	})();

	return shareCache;
}

async function requestStats(path?: string): Promise<UmamiStats | null> {
	const share = await getShare();
	if (!share?.token || !share.websiteId) {
		return null;
	}

	const params = new URLSearchParams({
		startAt: "0",
		endAt: Date.now().toString(),
	});
	if (path) {
		params.set("path", path);
	}

	try {
		const response = await fetch(
			`${umamiConfig.apiBaseUrl}/websites/${share.websiteId}/stats?${params}`,
			{
				headers: {
					"x-umami-share-token": share.token,
					"x-umami-share-context": "1",
				},
			},
		);
		if (!response.ok) {
			throw new Error(`Stats request failed with ${response.status}`);
		}

		const stats = (await response.json()) as Record<string, unknown>;
		return {
			pageviews: readStatValue(stats.pageviews),
			visitors: readStatValue(stats.visitors),
			visits: readStatValue(stats.visits),
		};
	} catch (error) {
		console.warn(
			"Unable to load Umami stats from the public share:",
			error,
		);
		return null;
	}
}

export function getUmamiStats(path?: string): Promise<UmamiStats | null> {
	const cacheKey = path || "__site__";
	const cached = statsCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	const request = requestStats(path);
	statsCache.set(cacheKey, request);
	return request;
}
