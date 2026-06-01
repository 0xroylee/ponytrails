export type PixelRobotAvatarStatus = "online" | "offline";

export type PixelRobotAntennaVariant = "dual" | "none" | "single";

export type PixelRobotEyeVariant = "offset" | "square" | "visor";

export type PixelRobotMouthVariant = "dots" | "line" | "speaker";

export type PixelRobotAccentTone = "crt" | "matrix" | "phosphor";

export type PixelRobotPanelVariant = "center" | "left" | "right";

export interface PixelRobotRecipe {
	accentTone: PixelRobotAccentTone;
	antenna: PixelRobotAntennaVariant;
	eyes: PixelRobotEyeVariant;
	mouth: PixelRobotMouthVariant;
	panel: PixelRobotPanelVariant;
}

export interface PixelRobotAvatarProps {
	className?: string;
	label: string;
	seed: string;
	size?: number;
	status?: PixelRobotAvatarStatus;
}
