import type { CollectionEntry } from "astro:content";
import { directoryCovers } from "@/data/directory-covers";
import { url } from "./url-utils";

export type TagDirectory = {
	name: string;
	slug: string;
	count: number;
	latestPost: CollectionEntry<"posts">;
	latestDate: Date;
	firstPost: CollectionEntry<"posts">;
	firstDate: Date;
	url: string;
	cover?: string;
};

export function getTagSlug(tag: string): string {
	return tag.trim();
}

export function getTagDirectoryUrl(tag: string): string {
	return url(`/categories/${encodeURIComponent(tag.trim())}/`);
}

export function getPostDisplayDate(post: CollectionEntry<"posts">): Date {
	return post.data.updated ?? post.data.published;
}

export function getTagDirectories(
	posts: CollectionEntry<"posts">[],
): TagDirectory[] {
	const grouped = new Map<string, CollectionEntry<"posts">[]>();

	for (const post of posts) {
		for (const rawTag of post.data.tags ?? []) {
			const tag = rawTag.trim();
			if (!tag) continue;

			const current = grouped.get(tag) ?? [];
			current.push(post);
			grouped.set(tag, current);
		}
	}

	return [...grouped.entries()]
		.map(([name, tagPosts]) => {
			const latestPost = tagPosts.reduce((latest, post) => {
				return getPostDisplayDate(post) > getPostDisplayDate(latest)
					? post
					: latest;
			}, tagPosts[0]);
			const firstPost = tagPosts.reduce((first, post) => {
				return post.data.published < first.data.published ? post : first;
			}, tagPosts[0]);

			return {
				name,
				slug: getTagSlug(name),
				count: tagPosts.length,
				latestPost,
				latestDate: getPostDisplayDate(latestPost),
				firstPost,
				firstDate: firstPost.data.published,
				url: getTagDirectoryUrl(name),
				cover: directoryCovers[name]?.cover,
			};
		})
		.sort((a, b) => {
			if (b.latestDate.getTime() !== a.latestDate.getTime()) {
				return b.latestDate.getTime() - a.latestDate.getTime();
			}
			return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
		});
}

export function postHasTag(
	post: CollectionEntry<"posts">,
	tagName: string,
): boolean {
	return (post.data.tags ?? []).some((tag) => tag.trim() === tagName);
}
