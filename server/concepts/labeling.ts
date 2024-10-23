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
      throw new LabelNotFoundError(title);
    }
    return label;
  }

  async delete(_id: ObjectId) {
    await this.labels.deleteOne({ _id });
    return { msg: "Label deleted successfully!" };
  }

  async addLabelToItem(item: ObjectId, title: string) {
    const label = await this.labels.readOne({ title });
    if (!label) {
      throw new LabelNotFoundError(title);
    }
    const check_current_items = label.items.map(item => item.toString());
    const updated_items = label.items;
    if (!check_current_items.includes(item.toString())) {
      updated_items.push(item);
    } else {
      throw new NotAllowedError(`Label ${title} already added to item!`);
    }
    await this.labels.partialUpdateOne({ title }, { items: updated_items });
    return { msg: `Label ${title} successfully added to item!`, label: await this.labels.readOne({ title }) };
  }

  async removeLabelFromItem(item: ObjectId, title: string) {
    const label = await this.labels.readOne({ title });
    if (!label) {
      throw new LabelNotFoundError(title);
    }
    const check_current_items = label.items.map(item => item.toString());
    if (!check_current_items.includes(item.toString())) {
      throw new NotAllowedError(`Label ${title} isn't attached to the item!`);
    }
    const updated_items = label.items.filter(currentItem => currentItem.toString() !== item.toString());
    console.log(updated_items);
    await this.labels.partialUpdateOne({ title }, { items: updated_items });
    return { msg: `Label ${title} successfully removed from item!`, label: await this.labels.readOne({ title }) };
  }

  async getItems(title: string) {
    const tag = await this.labels.readOne({ title });
    if (!tag) {
      throw new LabelNotFoundError(title);
    }
    return { msg: `Successfully found all items with label ${title}!`, items: tag.items };
  }
  
  async getLabelsByItem(item: ObjectId): Promise<{ msg: string; labels: LabelDoc[] }> {
    const labels: LabelDoc[] = await this.labels.collection.aggregate([
      {
        $match: { items: item }
      },
      {
        $project: {
          _id: 1,
          author: 1,
          title: 1,
          items: 1
        }
      }
    ]).toArray() as LabelDoc[];
    return { msg: `Successfully found all labels containing item ${item}!`, labels: labels };
  }

  
  async filterByLabelFromGiven(given: ObjectId[], title: string) {
    const givenString = given.map(item => item.toString());
    const items = (await this.getItems(title)).items;
    const filtered_items = items.filter(item => givenString.includes(item.toString()));
    return filtered_items;
  }

  async assertAuthorIsUser(title: string, user: ObjectId) {
    const label = await this.labels.readOne({ title });
    if (!label) {
      throw new LabelNotFoundError(title);
    }
    if (label.author.toString() !== user.toString()) {
      throw new LabelAuthorNotMatchError(user, title);
    }
  }

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

export class LabelAuthorNotMatchError extends NotFoundError {
  constructor(
    public readonly author: ObjectId,
    public readonly title: string,
  ) {
    super("{0} is not the author of label {1}!", author, title);
  }
}

export class LabelNotFoundError extends NotAllowedError {
  constructor(
    public readonly title: string,
  ) {
    super(`Label ${title} does not exist!`);
  }
}
