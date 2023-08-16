import { DisplayMode, getSystemDisplayManagerStore } from "./getSystemDisplayManagerStore";
import { findSP } from "decky-frontend-lib";
import { logger } from "../lib/logger";

/**
 * @returns The current display mode of the primary display if available
 */
export async function getCurrentDisplayMode(): Promise<DisplayMode | null> {
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

    const enabledDisplays = displayState.displays.filter((display) => display.is_enabled);
    const primaryDisplay = enabledDisplays.find((display) => display.is_primary);
    if (!primaryDisplay) {
      if (enabledDisplays.length === 1) {
        logger.warn("No primary display, falling back to only display available!");
      } else {
        logger.error("Failed to get current display mode - no primary display with multiple enabled displays!");
        return null;
      }
    }

    const currentDisplay = primaryDisplay ?? enabledDisplays[0];
    if (currentDisplay.is_internal) {
      const renderWindow = findSP();
      if (!renderWindow) {
        logger.error("Failed to get current display mode - render window not available!");
        return null;
      }

      return {
        width: Math.round(renderWindow.screen.width * renderWindow.devicePixelRatio),
        height: Math.round(renderWindow.screen.height * renderWindow.devicePixelRatio),
        id: -1,
        refresh_hz: -1
      };
    }

    const currentMode = currentDisplay.modes.find((mode) => mode.id === currentDisplay.current_mode_id);
    if (!currentMode) {
      logger.error("Failed to get current display mode - no mode matching the id!");
      return null;
    }

    return currentMode;
  } catch (error) {
    logger.critical(error);
    return null;
  }
}
