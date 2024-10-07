import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { BadValuesError, NotAllowedError } from "./errors";

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

  // async assertAuthorIsUser(_id: ObjectId, user: ObjectId) {
  //   const side = await this.labels.readOne({ _id });
  //   if (!side) {
  //     throw new NotFoundError(`side ${_id} does not exist!`);
  //   }
  //   if (side.user.toString() !== user.toString()) {
  //     throw new SideAuthorNotMatchError(user, _id);
  //   }
  // }

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
      throw new NotAllowedError(`User with title ${title} already exists!`);
    }
  }
}

// export class SideAuthorNotMatchError extends NotAllowedError {
//   constructor(
//     public readonly author: ObjectId,
//     public readonly _id: ObjectId,
//   ) {
//     super("{0} is not the author of side {1}!", author, _id);
//   }
// }
