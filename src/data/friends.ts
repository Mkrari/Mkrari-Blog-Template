export interface FriendItem {
	id: number;
	title: string;
	imgurl: string;
	desc: string;
	siteurl: string;
	tags: string[];
}

// Public examples only. Replace or remove them when customizing your site.
export const friendsData: FriendItem[] = [
	{
		id: 1,
		title: "Astro",
		imgurl: "https://avatars.githubusercontent.com/u/44914786?v=4",
		desc: "The web framework for content-driven websites.",
		siteurl: "https://astro.build/",
		tags: ["Framework"],
	},
	{
		id: 2,
		title: "GitHub",
		imgurl: "https://github.githubassets.com/favicons/favicon.svg",
		desc: "The home of open-source collaboration.",
		siteurl: "https://github.com/",
		tags: ["Community"],
	},
	{
		id: 3,
		title: "MDN Web Docs",
		imgurl: "https://developer.mozilla.org/favicon-48x48.cbbd161b.png",
		desc: "Documentation for web platform technologies.",
		siteurl: "https://developer.mozilla.org/",
		tags: ["Docs"],
	},
	{
		id: 4,
		title: "TypeScript",
		imgurl: "https://www.typescriptlang.org/favicon-32x32.png",
		desc: "JavaScript with syntax for types.",
		siteurl: "https://www.typescriptlang.org/",
		tags: ["Language"],
	},
	{
		id: 5,
		title: "Vercel",
		imgurl: "https://assets.vercel.com/image/upload/front/favicon/vercel/180x180.png",
		desc: "A platform for building and deploying the web.",
		siteurl: "https://vercel.com/",
		tags: ["Hosting"],
	},
];

export function getFriendsList(): FriendItem[] {
	return friendsData;
}

export function getShuffledFriendsList(): FriendItem[] {
	const shuffled = [...friendsData];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}
