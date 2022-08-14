import { AppStoreDetails, getAppStore } from "./steamutils";
import BiMap from "ts-bidirectional-map";
import { cloneDeep } from "lodash";
import { logger } from "./logger";

const patchKey = Symbol("PATCH_DATA");
type SetterPredicate<T> = (currentValue: T, newValue: T) => boolean;
interface PatchData<T> {
  patchedValue: T;
  setterPredicate: SetterPredicate<T>;
  origValue: T;
  origSetter: PropertyDescriptor["set"];
  origGetter: PropertyDescriptor["get"];
}
type PatchedData<T> = { [key in typeof patchKey]: PatchData<T> };
type PatchedSetter<T> = PropertyDescriptor["set"] & PatchedData<T>;
type PatchedGetter<T> = PropertyDescriptor["get"] & PatchedData<T>;
type MaybePatchedSetter<T> = PropertyDescriptor["set"] & Partial<PatchedData<T>>;
type MaybePatchedGetter<T> = PropertyDescriptor["get"] & Partial<PatchedData<T>>;

function makeSetterAndGetter<T>(initialData: PatchData<T>): PropertyDescriptor {
  const setter = function patchedSetter(value: T): void {
    const patchData = (patchedSetter as unknown as PatchedSetter<T>)[patchKey];
    patchData.origValue = value;
    if (patchData.setterPredicate(patchData.patchedValue, value)) {
      patchData.patchedValue = value;
      if (patchData.origSetter != null) {
        patchData.origSetter(value);
      }
    }
  } as unknown as MaybePatchedSetter<T>;
  const getter = function patchedGetter(): T {
    return (patchedGetter as unknown as PatchedGetter<T>)[patchKey].patchedValue;
  } as unknown as MaybePatchedGetter<T>;

  setter[patchKey] = initialData;
  getter[patchKey] = initialData;

  return {
    set: setter,
    get: getter,
    enumerable: true,
    configurable: true
  };
}

function getPatchData<T>(obj: object, prop: string): PatchData<T> | null {
  const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
  if (descriptor == null) {
    return null;
  }

  if (typeof descriptor.set !== "function" || typeof descriptor.get !== "function") {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setter = descriptor.set as unknown as MaybePatchedSetter<T>;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const getter = descriptor.get as unknown as MaybePatchedGetter<T>;
  if (setter == null || getter == null) {
    return null;
  }

  return setter[patchKey] ?? null;
}

function isPatched(obj: object, prop: string): boolean {
  return getPatchData(obj, prop) !== null;
}

function patchProperty<T>(obj: object, prop: string, setterPredicate: SetterPredicate<T>, value: T): void {
  if (isPatched(obj, prop)) {
    obj[prop] = value;
    return;
  }

  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(obj), prop);
  const origValue = obj[prop] as T;
  const patchData = {
    patchedValue: setterPredicate(origValue, value) ? value : origValue,
    setterPredicate,
    origValue,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    origGetter: descriptor?.get,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    origSetter: descriptor?.set
  };
  Object.defineProperty(obj, prop, makeSetterAndGetter(patchData));
}

function unpatchProperty(orig: object, out: object, prop: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(orig, prop);
  if (descriptor == null) {
    return;
  }

  let patchData: PatchData<unknown> | undefined;
  if (typeof descriptor.set === "function") {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setter = descriptor.set as unknown as MaybePatchedSetter<unknown>;
    patchData = setter[patchKey];
  } else if (typeof descriptor.get === "function") {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const getter = descriptor.set as unknown as MaybePatchedGetter<unknown>;
    patchData = getter[patchKey];
  }

  if (patchData == null) {
    return;
  }

  out[prop] = patchData.origValue;
}

export class AppDetailsPatcher<T extends keyof AppStoreDetails> {
  private unobserveCallback: (() => void) | null = null;
  private uninterceptCallback: (() => void) | null = null;
  private readonly shortcutToSteamAppIds = new BiMap<number, number>();

  constructor(private readonly propSetterPredicates: { [K in T]: SetterPredicate<AppStoreDetails[K]> }) {
  }

