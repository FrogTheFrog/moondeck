import { getCollectionStore } from "./getCollectionStore";
import { logger } from "../lib/logger";

/**
 * Removes collection for the given tag.
 */
export async function removeCollection(tag: string): Promise<boolean> {
  const collectionStore = getCollectionStore();
  if (collectionStore === null) {
    logger.error(`Could not remove collection for ${tag} - null collectionStore!`);
    return false;
  }

  const collectionId = collectionStore.GetCollectionIDByUserTag(tag);
  if (typeof collectionId !== "string") {
    return true;
  }

  const collection = collectionStore.GetCollection(collectionId);
  if (!collection) {
    logger.error(`Could not remove collection for ${tag} - failed to get collection!`);
    return false;
  }

  await collection.Delete();
  return true;
}
