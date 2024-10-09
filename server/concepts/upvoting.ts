import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotFoundError } from "./errors";

export interface UpvoteDoc extends BaseDoc {
  item: ObjectId;
  upvotes: ObjectId[];
  downvotes: ObjectId[];
  count: number;
}

/**
 * concept: Upvoting
 */
export default class UpvotingConcept {
  public readonly upvotes: DocCollection<UpvoteDoc>;

  /**
   * Make an instance of Upvoting.
   */
  constructor(collectionName: string) {
    this.upvotes = new DocCollection<UpvoteDoc>(collectionName);
  }

  async create(item: ObjectId) {
    const _id = await this.upvotes.createOne({ item, upvotes: [], downvotes: [], count: 0});
    return { msg: "Upvote Item successfully created!", upvote: await this.upvotes.readOne({ _id }) };
  }

  async upvote(item: ObjectId, user: ObjectId, title: string) {
    let upvote = await this.upvotes.readOne({ item });
    if (!upvote) {
      await this.create(item);
      upvote = await this.upvotes.readOne({ item });
      if (!upvote) {
        throw new NotFoundError(`Upvote item ${item} not found!`);
      }
    }
    const upvotesString = upvote.upvotes.map((upvote) => upvote.toString());
    if (!upvotesString.includes(user.toString())) {
      const downvotesString = upvote.downvotes.map((downvotes) => downvotes.toString());
      let currentCount = upvote.count;
      // if user was downvoting, remove downvote
      if (downvotesString.includes(user.toString())) {
        const updatedDownvotes = upvote.downvotes.filter((downvote) => downvote.toString() !== user.toString());
        currentCount += 2;
        await this.upvotes.partialUpdateOne({ item }, { downvotes: updatedDownvotes});
      } else {
        currentCount++;
      }
      const updatedUpvotes = upvote.upvotes.concat(user);
      await this.upvotes.partialUpdateOne({ item }, { upvotes: updatedUpvotes , count: currentCount });
    }
    return { msg: `Upvoted response with title ${title} and id ${item} successfully!` };
  }

  async downvote(item: ObjectId, user: ObjectId, title: string) {
    let downvote = await this.upvotes.readOne({ item });
    if (!downvote) {
      await this.create(item);
      downvote = await this.upvotes.readOne({ item });
      if (!downvote) {
        throw new NotFoundError(`Upvote item ${item} not found!`);
      }
    }
    const downvotesString = downvote.downvotes.map((downvote) => downvote.toString());
    if (!downvotesString.includes(user.toString())) {
      const upvotesString = downvote.upvotes.map((upvotes) => upvotes.toString());
      let currentCount = downvote.count;
      // if user was upvoting, remove upvote
      if (upvotesString.includes(user.toString())) {
        const updatedUpvotes = downvote.upvotes.filter((upvote) => upvote.toString() !== user.toString());
        currentCount -= 2;
        await this.upvotes.partialUpdateOne({ item }, { upvotes: updatedUpvotes});
      } else {
        currentCount--;
      }
      const updatedDownvotes = downvote.downvotes.concat(user);
      await this.upvotes.partialUpdateOne({ item }, { downvotes: updatedDownvotes , count: currentCount });
    }
    return { msg: `Downvoted response with title ${title} and id ${item} successfully!` };
  }

  async unvote(item: ObjectId, user: ObjectId, title: string) {
    let unvote = await this.upvotes.readOne({ item });
    if (!unvote) {
      await this.create(item);
      unvote = await this.upvotes.readOne({ item });
      if (!unvote) {
        throw new NotFoundError(`Upvote item ${item} not found!`);
      }
    }
    const downvotesString = unvote.downvotes.map((downvote) => downvote.toString());
    const upvotesString = unvote.upvotes.map((upvotes) => upvotes.toString());
    let currentCount = unvote.count;
    // if user was downvoting, remove downvote
    if (downvotesString.includes(user.toString())) {
      const updatedDownvotes = unvote.downvotes.filter((downvote) => downvote.toString() !== user.toString());
      currentCount++;
      await this.upvotes.partialUpdateOne({ item }, { downvotes: updatedDownvotes , count: currentCount });
    }
    // if user was upvoting, remove upvote
    if (upvotesString.includes(user.toString())) {
      const updatedUpvotes = unvote.upvotes.filter((upvote) => upvote.toString() !== user.toString());
      currentCount--;
      await this.upvotes.partialUpdateOne({ item }, { upvotes: updatedUpvotes, count: currentCount});
    }
    return { msg: `Unvoted response with title ${title} and id ${item} successfully!` };
  }

  async getCount(item: ObjectId) {
    let upvote = await this.upvotes.readOne({ item });
    if (!upvote) {
      await this.create(item);
      upvote = await this.upvotes.readOne({ item });
      if (!upvote) {
        throw new NotFoundError(`Upvote item ${item} not found!`);
      }
    }
    return upvote.count;
  }

  async sortItemsByCount(items: ObjectId[]) {
    const itemIds = await this.upvotes.getSortedByUpvoteCountForItem(items);
    for (let id of items) {
      if (!itemIds.includes(id)) {
        itemIds.push(id);
      }
    }
    return itemIds;
  }

  async sortItemsByControversy(items: ObjectId[]) {
    const itemIds = await this.upvotes.getSortedByControversyForItems(items);
    for (let id of items) {
      if (!itemIds.includes(id)) {
        itemIds.push(id);
      }
    }
    return itemIds;
  }
}