  init(): void {
    const appStore = getAppStore();
    if (appStore === null) {
      logger.error("appStore is null!");
      return;
    }

    // Watching for changes on custom shortcut
    this.unobserveCallback = appStore.m_mapApps.observe((details) => {
      const steamAppId = this.shortcutToSteamAppIds.get(details.name);
      if (typeof steamAppId !== "number" || details.type === "delete") {
        return;
      }

      const steamAppDetails = appStore.m_mapApps.get(steamAppId);
      if (steamAppDetails != null) {
        this.trySwapDetails(details.newValue, steamAppDetails);
      }
    });

    // Watching for changes on the actual app we are patching
    this.uninterceptCallback = appStore.m_mapApps.intercept((details) => {
      const shortcutAppId = this.shortcutToSteamAppIds.getKey(details.name);
      if (typeof shortcutAppId !== "number" || details.type === "delete" || details.newValue == null) {
        return details;
      }

      const shortcutAppDetails = appStore.m_mapApps.get(shortcutAppId);
      if (shortcutAppDetails != null) {
        this.trySwapDetails(shortcutAppDetails, details.newValue, true);
      }

      return details;
    });
  }

  deinit(): void {
    if (this.unobserveCallback !== null) {
      this.unobserveCallback();
      this.unobserveCallback = null;
    }

    if (this.uninterceptCallback !== null) {
      this.uninterceptCallback();
      this.uninterceptCallback = null;
    }

    const shortcutIds = this.shortcutToSteamAppIds.keys();
    for (const id of shortcutIds) {
      this.removePair(id);
    }
  }

  addPair(shortcutAppId: number, steamAppId: number): void {
    this.shortcutToSteamAppIds.set(shortcutAppId, steamAppId);
    this.tryUpdate(shortcutAppId);
  }

  removePair(shortcutAppId: number): void {
    const steamAppId = this.shortcutToSteamAppIds.get(shortcutAppId);
    this.shortcutToSteamAppIds.delete(shortcutAppId);

    if (typeof steamAppId === "number") {
      this.tryRestoreDetails(steamAppId);
    }
  }

  tryUpdate(shortcutAppId: number): void {
    const appStore = getAppStore();
    if (appStore === null) {
      logger.error("appStore is null!");
      return;
    }

    const steamAppId = this.shortcutToSteamAppIds.get(shortcutAppId);
    if (typeof steamAppId !== "number") {
      logger.error(`SteamAppId is not paired with ${shortcutAppId}`);
      return;
    }

    const fromDetails = appStore.m_mapApps.get(shortcutAppId);
    const toDetails = appStore.m_mapApps.get(steamAppId);
    if (fromDetails == null || toDetails == null) {
      return;
    }

    this.trySwapDetails(fromDetails, toDetails);
  }

  trySwapDetails(from: AppStoreDetails, to: AppStoreDetails, mutable = false): void {
    const appStore = getAppStore();
    if (appStore === null) {
      logger.error("appStore is null!");
      return;
    }

    to = mutable ? to : cloneDeep(to);

    for (const [prop, predicate] of Object.entries(this.propSetterPredicates)) {
      patchProperty(to, prop, predicate as SetterPredicate<unknown>, from[prop]);
    }

    logger.debug(`Patching app details from ${from.appid} to ${to.appid}.`);
    if (!mutable) {
      appStore.m_mapApps.set(to.appid, to);
    }
  }

  tryRestoreDetails(appId: number): void {
    const appStore = getAppStore();
    if (appStore === null) {
      logger.error("appStore is null!");
      return;
    }

    const details = appStore.m_mapApps.get(appId);
    if (details == null) {
      return;
    }

    const clonedDetails = cloneDeep(details);
    for (const prop of Object.keys(this.propSetterPredicates)) {
      unpatchProperty(details, clonedDetails, prop);
    }

    logger.debug(`Restoring app details for ${appId}.`);
    appStore.m_mapApps.set(clonedDetails.appid, clonedDetails);
  }
}
