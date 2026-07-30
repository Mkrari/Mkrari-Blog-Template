<script lang="ts">
	import { onMount } from "svelte";
	import Icon from "@iconify/svelte";

	export let tags: string[] = [];
	export let sortedPosts: Post[] = [];

	interface Post {
		id: string;
		url?: string;
		cover?: string;
		data: {
			title: string;
			tags: string[];
			published: Date;
			updated?: Date;
			description?: string;
			alias?: string;
			permalink?: string;
		};
	}

	interface Group {
		year: number;
		posts: Post[];
	}

	let query = "";
	let selectedTags: string[] = [];
	let filteredPosts: Post[] = [];
	let groups: Group[] = [];
	let searchInput: HTMLInputElement;

	const tagCounts = tags.map((tag) => ({
		name: tag,
		count: sortedPosts.filter((post) => post.data.tags?.includes(tag)).length,
	}));

	function toDate(value: Date | string) {
		return value instanceof Date ? value : new Date(value);
	}

	function formatDate(date: Date | string) {
		return new Intl.DateTimeFormat("zh-CN", {
			month: "2-digit",
			day: "2-digit",
		}).format(toDate(date));
	}

	function formatFullDate(date: Date | string) {
		return new Intl.DateTimeFormat("zh-CN", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}).format(toDate(date));
	}

	function toggleTag(tag: string) {
		selectedTags = selectedTags.includes(tag)
			? selectedTags.filter((item) => item !== tag)
			: [...selectedTags, tag];
		updateUrl();
	}

	function clearFilters() {
		query = "";
		selectedTags = [];
		updateUrl();
		searchInput?.focus();
	}

	function clearQuery() {
		query = "";
		updateUrl();
		searchInput?.focus();
	}

	function updateUrl() {
		const params = new URLSearchParams();
		selectedTags.forEach((tag) => params.append("tag", tag));
		if (query.trim()) params.set("q", query.trim());
		const nextUrl = `${window.location.pathname}${params.size ? `?${params}` : ""}`;
		window.history.replaceState({}, "", nextUrl);
	}

	function groupPosts(posts: Post[]): Group[] {
		const grouped = new Map<number, Post[]>();
		for (const post of posts) {
			const year = toDate(post.data.published).getFullYear();
			grouped.set(year, [...(grouped.get(year) ?? []), post]);
		}
		return [...grouped]
			.sort(([a], [b]) => b - a)
			.map(([year, yearPosts]) => ({ year, posts: yearPosts }));
	}

	$: {
		const normalizedQuery = query.trim().toLocaleLowerCase();
		filteredPosts = sortedPosts
			.filter((post) => {
				const matchesTags =
					selectedTags.length === 0 ||
					selectedTags.some((tag) => post.data.tags?.includes(tag));
				const searchable = [
					post.data.title,
					post.data.description,
					post.data.alias,
					...(post.data.tags ?? []),
				]
					.filter(Boolean)
					.join(" ")
					.toLocaleLowerCase();
				return matchesTags && (!normalizedQuery || searchable.includes(normalizedQuery));
			})
			.slice()
			.sort(
				(a, b) =>
					toDate(b.data.published).getTime() -
					toDate(a.data.published).getTime(),
			);
		groups = groupPosts(filteredPosts);
	}

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		selectedTags = params.getAll("tag").filter((tag) => tags.includes(tag));
		query = params.get("q") ?? "";
	});
</script>

