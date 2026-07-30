type TwikooRoot = HTMLElement & {
	dataset: DOMStringMap & {
		envId?: string;
		lang?: string;
		path?: string;
		twikooState?: string;
	};
};

declare global {
	interface Window {
		twikoo?: {
			init: (options: Record<string, unknown>) => Promise<unknown> | unknown;
		};
		__mkrariTwikooPromise?: Promise<void>;
		__mkrariScrollProtectionPromise?: Promise<void>;
		__mkrariTwikooObserver?: IntersectionObserver;
		__mkrariMountTwikoo?: () => void;
	}
}

const loadScriptOnce = (src: string, key: string): Promise<void> => {
	const promiseKey = key === "twikoo"
		? "__mkrariTwikooPromise"
		: "__mkrariScrollProtectionPromise";
	const existingPromise = window[promiseKey];
	if (existingPromise) return existingPromise;

	const promise = new Promise<void>((resolve, reject) => {
		const existing = document.querySelector<HTMLScriptElement>(
			`script[data-mkrari-script="${key}"]`,
		);
		if (existing) {
			if (key === "twikoo" && window.twikoo) resolve();
			else if (existing.dataset.loaded === "true") resolve();
			else {
				existing.addEventListener("load", () => resolve(), { once: true });
				existing.addEventListener("error", reject, { once: true });
			}
			return;
		}

		const script = document.createElement("script");
		script.src = src;
		script.defer = true;
		script.dataset.mkrariScript = key;
		script.addEventListener("load", () => {
			script.dataset.loaded = "true";
			resolve();
		}, { once: true });
		script.addEventListener("error", reject, { once: true });
		document.head.appendChild(script);
	});

	window[promiseKey] = promise;
	return promise;
};

const initialiseTwikoo = async (root: TwikooRoot) => {
	if (!document.body.contains(root) || root.dataset.twikooState === "loading" || root.dataset.twikooState === "ready") return;
	root.dataset.twikooState = "loading";

	try {
		await Promise.all([
			loadScriptOnce("/scroll-protection.js", "scroll-protection"),
			loadScriptOnce("/assets/js/twikoo.all.min.js", "twikoo"),
		]);
		if (!document.body.contains(root) || !window.twikoo) return;

		root.replaceChildren();
		await window.twikoo.init({
			el: root,
			envId: root.dataset.envId,
			lang: root.dataset.lang,
			path: root.dataset.path || window.location.pathname,
		});
		root.dataset.twikooState = "ready";
	} catch (error) {
		root.dataset.twikooState = "error";
		console.error("[Twikoo] Failed to load comments:", error);
	}
};

const mountTwikoo = () => {
	window.__mkrariTwikooObserver?.disconnect();
	const root = document.querySelector<TwikooRoot>("[data-twikoo-root]");
	if (!root || root.dataset.twikooState === "ready") return;

	if (!("IntersectionObserver" in window)) {
		void initialiseTwikoo(root);
		return;
	}

	const observer = new IntersectionObserver((entries) => {
		if (entries.some((entry) => entry.isIntersecting)) {
			observer.disconnect();
			void initialiseTwikoo(root);
		}
	}, { rootMargin: "600px 0px" });
	window.__mkrariTwikooObserver = observer;
	observer.observe(root);
};

window.__mkrariMountTwikoo = mountTwikoo;

document.addEventListener("DOMContentLoaded", mountTwikoo);
document.addEventListener("swup:page:view", mountTwikoo);
document.addEventListener("mizuki:page:loaded", mountTwikoo);

if (document.readyState !== "loading") mountTwikoo();

export {};
