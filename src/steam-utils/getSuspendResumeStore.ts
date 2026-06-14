export interface SuspendResumeStore {
  RequestSleep: () => void;
  BlockSuspendAction: () => (() => void);
}

/**
 * @returns The SuspendResumeStore interface or null if not available.
 */
export function getSuspendResumeStore(): SuspendResumeStore | null {
  return (window as unknown as { SuspendResumeStore?: SuspendResumeStore }).SuspendResumeStore ?? null;
}
