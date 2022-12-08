import { findModuleChild } from "decky-frontend-lib";
import { waitForPredicate } from "./shared";

interface LibraryInitializer {
  WaitForServicesInitialized: () => Promise<boolean>;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
const LibraryInitializer = findModuleChild((mod: { [key: string]: Partial<LibraryInitializer> }): unknown => {
  if (typeof mod !== "object") {
    return undefined;
  }

  for (const prop in mod) {
    if (mod[prop]?.WaitForServicesInitialized) {
      return mod[prop];
    }
  }

  return undefined;
}) as LibraryInitializer;

/**
 * Waits until the services are initialized.
 */
export async function waitForServicesInitialized(): Promise<boolean> {
  // This is for stable
  if (LibraryInitializer != null) {
    return await LibraryInitializer.WaitForServicesInitialized();
  }

  // This is for beta
  type WindowEx = Window & { App?: { WaitForServicesInitialized?: () => Promise<boolean> } };
  await waitForPredicate(20, 250, () => (window as WindowEx).App?.WaitForServicesInitialized != null);

  return (await (window as WindowEx).App?.WaitForServicesInitialized?.()) ?? false;
}
