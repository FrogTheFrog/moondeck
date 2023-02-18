import { waitForPredicate } from "./shared";

/**
 * Waits until the services are initialized.
 */
export async function waitForServicesInitialized(): Promise<boolean> {
  type WindowEx = Window & { App?: { WaitForServicesInitialized?: () => Promise<boolean> } };
  await waitForPredicate(20, 250, () => (window as WindowEx).App?.WaitForServicesInitialized != null);

  return (await (window as WindowEx).App?.WaitForServicesInitialized?.()) ?? false;
}
