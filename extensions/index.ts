import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { clearAllAnimations } from "./renderer/tool/result.ts";
import { installDefaultMode, type DefaultModeHooks } from "./renderer/default-mode.ts";
import {
	installToolMouseInteraction,
	teardownToolMouseInteraction,
} from "./renderer/mouse/interaction.ts";
import { installWriteOverride, WriteExecutionMetadataStore } from "./renderer/tool/diff/index.ts";

/**
 * Focused package entry point for the managed dotfiles setup.
 *
 * Keep tool cards, click-to-expand behavior, and rich diffs without replacing
 * Pi's header, footer, thinking, Markdown, context, or autocomplete.
 */
export default function (pi: ExtensionAPI): void {
	const writeExecutionMetadata = new WriteExecutionMetadataStore();
	const mouseOwner = {};
	let renderer: DefaultModeHooks | undefined;

	function ensureRenderer(ctx: any): void {
		if (renderer || ctx?.mode !== "tui" || !ctx?.hasUI) return;
		renderer = installDefaultMode(writeExecutionMetadata);
	}

	pi.on("session_start", async (_event, ctx) => {
		installWriteOverride(pi, writeExecutionMetadata);
		ensureRenderer(ctx);
		if (ctx?.mode === "tui" && ctx?.hasUI) {
			installToolMouseInteraction(ctx, mouseOwner);
		}
	});

	pi.on("session_compact", async (_event, ctx) => {
		ensureRenderer(ctx);
		if (ctx?.mode === "tui" && ctx?.hasUI) {
			installToolMouseInteraction(ctx, mouseOwner);
		}
	});

	pi.on("session_shutdown", async () => {
		writeExecutionMetadata.clear();
		teardownToolMouseInteraction(mouseOwner);
		renderer?.shutdown();
		renderer = undefined;
		clearAllAnimations();
	});
}
