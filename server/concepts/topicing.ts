import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { BadValuesError, NotAllowedError, NotFoundError } from "./errors";

export interface TopicDoc extends BaseDoc {
  author: ObjectId;
  title: string;
  description: string;
}

/**
 * concept: Topicing
 */
export default class TopicingConcept {
  public readonly topics: DocCollection<TopicDoc>;

  /**
   * Make an instance of Topicing.
   */
  constructor(collectionName: string) {
    this.topics = new DocCollection<TopicDoc>(collectionName);
  }

  async create(author: ObjectId, title: string, description: string) {
    await this.assertGoodTitle(title);
    const _id = await this.topics.createOne({ author, title, description});
    return { msg: "Topic successfully created!", topic: await this.topics.readOne({ _id }) };
  }

  async getTopics() {
    // Returns all topics! You might want to page for better client performance
    return await this.topics.readMany({}, { sort: { _id: -1 } });
  }

  async delete(_id: ObjectId) {
    await this.topics.deleteOne({ _id });
    return { msg: "Topic deleted successfully!" };
  }

  // async getTopicById(_id: ObjectId) {
  //   const topic = await this.topics.readOne({ _id });
  //   if (topic === null) {
  //     throw new NotFoundError(`Topic not found!`);
  //   }
  //   return topic;
  // }

  async getTopicByTitle(title: string) {
    const topic = await this.topics.readOne({ title });
    if (topic === null) {
      throw new NotFoundError(`Topic not found!`);
    }
    return topic;
  }

  async assertAuthorIsUser(_id: ObjectId, user: ObjectId) {
    const topic = await this.topics.readOne({ _id });
    if (!topic) {
      throw new NotFoundError(`Topic ${_id} does not exist!`);
    }
    if (topic.author.toString() !== user.toString()) {
      throw new TopicAuthorNotMatchError(user, _id);
    }
  }

  private async assertGoodTitle(title: string) {
    if (!title) {
      throw new BadValuesError("Title must be non-empty!");
    }
    await this.assertTitleUnique(title);
  }

  private async assertTitleUnique(title: string) {
    if (await this.topics.readOne({ title })) {
      throw new NotAllowedError(`User with title ${title} already exists!`);
    }
  }
}

export class TopicAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of topic {1}!", author, _id);
  }
}
