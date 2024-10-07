import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

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
    const degree = await this.assertDegree(degreeInput);
    await this.assertNewTopic(user, issue);
    const _id = await this.sides.createOne({ user, issue, degree });
    return { msg: "Side successfully created!", side: await this.sides.readOne({ _id }) };
  }

  // async getAllSides() {
  //   // Returns all sides! You might want to page for better client performance
  //   return await this.sides.readMany({}, { sort: { _id: -1 } });
  // }

  async getSideByUserAndIssue(user: ObjectId, issue: ObjectId) {
    return await this.sides.readMany({ user, issue });
  }

  async getSideByUser(user: ObjectId) {
    return await this.sides.readMany({ user });
  }

  async update(user: ObjectId, issue: ObjectId, newside?: string) {
    if (newside) {
      await this.sides.partialUpdateOne({ user, issue }, { degree: await this.assertDegree(newside) });

    }
    return { msg: "Response successfully updated!" };
  }

  async assertUserHasSide(user: ObjectId, issue: ObjectId) {
    const side = await this.sides.readOne({ user, issue });
    if (!side) {
      throw new NoSideFoundForUserError(user, issue);
    }
  }

  // async assertAuthorIsUser(issue: ObjectId, user: ObjectId) {
  //   const side = await this.sides.readOne({ issue });
  //   if (!side) {
  //     throw new NotFoundError(`side ${issue} does not exist!`);
  //   }
  //   if (side.user.toString() !== user.toString()) {
  //     throw new SideAuthorNotFoundError(user, issue);
  //   }
  // }

  private async assertDegree(degree: string){
    if (!Object.values(OpinionDegree).includes(degree as OpinionDegree)) {
      throw new NotFoundError(`Degree ${degree} is not a valid side!`);
    }
    return degree as OpinionDegree;
  }

  private async assertNewTopic(user: ObjectId, issue: ObjectId) {
    const side = await this.sides.readOne({ user, issue });
    if (side) {
      throw new UserAlreadyHasTopicSideError(user, issue);
    }
  }
}

export class UserAlreadyHasTopicSideError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} already has a side for {1}!", author, _id);
  }
}

export class NoSideFoundForUserError extends NotFoundError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} doesn't have a side for topic {1}!", author, _id);
  }
}
