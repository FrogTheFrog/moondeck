import { SteamAppOverview } from "./getAppStore";

export interface Collection {
  AsDragDropCollection: () => {
    RemoveApps: (overviews: SteamAppOverview[]) => void;
  };
  apps: {
    has: (appId: number) => boolean;
  };
  bAllowsDragAndDrop: boolean;
}

export interface CollectionStore {
  userCollections: Collection[];
  BIsHidden: (appId: number) => boolean;
  SetAppsAsHidden: (appIds: number[], hide: boolean) => void;
}

/**
 * @returns The CollectionStore interface or null if not available.
 */
export function getCollectionStore(): CollectionStore | null {
  return (window as unknown as { collectionStore?: CollectionStore }).collectionStore ?? null;
}
