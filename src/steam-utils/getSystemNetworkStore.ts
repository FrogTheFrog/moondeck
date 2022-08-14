export interface SystemNetworkStore {
  hasInternetConnection: boolean;
  hasNetworkConnection: boolean;
}

/**
 * @returns The SystemNetworkStore interface or null if not available.
 */
export function getSystemNetworkStore(): SystemNetworkStore | null {
  return (window as unknown as { SystemNetworkStore?: SystemNetworkStore }).SystemNetworkStore ?? null;
}
