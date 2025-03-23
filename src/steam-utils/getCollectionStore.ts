import { AppStoreOverview } from "./getAppStoreEx";

export interface Collection {
  AsDragDropCollection: () => {
    AddApps: (overviews: AppStoreOverview[]) => void;
    RemoveApps: (overviews: AppStoreOverview[]) => void;
  };
  Save: () => Promise<void>;
  Delete: () => Promise<void>;
  apps: {
    keys: () => IterableIterator<number>;
    has: (appId: number) => boolean;
  };
  bAllowsDragAndDrop: boolean;
}

export interface CollectionStore {
  deckDesktopApps: Collection;
  userCollections: Collection[];
  BIsHidden: (appId: number) => boolean;
  SetAppsAsHidden: (appIds: number[], hide: boolean) => void;
  GetCollection: (collectionId: string) => Collection | undefined;
  GetCollectionIDByUserTag: (tag: string) => string | null;
  NewUnsavedCollection: (tag: string, filter: unknown | undefined, overviews: AppStoreOverview[]) => Collection | undefined;
}

/**
 * @returns The CollectionStore interface or null if not available.
 */
export function getCollectionStore(): CollectionStore | null {
  return (window as unknown as { collectionStore?: CollectionStore }).collectionStore ?? null;
}
