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

  async getAllTopics() {
    // Returns all topics! You might want to page for better client performance
    return await this.topics.readMany({}, { sort: { _id: -1 } });
  }

  async delete(_id: ObjectId) {
    await this.topics.deleteOne({ _id });
    return { msg: "Topic deleted successfully!" };
  }

  async getTopicByTitle(title: string) {
    const topic = await this.topics.readOne({ title });
    if (topic === null) {
      throw new NotFoundError(`Topic ${title} not found!`);
    }
    return topic;
  }

  async searchTopicTitles(title: string) {
    const topics = await this.topics.readMany({
      title: { $regex: title, $options: "i" } // case-insensitive
    });
    return topics;
  }

  async getTopicById(_id: ObjectId) {
    const topic = await this.topics.readOne({ _id });
    if (topic === null) {
      throw new NotFoundError(`Topic ${_id} does not exist!`);
    }
    return topic;
  }

  async idsToTitles(ids: ObjectId[]) {
    const topics = await this.topics.readMany({ _id: { $in: ids } });
    // Store strings in Map because ObjectId comparison by reference is wrong
    const idToTitle = new Map(topics.map((topic) => [topic._id.toString(), topic]));
    return ids.map((id) => idToTitle.get(id.toString())?.title ?? "DELETED_TOPIC");
  }

  async idToObjects(ids: ObjectId[]) {
    const topics = await this.topics.readMany({ _id: { $in: ids } });
    return topics;
  }

  async getSorted(sort: string, topicsSortedByEngagement: { target: ObjectId; responseCount: number }[]) {
    switch (sort) {
      case "newest":
        return await this.topics.readMany({}, { sort: { dateUpdated: "desc" } });
      case "random":
        return await this.topics.getRandomDocs(50);
      case "engagement": {
        const topicsByEngagement = [];
        const topicsByEngagementId = new Set();
        for (const topic of topicsSortedByEngagement) {
          try {
            topicsByEngagement.push(await this.getTopicById(topic.target));
            topicsByEngagementId.add(topic.target.toString());
          } finally {
            continue;
          }
        }
        const allTopics = await this.getAllTopics();
        for (const topic of allTopics) {
          if (!topicsByEngagementId.has(topic._id.toString())) {
            topicsByEngagement.push(topic);
          }
        }
        return topicsByEngagement;
      }
      default:
        throw new BadValuesError(`${sort} is an invalid sort option`);
    }
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
    await this.assertTitleCorrectFormat(title);
  }

  private async assertTitleUnique(title: string) {
    if (await this.topics.readOne({ title })) {
      throw new NotAllowedError(`Topic with title ${title} already exists!`);
    }
  }

  private async assertTitleCorrectFormat(title: string) {
    const regex = /.+\s+vs\.\s+.+/i; // The `i` flag makes it case-insensitive
    if (!regex.test(title)) {
      throw new NotAllowedError("Title must be in the format 'X vs. Y'");
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
