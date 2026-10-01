import { o as __toESM } from "../_runtime.mjs";
import { _ as createFileRoute, b as require_jsx_runtime, d as Scripts, f as HeadContent, g as lazyRouteComponent, h as Outlet, m as createRouter, q as require_react, v as createRootRoute, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { _ as summarise, a as clearManual, c as loadPhase, d as profitOf, f as saveLedger, g as suggestionStamp, h as signedMoney, i as capturePicks, l as markWinner, m as setStake, n as asSuggestion, o as feedFromSettled, p as savePhase, r as awaitingResult, s as loadLedger, t as applyFeed, u as mergeHistory, v as toStored } from "./ledger-FF_kf9l1.mjs";
import { a as Funnel, c as ChevronLeft, i as Hourglass, l as ChevronDown, n as Search, o as Clock, r as RefreshCw, s as ClipboardList, t as TriangleAlert, u as Bookmark } from "../_libs/lucide-react.mjs";
import { a as union, i as string, n as number, r as object, t as literal } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-BtTIkHC6.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";
function errorMessage(error) {
	if (error instanceof Error && error.message) return error.message;
	if (typeof error === "string" && error) return error;
	return FALLBACK_MESSAGE;
}
function AppErrorComponent({ error }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "grid size-12 place-items-center rounded-full bg-surface text-gold",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "size-6" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-4 font-display text-3xl",
				children: "Something went wrong"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 max-w-md text-sm break-words text-pretty text-muted",
				children: errorMessage(error)
			})
		]
	});
}
/**
* App-wide client provider mounted once near the root (in `src/routes/__root.tsx`):
*
*   <AuthProvider><Outlet /></AuthProvider>
*
* Better Auth's React client (`@/lib/auth/client`) needs NO context provider —
* its `useSession()` works standalone — so this is a passthrough today. It's
* kept as the single, stable mount point for any future client-side providers
* (e.g. a toast or theme provider) without churning the root shell.
*/
function AuthProvider({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
var CONNECTOR_TOKEN_READY_EVENT = "grok:connector-token-ready";
function isGrokEmbedderOrigin(origin) {
	try {
		const url = new URL(origin);
		if (url.protocol !== "https:" && url.protocol !== "http:") return false;
		const host = url.hostname.toLowerCase();
		if (host === "grok.com" || host.endsWith(".grok.com")) return true;
		if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
		return false;
	} catch {
		return false;
	}
}
function isSandboxPreviewGuestHost(hostname) {
	const host = hostname.toLowerCase();
	return host === "grok-sandbox.com" || host.endsWith(".grok-sandbox.com");
}
function isRemintPreviewPair(guestHost, parentHost) {
	const guest = guestHost.toLowerCase();
	const parent = parentHost.toLowerCase();
	const i = guest.indexOf(".preview.");
	if (i <= 0) return false;
	const label = guest.slice(0, i);
	const rest = guest.slice(i + 9);
	if (label.includes(".") || !rest.includes(".")) return false;
	return parent === rest || parent === `grok.${rest}`;
}
function resolveParentEmbedderOrigin(parentIsSelf, referrer, ancestorOrigin, guestHostname = "") {
	if (parentIsSelf) return null;
	for (const candidate of [referrer, ancestorOrigin ?? ""].filter(Boolean)) try {
		const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
		if (url.protocol !== "https:" && url.protocol !== "http:") continue;
		if (isGrokEmbedderOrigin(url.origin)) return url.origin;
		if (isSandboxPreviewGuestHost(guestHostname) || isRemintPreviewPair(guestHostname, url.hostname)) return url.origin;
	} catch {}
	return null;
}
/**
* Guest side of the grok-web ↔ sandbox preview postMessage bridge.
*
* Activates only when this page is framed by an allowlisted Grok embedder.
* Top-level runs (download/export, local `npm run dev`, deployed sites) noop.
*/
var PREVIEW_BRIDGE_CHANNEL = "grok-preview-bridge";
var EnvelopeSchema = object({
	channel: literal(PREVIEW_BRIDGE_CHANNEL),
	version: number().int().positive(),
	type: string().min(1)
});
var HelloSchema = EnvelopeSchema.extend({ type: literal("hello") });
var NavigateSchema = EnvelopeSchema.extend({
	type: literal("navigate"),
	path: string().min(1)
});
var HistorySchema = EnvelopeSchema.extend({
	type: literal("history"),
	delta: union([literal(-1), literal(1)])
});
var ConnectorTokenReadySchema = EnvelopeSchema.extend({ type: literal("connector-token-ready") });
function isSafeBridgePath(path) {
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
	try {
		return new URL(path, "https://preview.invalid").origin === "https://preview.invalid";
	} catch {
		return false;
	}
}
/**
* Origin of the Grok embedder framing this page, or null when the page runs
* top-level (download/export, local `npm run dev`, deployed sites) or under a
* non-Grok parent. Client-only; null during SSR.
*/
function resolveCurrentEmbedderOrigin() {
	if (typeof window === "undefined") return null;
	const ancestorOrigin = typeof location.ancestorOrigins !== "undefined" && location.ancestorOrigins.length > 0 ? location.ancestorOrigins[0] : null;
	return resolveParentEmbedderOrigin(window.parent === window, document.referrer, ancestorOrigin, window.location.hostname);
}
/**
* Install host↔guest messaging. Returns a dispose function.
* Noops (returns a no-op dispose) when not embedded under a Grok parent.
*/
function installPreviewHostBridge(options = {}) {
	const parentOrigin = resolveCurrentEmbedderOrigin();
	if (parentOrigin === null) return () => {};
	const ROOT_STATE_KEY = "__grokPreviewBridgeRoot";
	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);
	const isAtHistoryRoot = () => {
		const state = window.history.state;
		return Boolean(state && typeof state === "object" && state[ROOT_STATE_KEY] === true);
	};
	try {
		const current = window.history.state;
		if (!(current !== null && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, ROOT_STATE_KEY))) {
			const isRoot = window.history.length <= 1;
			originalReplaceState(current && typeof current === "object" ? {
				...current,
				[ROOT_STATE_KEY]: isRoot
			} : { [ROOT_STATE_KEY]: isRoot }, "", window.location.href);
		}
	} catch {}
	const post = (message) => {
		window.parent.postMessage(message, parentOrigin);
	};
	const reportLocation = () => {
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "location",
			path: window.location.pathname || "/",
			search: window.location.search,
			hash: window.location.hash
		});
	};
	const reportRoutes = () => {
		const paths = options.getRoutePaths?.() ?? [];
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "routes",
			paths
		});
	};
	const defaultNavigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		try {
			const url = new URL(path, window.location.origin);
			if (url.origin !== window.location.origin) return;
			const next = `${url.pathname}${url.search}${url.hash}`;
			window.history.pushState(window.history.state, "", next);
			window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
		} catch {}
	};
	const navigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		if (options.navigate) {
			options.navigate(path);
			return;
		}
		defaultNavigate(path);
	};
	const announce = () => {
		reportLocation();
		reportRoutes();
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "ready"
		});
	};
	const onHello = (data) => {
		if (!HelloSchema.safeParse(data).success) return;
		announce();
	};
	const onNavigate = (data) => {
		const parsed = NavigateSchema.safeParse(data);
		if (!parsed.success) return;
		navigate(parsed.data.path);
		queueMicrotask(reportLocation);
	};
	const onHistory = (data) => {
		const parsed = HistorySchema.safeParse(data);
		if (!parsed.success) return;
		if (parsed.data.delta === -1 && isAtHistoryRoot()) return;
		window.history.go(parsed.data.delta);
	};
	const onConnectorTokenReady = (data) => {
		if (!ConnectorTokenReadySchema.safeParse(data).success) return;
		window.dispatchEvent(new Event(CONNECTOR_TOKEN_READY_EVENT));
	};
	const hostMessageHandlers = /* @__PURE__ */ new Map([
		["hello", onHello],
		["navigate", onNavigate],
		["history", onHistory],
		["connector-token-ready", onConnectorTokenReady]
	]);
	const onMessage = (event) => {
		if (event.source !== window.parent) return;
		if (event.origin !== parentOrigin) return;
		const envelope = EnvelopeSchema.safeParse(event.data);
		if (!envelope.success || envelope.data.version !== 1) return;
		hostMessageHandlers.get(envelope.data.type)?.(event.data);
	};
	const onPopState = () => {
		reportLocation();
	};
	const onHashChange = () => {
		reportLocation();
	};
	window.history.pushState = (data, unused, url) => {
		const next = data && typeof data === "object" ? {
			...data,
			[ROOT_STATE_KEY]: false
		} : data;
		originalPushState(next, unused, url);
		reportLocation();
	};
	window.history.replaceState = (data, unused, url) => {
		const next = isAtHistoryRoot() ? {
			...data && typeof data === "object" ? data : {},
			[ROOT_STATE_KEY]: true
		} : data;
		originalReplaceState(next, unused, url);
		reportLocation();
	};
	window.addEventListener("message", onMessage);
	window.addEventListener("popstate", onPopState);
	window.addEventListener("hashchange", onHashChange);
	announce();
	return () => {
		window.removeEventListener("message", onMessage);
		window.removeEventListener("popstate", onPopState);
		window.removeEventListener("hashchange", onHashChange);
		window.history.pushState = originalPushState;
		window.history.replaceState = originalReplaceState;
	};
}
/** Collect static path patterns from a TanStack route tree (best-effort). */
function collectRoutePathsFromTree(routeTree) {
	const paths = /* @__PURE__ */ new Set();
	const walk = (node) => {
		if (!node || typeof node !== "object") return;
		const record = node;
		const full = typeof record.fullPath === "string" ? record.fullPath : typeof record.path === "string" ? record.path : null;
		if (full !== null && full !== "") paths.add(full.startsWith("/") ? full : `/${full}`);
		else if (full === "") paths.add("/");
		const children = record.children;
		if (Array.isArray(children)) for (const child of children) walk(child);
		else if (children && typeof children === "object") for (const child of Object.values(children)) walk(child);
	};
	walk(routeTree);
	return [...paths];
}
/**
* Mount once in `__root.tsx` so the Grok preview chrome can drive navigation
* (and later receive registered routes). Noops when the app is not embedded.
*/
function PreviewHostBridge() {
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		return installPreviewHostBridge({
			navigate: (path) => {
				router.history.push(path);
			},
			getRoutePaths: () => collectRoutePathsFromTree(router.routeTree)
		});
	}, [router]);
	return null;
}
var styles_default = "/assets/styles-DVRO-jDp.css";
var APP_NAME = "Elite Tips";
var Route$1 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: APP_NAME },
			{
				name: "theme-color",
				content: "#10140f"
			}
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "manifest",
				href: "/__grok/manifest.webmanifest"
			},
			{
				rel: "apple-touch-icon",
				href: "/__grok/icon-180.png"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560;9..144,640&family=Outfit:wght@400;500;600;700&display=swap"
			}
		]
	}),
	component: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		suppressHydrationWarning: true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewHostBridge, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})
		] })]
	})
});
var WINDOW_MIN = 15;
function priceOf(runner) {
	return runner.sportsbet ?? runner.bestWin;
}
function formScore(form) {
	if (!form) return null;
	const figs = [...form.toUpperCase()].filter((c) => /[0-9X]/.test(c)).slice(0, 6);
	if (!figs.length) return null;
	const weights = [
		1,
		.75,
		.55,
		.4,
		.3,
		.22
	];
	const place = (c) => {
		if (c === "1") return 1;
		if (c === "2") return .66;
		if (c === "3") return .45;
		if (c === "4") return .3;
		if (c === "5") return .18;
		if (c === "6") return .12;
		if (c === "7") return .08;
		return .02;
	};
	let num = 0;
	let den = 0;
	figs.forEach((c, i) => {
		const w = weights[i] ?? .15;
		num += place(c) * w;
		den += w;
	});
	return den ? num / den : null;
}
function barrierScore(barrier, category, distance, field) {
	if (barrier == null || barrier <= 0) return null;
	const width = Math.max(field, barrier, 8);
	const inside = 1 - (barrier - 1) / width;
	if (category === "greyhound") return inside;
	if (category === "harness") return .55 + inside * .45;
	return (distance ?? 1600) <= 1400 ? .4 + inside * .6 : .68 + inside * .32;
}
function figures(form, n) {
	if (!form) return "";
	return [...form.toUpperCase()].filter((c) => /[0-9X]/.test(c)).slice(0, n).join("");
}
function readRace(race, now) {
	const minutes = (new Date(race.startTime).getTime() - now) / 6e4;
	const inWindow = minutes >= -.25 && minutes <= WINDOW_MIN;
	const active = race.runners.filter((r) => !r.scratched);
	const priced = active.filter((r) => priceOf(r) != null && priceOf(r) > 1);
	const base = {
		raceId: race.id,
		inWindow,
		minutes,
		favourite: null,
		pick: null,
		ranking: [],
		marketOrder: [],
		reasons: [],
		concerns: [],
		model: null
	};
	if (minutes < -.5) return {
		...base,
		inWindow: false,
		decision: "no_bet",
		noBetReason: "This race has jumped."
	};
	if (!inWindow && minutes > WINDOW_MIN) return {
		...base,
		decision: "no_bet",
		noBetReason: "Outside the 15-minute window. No pick until it is actually approaching."
	};
	if (priced.length < 3) return {
		...base,
		decision: "no_bet",
		noBetReason: minutes < -.25 ? "This race has jumped." : "Not enough live prices to verify the field. No bet."
	};
	const implied = priced.map((r) => 1 / priceOf(r));
	const impliedSum = implied.reduce((a, b) => a + b, 0);
	const forms = priced.map((r) => formScore(r.form));
	const known = forms.filter((f) => f != null);
	const field = active.length;
	if (known.length / priced.length < .45) {
		const fav = [...priced].sort((a, b) => priceOf(a) - priceOf(b))[0];
		return {
			...base,
			decision: "no_bet",
			favourite: fav ? {
				number: fav.number,
				name: fav.name,
				price: priceOf(fav)
			} : null,
			marketOrder: [...priced].sort((a, b) => priceOf(a) - priceOf(b)).slice(0, 4).map((r) => r.number),
			noBetReason: "Form figures are missing on most of the field, so this can't be checked against the market. No bet."
		};
	}
	const formNeutral = known.reduce((a, b) => a + b, 0) / known.length;
	const scored = priced.map((runner, i) => {
		const formKnown = forms[i] != null;
		const form = forms[i] ?? formNeutral;
		const barrier = barrierScore(runner.barrier, race.category, race.distance, field) ?? .5;
		const fair = implied[i] / impliedSum;
		const composite = fair * .62 + form * .26 + barrier * .12;
		return {
			runner,
			price: priceOf(runner),
			fair,
			form,
			formKnown,
			barrier,
			composite
		};
	});
	scored.sort((a, b) => b.composite - a.composite);
	const market = [...scored].sort((a, b) => a.price - b.price);
	const top = scored[0];
	const second = scored[1];
	const fav = market[0];
	const margin = top.composite - second.composite;
	const ranking = scored.slice(0, 4).map((s) => s.runner.number);
	const marketOrder = market.slice(0, 4).map((s) => s.runner.number);
	const valuePool = scored.filter((s) => s.price >= 2.4 && s.price <= 14 && s.formKnown && s.form >= .42 && s.form - s.fair >= .12);
	valuePool.sort((a, b) => b.form - b.fair - (a.form - a.fair));
	const value = valuePool[0];
	const concerns = [];
	const reasons = [];
	let chosen = top;
	let tag = top.runner.number === fav.runner.number ? "agreement" : "value";
	let noBet = null;
	if (value && value.runner.number !== fav.runner.number && value.form - value.fair >= .16 && value.composite >= top.composite - .08) {
		chosen = value;
		tag = "value";
	} else if (margin < .04) noBet = "The card is split. Form and the market don't separate the top two. No bet.";
	const pickRunner = chosen.runner;
	const sbAge = pickRunner.sportsbetAge;
	if (sbAge != null && sbAge > 120) concerns.push("The Sportsbet quote on this runner is over two minutes old.");
	if (chosen.price < 1.8) concerns.push("Short price. Only a small edge even if the read is right.");
	if (pickRunner.sportsbet != null && pickRunner.bestWin != null && pickRunner.bestWin >= pickRunner.sportsbet * 1.22 && pickRunner.bestBook && pickRunner.bestBook !== "Sportsbet") concerns.push(`Sportsbet $${pickRunner.sportsbet.toFixed(2)} is the short one. Best is $${pickRunner.bestWin.toFixed(2)} ${pickRunner.bestBook}.`);
	if ((race.category === "greyhound" && (pickRunner.barrier ?? 0) >= 7 || race.category === "horse" && (pickRunner.barrier ?? 0) >= 9) && pickRunner.barrier) concerns.push(`Barrier ${pickRunner.barrier} is wide for this code.`);
	if (!noBet) {
		const figs = figures(pickRunner.form, 3);
		if (figs) reasons.push(`Recent figures ${figs.split("").join("-")}.`);
		const formRank = [...scored].filter((s) => s.formKnown).sort((a, b) => b.form - a.form).findIndex((s) => s.runner.number === pickRunner.number) + 1;
		if (formRank > 0) reasons.push(formRank === 1 ? "Best recent form in the priced field." : `Form ranks ${formRank}${formRank === 2 ? "nd" : formRank === 3 ? "rd" : "th"} in the field.`);
		if (tag === "value" && fav.runner.number !== pickRunner.number) reasons.push(`Sportsbet $${chosen.price.toFixed(2)} against favourite ${fav.runner.name} at $${fav.price.toFixed(2)}. The form is ahead of that price.`);
		else if (tag === "agreement") reasons.push(`Market favourite and the form read land on the same runner at $${chosen.price.toFixed(2)}.`);
		if (pickRunner.barrier && pickRunner.barrier > 0 && race.category !== "harness") {
			const sprint = race.category === "horse" && (race.distance ?? 1600) <= 1400;
			if (pickRunner.barrier <= 3 && (sprint || race.category === "greyhound")) reasons.push(race.category === "greyhound" ? `Box ${pickRunner.barrier} is a handy draw.` : `Barrier ${pickRunner.barrier} on ${race.distance ?? "this"}m.`);
		}
		if (pickRunner.jockey) reasons.push(`${race.category === "harness" ? "Driver" : "Jockey"} ${pickRunner.jockey}${pickRunner.trainer ? `, trainer ${pickRunner.trainer}` : ""}.`);
		else if (pickRunner.trainer) reasons.push(`Trainer ${pickRunner.trainer}.`);
	}
	return {
		raceId: race.id,
		inWindow,
		minutes,
		decision: noBet ? "no_bet" : "pick",
		noBetReason: noBet,
		favourite: {
			number: fav.runner.number,
			name: fav.runner.name,
			price: fav.price
		},
		pick: noBet ? null : {
			number: pickRunner.number,
			name: pickRunner.name,
			price: pickRunner.sportsbet ?? chosen.price,
			best: pickRunner.bestWin,
			bestBook: pickRunner.bestBook,
			tag
		},
		ranking,
		marketOrder,
		reasons: reasons.slice(0, 4),
		concerns: concerns.slice(0, 3),
		model: noBet || !second ? null : {
			form: round3(chosen.form),
			fair: round3(chosen.fair),
			composite: round3(chosen.composite),
			barrier: round3(chosen.barrier),
			margin: round3(margin),
			secondNumber: second.runner.number,
			secondName: second.runner.name
		}
	};
}
function round3(n) {
	return Math.round(n * 1e3) / 1e3;
}
function readsInWindow(races, now) {
	return races.map((race) => readRace(race, now)).filter((read) => read.inWindow).sort((a, b) => a.minutes - b.minutes);
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var loadBoard = createServerFn({ method: "POST" }).validator((input) => {
	const limitRaw = input && typeof input === "object" && "limit" in input ? input.limit : 16;
	return { limit: Math.max(8, Math.min(24, Math.round(typeof limitRaw === "number" && Number.isFinite(limitRaw) ? limitRaw : 16))) };
}).handler(createSsrRpc("e9113345a10d831bd14bb553b459dda5355c8e80e17dc79473aa17e064cc83d3"));
function compactRace(input) {
	if (!input || typeof input !== "object") return null;
	const o = input;
	if (typeof o.id !== "string" || typeof o.venue !== "string") return null;
	if (!Array.isArray(o.runners) || o.runners.length > 24) return null;
	const runners = [];
	for (const raw of o.runners) {
		if (!raw || typeof raw !== "object") continue;
		const r = raw;
		if (typeof r.number !== "number" || typeof r.name !== "string") continue;
		runners.push({
			number: r.number,
			name: r.name.slice(0, 80),
			barrier: typeof r.barrier === "number" ? r.barrier : null,
			jockey: typeof r.jockey === "string" ? r.jockey.slice(0, 80) : null,
			trainer: typeof r.trainer === "string" ? r.trainer.slice(0, 80) : null,
			form: typeof r.form === "string" ? r.form.slice(0, 24) : null,
			scratched: r.scratched === true,
			sportsbet: typeof r.sportsbet === "number" ? r.sportsbet : null,
			bestWin: typeof r.bestWin === "number" ? r.bestWin : null,
			bestBook: typeof r.bestBook === "string" ? r.bestBook.slice(0, 40) : null
		});
	}
	return {
		id: o.id.slice(0, 80),
		venue: o.venue.slice(0, 80),
		country: typeof o.country === "string" ? o.country.slice(0, 8) : "AU",
		category: typeof o.category === "string" ? o.category.slice(0, 20) : "horse",
		raceNumber: typeof o.raceNumber === "number" ? o.raceNumber : 0,
		raceName: typeof o.raceName === "string" ? o.raceName.slice(0, 120) : null,
		startTime: typeof o.startTime === "string" ? o.startTime.slice(0, 40) : "",
		distance: typeof o.distance === "number" ? o.distance : null,
		condition: typeof o.condition === "string" ? o.condition.slice(0, 40) : null,
		weather: typeof o.weather === "string" ? o.weather.slice(0, 40) : null,
		runners
	};
}
var researchRace = createServerFn({ method: "POST" }).validator((input) => compactRace(input)).handler(createSsrRpc("acaef5bc720e1ae164f6f46a45c08581a338d82075a3bbfbfe92defde57e4c4e"));
var loadResults = createServerFn({ method: "POST" }).validator((input) => {
	const o = input && typeof input === "object" ? input : {};
	const hoursRaw = typeof o.hoursBack === "number" && Number.isFinite(o.hoursBack) ? o.hoursBack : 12;
	const ids = Array.isArray(o.raceIds) ? o.raceIds.filter((id) => typeof id === "string" && id.length > 0 && id.length <= 80).slice(0, 60) : [];
	return {
		hoursBack: Math.max(1, Math.min(72, Math.round(hoursRaw))),
		raceIds: ids
	};
}).handler(createSsrRpc("94c89a4b7dcb61c2f7f524b29d28f6a97773e55afd16546f1b7533b82b8b4ad7"));
function raceToResearchInput(race) {
	return {
		id: race.id,
		venue: race.venue,
		country: race.country,
		category: race.category,
		raceNumber: race.raceNumber,
		raceName: race.raceName,
		startTime: race.startTime,
		distance: race.distance,
		condition: race.condition,
		weather: race.weather,
		runners: race.runners.map((r) => ({
			number: r.number,
			name: r.name,
			barrier: r.barrier,
			jockey: r.jockey,
			trainer: r.trainer,
			form: r.form,
			scratched: r.scratched,
			sportsbet: r.sportsbet,
			bestWin: r.bestWin,
			bestBook: r.bestBook
		}))
	};
}
function iso(v) {
	if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
	if (typeof v === "string" && v.trim()) {
		const parsed = new Date(v);
		if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
	}
	return null;
}
function storedFrom(v) {
	const entry = asSuggestion(v);
	if (!entry) return null;
	const start = iso(entry.startTime);
	const logged = iso(entry.loggedAt);
	if (!start || !logged || entry.raceId.length > 80 || entry.pickName.length > 80) return null;
	const { stake: _stake, priceTaken: _price, ...stored } = entry;
	return {
		...stored,
		raceId: entry.raceId.slice(0, 80),
		startTime: start,
		loggedAt: logged,
		venue: entry.venue.slice(0, 80)
	};
}
var listSuggestions = createServerFn({ method: "GET" }).handler(createSsrRpc("60631ec4d36d089ed9cc17ffbcfb0f147a7c4ccdd41b0c369fff231f1999f611"));
var saveSuggestions = createServerFn({ method: "POST" }).validator((input) => {
	const raw = input && typeof input === "object" && "suggestions" in input ? input.suggestions : [];
	return { suggestions: (Array.isArray(raw) ? raw : []).map(storedFrom).filter((entry) => entry != null).slice(0, 40) };
}).handler(createSsrRpc("94f38972def90dba4787fd3504ea8405f207867582a83b54f0a04f97bb21d4a8"));
var moneyFmt = new Intl.NumberFormat("en-AU", {
	style: "currency",
	currency: "AUD"
});
var timeFmt$1 = new Intl.DateTimeFormat("en-AU", {
	timeZone: "Australia/Perth",
	hour: "numeric",
	minute: "2-digit",
	hour12: true
});
function codeLabel$1(category) {
	if (category === "horse") return "Thoroughbred";
	if (category === "harness") return "Harness";
	if (category === "greyhound") return "Greyhound";
	return category;
}
function pct(rate) {
	if (rate == null) return "—";
	return `${Math.round(rate * 100)}%`;
}
function RecordPane({ entries, phaseStartedAt, now, checking, checkError, onBack, onOpen, onStake, onWinner, onClearManual, onNewPhase, onCheck }) {
	const [earlier, setEarlier] = (0, import_react.useState)(false);
	const [armPhase, setArmPhase] = (0, import_react.useState)(false);
	const [onlyBets, setOnlyBets] = (0, import_react.useState)(false);
	const phase = entries.filter((entry) => entry.loggedAt >= phaseStartedAt);
	const before = entries.filter((entry) => entry.loggedAt < phaseStartedAt);
	const summary = summarise(phase);
	const allTime = summarise(entries);
	const isBet = (entry) => entry.stake != null && entry.stake > 0;
	const ordered = [...phase].sort((a, b) => {
		const ap = a.outcome === "pending" ? 0 : 1;
		const bp = b.outcome === "pending" ? 0 : 1;
		if (ap !== bp) return ap - bp;
		return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
	});
	const orderedShown = onlyBets ? ordered.filter(isBet) : ordered;
	const beforeShown = onlyBets ? before.filter(isBet) : before;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "pane-in px-4 pt-4 pb-32 md:pb-24",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: onBack,
				className: "press mb-3 inline-flex h-11 items-center gap-1 text-sm text-muted md:hidden",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "size-4" }), "Card"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: "Book"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 max-w-prose text-sm text-pretty text-muted",
				children: "Every suggestion inside 15 minutes is stored, whether you bet it or not, and it stays after you leave. A stake is only for the ones you actually take, and that stays on this phone."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 rounded-xl border border-line bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm tracking-wide text-gold uppercase",
						children: "Suggestions this phase"
					}),
					summary.calls === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-pretty text-muted",
						children: "No suggestions stored since this phase started."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 font-display text-2xl leading-tight",
							children: [
								summary.won,
								" won, ",
								summary.lost,
								" lost",
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-gold",
									children: [" · ", pct(summary.hitRate)]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-sm text-muted",
							children: [
								summary.calls,
								" suggested",
								summary.marked ? ` · ${summary.marked} ${summary.marked === 1 ? "bet" : "bets"}` : " · none bet yet",
								summary.pending ? ` · ${summary.pending} waiting` : "",
								summary.voids ? ` · ${summary.voids} void` : ""
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm",
							children: summary.bets === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-muted",
								children: ["Strike rate is every suggestion, bet or not.", summary.marked ? " Settled bets show here once they jump." : " Leave the stake blank on the ones you skip."]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								"Your bets ",
								summary.betsWon,
								" won, ",
								summary.betsLost,
								" lost · staked ",
								moneyFmt.format(summary.staked),
								" ·",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: summary.profit < 0 ? "text-gold" : "text-fg",
									children: signedMoney(summary.profit)
								})
							] })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: "Profit uses your stake and the price you took, not the tote dividend."
						})
					] }),
					before.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-sm text-muted",
						children: [
							"All time ",
							allTime.won,
							" won, ",
							allTime.lost,
							" lost · ",
							pct(allTime.hitRate),
							" · ",
							allTime.calls,
							" suggestions"
						]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: onCheck,
							disabled: checking,
							className: "press h-11 rounded-full border border-line px-4 text-sm disabled:opacity-60",
							children: checking ? "Checking results…" : "Check results"
						}), armPhase ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								setArmPhase(false);
								onNewPhase();
							},
							className: "press h-11 rounded-full bg-gold px-4 text-sm font-semibold text-ink",
							children: "Start now"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setArmPhase(false),
							className: "press h-11 rounded-full px-3 text-sm text-muted",
							children: "Cancel"
						})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setArmPhase(true),
							className: "press h-11 rounded-full px-3 text-sm text-muted",
							children: "New phase"
						})]
					}),
					armPhase ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted",
						children: "Old suggestions stay saved. The scoreboard above starts again from now."
					}) : null,
					checkError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-pretty",
						role: "status",
						children: checkError
					}) : null
				]
			}),
			ordered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 rounded-xl border border-line bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid size-11 place-items-center rounded-full bg-surface-2 text-gold",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClipboardList, { className: "size-5" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 font-display text-2xl",
						children: "Nothing on the book yet."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-pretty text-muted",
						children: "A suggestion is stored the moment it is made inside 15 minutes, and it stays after you leave. No-bets stay off the book. After the race, a miss gets a reason and a note for next time."
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 flex gap-2",
				role: "group",
				"aria-label": "Book filter",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					"aria-pressed": !onlyBets,
					onClick: () => setOnlyBets(false),
					className: `press h-11 rounded-full px-3 text-sm ${onlyBets ? "bg-surface text-fg" : "bg-gold text-ink"}`,
					children: ["Suggestions · ", phase.length]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					"aria-pressed": onlyBets,
					onClick: () => setOnlyBets(true),
					className: `press h-11 rounded-full px-3 text-sm ${onlyBets ? "bg-gold text-ink" : "bg-surface text-fg"}`,
					children: ["My bets · ", phase.filter(isBet).length]
				})]
			}), orderedShown.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-sm text-pretty text-muted",
				children: "No stakes in this phase. The suggestions are still stored. Switch back to see them."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "rise-list mt-4 flex flex-col gap-3",
				children: orderedShown.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RecordCard, {
					entry,
					now,
					onOpen,
					onStake,
					onWinner,
					onClearManual
				}, entry.raceId))
			})] }),
			beforeShown.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setEarlier((v) => !v),
					className: "press h-11 text-sm text-muted",
					children: earlier ? "Hide earlier suggestions" : `Earlier suggestions · ${beforeShown.length}`
				}), earlier ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-2 flex flex-col gap-3",
					children: beforeShown.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RecordCard, {
						entry,
						now,
						onOpen,
						onStake,
						onWinner,
						onClearManual
					}, entry.raceId))
				}) : null]
			}) : null
		]
	});
}
function RecordCard({ entry, now, onOpen, onStake, onWinner, onClearManual }) {
	const [winner, setWinner] = (0, import_react.useState)("");
	const [editing, setEditing] = (0, import_react.useState)(false);
	const profit = profitOf(entry);
	const jumped = new Date(entry.startTime).getTime() < now - 9e4;
	const showMarker = editing || entry.outcome === "pending" && jumped;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
		className: "rounded-xl border border-line bg-surface p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-baseline justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => onOpen(entry.raceId),
					className: "press min-w-0 text-left",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-display text-xl",
						children: [
							entry.venue,
							" R",
							entry.raceNumber
						]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted tabular-nums",
					children: timeFmt$1.format(new Date(entry.startTime))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: [
					codeLabel$1(entry.category),
					entry.country !== "AU" ? ` · ${entry.country}` : "",
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-gold",
						children: [" · ", entry.tag === "value" ? "Value" : "Agrees"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-lg",
				children: [
					"#",
					entry.pickNumber,
					" ",
					entry.pickName,
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-gold tabular-nums",
						children: entry.price != null ? `$${entry.price.toFixed(2)}` : "—"
					})
				]
			}),
			entry.reasons.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-2 flex flex-col gap-1 text-sm text-muted",
				children: entry.reasons.map((reason) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: reason }, reason))
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: `mt-3 text-sm ${entry.stake != null && entry.stake > 0 ? "text-fg" : "text-muted"}`,
				children: betLine(entry)
			}),
			entry.model ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-pretty text-muted",
				children: logicLine(entry.model)
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OutcomeLine, {
				entry,
				profit
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StakeFields, {
				entry,
				onCommit: (stake, price) => onStake(entry.raceId, stake, price)
			}),
			entry.outcome === "lost" && entry.missReason ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 border-t border-line pt-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm tracking-wide text-gold uppercase",
						children: "Why this missed"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-pretty",
						children: entry.missReason
					}),
					entry.nextTime ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm tracking-wide text-muted uppercase",
						children: "Next time"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-pretty text-muted",
						children: entry.nextTime
					})] }) : null
				]
			}) : null,
			entry.outcome === "void" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-3 text-sm text-muted",
				children: [entry.feed?.status === "abandoned" ? "Abandoned." : "Scratched after the call.", " It doesn't count, and a stake is treated as returned."]
			}) : null,
			showMarker ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "mt-3 flex flex-wrap items-center gap-2",
				onSubmit: (event) => {
					event.preventDefault();
					const number = Number(winner);
					if (!Number.isInteger(number) || number <= 0 || number > 24) return;
					onWinner(entry.raceId, number);
					setWinner("");
					setEditing(false);
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "text-sm text-muted",
						htmlFor: `winner-${entry.raceId}`,
						children: "Winner"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						id: `winner-${entry.raceId}`,
						inputMode: "numeric",
						value: winner,
						onChange: (event) => setWinner(event.target.value),
						placeholder: "#",
						className: "h-11 w-16 rounded-xl border border-line bg-bg px-3 text-sm tabular-nums"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						className: "press h-11 rounded-full border border-line px-4 text-sm",
						children: "Mark winner"
					})
				]
			}) : null,
			entry.resultSource === "manual" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => onClearManual(entry.raceId),
				className: "press mt-2 h-11 text-sm text-muted",
				children: entry.feed?.winnerNumber != null ? "Use the feed result" : "Clear my winner"
			}) : entry.outcome !== "pending" && !showMarker ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => setEditing(true),
				className: "press mt-2 h-11 text-sm text-muted",
				children: "Wrong winner?"
			}) : null
		]
	});
}
function betLine(entry) {
	if (entry.stake != null && entry.stake > 0) {
		const price = entry.priceTaken ?? entry.price;
		return price != null ? `Bet · ${moneyFmt.format(entry.stake)} at $${price.toFixed(2)}` : `Bet · ${moneyFmt.format(entry.stake)}`;
	}
	return "Suggested · no stake";
}
function logicLine(model) {
	return `Stored with the call: ${Math.round(model.fair * 100)}% of the market, next on the card #${model.secondNumber} ${model.secondName}.`;
}
function OutcomeLine({ entry, profit }) {
	if (entry.outcome === "pending") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mt-2 text-sm text-muted",
		children: entry.resultKind === "interim" ? "Interim result." : "Waiting on the result."
	});
	const label = entry.outcome === "won" ? "Won" : entry.outcome === "lost" ? "Lost" : "Void";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "mt-2 text-sm",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-gold",
				children: label
			}),
			entry.resultKind === "interim" ? " · interim" : "",
			entry.winnerName ? ` · ${entry.winnerName} won` : "",
			entry.pickPosition && entry.pickPosition > 1 ? ` · ours finished ${entry.pickPosition}` : "",
			entry.resultSource === "manual" ? " · marked by you" : "",
			profit != null ? ` · ${signedMoney(profit)}` : ""
		]
	});
}
function priceField(entry) {
	const price = entry.priceTaken ?? entry.price;
	return price == null ? "" : price.toFixed(2);
}
function StakeFields({ entry, onCommit }) {
	const [stake, setStake] = (0, import_react.useState)(entry.stake == null ? "" : String(entry.stake));
	const [price, setPrice] = (0, import_react.useState)(priceField(entry));
	(0, import_react.useEffect)(() => {
		setStake(entry.stake == null ? "" : String(entry.stake));
		setPrice(priceField(entry));
	}, [
		entry.raceId,
		entry.stake,
		entry.priceTaken,
		entry.price
	]);
	function commit(nextStake, nextPrice) {
		const parsedStake = nextStake.trim() === "" ? null : Number(nextStake);
		const parsedPrice = nextPrice.trim() === "" ? null : Number(nextPrice);
		if (parsedStake != null && (!Number.isFinite(parsedStake) || parsedStake < 0 || parsedStake > 1e5)) return;
		if (parsedPrice != null && (!Number.isFinite(parsedPrice) || parsedPrice <= 1 || parsedPrice > 1001)) return;
		const stakeValue = parsedStake == null || parsedStake === 0 ? null : Math.round(parsedStake * 100) / 100;
		onCommit(stakeValue, stakeValue == null ? null : parsedPrice);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-3 grid grid-cols-2 gap-2 sm:max-w-xs",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
			className: "text-sm text-muted",
			children: ["My stake", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				inputMode: "decimal",
				value: stake,
				placeholder: "0",
				onChange: (event) => setStake(event.target.value),
				onBlur: () => commit(stake, price),
				className: "mt-1 h-11 w-full rounded-xl border border-line bg-bg px-3 text-fg tabular-nums"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
			className: "text-sm text-muted",
			children: ["Price taken", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				inputMode: "decimal",
				value: price,
				placeholder: "2.80",
				onChange: (event) => setPrice(event.target.value),
				onBlur: () => commit(stake, price),
				className: "mt-1 h-11 w-full rounded-xl border border-line bg-bg px-3 text-fg tabular-nums"
			})]
		})]
	});
}
var WATCH_KEY = "elite-tips-watch";
var STALE_MS = 9e4;
function pushSuggestions(entries) {
	const stored = entries.map(toStored);
	for (let i = 0; i < stored.length; i += 30) saveSuggestions({ data: { suggestions: stored.slice(i, i + 30) } }).catch(() => void 0);
}
var timeFmt = new Intl.DateTimeFormat("en-AU", {
	timeZone: "Australia/Perth",
	hour: "numeric",
	minute: "2-digit",
	hour12: true
});
function codeLabel(category) {
	if (category === "horse") return "Thoroughbred";
	if (category === "harness") return "Harness";
	if (category === "greyhound") return "Greyhound";
	return category;
}
function codeNoun(code) {
	if (code === "horse") return "thoroughbreds";
	if (code === "harness") return "harness";
	if (code === "greyhound") return "greyhounds";
	return "meetings";
}
function pilot(category) {
	if (category === "harness") return "Driver";
	if (category === "greyhound") return "Trainer";
	return "Jockey";
}
function money(n) {
	if (n == null) return "—";
	return `$${n.toFixed(2)}`;
}
function countdown(ms) {
	if (ms <= -9e4) return "Jumped";
	if (ms < 0) return "Off";
	const total = Math.floor(ms / 1e3);
	const m = Math.floor(total / 60);
	const s = total % 60;
	if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
	if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
	return `${s}s`;
}
function freshness(fetchedAt, now) {
	if (now == null) return "just now";
	const ms = now - new Date(fetchedAt).getTime();
	if (!Number.isFinite(ms) || ms < 5e3) return "just now";
	const s = Math.floor(ms / 1e3);
	if (s < 60) return `${s}s ago`;
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}m ago`;
	return `${Math.floor(m / 60)}h ago`;
}
function loadWatch() {
	try {
		const raw = localStorage.getItem(WATCH_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.slice(0, 30) : [];
	} catch {
		return [];
	}
}
function within(race, horizon, now) {
	if (horizon === "all") return true;
	const mins = (new Date(race.startTime).getTime() - now) / 6e4;
	if (mins < -2) return false;
	return horizon === "15" ? mins <= 15 : mins <= 60;
}
function byStart(a, b) {
	return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
}
function RacingDesk({ initial }) {
	const [board, setBoard] = (0, import_react.useState)(initial);
	const [refreshing, setRefreshing] = (0, import_react.useState)(false);
	const [now, setNow] = (0, import_react.useState)(null);
	const [horizon, setHorizon] = (0, import_react.useState)("15");
	const [code, setCode] = (0, import_react.useState)("all");
	const [selectedId, setSelectedId] = (0, import_react.useState)(null);
	const [mobilePane, setMobilePane] = (0, import_react.useState)("list");
	const [openRunner, setOpenRunner] = (0, import_react.useState)(null);
	const [openFor, setOpenFor] = (0, import_react.useState)(null);
	const [watch, setWatch] = (0, import_react.useState)([]);
	const [ledger, setLedger] = (0, import_react.useState)([]);
	const [phaseStartedAt, setPhaseStartedAt] = (0, import_react.useState)(() => (/* @__PURE__ */ new Date()).toISOString());
	const [checking, setChecking] = (0, import_react.useState)(false);
	const [checkError, setCheckError] = (0, import_react.useState)(null);
	const [research, setResearch] = (0, import_react.useState)({});
	const [researching, setResearching] = (0, import_react.useState)(null);
	const ledgerRef = (0, import_react.useRef)([]);
	const booted = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		setWatch(loadWatch());
		const loaded = loadLedger();
		ledgerRef.current = loaded;
		setLedger(loaded);
		setPhaseStartedAt(loadPhase(loaded));
		booted.current = true;
		setNow(Date.now());
		const tick = setInterval(() => setNow(Date.now()), 1e3);
		let stop = false;
		listSuggestions().then((remote) => {
			if (stop) return;
			const { entries, push } = mergeHistory(ledgerRef.current, remote);
			if (!(entries.length === ledgerRef.current.length && entries.every((entry, index) => entry.raceId === ledgerRef.current[index]?.raceId && entry.stake === ledgerRef.current[index]?.stake && suggestionStamp(entry) === suggestionStamp(ledgerRef.current[index])))) {
				ledgerRef.current = entries;
				saveLedger(entries);
				setLedger(entries);
			}
			if (push.length) pushSuggestions(push);
		}).catch(() => void 0);
		return () => {
			stop = true;
			clearInterval(tick);
		};
	}, []);
	(0, import_react.useEffect)(() => {
		let stop = false;
		const pull = async () => {
			setRefreshing(true);
			try {
				const next = await loadBoard({ data: { limit: 18 } });
				if (!stop) setBoard(next);
			} catch {
				if (!stop) setBoard((prev) => ({
					...prev,
					error: "Couldn't refresh the card. The last one is still on screen."
				}));
			} finally {
				if (!stop) setRefreshing(false);
			}
		};
		const timer = setInterval(() => {
			if (document.visibilityState === "visible") pull();
		}, 45e3);
		return () => {
			stop = true;
			clearInterval(timer);
		};
	}, []);
	const clock = now ?? new Date(board.fetchedAt).getTime();
	const races = board.races.filter((r) => (code === "all" ? true : r.category === code) && within(r, horizon, clock));
	const upcoming = races.find((race) => new Date(race.startTime).getTime() - clock > -3e4) ?? races[0] ?? null;
	const selected = board.races.find((r) => r.id === selectedId) ?? upcoming;
	const windowReads = (0, import_react.useMemo)(() => readsInWindow(board.races, clock), [board.races, clock]);
	const windowCount = windowReads.length;
	const emptyBoard = board.races.length === 0;
	const showBoot = emptyBoard && refreshing;
	const showError = emptyBoard && Boolean(board.error) && !refreshing;
	const age = now == null ? 0 : now - new Date(board.fetchedAt).getTime();
	const stale = Number.isFinite(age) && age > STALE_MS;
	const shownOpen = openFor === selected?.id ? openRunner : null;
	const phaseCalls = ledger.filter((entry) => entry.loggedAt >= phaseStartedAt && entry.outcome === "pending").length;
	(0, import_react.useEffect)(() => {
		if (!booted.current) return;
		const next = capturePicks(ledgerRef.current, board.races, windowReads, (/* @__PURE__ */ new Date()).toISOString());
		if (next === ledgerRef.current) return;
		commitLedger(next, true);
	}, [board.races, windowReads]);
	const settleKey = ledger.filter((entry) => awaitingResult(entry, clock)).map((entry) => entry.raceId).sort().join("|");
	(0, import_react.useEffect)(() => {
		if (!settleKey) return;
		let stop = false;
		const run = async () => {
			const due = ledgerRef.current.filter((entry) => awaitingResult(entry, Date.now()));
			if (!due.length) return;
			const oldest = Math.min(...due.map((entry) => new Date(entry.startTime).getTime()));
			const hoursBack = Math.min(72, Math.max(6, Math.ceil((Date.now() - oldest) / 36e5) + 2));
			setChecking(true);
			try {
				const loaded = await loadResults({ data: {
					hoursBack,
					raceIds: due.map((entry) => entry.raceId)
				} });
				if (stop) return;
				setCheckError(loaded.error ?? null);
				const byId = new Map(loaded.races.map((race) => [race.raceId, race]));
				let changed = false;
				const next = ledgerRef.current.map((entry) => {
					const race = byId.get(entry.raceId);
					if (!race || entry.outcome !== "pending" && entry.resultKind !== "interim" && entry.resultSource !== "manual") return entry;
					const updated = applyFeed(entry, feedFromSettled(entry.pickNumber, race));
					if (updated !== entry) changed = true;
					return updated;
				});
				if (changed) commitLedger(next, true);
			} catch {
				if (!stop) setCheckError("Couldn't check results. You can still mark a winner.");
			} finally {
				if (!stop) setChecking(false);
			}
		};
		run();
		const timer = setInterval(() => void run(), 9e4);
		return () => {
			stop = true;
			clearInterval(timer);
		};
	}, [settleKey]);
	(0, import_react.useEffect)(() => {
		if (!selectedId) return;
		const node = document.querySelector(`[data-race-id="${CSS.escape(selectedId)}"]`);
		if (!(node instanceof HTMLElement) || node.offsetParent === null) return;
		node.scrollIntoView({ block: "nearest" });
	}, [selectedId]);
	function choose(id) {
		setSelectedId(id);
		setOpenRunner(null);
		setMobilePane("race");
	}
	function toggleRunner(number) {
		if (!selected) return;
		if (openFor === selected.id && openRunner === number) {
			setOpenRunner(null);
			return;
		}
		setOpenFor(selected.id);
		setOpenRunner(number);
	}
	function toggleWatch(race, runner) {
		const id = `${race.id}-${runner.number}`;
		setWatch((prev) => {
			const next = prev.some((w) => w.id === id) ? prev.filter((w) => w.id !== id) : [{
				id,
				raceId: race.id,
				venue: race.venue,
				raceNumber: race.raceNumber,
				number: runner.number,
				name: runner.name,
				price: runner.sportsbet,
				startTime: race.startTime
			}, ...prev].slice(0, 30);
			localStorage.setItem(WATCH_KEY, JSON.stringify(next));
			return next;
		});
	}
	async function refresh() {
		setRefreshing(true);
		try {
			setBoard(await loadBoard({ data: { limit: 18 } }));
		} catch {
			setBoard((prev) => ({
				...prev,
				error: "Refresh failed. Try again in a moment."
			}));
		} finally {
			setRefreshing(false);
		}
	}
	async function researchSelected(race) {
		setResearching(race.id);
		try {
			const result = await researchRace({ data: raceToResearchInput(race) });
			setResearch((prev) => ({
				...prev,
				[race.id]: result.ok ? result.research : { error: result.error }
			}));
		} catch {
			setResearch((prev) => ({
				...prev,
				[race.id]: { error: "Research didn't finish. Try again." }
			}));
		} finally {
			setResearching(null);
		}
	}
	function commitLedger(next, sync) {
		const prev = ledgerRef.current;
		ledgerRef.current = next;
		saveLedger(next);
		setLedger(next);
		if (!sync) return;
		const prevStamp = new Map(prev.map((entry) => [entry.raceId, suggestionStamp(entry)]));
		const changed = next.filter((entry) => prevStamp.get(entry.raceId) !== suggestionStamp(entry));
		if (changed.length) pushSuggestions(changed);
	}
	function updateEntry(raceId, map, sync = false) {
		commitLedger(ledgerRef.current.map((entry) => entry.raceId === raceId ? map(entry) : entry), sync);
	}
	const showList = mobilePane === "list";
	const showRace = mobilePane === "race";
	const showScan = mobilePane === "scan";
	const showWatch = mobilePane === "watch";
	const showRecord = mobilePane === "record";
	const bookEntry = selected ? ledger.find((entry) => entry.raceId === selected.id) : void 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-bg text-fg",
		"data-ready": board.races.length > 0 ? "yes" : "no",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex max-w-6xl items-center gap-3 px-4 py-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "font-display text-lg leading-none tracking-tight",
								children: ["Elite ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-gold",
									children: "Tips"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 truncate text-sm text-muted tabular-nums",
								children: [
									"Perth ",
									timeFmt.format(new Date(now ?? board.fetchedAt)),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: stale ? "text-gold" : void 0,
										children: [
											" ",
											"· ",
											refreshing ? "Updating prices" : freshness(board.fetchedAt, now)
										]
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setMobilePane(showRecord ? "list" : "record"),
							"aria-pressed": showRecord,
							"aria-label": showRecord ? "Close the book" : `Book, ${phaseCalls} waiting`,
							className: `press inline-flex h-11 shrink-0 items-center gap-2 rounded-full border bg-surface px-3 text-sm ${showRecord ? "border-gold" : "border-line"}`,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClipboardList, { className: "size-4 text-gold" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: showRecord ? "Close" : "Book" }),
								phaseCalls > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "tabular-nums",
									children: phaseCalls
								}) : null
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setMobilePane(showWatch ? "list" : "watch"),
							"aria-pressed": showWatch,
							"aria-label": showWatch ? "Close watch list" : `Watch list, ${watch.length} saved`,
							className: `press inline-flex h-11 shrink-0 items-center gap-2 rounded-full border bg-surface px-3 text-sm ${showWatch ? "border-gold" : "border-line"}`,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bookmark, { className: `size-4 ${watch.length ? "fill-gold text-gold" : "text-gold"}` }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: showWatch ? "Close" : "Watch" }),
								watch.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "tabular-nums",
									children: watch.length
								}) : null
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => void refresh(),
							disabled: refreshing,
							"aria-label": refreshing ? "Refreshing prices" : "Refresh prices",
							className: "press inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface disabled:opacity-60",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: `size-4 ${refreshing ? "spin" : ""}` })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setMobilePane(showScan ? "list" : "scan"),
							"aria-pressed": showScan,
							className: "press hidden h-11 shrink-0 items-center rounded-full bg-gold px-4 text-sm font-semibold text-ink md:inline-flex",
							children: showScan ? "Close scan" : `Scan 15 min${windowCount ? ` · ${windowCount}` : ""}`
						})
					]
				}), refreshing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "loadbar",
					"aria-hidden": "true",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {})
				}) : null]
			}),
			board.error && board.races.length > 0 && !showList ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "border-b border-line bg-surface px-4 py-2 text-sm text-pretty md:hidden",
				role: "status",
				children: board.error
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto grid max-w-6xl md:grid-cols-[20rem_minmax(0,1fr)]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
					className: `${showList ? "block" : "hidden"} min-w-0 border-line md:block md:border-r`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "chip-row flex min-w-0 gap-2 overflow-x-auto px-4 pt-4",
							role: "group",
							"aria-label": "Time window",
							children: [
								["15", "15 min"],
								["60", "Hour"],
								["all", "Card"]
							].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterChip, {
								active: horizon === id,
								onClick: () => setHorizon(id),
								label
							}, id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "chip-row flex min-w-0 gap-2 overflow-x-auto px-4 py-3",
							role: "group",
							"aria-label": "Code",
							children: [
								["all", "All"],
								["horse", "Horses"],
								["harness", "Harness"],
								["greyhound", "Greys"]
							].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterChip, {
								active: code === id,
								onClick: () => setCode(id),
								label
							}, id))
						}),
						showBoot ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QueueSkeleton, {}) : showError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BoardError, {
							message: board.error ?? "The live card couldn't be loaded.",
							busy: refreshing,
							onRetry: () => void refresh()
						}) : races.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyQueue, {
							horizon,
							code,
							races: board.races,
							now: clock,
							onHorizon: setHorizon,
							onResetCode: () => setCode("all")
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [board.error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StaleBanner, {
							message: board.error,
							busy: refreshing,
							onRetry: () => void refresh()
						}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "rise-list flex flex-col gap-2 px-4 pb-28 md:pb-6",
							children: races.map((race) => {
								const ms = new Date(race.startTime).getTime() - clock;
								const active = selected?.id === race.id && !showScan && !showWatch && !showRecord;
								const verdict = windowReads.find((read) => read.raceId === race.id);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									"data-race-id": race.id,
									"aria-current": active ? "true" : void 0,
									onClick: () => choose(race.id),
									className: `press w-full rounded-xl border px-3 py-3 text-left ${active ? "border-gold bg-surface" : "border-line bg-surface/60 md:hover:border-gold/60"}`,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-baseline justify-between gap-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-sm text-muted tabular-nums",
												children: timeFmt.format(new Date(race.startTime))
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: `text-sm tabular-nums transition-colors duration-200 ${ms <= 9e5 && ms > -9e4 ? "text-gold" : "text-muted"}`,
												children: countdown(ms)
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "mt-1 font-display text-xl leading-tight",
											children: [
												race.venue,
												" ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-gold",
													children: ["R", race.raceNumber]
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "mt-1 text-sm text-muted",
											children: [
												codeLabel(race.category),
												race.country !== "AU" ? ` · ${race.country}` : "",
												race.distance ? ` · ${race.distance}m` : "",
												race.condition ? ` · ${race.condition}` : ""
											]
										}),
										verdict?.decision === "pick" && verdict.pick ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "mt-2 truncate text-sm",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-gold",
												children: [
													"#",
													verdict.pick.number,
													" ",
													verdict.pick.name
												]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-muted",
												children: [" · ", money(verdict.pick.price)]
											})]
										}) : verdict ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-2 truncate text-sm text-muted",
											children: "No bet in this window"
										}) : null
									]
								}) }, race.id);
							})
						})] })
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
					className: `${showRace || showScan || showWatch || showRecord ? "block" : "hidden"} min-w-0 md:block`,
					children: showRecord ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RecordPane, {
						entries: ledger,
						phaseStartedAt,
						now: clock,
						checking,
						checkError,
						onBack: () => setMobilePane("list"),
						onOpen: choose,
						onStake: (raceId, stake, priceTaken) => updateEntry(raceId, (entry) => setStake(entry, stake, priceTaken)),
						onWinner: (raceId, number) => updateEntry(raceId, (entry) => markWinner(entry, number), true),
						onClearManual: (raceId) => updateEntry(raceId, (entry) => clearManual(entry), true),
						onNewPhase: () => {
							const startedAt = (/* @__PURE__ */ new Date()).toISOString();
							savePhase(startedAt);
							setPhaseStartedAt(startedAt);
						},
						onCheck: () => {
							const due = ledgerRef.current.filter((entry) => entry.outcome === "pending" || entry.resultKind === "interim");
							if (!due.length) {
								setCheckError("Nothing is waiting on a result.");
								return;
							}
							const oldest = Math.min(...due.map((entry) => new Date(entry.startTime).getTime()));
							const hoursBack = Math.min(72, Math.max(6, Math.ceil((Date.now() - Math.min(oldest, Date.now())) / 36e5) + 2));
							setChecking(true);
							loadResults({ data: {
								hoursBack,
								raceIds: due.map((entry) => entry.raceId)
							} }).then((loaded) => {
								const byId = new Map(loaded.races.map((race) => [race.raceId, race]));
								let changed = false;
								const next = ledgerRef.current.map((entry) => {
									const race = byId.get(entry.raceId);
									if (!race) return entry;
									const updated = applyFeed(entry, feedFromSettled(entry.pickNumber, race));
									if (updated !== entry) changed = true;
									return updated;
								});
								if (changed) commitLedger(next, true);
								setCheckError(loaded.error ?? (changed ? null : "None of these have a result yet. Check again after they jump."));
							}).catch(() => setCheckError("Couldn't check results. You can still mark a winner.")).finally(() => setChecking(false));
						}
					}) : showWatch ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WatchList, {
						watch,
						now: clock,
						onBack: () => setMobilePane("list"),
						onOpen: choose,
						onClear: (id) => {
							setWatch((prev) => {
								const next = prev.filter((w) => w.id !== id);
								localStorage.setItem(WATCH_KEY, JSON.stringify(next));
								return next;
							});
						}
					}) : showScan ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScanPane, {
						reads: windowReads,
						races: board.races,
						now: clock,
						onBack: () => setMobilePane("list"),
						onOpen: choose
					}) : showBoot ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "hidden md:block",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RaceSkeleton, {})
					}) : selected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RacePane, {
						race: selected,
						now: clock,
						read: readRace(selected, clock),
						openRunner: shownOpen,
						setOpenRunner: toggleRunner,
						watch,
						onBack: () => setMobilePane("list"),
						onWatch: toggleWatch,
						research: research[selected.id],
						researching: researching === selected.id,
						onResearch: () => void researchSelected(selected),
						bookEntry,
						onStake: (stake, priceTaken) => {
							if (!bookEntry) return;
							updateEntry(bookEntry.raceId, (entry) => setStake(entry, stake, priceTaken));
						},
						onOpenBook: () => setMobilePane("record")
					}, selected.id) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuietDesk, {})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 p-3 backdrop-blur md:hidden",
				children: showScan || showWatch || showRecord ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setMobilePane("list"),
					className: "press flex h-12 w-full items-center justify-center rounded-full border border-line bg-surface text-base font-semibold",
					children: "Back to the card"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setMobilePane("scan"),
					className: "press flex h-12 w-full items-center justify-center rounded-full bg-gold text-base font-semibold text-ink",
					children: `Scan 15 min${windowCount ? ` · ${windowCount}` : ""}`
				})
			})
		]
	});
}
function BoardPending() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-bg text-fg",
		"data-ready": "no",
		"aria-busy": "true",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "sticky top-0 z-20 border-b border-line bg-bg/95",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex max-w-6xl items-center gap-3 px-4 py-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-display text-lg leading-none tracking-tight",
							children: ["Elite ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-gold",
								children: "Tips"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted",
							children: "Pulling the card…"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "skeleton size-11 rounded-full" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "skeleton size-11 rounded-full" })
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "loadbar",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {})
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto grid max-w-6xl md:grid-cols-[20rem_minmax(0,1fr)]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2 px-4 pt-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "skeleton h-11 w-20 rounded-full" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "skeleton h-11 w-16 rounded-full" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "skeleton h-11 w-16 rounded-full" })
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QueueSkeleton, {})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "hidden md:block",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RaceSkeleton, {})
			})]
		})]
	});
}
function FilterChip({ active, onClick, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick,
		"aria-pressed": active,
		className: `press h-11 shrink-0 rounded-full px-3 text-sm ${active ? "bg-gold text-ink" : "bg-surface text-fg"}`,
		children: label
	});
}
function Bone({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `skeleton ${className}` });
}
function QueueSkeleton() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-2 px-4 pt-1 pb-28 md:pb-6",
		"aria-busy": "true",
		"aria-live": "polite",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "sr-only",
			children: "Pulling the card"
		}), Array.from({ length: 5 }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-xl border border-line bg-surface p-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bone, { className: "h-3 w-16 rounded-md" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bone, { className: "mt-3 h-6 w-40 max-w-full rounded-md" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bone, { className: "mt-2 h-3 w-32 rounded-md" })
			]
		}, i))]
	});
}
function RaceSkeleton() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "px-4 pt-4",
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bone, { className: "h-3 w-24 rounded-md" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bone, { className: "mt-3 h-8 w-64 max-w-full rounded-md" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bone, { className: "mt-4 h-28 w-full rounded-xl" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bone, { className: "mt-3 h-16 w-full rounded-xl" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bone, { className: "mt-3 h-16 w-full rounded-xl" })
		]
	});
}
function BoardError({ message, onRetry, busy }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "px-4 pb-28 md:pb-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "pane-in rounded-xl border border-line bg-surface p-4",
			role: "alert",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid size-11 place-items-center rounded-full bg-surface-2 text-gold",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "size-5" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 font-display text-2xl",
					children: "The card didn't load."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-pretty text-muted",
					children: message
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: onRetry,
					disabled: busy,
					className: "press mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-gold px-4 text-sm font-semibold text-ink disabled:opacity-60",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: `size-4 ${busy ? "spin" : ""}` }), "Try again"]
				})
			]
		})
	});
}
function StaleBanner({ message, onRetry, busy }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-4 mb-3 flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2",
		role: "status",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "size-4 shrink-0 text-gold" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "min-w-0 flex-1 text-sm text-pretty",
				children: message
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onRetry,
				disabled: busy,
				className: "press h-11 shrink-0 rounded-full border border-line px-3 text-sm",
				children: "Retry"
			})
		]
	});
}
function EmptyQueue({ horizon, code, races, now, onHorizon, onResetCode }) {
	const pool = code === "all" ? races : races.filter((race) => race.category === code);
	const noneOfCode = code !== "all" && pool.length === 0;
	const next = [...pool].sort(byStart)[0];
	const nextAny = [...races].sort(byStart)[0];
	const hiddenLater = horizon !== "all" && pool.some((race) => {
		return (new Date(race.startTime).getTime() - now) / 6e4 >= -2 && !within(race, horizon, now);
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "px-4 pb-28 md:pb-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "pane-in rounded-xl border border-line bg-surface p-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid size-11 place-items-center rounded-full bg-surface-2 text-gold",
					children: noneOfCode ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Funnel, { className: "size-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "size-5" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 font-display text-2xl",
					children: noneOfCode ? `No ${codeNoun(code)} on the card.` : "Nothing in this window."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-pretty text-muted",
					children: noneOfCode ? "This code is quiet. The other meetings are still on the card." : horizon === "15" ? "The 15-minute rule stays strict. No manufactured pick just to fill the screen." : horizon === "60" ? "Nothing jumps in the next hour. The rest of the card may still be up." : "The feed has no meetings in this filter."
				}),
				noneOfCode && nextAny ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-3 text-sm",
					children: [
						"Next on the card is ",
						nextAny.venue,
						" R",
						nextAny.raceNumber,
						" at ",
						timeFmt.format(new Date(nextAny.startTime)),
						" ·",
						" ",
						countdown(new Date(nextAny.startTime).getTime() - now)
					]
				}) : null,
				!noneOfCode && next ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-3 text-sm",
					children: [
						"Next is ",
						next.venue,
						" R",
						next.raceNumber,
						" at ",
						timeFmt.format(new Date(next.startTime)),
						" ·",
						" ",
						countdown(new Date(next.startTime).getTime() - now)
					]
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 flex flex-wrap gap-2",
					children: [
						hiddenLater && horizon === "15" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => onHorizon("60"),
							className: "press h-11 rounded-full bg-gold px-4 text-sm font-semibold text-ink",
							children: "Show the next hour"
						}) : null,
						hiddenLater && horizon === "60" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => onHorizon("all"),
							className: "press h-11 rounded-full bg-gold px-4 text-sm font-semibold text-ink",
							children: "Show the full card"
						}) : null,
						code !== "all" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: onResetCode,
							className: `press h-11 rounded-full px-4 text-sm ${noneOfCode ? "bg-gold font-semibold text-ink" : "border border-line"}`,
							children: "Show all codes"
						}) : null
					]
				})
			]
		})
	});
}
function QuietDesk() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pane-in hidden px-4 pt-16 md:block",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-display text-3xl",
			children: "Waiting on the next jump."
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 max-w-prose text-sm text-pretty text-muted",
			children: "When a race lands in this window it opens here. Widen the filters on the left, or run the 15-minute scan."
		})]
	});
}
function RacePane({ race, now, read, openRunner, setOpenRunner, watch, onBack, onWatch, research, researching, onResearch, bookEntry, onStake, onOpenBook }) {
	const ms = new Date(race.startTime).getTime() - now;
	const active = race.runners.filter((runner) => !runner.scratched).length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "pane-in px-4 pt-4 pb-32 md:pb-24",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: onBack,
				className: "press mb-3 inline-flex h-11 items-center gap-1 text-sm text-muted md:hidden",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "size-4" }), "Card"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm tracking-wide text-muted uppercase",
				children: [codeLabel(race.category), race.country !== "AU" ? ` · ${race.country}` : ""]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "font-display text-3xl leading-tight",
				children: [
					race.venue,
					" R",
					race.raceNumber
				]
			}),
			race.raceName ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-pretty text-muted",
				children: race.raceName
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-sm tabular-nums",
				children: [
					timeFmt.format(new Date(race.startTime)),
					" Perth · ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-gold",
						children: countdown(ms)
					}),
					race.distance ? ` · ${race.distance}m` : "",
					race.condition ? ` · ${race.condition}` : "",
					race.weather ? ` · ${race.weather}` : "",
					race.rail ? ` · Rail ${race.rail}` : ""
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-sm text-muted",
				children: [
					active,
					" ",
					active === 1 ? "runner" : "runners",
					race.scratchings.length ? ` · ${race.scratchings.length} scratched` : ""
				]
			}),
			race.scratchings.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-sm text-muted",
				children: ["Scratched: ", race.scratchings.join(", ")]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EliteBlock, { read }),
			bookEntry ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 rounded-xl border border-line bg-surface px-4 py-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Suggested and stored. Add a stake only if you bet it."
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onOpenBook,
						className: "press h-11 shrink-0 text-sm text-gold",
						children: "Open book"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StakeFields, {
					entry: bookEntry,
					onCommit: onStake
				})]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-4 flex flex-col gap-2",
				children: race.runners.map((runner) => {
					const saved = watch.some((w) => w.id === `${race.id}-${runner.number}`);
					const open = openRunner === runner.number;
					const isPick = read.pick?.number === runner.number && read.decision === "pick";
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: `rounded-xl border bg-surface ${isPick ? "border-gold" : "border-line"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start gap-3 p-3",
							children: [
								runner.scratched ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex min-w-0 flex-1 items-start gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RunnerNumber, {
										runner,
										isPick: false
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RunnerName, {
										race,
										runner
									})]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									"aria-expanded": open,
									onClick: () => setOpenRunner(runner.number),
									className: "press flex min-w-0 flex-1 items-start gap-3 text-left",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RunnerNumber, {
										runner,
										isPick
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "min-w-0 flex-1",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "flex items-start gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RunnerName, {
												race,
												runner
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: `chev mt-1 size-4 shrink-0 text-muted ${open ? "open" : ""}` })]
										})
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "shrink-0 text-right",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "font-semibold tabular-nums",
											children: money(runner.sportsbet)
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-muted",
											children: "Sportsbet"
										}),
										runner.bestWin != null && runner.bestBook ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "mt-1 text-xs text-muted tabular-nums",
											children: [
												"Best ",
												money(runner.bestWin),
												" ",
												runner.bestBook
											]
										}) : null
									]
								}),
								runner.scratched && !saved ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-11 shrink-0" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-pressed": saved,
									"aria-label": saved ? `Remove ${runner.name} from watch` : `Watch ${runner.name}`,
									onClick: () => onWatch(race, runner),
									className: "press grid size-11 shrink-0 place-items-center rounded-full",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "icon-swap",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bookmark, { className: `size-4 fill-gold text-gold ${saved ? "is-on" : "is-off"}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bookmark, { className: `size-4 text-muted ${saved ? "is-off" : "is-on"}` })]
									})
								})
							]
						}), runner.scratched ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: `fold ${open ? "open" : ""}`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "fold-inner",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "border-t border-line px-3 py-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-sm text-muted",
										children: [
											pilot(race.category),
											" ",
											runner.jockey ?? "—",
											runner.trainer ? ` · Trainer ${runner.trainer}` : "",
											runner.sportsbetPlace ? ` · Place ${money(runner.sportsbetPlace)}` : ""
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "mt-2 flex flex-wrap gap-2",
										children: runner.books.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-sm text-muted",
											children: "No bookmaker prices on this runner."
										}) : runner.books.map((book) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "rounded-full bg-surface-2 px-2.5 py-1 text-xs tabular-nums",
											children: [
												book.label,
												" ",
												money(book.win)
											]
										}, book.key))
									})]
								})
							})
						})]
					}, runner.number);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-4 rounded-xl border border-line bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-xl",
						children: "Outside research"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-pretty text-muted",
						children: "One pass on this race: live search for independent tips, kept separate from the card read. It does not run on its own."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: onResearch,
						disabled: researching,
						className: "press mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gold px-4 font-semibold text-ink disabled:opacity-60 sm:w-auto",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "icon-swap",
							"aria-hidden": "true",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: `size-4 spin ${researching ? "is-on" : "is-off"}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: `size-4 ${researching ? "is-off" : "is-on"}` })]
						}), researching ? "Researching…" : research ? "Research again" : "Research this race"]
					}),
					researching ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResearchSkeleton, {}) : null,
					!researching && research && "error" in research ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 rounded-xl border border-line bg-bg px-3 py-2 text-sm text-pretty",
						role: "alert",
						children: research.error
					}) : null,
					!researching && research && !("error" in research) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResearchBlock, { research }) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-6 text-xs text-pretty text-muted",
				children: "18+. Not a bookmaker and not a promise of a result. You still place the bet in Sportsbet. gamblinghelponline.org.au · 1800 858 858"
			})
		]
	});
}
function RunnerNumber({ runner, isPick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: `grid size-10 shrink-0 place-items-center rounded-md font-display text-lg ${runner.scratched ? "bg-bg text-muted" : isPick ? "bg-gold text-ink" : "bg-surface-2 text-fg"}`,
		children: runner.number
	});
}
function RunnerName({ race, runner }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "min-w-0 flex-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: `block text-pretty font-medium ${runner.scratched ? "text-muted line-through" : ""}`,
			children: runner.name
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "mt-0.5 block text-sm text-muted",
			children: [
				runner.barrier ? `${race.category === "greyhound" ? "Box" : "Bar"} ${runner.barrier}` : "Bar —",
				runner.form ? ` · ${runner.form}` : "",
				runner.jockey ? ` · ${runner.jockey}` : runner.trainer ? ` · ${runner.trainer}` : ""
			]
		})]
	});
}
function EliteBlock({ read }) {
	if (!read.inWindow && read.minutes > 15) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-4 rounded-xl border border-line bg-surface p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm tracking-wide text-gold uppercase",
			children: "Outside 15 min"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 text-sm text-pretty text-muted",
			children: read.noBetReason
		})]
	});
	if (read.decision === "no_bet" || !read.pick) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-4 rounded-xl border border-line bg-surface p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm tracking-wide text-gold uppercase",
				children: "No bet"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-pretty",
				children: read.noBetReason
			}),
			read.favourite ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-sm text-muted",
				children: [
					"Market favourite #",
					read.favourite.number,
					" ",
					read.favourite.name,
					" ",
					money(read.favourite.price)
				]
			}) : null
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-4 rounded-xl border border-gold bg-surface p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm tracking-wide text-gold uppercase",
				children: read.pick.tag === "value" ? "Elite angle · value" : "Elite angle · agreement"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 font-display text-2xl leading-tight",
				children: [
					"#",
					read.pick.number,
					" ",
					read.pick.name,
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-gold tabular-nums",
						children: money(read.pick.price)
					})
				]
			}),
			read.favourite && read.favourite.number !== read.pick.number ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-sm text-muted",
				children: [
					"Market favourite #",
					read.favourite.number,
					" ",
					read.favourite.name,
					" ",
					money(read.favourite.price)
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted",
				children: "Same runner as the market favourite."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-sm text-muted tabular-nums",
				children: [
					"Order ",
					read.ranking.join(" → "),
					read.marketOrder.length ? ` · Market ${read.marketOrder.join(" → ")}` : ""
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 flex flex-col gap-1 text-sm",
				children: read.reasons.map((reason) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: reason }, reason))
			}),
			read.concerns.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 flex flex-col gap-1 text-sm text-muted",
				children: read.concerns.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: c }, c))
			}) : null
		]
	});
}
function ResearchSkeleton() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-4 border-t border-line pt-3",
		"aria-busy": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Looking for independent tips…"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bone, { className: "mt-3 h-3 w-40 max-w-full rounded-md" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bone, { className: "mt-2 h-3 w-full rounded-md" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bone, { className: "mt-2 h-3 w-4/5 rounded-md" })
		]
	});
}
function ResearchBlock({ research }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pane-in mt-4 border-t border-line pt-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm tracking-wide text-gold uppercase",
				children: [
					research.noBet ? "Research · no bet" : "Research pick",
					" · ",
					research.confidence,
					" confidence",
					research.cardOnly ? " · card only" : ""
				]
			}),
			!research.noBet && research.pickNumber ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 font-display text-xl",
				children: [
					"#",
					research.pickNumber,
					" ",
					research.pickName
				]
			}) : null,
			research.sources.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-2 text-sm text-muted",
				children: research.sources.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [s.name, s.selection ? ` — ${s.selection}` : ""] }, s.name))
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-muted",
				children: "No outside source was verified for this race."
			}),
			research.consensus ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-3 text-sm text-pretty break-words",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-muted",
					children: "Consensus. "
				}), research.consensus]
			}) : null,
			research.synthesis ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-sm text-pretty break-words",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-muted",
					children: "Synthesis. "
				}), research.synthesis]
			}) : null,
			research.ranking.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-sm text-muted tabular-nums",
				children: ["Order ", research.ranking.join(" → ")]
			}) : null
		]
	});
}
function ScanPane({ reads, races, now, onBack, onOpen }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "pane-in px-4 pt-4 pb-32 md:pb-24",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: onBack,
				className: "press mb-3 inline-flex h-11 items-center gap-1 text-sm text-muted md:hidden",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "size-4" }), "Card"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: "15-minute scan"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 max-w-prose text-sm text-pretty text-muted",
				children: [
					reads.length === 0 ? "Nothing is jumping inside 15 minutes." : `${reads.length} ${reads.length === 1 ? "race" : "races"} jumping inside 15 minutes, all codes.`,
					" ",
					"The order is a form, barrier and Sportsbet-price read. If the field can't be checked, it stays a no bet. Use Research on a race when you want outside tips."
				]
			}),
			reads.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 rounded-xl border border-line bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid size-11 place-items-center rounded-full bg-surface-2 text-gold",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hourglass, { className: "size-5" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 font-display text-2xl",
						children: "No bet yet."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-pretty text-muted",
						children: "Come back closer to jump, or open the hour view and wait for something to enter the window."
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "rise-list mt-4 flex flex-col gap-3",
				children: reads.map((read) => {
					const race = races.find((r) => r.id === read.raceId);
					if (!race) return null;
					const pick = read.decision === "pick" && read.pick;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-xl border border-line bg-surface p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-baseline justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "font-display text-xl",
									children: [
										race.venue,
										" R",
										race.raceNumber
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-gold tabular-nums",
									children: countdown(new Date(race.startTime).getTime() - now)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-muted",
								children: [
									codeLabel(race.category),
									race.country !== "AU" ? ` · ${race.country}` : "",
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-gold",
										children: [" · ", pick ? read.pick?.tag === "value" ? "Value" : "Agrees" : "No bet"]
									})
								]
							}),
							pick && read.pick ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-2 text-lg",
								children: [
									"#",
									read.pick.number,
									" ",
									read.pick.name,
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-gold tabular-nums",
										children: money(read.pick.price)
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-muted",
								children: [
									read.pick.tag === "value" ? "Value against the favourite. " : "Agrees with the favourite. ",
									"Order ",
									read.ranking.join(" → ")
								]
							})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-pretty",
								children: read.noBetReason
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => onOpen(race.id),
								className: "press mt-3 h-11 rounded-full border border-line px-4 text-sm",
								children: "Open race"
							})
						]
					}, read.raceId);
				})
			})
		]
	});
}
function WatchList({ watch, now, onBack, onOpen, onClear }) {
	const ordered = [...watch].sort((a, b) => {
		const da = new Date(a.startTime).getTime() - now;
		const db = new Date(b.startTime).getTime() - now;
		const aPast = da < -9e4;
		if (aPast !== db < -9e4) return aPast ? 1 : -1;
		return da - db;
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "pane-in px-4 pt-4 pb-32",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: onBack,
				className: "press mb-3 inline-flex h-11 items-center gap-1 text-sm text-muted md:hidden",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "size-4" }), "Card"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: "Watch"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-muted",
				children: "Saved on this phone only. The bet still goes in Sportsbet."
			}),
			ordered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 rounded-xl border border-line bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid size-11 place-items-center rounded-full bg-surface-2 text-gold",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bookmark, { className: "size-5" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 font-display text-2xl",
						children: "Nothing on the watch yet."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-pretty text-muted",
						children: "Open a race and bookmark a runner. It stays on this phone, with the price you saw and the jump time."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onBack,
						className: "press mt-4 hidden h-11 rounded-full border border-line px-4 text-sm md:inline-flex md:items-center",
						children: "Back to the card"
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "rise-list mt-4 flex flex-col gap-2",
				children: ordered.map((item) => {
					const ms = new Date(item.startTime).getTime() - now;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: `flex items-center gap-3 rounded-xl border border-line bg-surface p-3 ${ms < -9e4 ? "opacity-60" : ""}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => onOpen(item.raceId),
							className: "press min-w-0 flex-1 text-left",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "font-medium text-pretty",
								children: [
									"#",
									item.number,
									" ",
									item.name
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-muted tabular-nums",
								children: [
									item.venue,
									" R",
									item.raceNumber,
									" · ",
									money(item.price),
									" · ",
									countdown(ms)
								]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => onClear(item.id),
							className: "press h-11 shrink-0 px-3 text-sm text-muted",
							children: "Remove"
						})]
					}, item.id);
				})
			})
		]
	});
}
var $$splitComponentImporter = () => import("./routes-BWve47zx.mjs");
var Route = createFileRoute("/")({
	loader: async () => {
		try {
			return await loadBoard({ data: { limit: 18 } });
		} catch (error) {
			const message = error instanceof Error ? error.message : "The live card couldn't be loaded.";
			return {
				races: [],
				fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
				error: message
			};
		}
	},
	pendingComponent: BoardPending,
	pendingMs: 200,
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var rootRouteChildren = { IndexRoute: Route.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$1
}) };
var routeTree = Route$1._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
function getRouter() {
	return createRouter({
		routeTree,
		defaultErrorComponent: AppErrorComponent
	});
}
//#endregion
export { Route as n, RacingDesk as r, router_exports as t };
