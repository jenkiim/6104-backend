import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

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
    const _id = await this.responses.createOne({ author, title, content, target});
    return { msg: "Response successfully created!", response: await this.responses.readOne({ _id }) };
  }

  async getResponses() {
    // Returns all responses! You might want to page for better client performance
    return await this.responses.readMany({}, { sort: { _id: -1 } });
  }

  async getByAuthor(author: ObjectId) {
    return await this.responses.readMany({ author });
  }

  async getByTarget(target: ObjectId) {
    return await this.responses.readMany({ target });
  }

  async getByAuthorAndTarget(author: ObjectId, target: ObjectId) {
    return await this.responses.readMany({ author, target });
  }

  async updateTitle(_id: ObjectId, title?: string) { //, options?: ResponseOptions
    // Note that if content or options is undefined, those fields will *not* be updated
    // since undefined values for partialUpdateOne are ignored.
    await this.responses.partialUpdateOne({ _id }, { title });
    return { msg: "Response successfully updated!" };
  }

  async updateContent(_id: ObjectId, content?: string) { //, options?: ResponseOptions
    // Note that if content or options is undefined, those fields will *not* be updated
    // since undefined values for partialUpdateOne are ignored.
    await this.responses.partialUpdateOne({ _id }, { content });
    return { msg: "Response successfully updated!" };
  }


  async delete(_id: ObjectId) {
    await this.responses.deleteOne({ _id });
    return { msg: "Response deleted successfully!" };
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
}

export class ResponseAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of response {1}!", author, _id);
  }
}
