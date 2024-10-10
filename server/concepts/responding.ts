import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { BadValuesError, NotAllowedError, NotFoundError } from "./errors";

export interface ResponseDoc extends BaseDoc {
  author: ObjectId;
  title: string;
  content: string;
  target: ObjectId;
}

/**
 * concept: Responding [Author, Target]
 */
export default class RespondingConcept {
  public readonly responses: DocCollection<ResponseDoc>;

  /**
   * Make an instance of Responding.
   */
  constructor(collectionName: string) {
    this.responses = new DocCollection<ResponseDoc>(collectionName);
  }

  async create(author: ObjectId, title: string, content: string, target: ObjectId) {
    await this.assertGoodResponse(title, content);
    const _id = await this.responses.createOne({ author, title, content, target});
    const response = await this.responses.readOne({ _id });
    if (!response) {
      throw new NotFoundError(`Response wasn't created correctly!`);
    }
    return { msg: "Response successfully created!", response: response };
  }

  async getResponses() {
    // Returns all responses! You might want to page for better client performance
    return await this.responses.readMany({}, { sort: { _id: -1 } });
  }
//////////////////////////////////
  async getByAuthor(author: ObjectId) {
    return await this.responses.readMany({ author });
  }

  async getByTarget(target: ObjectId) {
    return await this.responses.readMany({ target });
  }

  async getByAuthorAndTarget(author: ObjectId | undefined, target: ObjectId | undefined) {
    const query: { author?: ObjectId; target?: ObjectId } = { };
    if (author !== undefined) {
      query.author = author;
    }
    if (target !== undefined) {
      query.target = target;
    }

    return await this.responses.readMany(query);
  }

  async getById(_id: ObjectId) {
    const current = await this.responses.readOne({ _id });
    if (!current) {
      throw new NotFoundError(`Response ${_id} does not exist!`);
    }
    return current;
  }

  async idsToTitles(ids: ObjectId[]) {
    const responses = await this.responses.readMany({ _id: { $in: ids } });
    // Store strings in Map because ObjectId comparison by reference is wrong
    const idToTitle = new Map(responses.map((response) => [response._id.toString(), response]));
    return ids.map((id) => idToTitle.get(id.toString())?.title ?? "DELETED_RESPONSE");
  }

  async idsToResponses(ids: ObjectId[]) {
    const responses = await this.responses.readMany({ _id: { $in: ids } });
    return responses;
  }

  async updateTitle(_id: ObjectId, title?: string) {
    // Note that if content or options is undefined, those fields will *not* be updated
    // since undefined values for partialUpdateOne are ignored.
    if (!title) {
      throw new BadValuesError("Title must be non-empty!");
    }
    await this.responses.partialUpdateOne({ _id }, { title });
    return { msg: "Response successfully updated!" };
  }

  async updateContent(_id: ObjectId, content?: string) {
    // Note that if content or options is undefined, those fields will *not* be updated
    // since undefined values for partialUpdateOne are ignored.
    if (!content) {
      throw new BadValuesError("Content must be non-empty!");
    }
    await this.responses.partialUpdateOne({ _id }, { content });
    return { msg: "Response successfully updated!" };
  }

  async delete(_id: ObjectId) {
    await this.responses.deleteOne({ _id });
    return { msg: "Response deleted successfully!" };
  }

  async getSortedByResponseCount() {
    return await this.responses.getSortedByResponseCount();
  }

  async getSorted(sort: string, target: ObjectId, sortByUpvote: ObjectId[], sortByControversy: ObjectId[]) {
    switch (sort) {
      case "newest":
        return await this.responses.readMany({ target }, { sort: { dateUpdated: "desc" } });
      case "random":
        return await this.responses.getRandomDocsWithTarget(50, target);
      case "upvotes": {
        /////// don't get responses without upvotes :(
        return await this.idsToResponses(sortByUpvote);
      }
      case "downvotes": {
        return (await this.idsToResponses(sortByUpvote)).reverse();
      }
      case "controversial": {
        return await this.idsToResponses(sortByControversy);
      }
      default:
        throw new BadValuesError(`${sort} is an invalid sort option`);
    }
  }

  async inCollection(_id: ObjectId) {
    const response = await this.responses.readOne({ _id });
    if (response) {
      return true;
    } else {
      return false;
    }
  }

  async assertAuthorIsUser(_id: ObjectId, user: ObjectId) {
    const response = await this.responses.readOne({ _id });
    if (!response) {
      throw new NotFoundError(`Response ${_id} does not exist!`);
    }
    if (response.author.toString() !== user.toString()) {
      throw new ResponseAuthorNotMatchError(user, _id);
    }
  }

  async assertResponseExists(_id: ObjectId) {
    const maybeResponse = await this.responses.readOne({ _id });
    if (maybeResponse === null) {
      return false;
    }
    return true;
  }

  private async assertGoodResponse(title: string, content: string) {
    if (!title) {
      throw new BadValuesError("Title must be non-empty!");
    }
    if (!content) {
      throw new BadValuesError("Content must be non-empty!");
    }
  }
}

export class ResponseAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of response {1}!", author, _id);
  }
}
