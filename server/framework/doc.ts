import {
  BulkWriteOptions,
  Collection,
  CountDocumentsOptions,
  DeleteOptions,
  DeleteResult,
  Document,
  Filter,
  FindOneAndUpdateOptions,
  FindOptions,
  ObjectId,
  OptionalUnlessRequiredId,
  ReplaceOptions,
  UpdateResult,
  WithoutId,
} from "mongodb";

import db from "../db";

export interface BaseDoc {
  _id: ObjectId;
  dateCreated: Date;
  dateUpdated: Date;
}

export type WithoutBase<T extends BaseDoc> = Omit<T, keyof BaseDoc>;

/**
 * MongoDB collection with operations that maintain created and updated timestamps.
 *
 * Note that you may wish to add more methods, e.g. using other MongoDB operations!
 */
export default class DocCollection<Schema extends BaseDoc> {
  public readonly collection: Collection<Schema>;
  private static collectionNames: Set<string> = new Set();

  constructor(public readonly name: string) {
    if (DocCollection.collectionNames.has(name)) {
      throw new Error(`Collection '${name}' already exists!`);
    }
    this.collection = db.collection(name);
  }

  /**
   * Remove internal fields from an item so that the client does not alter them.
   */
  private withoutInternal<P extends Partial<Schema>>(item: P): WithoutId<P> {
    const safe = Object.assign({}, item);
    delete safe._id;
    delete safe.dateCreated;
    delete safe.dateUpdated;
    return safe;
  }

  /**
   * Add `item` to the collection.
   * @returns the object ID of the inserted document
   */
  async createOne(item: Partial<Schema>): Promise<ObjectId> {
    const safe = this.withoutInternal(item);
    safe.dateCreated = new Date();
    safe.dateUpdated = new Date();
    return (await this.collection.insertOne(safe as OptionalUnlessRequiredId<Schema>)).insertedId;
  }

  /**
   * Add `items` to the collection.
   * @returns a record object of the form `{ <index>: <object ID> }` for inserted documents
   */
  async createMany(items: Partial<Schema>[], options?: BulkWriteOptions): Promise<Record<number, ObjectId>> {
    const safe = items.map((item) => {
      const safe = this.withoutInternal(item);
      safe.dateCreated = new Date();
      safe.dateUpdated = new Date();
      return safe;
    });
    return (await this.collection.insertMany(safe as OptionalUnlessRequiredId<Schema>[], options)).insertedIds;
  }

  /**
   * Read the document that matches `filter`
   * @returns the document, or `null` if no document matches
   */
  async readOne(filter: Filter<Schema>, options?: FindOptions): Promise<Schema | null> {
    return await this.collection.findOne<Schema>(filter, options);
  }

  /**
   * Read all documents that match `filter`
   * @returns all matching documents
   */
  async readMany(filter: Filter<Schema>, options?: FindOptions): Promise<Schema[]> {
    return await this.collection.find<Schema>(filter, options).toArray();
  }

  /**
   * Replace the document that matches `filter` with `item`.
   * @returns an object describing what was updated
   */
  async replaceOne(filter: Filter<Schema>, item: Partial<Schema>, options?: ReplaceOptions): Promise<UpdateResult<Schema> | Document> {
    const safe = this.withoutInternal(item);
    safe.dateUpdated = new Date();
    return await this.collection.replaceOne(filter, safe as WithoutId<Schema>, options);
  }

  /**
   * Update the document that matches `filter` with fields in `update`; only fields in `update` are updated.
   * @returns an object describing what was updated
   */
  async partialUpdateOne(filter: Filter<Schema>, update: Partial<Schema>, options?: FindOneAndUpdateOptions): Promise<UpdateResult<Schema>> {
    const safe = this.withoutInternal(update);
    safe.dateUpdated = new Date();
    return await this.collection.updateOne(filter, { $set: safe as Partial<Schema> }, options);
  }

  /**
   * Delete the document that matches `filter`.
   * @returns an object describing what was deleted
   */
  async deleteOne(filter: Filter<Schema>, options?: DeleteOptions): Promise<DeleteResult> {
    return await this.collection.deleteOne(filter, options);
  }

  /**
   * Delete all documents that match `filter`.
   * @returns an object describing what was deleted
   */
  async deleteMany(filter: Filter<Schema>, options?: DeleteOptions): Promise<DeleteResult> {
    return await this.collection.deleteMany(filter, options);
  }

  /**
   * Count all documents that match `filter`.
   * @returns the count
   */
  async count(filter: Filter<Schema>, options?: CountDocumentsOptions): Promise<number> {
    return await this.collection.countDocuments(filter, options);
  }

  /**
   * Pop one document that matches `filter`, equivalent to calling `readOne` and `deleteOne`.
   * @returns the document, or `null` if no document matches
   */
  async popOne(filter: Filter<Schema>): Promise<Schema | null> {
    const one = await this.readOne(filter);
    if (one === null) {
      return null;
    }
    await this.deleteOne({ _id: one._id } as Filter<Schema>);
    return one;
  }

  /*
   * You may wish to add more methods, e.g. using other MongoDB operations!
   */

  /**
   * Get random documents from the collection.
   * @param limit Number of documents to return.
   */
  async getRandomDocs(limit: number): Promise<Schema[]> {
    return await this.collection.aggregate<Schema>([{ $sample: { size: limit } }]).toArray();
  }

  async getRandomDocsWithTarget(limit: number, target: ObjectId): Promise<Schema[]> {
    return await this.collection.aggregate<Schema>([
      { $match: { target: target } }, // Match documents where target equals the given target
      { $sample: { size: limit } }      // Then randomly sample the matched documents
    ]).toArray();
  }

  /**
   * Get targets sorted by the count of responses for each target.
   * @returns An array of objects, each containing a target and its response count.
   */
  async getSortedByResponseCount(): Promise<{ target: ObjectId; responseCount: number }[]> {
    return await this.collection
      .aggregate<{ target: ObjectId; responseCount: number }>([
        { $group: { _id: "$target", responseCount: { $sum: 1 } } },
        { $sort: { responseCount: -1 } },
        { $project: { target: "$_id", responseCount: 1, _id: 0 } }  // renaming _id to target for clarity
      ])
      .toArray();
  }

  /**
   * Get items sorted by the count of upvotes, filtered by a specific list of item IDs.
   * @param itemIds - An array of item IDs to filter and sort by upvote count.
   * @returns An array of objects, each containing an item and its upvote count.
   */
  async getSortedByUpvoteCountForItem(itemIds: ObjectId[]): Promise<ObjectId[]> {
    const results = await this.collection.aggregate([
      {
        $match: { item: { $in: itemIds } }
      },
      {
        $sort: { count: -1 } 
      },
    ]).toArray();
    return results.map(result => result.item);
  }

  /**
   * Get items sorted by the absolute count, filtered by a specific list of item IDs.
   * @param itemIds - An array of item IDs to filter and sort by count.
   * @returns An array of objects, each containing an item and its absolute count.
   */
  async getSortedByControversyForItems(itemIds: ObjectId[]): Promise<ObjectId[]> {
    const results = await this.collection.aggregate([
      {
        $match: { item: { $in: itemIds } } // Filter by item IDs
      },
      {
        $project: {
          item: 1,
          absoluteCount: { $abs: "$count" } // Calculate the absolute value of count
        }
      },
      {
        $sort: { absoluteCount: 1 } // Sort by absoluteCount in ascending order
      },
      {
        $project: {
          _id: 0, // Exclude the default _id field
          item: 1 // Include only the item field in the output
        }
      }
    ]).toArray();
    
    return results.map(result => result.item);
  }
}
