import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotFoundError } from "./errors";

export enum OpinionDegree {
  StronglyDisagree = "Strongly Disagree",
  Disagree = "Disagree",
  SlightlyDisagree = "Slightly Disagree",
  Neutral = "Neutral",
  SlightlyAgree = "Slightly Agree",
  Agree = "Agree",
  StronglyAgree = "Strongly Agree",
  Undecided = "Undecided",
}

export interface SideDoc extends BaseDoc {
  user: ObjectId;
  issue: ObjectId;
  degree: OpinionDegree;
}

/**
 * concept: Sideing
 */
export default class SideingConcept {
  public readonly sides: DocCollection<SideDoc>;

  /**
   * Make an instance of Sideing.
   */
  constructor(collectionName: string) {
    this.sides = new DocCollection<SideDoc>(collectionName);
  }

  async create(user: ObjectId, issue: ObjectId, degreeInput: string) {
    // await this.assertGoodTitle(title);
    const degree = await this.assertDegree(degreeInput);
    const _id = await this.sides.createOne({ user, issue, degree});
    return { msg: "Side successfully created!", side: await this.sides.readOne({ _id }) };
  }

  async getAllSides() {
    // Returns all sides! You might want to page for better client performance
    return await this.sides.readMany({}, { sort: { _id: -1 } });
  }

  // async getTopicById(_id: ObjectId) {
  //   const topic = await this.sides.readOne({ _id });
  //   if (topic === null) {
  //     throw new NotFoundError(`Topic not found!`);
  //   }
  //   return topic;
  // }

  async getSideByTitle(title: string) {
    const side = await this.sides.readOne({ title });
    if (side === null) {
      throw new NotFoundError(`Side not found!`);
    }
    return side;
  }

  async searchSideTitles(title: string) {
    const sides = await this.sides.readMany({
      title: { $regex: title, $options: "i" } // case-insensitive
    });
    
    if (!sides || sides.length === 0) {
      throw new NotFoundError(`No sides found with the given title!`);
    }
    
    return sides;
  }

//   async assertAuthorIsUser(_id: ObjectId, user: ObjectId) {
//     const side = await this.sides.readOne({ _id });
//     if (!side) {
//       throw new NotFoundError(`side ${_id} does not exist!`);
//     }
//     if (side.author.toString() !== user.toString()) {
//       throw new SideAuthorNotMatchError(user, _id);
//     }
//   }

  private async assertDegree(degree: string){
    if (!Object.values(OpinionDegree).includes(degree as OpinionDegree)) {
      throw new NotFoundError(`Degree ${degree} is not a valid side!`);
    }
    return degree as OpinionDegree;
  }

//   private async assertTitleUnique(title: string) {
//     if (await this.sides.readOne({ title })) {
//       throw new NotAllowedError(`User with title ${title} already exists!`);
//     }
//   }
// }

// export class TopicAuthorNotMatchError extends NotAllowedError {
//   constructor(
//     public readonly author: ObjectId,
//     public readonly _id: ObjectId,
//   ) {
//     super("{0} is not the author of topic {1}!", author, _id);
//   }
}
