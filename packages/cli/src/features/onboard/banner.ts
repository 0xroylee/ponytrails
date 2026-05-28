import { colorizeBanner } from "../../utils/terminal-format";

export function renderDevosBanner(): string {
	return colorizeBanner(
		[
			"########  ######## ##     ##  #######   ######",
			"##     ## ##       ##     ## ##     ## ##    ##",
			"##     ## ##       ##     ## ##     ## ##",
			"##     ## ######   ##     ## ##     ##  ######",
			"##     ## ##        ##   ##  ##     ##       ##",
			"##     ## ##         ## ##   ##     ## ##    ##",
			"########  ########    ###     #######   ######",
		].join("\n"),
	);
}
