import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { installDefaultMode, type DefaultModeHooks } from "./renderer/default-mode.ts";
import {
	installToolMouseInteraction,
	scheduleSessionRender,
	teardownToolMouseInteraction,
} from "./renderer/mouse/interaction.ts";
import { getToolMouseTui } from "./renderer/mouse/scroll.ts";
import { installWriteOverride, WriteExecutionMetadataStore } from "./renderer/tool/diff/index.ts";
import { installToolGrouping, type ToolGroupingHooks } from "./renderer/tool/grouping.ts";
import { clearAllAnimations } from "./renderer/tool/result.ts";

/**
 * Focused package entry point for the managed dotfiles setup.
 *
 * Keep grouped tool cards, click-to-expand behavior, and rich diffs without
 * replacing Pi's header, footer, thinking, Markdown, context, or autocomplete.
 */
export default function (pi: ExtensionAPI): void {
	const writeExecutionMetadata = new WriteExecutionMetadataStore();
	const mouseOwner = {};
	let renderer: DefaultModeHooks | undefined;
	let grouping: ToolGroupingHooks | undefined;

	function refreshGrouping(ctx?: any): void {
		grouping?.refresh(getToolMouseTui());
		ctx?.ui?.requestRender?.(true);
	}

	function ensureRenderer(ctx: any): void {
		if (renderer || ctx?.mode !== "tui" || !ctx?.hasUI) return;
		renderer = installDefaultMode(writeExecutionMetadata);
		grouping = installToolGrouping(() => true);
	}

	function bindTui(ctx: any): void {
		ensureRenderer(ctx);
		if (ctx?.mode !== "tui" || !ctx?.hasUI) return;
		installToolMouseInteraction(ctx, mouseOwner);
		grouping?.setTheme(ctx.ui.theme);
		refreshGrouping(ctx);
		scheduleSessionRender(() => refreshGrouping(ctx));
	}

	pi.on("session_start", async (_event, ctx) => {
		installWriteOverride(pi, writeExecutionMetadata);
		bindTui(ctx);
	});

	pi.on("session_compact", async (_event, ctx) => {
		bindTui(ctx);
	});

	pi.on("session_tree", async (_event, ctx) => {
		bindTui(ctx);
	});

	pi.on("tool_execution_start", async (_event, ctx) => {
		grouping?.setTheme(ctx.ui.theme);
	});

	pi.on("session_shutdown", async () => {
		writeExecutionMetadata.clear();
		teardownToolMouseInteraction(mouseOwner);
		renderer?.shutdown();
		grouping?.shutdown();
		renderer = undefined;
		grouping = undefined;
		clearAllAnimations();
	});
}
