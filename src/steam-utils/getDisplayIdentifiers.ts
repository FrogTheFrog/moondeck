import { Display, getSystemDisplayManagerStore } from "./getSystemDisplayManagerStore";
import { logger } from "../lib/logger";

export interface DisplayIdentifiers {
  current: string;
  all: string[];
}

function makeIdentifier(display: Display): string {
  return `${display.description} (${display.width_mm}x${display.height_mm} mm)`;
}

/**
 * @returns The currently available display identifiers
 */
export async function getDisplayIdentifiers(): Promise<DisplayIdentifiers | null> {
  const displayStore = getSystemDisplayManagerStore();
  if (displayStore === null) {
    logger.error("Failed to get current display mode - store not available!");
    return null;
  }

  try {
    const displayState = await displayStore.GetState();
    if (!displayState || displayState.displays.length === 0) {
      logger.error("Failed to get current display mode - no displays are available!");
      return null;
    }

    const primaryDisplay = displayState.displays.find((display) => display.is_primary);
    if (!primaryDisplay) {
      if (displayState.displays.length === 1) {
        logger.warn("No primary display, falling back to only display available!");
      } else {
        logger.error("Failed to get current display mode - no primary display with multiple enabled displays!");
        return null;
      }
    }

    const currentDisplay = primaryDisplay ?? displayState.displays[0];
    return {
      current: makeIdentifier(currentDisplay),
      all: displayState.displays.map(makeIdentifier)
    };
  } catch (error) {
    logger.critical(error);
    return null;
  }
}
