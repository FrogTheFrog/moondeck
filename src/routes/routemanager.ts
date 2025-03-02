import { LibraryAppHook } from "./libaryapp";
import { MoonDeckRouterHook } from "./moondeck";

export class RouteManager {
  private moonDeckRouteUnhook: (() => void) | null = null;
  private libraryAppUnhook: (() => void) | null = null;

  init(): void {
    this.moonDeckRouteUnhook = MoonDeckRouterHook();
    this.libraryAppUnhook = LibraryAppHook();
  }

  deinit(): void {
    if (this.moonDeckRouteUnhook !== null) {
      this.moonDeckRouteUnhook();
      this.moonDeckRouteUnhook = null;
    }
    if (this.libraryAppUnhook !== null) {
      this.libraryAppUnhook();
      this.libraryAppUnhook = null;
    }
  }
}
