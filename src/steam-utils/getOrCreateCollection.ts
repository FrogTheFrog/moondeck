import { Collection, getCollectionStore } from "./getCollectionStore";
import { logger } from "../lib/logger";

/**
 * Gets existing or creates a new collection for the given tag.
 */
export async function getOrCreateCollection(tag: string, getOnly = false): Promise<Collection | null> {
  const collectionStore = getCollectionStore();
  if (collectionStore === null) {
    logger.error(`Could not get/create collection for ${tag} - null collectionStore!`);
    return null;
  }

  const collectionId = collectionStore.GetCollectionIDByUserTag(tag);
  if (typeof collectionId === "string") {
    const collection = collectionStore.GetCollection(collectionId);
    if (!collection) {
      logger.error(`Could not get collection for ${tag} - failed to get collection!`);
      return null;
    }

    return collection;
  }

  if (getOnly) {
    return null;
  }

  const collection = collectionStore.NewUnsavedCollection(tag, undefined, []);
  if (!collection) {
    logger.error(`Could not create collection for ${tag} - failed to create collection!`);
    return null;
  }

  await collection.Save();
  return collection;
}
