import { AppStoreOverview, getAppStoreEx } from "./steamutils";
import { IMapWillChange, Lambda } from "mobx";
import BiMap from "ts-bidirectional-map";
import { ObservableObjectAdministration } from "mobx/dist/internal";
import { cloneDeep } from "lodash";
import { logger } from "./logger";

const patchKey = Symbol("MoonDeck");
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

function patchProperty<T>(obj: object, prop: string, setterPredicate: SetterPredicate<T>, value: T): boolean {
  if (isPatched(obj, prop)) {
    obj[prop] = value;
    return false;
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
  return true;
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

function getMobxAdminSymbol(obj: object): symbol | null {
  for (const symbol of Object.getOwnPropertySymbols(obj)) {
    if (symbol.description?.includes("mobx admin")) {
      return symbol;
    }
  }
  return null;
}

export class AppOverviewPatcher<T extends keyof AppStoreOverview> {
  private unobserveCallback: (() => void) | null = null;
  private uninterceptCallback: (() => void) | null = null;
  private readonly shortcutToSteamAppIds = new BiMap<number, number>();

  constructor(private readonly propSetterPredicates: { [K in T]: SetterPredicate<AppStoreOverview[K]> }) {
  }

  init(): void {
    const appStoreEx = getAppStoreEx();
    if (appStoreEx === null) {
      logger.error("appStoreEx is null!");
      return;
    }

    // Watching for changes on custom shortcut
    this.unobserveCallback = appStoreEx.observe((change) => {
      const steamAppId = this.shortcutToSteamAppIds.get(change.name);
      if (typeof steamAppId !== "number" || change.type === "delete") {
        return;
      }

      const steamAppOverview = appStoreEx.getAppOverview(steamAppId);
      if (steamAppOverview != null) {
        this.trySwapOverview(change.newValue, steamAppOverview);
      }
    });

    // Watching for changes on the actual app we are patching
    this.uninterceptCallback = appStoreEx.intercept((change) => {
      const shortcutAppId = this.shortcutToSteamAppIds.getKey(change.name);
      if (typeof shortcutAppId !== "number" || change.type === "delete" || change.newValue == null) {
        return change;
      }

      const steamAppOverview = appStoreEx.getAppOverview(shortcutAppId);
      if (steamAppOverview != null) {
        this.trySwapOverview(steamAppOverview, change.newValue, true);
      }

      return change;
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
      this.tryRestoreOverview(steamAppId);
    }
  }

  tryUpdate(shortcutAppId: number): void {
    const appStoreEx = getAppStoreEx();
    if (appStoreEx === null) {
      logger.error("appStoreEx is null!");
      return;
    }

    const steamAppId = this.shortcutToSteamAppIds.get(shortcutAppId);
    if (typeof steamAppId !== "number") {
      logger.error(`SteamAppId is not paired with ${shortcutAppId}`);
      return;
    }

    const fromOverview = appStoreEx.getAppOverview(shortcutAppId);
    const toOverview = appStoreEx.getAppOverview(steamAppId);
    if (fromOverview == null || toOverview == null) {
      return;
    }

    this.trySwapOverview(fromOverview, toOverview);
  }

  trySwapOverview(from: AppStoreOverview, to: AppStoreOverview, fromIntercept = false): void {
    const appStoreEx = getAppStoreEx();
    if (appStoreEx === null) {
      logger.error("appStoreEx is null!");
      return;
    }

    logger.debug(`Checking if need to patch overview for ${to.appid}.`);
    const mobxAdmin = getMobxAdminSymbol(to);
    if (mobxAdmin) {
      const mobxAdminObj = to[mobxAdmin] as ObservableObjectAdministration;
      const isBeingObserved = mobxAdminObj.values_.size > 0;

      if (isBeingObserved) {
        const interceptorUnregister = mobxAdminObj[patchKey] as Lambda | undefined;
        if (!interceptorUnregister) {
          logger.debug(`Patching MobX for ${to.appid}.`);
          mobxAdminObj[patchKey] = mobxAdminObj.intercept_((change: IMapWillChange<string | number, unknown>) => {
            if (change.type === "update") {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              const predicate = this.propSetterPredicates[change.name] as SetterPredicate<unknown> | undefined;
              if (predicate) {
                if (!predicate(change.object[change.name], change.newValue)) {
                  return null;
                }
              }
            }

            return change;
          });
        }

        for (const [prop] of Object.entries(this.propSetterPredicates)) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          to[prop] = from[prop];
        }

        return;
      }
    }

    to = fromIntercept ? to : cloneDeep(to);

    let patched = false;
    for (const [prop, predicate] of Object.entries(this.propSetterPredicates)) {
      patched = patchProperty(to, prop, predicate as SetterPredicate<unknown>, from[prop]) || patched;
    }

    if (patched) {
      logger.debug(`Patching setter/getter for ${to.appid}.`);
    }

    if (!fromIntercept) {
      appStoreEx.setAppOverview(to.appid, to);
    }
  }

  tryRestoreOverview(appId: number): void {
    const appStoreEx = getAppStoreEx();
    if (appStoreEx === null) {
      logger.error("appStoreEx is null!");
      return;
    }

    const overview = appStoreEx.getAppOverview(appId);
    if (overview == null) {
      return;
    }

    const mobxAdmin = getMobxAdminSymbol(overview);
    if (mobxAdmin) {
      const mobxAdminObj = overview[mobxAdmin] as ObservableObjectAdministration;
      const interceptorUnregister = mobxAdminObj[patchKey] as Lambda | undefined;
      if (interceptorUnregister) {
        logger.debug(`Unpatching MobX for ${appId}.`);
        interceptorUnregister();

        return;
      }
    }

    const clonedOverview = cloneDeep(overview);
    for (const prop of Object.keys(this.propSetterPredicates)) {
      unpatchProperty(overview, clonedOverview, prop);
    }

    logger.debug(`Restoring app overview for ${appId}.`);
    appStoreEx.setAppOverview(clonedOverview.appid, clonedOverview);
  }
}
