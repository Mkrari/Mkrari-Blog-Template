const VISIBLE_COMMENTS = 5;
const GROUP_SELECTOR = ".tk-comments-container, .tk-replies";

let nextGroupId = 0;

interface CommentGroup {
	expanded: boolean;
	button: HTMLButtonElement;
	generatedId: boolean;
}

/** Fold complete comment cards, including independently counted reply lists. */
export function setupCommentFolding(root: HTMLElement): () => void {
	const groups = new Map<HTMLElement, CommentGroup>();
	const loadingPages = new WeakSet<HTMLElement>();
	let frame = 0;
	let disposed = false;
	let revealedHash = "";

	const sync = () => {
		cancelAnimationFrame(frame);
		frame = 0;
		if (disposed) return;
		let hashTarget: HTMLElement | null = null;
		const hash = window.location.hash;
		if (hash && hash !== revealedHash) {
			try {
				const target = document.getElementById(decodeURIComponent(hash.slice(1)));
				if (target && root.contains(target) && target.closest(".tk-comment")) hashTarget = target;
			} catch {
				// A malformed URL fragment must not prevent comments from rendering.
			}
		}

		for (const [list, group] of groups) {
			if (!root.contains(list)) {
				group.button.remove();
				groups.delete(list);
			}
		}

		for (const list of root.querySelectorAll<HTMLElement>(GROUP_SELECTOR)) {
			const comments = Array.from(list.children).filter(
				(child): child is HTMLElement =>
					child instanceof HTMLElement && child.classList.contains("tk-comment"),
			);
			let group = groups.get(list);
			if (comments.length <= VISIBLE_COMMENTS) {
				for (const comment of comments) comment.removeAttribute("data-comment-folded");
				if (group) {
					group.button.remove();
					group.expanded = false;
				}
				continue;
			}

			if (!group) {
				const button = document.createElement("button");
				button.type = "button";
				button.className = "comment-fold-toggle";
				const generatedId = !list.id;
				if (generatedId) list.id = `comment-group-${++nextGroupId}`;
				button.setAttribute("aria-controls", list.id);
				group = { expanded: false, button, generatedId };
				groups.set(list, group);
			}
			if (loadingPages.has(list)) {
				group.expanded = true;
				loadingPages.delete(list);
			}
			if (hashTarget && comments.findIndex((comment) => comment.contains(hashTarget)) >= VISIBLE_COMMENTS) {
				group.expanded = true;
			}

			const state = group;
			comments.forEach((comment, index) => {
				comment.toggleAttribute("data-comment-folded", !state.expanded && index >= VISIBLE_COMMENTS);
			});
			const kind = list.classList.contains("tk-replies") ? "回复" : "评论";
			const label = group.expanded
				? `收起${kind}（保留前 ${VISIBLE_COMMENTS} 条）`
				: `展开其余 ${comments.length - VISIBLE_COMMENTS} 条${kind}`;
			if (group.button.textContent !== label) group.button.textContent = label;
			group.button.setAttribute("aria-expanded", String(group.expanded));

			// Keep the top-level pagination control after our toggle, and keep reply
			// toggles outside the list that they control. Never wrap Vue's nodes.
			const anchor = list.classList.contains("tk-replies") ? list : comments[comments.length - 1];
			if (anchor.nextElementSibling !== group.button) anchor.after(group.button);
		}
		if (hashTarget) revealedHash = hash;
	};

	const scheduleSync = () => {
		if (!frame && !disposed) frame = requestAnimationFrame(sync);
	};

	const onHashChange = () => {
		revealedHash = "";
		scheduleSync();
	};

	const onClick = (event: MouseEvent) => {
		if (!(event.target instanceof Element)) return;
		const toggle = event.target.closest<HTMLButtonElement>(".comment-fold-toggle");
		if (toggle) {
			for (const group of groups.values()) {
				if (group.button !== toggle) continue;
				group.expanded = !group.expanded;
				sync();
				if (!group.expanded) toggle.scrollIntoView({ block: "nearest" });
				break;
			}
		} else {
			// Loading the next server page should reveal it immediately, rather
			// than asking visitors to expand the newly loaded cards a second time.
			const pagination = event.target.closest(".tk-expand-wrap");
			if (pagination?.parentElement?.classList.contains("tk-comments-container")) {
				loadingPages.add(pagination.parentElement);
				const group = groups.get(pagination.parentElement);
				if (group) group.expanded = true;
				scheduleSync();
			}
		}
	};

	const observer = new MutationObserver(scheduleSync);
	observer.observe(root, { childList: true, subtree: true });
	root.addEventListener("click", onClick, true);
	window.addEventListener("hashchange", onHashChange);
	sync();

	return () => {
		disposed = true;
		observer.disconnect();
		cancelAnimationFrame(frame);
		root.removeEventListener("click", onClick, true);
		window.removeEventListener("hashchange", onHashChange);
		for (const [list, group] of groups) {
			group.button.remove();
			if (group.generatedId) list.removeAttribute("id");
		}
		for (const comment of root.querySelectorAll("[data-comment-folded]")) {
			comment.removeAttribute("data-comment-folded");
		}
		groups.clear();
	};
}