<div class="archive-page">
	<header class="archive-hero onload-animation">
		<div class="archive-orbit" aria-hidden="true">
			<span></span>
		</div>
		<div class="archive-kicker">WRITING JOURNEY</div>
		<h1>归档与探索</h1>
		<p>沿着时间向下，重访每一次记录与思考。</p>
		<div class="archive-overview" aria-label="归档概览">
			<span><strong>{sortedPosts.length}</strong> 篇文章</span>
			<span><strong>{tags.length}</strong> 个主题</span>
			<span><strong>{groups.length}</strong> 年记录</span>
		</div>
	</header>

	<section class="archive-toolbar onload-animation" aria-label="搜索和筛选文章">
		<label class="archive-search">
			<Icon icon="material-symbols:search-rounded" />
			<input
				bind:this={searchInput}
				bind:value={query}
				on:input={updateUrl}
				type="search"
				placeholder="搜索标题、摘要或标签…"
				aria-label="搜索归档文章"
			/>
			{#if query}
				<button type="button" on:click={clearQuery} aria-label="清空搜索">
					<Icon icon="material-symbols:close-rounded" />
				</button>
			{/if}
		</label>

		<div class="archive-filter-row">
			<button
				type="button"
				class:active={selectedTags.length === 0}
				on:click={() => {
					selectedTags = [];
					updateUrl();
				}}
			>
				全部文章
				<span>{sortedPosts.length}</span>
			</button>
			{#each tagCounts as tag}
				<button
					type="button"
					class:active={selectedTags.includes(tag.name)}
					on:click={() => toggleTag(tag.name)}
				>
					{tag.name}
					<span>{tag.count}</span>
				</button>
			{/each}
		</div>

		<div class="archive-result-line">
			<span>
				<Icon icon="material-symbols:filter-list-rounded" />
				找到 <strong>{filteredPosts.length}</strong> 篇文章
			</span>
			{#if query || selectedTags.length}
				<button type="button" on:click={clearFilters}>清除筛选</button>
			{/if}
		</div>
	</section>

	{#if groups.length}
		<div class="archive-timeline">
			{#each groups as group}
				<section class="timeline-year" aria-labelledby={`year-${group.year}`}>
					<div class="year-marker" id={`year-${group.year}`}>
						<strong>{group.year}</strong>
						<span>{group.posts.length} POSTS</span>
					</div>

					<div class="year-posts">
						{#each group.posts as post, index}
							<article class:timeline-left={index % 2 === 0} class="timeline-entry">
								<div class="timeline-dot" aria-hidden="true">
									<span></span>
								</div>
								<a
									class="timeline-card"
									href={post.url || `/posts/${post.id}/`}
									aria-label={post.data.title}
								>
									{#if post.cover}
										<div class="timeline-cover">
											<img src={post.cover} alt="" loading="lazy" />
											<span>{formatDate(post.data.published)}</span>
										</div>
									{:else}
										<div class="timeline-cover timeline-cover-fallback">
											<Icon icon="material-symbols:auto-stories-outline-rounded" />
											<span>{formatDate(post.data.published)}</span>
										</div>
									{/if}
									<div class="timeline-content">
										<div class="timeline-date">
											<Icon icon="material-symbols:schedule-rounded" />
											{formatFullDate(post.data.published)}
										</div>
										<h2>{post.data.title}</h2>
										{#if post.data.description}
											<p>{post.data.description}</p>
										{/if}
										<div class="timeline-footer">
											<div class="timeline-tags">
												{#each post.data.tags?.slice(0, 3) ?? [] as tag}
													<span>#{tag}</span>
												{/each}
											</div>
											<Icon class="timeline-arrow" icon="material-symbols:arrow-forward-rounded" />
										</div>
									</div>
								</a>
							</article>
						{/each}
					</div>
				</section>
			{/each}
			<div class="timeline-ending">
				<Icon icon="material-symbols:favorite-rounded" />
				<span>故事还在继续</span>
			</div>
		</div>
	{:else}
		<div class="archive-empty">
			<Icon icon="material-symbols:search-off-rounded" />
			<h2>没有找到匹配的文章</h2>
			<p>换个关键词或清除筛选条件试试看。</p>
			<button type="button" on:click={clearFilters}>查看全部文章</button>
		</div>
	{/if}
</div>

<svelte:window
	on:keydown={(event) => {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
			event.preventDefault();
			searchInput?.focus();
		}
	}}
/>

<style>
	.archive-page {
		--glass: color-mix(in oklch, var(--card-bg) 86%, transparent);
		--line: color-mix(in oklch, var(--primary) 48%, transparent);
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 1120px;
		margin: 0 auto;
		padding-bottom: 3rem;
	}

	.archive-hero {
		position: relative;
		padding: clamp(2rem, 5vw, 4rem) 1.5rem 2.25rem;
		overflow: hidden;
		text-align: center;
		border: 1px solid color-mix(in oklch, var(--primary) 14%, transparent);
		border-radius: calc(var(--radius-large) + 0.4rem);
		background:
			radial-gradient(circle at 50% 5%, color-mix(in oklch, var(--primary) 18%, transparent), transparent 42%),
			var(--glass);
		box-shadow: 0 22px 55px rgba(54, 42, 96, 0.08);
		backdrop-filter: blur(18px);
	}

	.archive-kicker {
		color: var(--primary);
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.2em;
	}

	.archive-hero h1 {
		margin: 0.35rem 0 0;
		color: var(--deep-text);
		font-size: clamp(2.35rem, 5vw, 4.3rem);
		font-weight: 900;
		letter-spacing: -0.055em;
		line-height: 1.05;
	}

	.archive-hero > p {
		margin: 0.85rem 0 0;
		color: color-mix(in oklch, var(--deep-text) 55%, transparent);
	}

	.archive-overview {
		display: flex;
		justify-content: center;
		gap: 0.75rem;
		margin-top: 1.4rem;
	}

	.archive-overview span {
		padding: 0.5rem 0.85rem;
		border: 1px solid color-mix(in oklch, var(--primary) 13%, transparent);
		border-radius: 999px;
		background: color-mix(in oklch, var(--card-bg) 65%, transparent);
		color: color-mix(in oklch, var(--deep-text) 64%, transparent);
		font-size: 0.76rem;
	}

	.archive-overview strong {
		color: var(--primary);
	}

	.archive-orbit {
		position: absolute;
		top: -7rem;
		left: 50%;
		width: 22rem;
		height: 22rem;
		transform: translateX(-50%);
		border: 1px solid color-mix(in oklch, var(--primary) 12%, transparent);
		border-radius: 50%;
		pointer-events: none;
	}

	.archive-orbit span {
		position: absolute;
		right: 3rem;
		bottom: 2.4rem;
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 50%;
		background: var(--primary);
		box-shadow: 0 0 18px var(--primary);
	}

	.archive-toolbar {
		position: relative;
		z-index: 2;
		padding: 1rem;
		border: 1px solid color-mix(in oklch, var(--primary) 14%, transparent);
		border-radius: calc(var(--radius-large) + 0.2rem);
		background: var(--glass);
		box-shadow: 0 18px 45px rgba(54, 42, 96, 0.07);
		backdrop-filter: blur(18px);
	}

	.archive-search {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		height: 3.4rem;
		padding: 0 0.9rem 0 1rem;
		border: 1px solid color-mix(in oklch, var(--primary) 16%, transparent);
		border-radius: 1rem;
		background: color-mix(in oklch, var(--card-bg) 72%, transparent);
		transition: border-color 160ms ease, box-shadow 160ms ease;
	}

	.archive-search:focus-within {
		border-color: color-mix(in oklch, var(--primary) 60%, transparent);
		box-shadow: 0 0 0 4px color-mix(in oklch, var(--primary) 10%, transparent);
	}

	.archive-search > svg {
		flex: none;
		color: var(--primary);
		font-size: 1.45rem;
	}

	.archive-search input {
		min-width: 0;
		flex: 1;
		appearance: textfield;
		border: 0;
		outline: 0;
		background: transparent;
		color: var(--deep-text);
		font-size: 0.92rem;
	}

	.archive-search input::-webkit-search-cancel-button {
		display: none;
		-webkit-appearance: none;
	}

	.archive-search input::placeholder {
		color: color-mix(in oklch, var(--deep-text) 38%, transparent);
	}

	.archive-search button {
		display: grid;
		width: 1.8rem;
		height: 1.8rem;
		place-items: center;
		border-radius: 0.55rem;
		color: color-mix(in oklch, var(--deep-text) 48%, transparent);
	}

	.archive-filter-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding-top: 0.85rem;
	}

	.archive-filter-row button {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.48rem 0.72rem;
		border: 1px solid color-mix(in oklch, var(--deep-text) 8%, transparent);
		border-radius: 0.7rem;
		background: color-mix(in oklch, var(--card-bg) 58%, transparent);
		color: color-mix(in oklch, var(--deep-text) 64%, transparent);
		font-size: 0.76rem;
		font-weight: 700;
		transition: transform 150ms ease, color 150ms ease, background 150ms ease;
	}

	.archive-filter-row button:hover {
		transform: translateY(-2px);
		color: var(--primary);
	}

	.archive-filter-row button.active {
		border-color: var(--primary);
		background: var(--primary);
		color: white;
		box-shadow: 0 7px 18px color-mix(in oklch, var(--primary) 28%, transparent);
	}

	.archive-filter-row button span {
		opacity: 0.65;
		font-size: 0.66rem;
	}

	.archive-result-line {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 0.85rem;
		padding: 0.75rem 0.2rem 0;
		border-top: 1px dashed color-mix(in oklch, var(--deep-text) 12%, transparent);
		color: color-mix(in oklch, var(--deep-text) 50%, transparent);
		font-size: 0.75rem;
	}

	.archive-result-line span {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.archive-result-line svg {
		color: var(--primary);
		font-size: 1.05rem;
	}

	.archive-result-line strong,
	.archive-result-line button {
		color: var(--primary);
		font-weight: 800;
	}

	.archive-timeline {
		position: relative;
		padding-top: 1.5rem;
	}

	.timeline-year {
		position: relative;
		padding-bottom: 2.5rem;
	}

	.year-marker {
		position: relative;
		z-index: 2;
		display: flex;
		width: max-content;
		flex-direction: column;
		align-items: center;
		margin: 0 auto 1.25rem;
		padding: 0.55rem 1.1rem;
		border: 1px solid color-mix(in oklch, var(--primary) 24%, transparent);
		border-radius: 999px;
		background: var(--card-bg);
		box-shadow: 0 8px 24px rgba(54, 42, 96, 0.08);
	}

	.year-marker strong {
		color: var(--deep-text);
		font-size: 1.2rem;
		line-height: 1.1;
	}

	.year-marker span {
		margin-top: 0.1rem;
		color: var(--primary);
		font-size: 0.55rem;
		font-weight: 800;
		letter-spacing: 0.12em;
	}

	.year-posts {
		position: relative;
	}

	.year-posts::before {
		content: "";
		position: absolute;
		top: -1.25rem;
		bottom: -3rem;
		left: 50%;
		width: 2px;
		transform: translateX(-50%);
		background: linear-gradient(var(--line), color-mix(in oklch, var(--primary) 18%, transparent));
	}

	.timeline-entry {
		position: relative;
		display: flex;
		min-height: 16rem;
		align-items: center;
		justify-content: flex-end;
		padding-left: calc(50% + 2.4rem);
	}

	.timeline-entry.timeline-left {
		justify-content: flex-start;
		padding-right: calc(50% + 2.4rem);
		padding-left: 0;
	}

	.timeline-dot {
		position: absolute;
		z-index: 2;
		top: 50%;
		left: 50%;
		display: grid;
		width: 1.05rem;
		height: 1.05rem;
		place-items: center;
		transform: translate(-50%, -50%);
		border: 3px solid var(--card-bg);
		border-radius: 50%;
		background: var(--primary);
		box-shadow:
			0 0 0 2px color-mix(in oklch, var(--primary) 65%, transparent),
			0 0 18px color-mix(in oklch, var(--primary) 38%, transparent);
	}

	.timeline-dot span {
		width: 0.2rem;
		height: 0.2rem;
		border-radius: 50%;
		background: white;
	}

	.timeline-card {
		width: 100%;
		overflow: hidden;
		border: 1px solid color-mix(in oklch, var(--primary) 14%, transparent);
		border-radius: calc(var(--radius-large) + 0.2rem);
		background: var(--glass);
		box-shadow: 0 16px 42px rgba(54, 42, 96, 0.08);
		backdrop-filter: blur(16px);
		transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
	}

	.timeline-card:hover {
		transform: translateY(-6px);
		border-color: color-mix(in oklch, var(--primary) 48%, transparent);
		box-shadow: 0 23px 55px rgba(54, 42, 96, 0.14);
	}

	.timeline-cover {
		position: relative;
		height: 10.75rem;
		overflow: hidden;
		background:
			linear-gradient(135deg, color-mix(in oklch, var(--primary) 22%, transparent), transparent),
			color-mix(in oklch, var(--card-bg) 92%, var(--primary) 8%);
	}

	.timeline-cover::after {
		content: "";
		position: absolute;
		inset: 50% 0 0;
		background: linear-gradient(transparent, rgba(18, 12, 34, 0.45));
		pointer-events: none;
	}

	.timeline-cover img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 550ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.timeline-card:hover .timeline-cover img {
		transform: scale(1.06);
	}

	.timeline-cover > span {
		position: absolute;
		z-index: 2;
		right: 0.75rem;
		bottom: 0.65rem;
		padding: 0.25rem 0.48rem;
		border: 1px solid rgba(255, 255, 255, 0.24);
		border-radius: 0.45rem;
		background: rgba(18, 12, 34, 0.35);
		color: white;
		font-size: 0.64rem;
		font-weight: 800;
		backdrop-filter: blur(8px);
	}

	.timeline-cover-fallback {
		display: grid;
		place-items: center;
	}

	.timeline-cover-fallback > svg {
		color: color-mix(in oklch, var(--primary) 55%, transparent);
		font-size: 4rem;
	}

	.timeline-content {
		padding: 1rem 1.1rem 1.05rem;
	}

	.timeline-date {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		color: var(--primary);
		font-size: 0.66rem;
		font-weight: 800;
		letter-spacing: 0.04em;
	}

	.timeline-date svg {
		font-size: 0.9rem;
	}

	.timeline-content h2 {
		display: -webkit-box;
		margin: 0.45rem 0 0;
		overflow: hidden;
		color: var(--deep-text);
		font-size: clamp(1.05rem, 1.8vw, 1.35rem);
		font-weight: 800;
		letter-spacing: -0.025em;
		line-height: 1.35;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
	}

	.timeline-content p {
		display: -webkit-box;
		margin: 0.55rem 0 0;
		overflow: hidden;
		color: color-mix(in oklch, var(--deep-text) 52%, transparent);
		font-size: 0.76rem;
		line-height: 1.55;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
	}

	.timeline-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		margin-top: 0.9rem;
	}

	.timeline-tags {
		display: flex;
		min-width: 0;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.timeline-tags span {
		padding: 0.25rem 0.45rem;
		border-radius: 0.4rem;
		background: color-mix(in oklch, var(--primary) 10%, transparent);
		color: var(--primary);
		font-size: 0.62rem;
		font-weight: 700;
	}

	.timeline-arrow {
		flex: none;
		color: var(--primary);
		font-size: 1.25rem;
		transition: transform 180ms ease;
	}

	.timeline-card:hover .timeline-arrow {
		transform: translateX(4px);
	}

	.timeline-ending {
		position: relative;
		z-index: 2;
		display: flex;
		width: max-content;
		align-items: center;
		gap: 0.45rem;
		margin: 0 auto;
		padding: 0.65rem 0.9rem;
		border: 1px solid color-mix(in oklch, var(--primary) 18%, transparent);
		border-radius: 999px;
		background: var(--card-bg);
		color: color-mix(in oklch, var(--deep-text) 55%, transparent);
		font-size: 0.72rem;
		font-weight: 700;
	}

	.timeline-ending svg {
		color: var(--primary);
	}

	.archive-empty {
		padding: 4rem 1.5rem;
		border: 1px dashed color-mix(in oklch, var(--primary) 28%, transparent);
		border-radius: calc(var(--radius-large) + 0.2rem);
		background: var(--glass);
		text-align: center;
	}

	.archive-empty > svg {
		color: var(--primary);
		font-size: 3.5rem;
	}

	.archive-empty h2 {
		margin: 0.6rem 0 0;
		color: var(--deep-text);
		font-size: 1.4rem;
	}

	.archive-empty p {
		margin: 0.35rem 0 1rem;
		color: color-mix(in oklch, var(--deep-text) 50%, transparent);
		font-size: 0.85rem;
	}

	.archive-empty button {
		padding: 0.65rem 1rem;
		border-radius: 0.7rem;
		background: var(--primary);
		color: white;
		font-size: 0.78rem;
		font-weight: 800;
	}

	@media (max-width: 767px) {
		.archive-page {
			gap: 0.75rem;
		}

		.archive-hero {
			padding: 2.2rem 1rem 1.5rem;
		}

		.archive-overview {
			gap: 0.35rem;
		}

		.archive-overview span {
			padding: 0.4rem 0.58rem;
			font-size: 0.65rem;
		}

		.archive-toolbar {
			padding: 0.75rem;
		}

		.archive-filter-row {
			flex-wrap: nowrap;
			margin-inline: -0.75rem;
			padding: 0.75rem 0.75rem 0.15rem;
			overflow-x: auto;
			scrollbar-width: none;
		}

		.archive-filter-row::-webkit-scrollbar {
			display: none;
		}

		.archive-filter-row button {
			flex: none;
		}

		.year-marker {
			margin-left: 0;
		}

		.year-posts::before {
			left: 0.55rem;
		}

		.timeline-entry,
		.timeline-entry.timeline-left {
			min-height: 0;
			justify-content: flex-start;
			padding: 0 0 1rem 2rem;
		}

		.timeline-dot {
			top: 5.3rem;
			left: 0.55rem;
		}

		.timeline-cover {
			height: 9.5rem;
		}

		.timeline-ending {
			margin-left: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.timeline-card,
		.timeline-cover img,
		.timeline-arrow,
		.archive-filter-row button {
			transition: none;
		}
	}
</style>
