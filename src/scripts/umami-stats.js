import { umamiConfig } from "../config";

const STATS_SELECTOR = "[data-umami-stats]";
const REFRESH_INTERVAL = 30_000;
const INGESTION_DELAY = 4_000;

let shareRequest;
let delayedRefresh;

function getShareId(value) {
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

function readStatValue(value) {
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

async function getShare() {
	if (shareRequest) {
		return shareRequest;
	}

	shareRequest = (async () => {
		const shareId = getShareId(umamiConfig.shareId);
		if (!shareId) {
			return null;
		}

		const response = await fetch(
			`${umamiConfig.apiBaseUrl}/share/${encodeURIComponent(shareId)}`,
			{ cache: "no-store" },
		);
		if (!response.ok) {
			throw new Error(`Share request failed with ${response.status}`);
		}

		const share = await response.json();
		return share.token && share.websiteId ? share : null;
	})();

	return shareRequest;
}

async function requestStats(path) {
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

	const response = await fetch(
		`${umamiConfig.apiBaseUrl}/websites/${share.websiteId}/stats?${params}`,
		{
			cache: "no-store",
			headers: {
				"x-umami-share-token": share.token,
				"x-umami-share-context": "1",
			},
		},
	);
	if (!response.ok) {
		throw new Error(`Stats request failed with ${response.status}`);
	}

	const stats = await response.json();
	return {
		pageviews: readStatValue(stats.pageviews),
		visitors: readStatValue(stats.visitors),
		visits: readStatValue(stats.visits),
	};
}

function updateTarget(target, stats) {
	const requestedStat = target.dataset.umamiStat;
	if (requestedStat && requestedStat in stats) {
		target.textContent = String(stats[requestedStat]);
		return;
	}

	const secondaryStat =
		target.dataset.secondaryStat === "visitors" ? "visitors" : "visits";
	const pageviewsLabel = target.dataset.pageviewsLabel || "浏览量";
	const secondaryLabel =
		target.dataset.secondaryLabel ||
		(secondaryStat === "visitors" ? "访客" : "访问次数");

	target.textContent = `${pageviewsLabel} ${stats.pageviews} · ${secondaryLabel} ${stats[secondaryStat]}`;
}

async function refreshStats() {
	const targets = Array.from(document.querySelectorAll(STATS_SELECTOR));
	if (targets.length === 0) {
		return;
	}

	const requests = new Map();
	for (const target of targets) {
		const path =
			target.dataset.umamiStats === "page"
				? target.dataset.umamiPath || window.location.pathname
				: "";
		if (!requests.has(path)) {
			requests.set(path, requestStats(path || undefined));
		}
	}

	try {
		const results = new Map(
			await Promise.all(
				Array.from(requests, async ([path, request]) => [
					path,
					await request,
				]),
			),
		);

		for (const target of targets) {
			if (!target.isConnected) {
				continue;
			}

			const path =
				target.dataset.umamiStats === "page"
					? target.dataset.umamiPath || window.location.pathname
					: "";
			const stats = results.get(path);
			if (stats) {
				updateTarget(target, stats);
			}
		}
	} catch (error) {
		// 保留构建时的统计快照作为网络异常时的回退值。
		console.warn("Unable to refresh Umami stats:", error);
	}
}

function handlePageView() {
	void refreshStats();
	clearTimeout(delayedRefresh);
	delayedRefresh = window.setTimeout(() => {
		void refreshStats();
	}, INGESTION_DELAY);
}

if (!window.__mizukiUmamiStatsInitialized) {
	window.__mizukiUmamiStatsInitialized = true;

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", handlePageView, {
			once: true,
		});
	} else {
		handlePageView();
	}

	document.addEventListener("swup:pageView", handlePageView);
	document.addEventListener("visibilitychange", () => {
		if (!document.hidden) {
			void refreshStats();
		}
	});

	window.setInterval(() => {
		if (!document.hidden) {
			void refreshStats();
		}
	}, REFRESH_INTERVAL);
} else {
	handlePageView();
}
