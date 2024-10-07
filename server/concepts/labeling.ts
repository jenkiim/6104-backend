import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { BadValuesError, NotAllowedError, NotFoundError } from "./errors";

export interface LabelDoc extends BaseDoc {
  author: ObjectId;
  title: String;
  items: ObjectId[];
}

/**
 * concept: Labeling
 */
export default class LabelingConcept {
  public readonly labels: DocCollection<LabelDoc>;

  /**
   * Make an instance of Labeling.
   */
  constructor(collectionName: string) {
    this.labels = new DocCollection<LabelDoc>(collectionName);
  }

  async create(author: ObjectId, title: string) {
    await this.assertGoodTitle(title);
    const _id = await this.labels.createOne({ author, title, items: [] });
    return { msg: "Label successfully created!", label: await this.labels.readOne({ _id }) };
  }

  async getAllLabels() {
    // Returns all labels! You might want to page for better client performance
    return await this.labels.readMany({}, { sort: { _id: -1 } });
  }

  async getLabelByTitle(title: string) {
    const label = await this.labels.readOne({ title });
    if (label === null) {
      throw new NotFoundError(`Label ${title} not found!`);
    }
    return label;
  }

  async delete(_id: ObjectId) {
    await this.labels.deleteOne({ _id });
    return { msg: "Label deleted successfully!" };
  }

  // async getSideByUserAndIssue(user: ObjectId, issue: ObjectId) {
  //   return await this.labels.readMany({ user, issue });
  // }

  // async getSideByUser(user: ObjectId) {
  //   return await this.labels.readMany({ user });
  // }

  // async update(_id: ObjectId, newside?: string) {
  //   if (newside) {
  //     await this.labels.partialUpdateOne({ _id }, { degree: await this.assertDegree(newside) });

  //   }
  //   return { msg: "Response successfully updated!" };
  // }

  async assertAuthorIsUser(title: string, user: ObjectId) {
    const label = await this.labels.readOne({ title });
    if (!label) {
      throw new NotFoundError(`Label ${title} does not exist!`);
    }
    if (label.author.toString() !== user.toString()) {
      throw new LabelAuthorNotMatchError(user, title);
    }
  }

  // private async assertDegree(degree: string){
  //   if (!Object.values(OpinionDegree).includes(degree as OpinionDegree)) {
  //     throw new NotFoundError(`Degree ${degree} is not a valid side!`);
  //   }
  //   return degree as OpinionDegree;
  // }

  private async assertGoodTitle(title: string) {
    if (!title) {
      throw new BadValuesError("Title must be non-empty!");
    }
    await this.assertTitleUnique(title);
  }

  private async assertTitleUnique(title: string) {
    if (await this.labels.readOne({ title })) {
      throw new NotAllowedError(`Label with title ${title} already exists!`);
    }
  }
}

export class LabelAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly title: string,
  ) {
    super("{0} is not the author of label {1}!", author, title);
  }
}
