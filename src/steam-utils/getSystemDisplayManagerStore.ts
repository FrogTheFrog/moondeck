export interface DisplayMode {
  id: number;
  width: number;
  height: number;
  refresh_hz: number;
}

export interface Display {
  current_mode_id: number;
  is_internal: boolean;
  is_enabled: boolean;
  is_primary: boolean;
  modes: DisplayMode[];
}

export interface DisplayState {
  displays: Display[];
}

export interface SystemDisplayManagerStore {
  GetState: () => Promise<DisplayState | undefined | null>;
}

/**
 * @returns The SystemDisplayManagerStore interface or null if not available.
 */
export function getSystemDisplayManagerStore(): SystemDisplayManagerStore | null {
  return (window as unknown as { SystemDisplayManagerStore?: SystemDisplayManagerStore }).SystemDisplayManagerStore ?? null;
}
