import { Authing, Topicing } from "./app";
import { AlreadyFriendsError, FriendNotFoundError, FriendRequestAlreadyExistsError, FriendRequestDoc, FriendRequestNotFoundError } from "./concepts/friending";
import { LabelDoc } from "./concepts/labeling";
import { ResponseAuthorNotMatchError, ResponseDoc } from "./concepts/responding";
import { NoSideFoundForUserError, SideDoc, UserAlreadyHasTopicSideError } from "./concepts/sideing";
import { TopicAuthorNotMatchError, TopicDoc } from "./concepts/topicing";
import { Router } from "./framework/router";

/**
 * This class does useful conversions for the frontend.
 * For example, it converts a {@link ResponseDoc} into a more readable format for the frontend.
 */
export default class Responses {

  /**
     * Convert TopicDoc into more readable format for the frontend by converting the author id into a username.
     */
  static async topic(topic: TopicDoc | null) {
    if (!topic) {
      return topic;
    }
    const author = await Authing.getUserById(topic.author);
    return { ...topic, author: author.username };
  }

  /**
   * Same as {@link topic} but for an array of TopicDoc for improved performance.
   */
  static async topics(topics: TopicDoc[]) {
    const authors = await Authing.idsToUsernames(topics.map((topic) => topic.author));
    return topics.map((topic, i) => ({ ...topic, author: authors[i] }));
  }

  /**
   * Convert ResponseDoc into more readable format for the frontend by converting the author id into a username.
   */
  static async respond(response: ResponseDoc | null) {
    if (!response) {
      return response;
    }
    const author = await Authing.getUserById(response.author);
    return { ...response, author: author.username };
  }

  /**
   * Same as {@link respond} but for an array of ResponseDoc for improved performance.
   */
  static async responses(responses: ResponseDoc[]) {
    const authors = await Authing.idsToUsernames(responses.map((response) => response.author));
    return responses.map((response, i) => ({ ...response, author: authors[i] }));
  }

  /**
   * Same as {@link responses} but for ResponseDoc that are responses to topics.
   */
  static async responsesToTopic(responses: ResponseDoc[]) {
    const authors = await Authing.idsToUsernames(responses.map((response) => response.author));
    const topics = await Topicing.idsToTitles(responses.map((response) => response.target));
    return responses.map((response, i) => ({ ...response, author: authors[i], topic: topics[i] }));
  }

  /**
     * Convert SideDoc into more readable format for the frontend by converting the author id into a username.
     */
  static async side(side: SideDoc | null) {
    if (!side) {
      return side;
    }
    const author = await Authing.getUserById(side.user);
    const topic = await Topicing.getTopicById(side.issue);
    return { ...side, author: author.username, topic: topic.title };
  }

  /**
   * Same as {@link side} but for an array of SideDoc for improved performance.
   */
  static async sides(sides: SideDoc[]) {
    const authors = await Authing.idsToUsernames(sides.map((side) => side.user));
    const topics = await Topicing.idsToTitles(sides.map((side) => side.issue));
    return sides.map((side, i) => ({ ...side, author: authors[i], topic: topics[i] }));
  }

  /**
     * Convert LabelDoc into more readable format for the frontend by converting the author id into a username.
     */
  static async topicLabel(label: LabelDoc | null) {
    if (!label) {
      return label;
    }
    const items = await Topicing.idsToTitles(label.items);
    return { ...label, items: items};
  }

  /**
   * Same as {@link topicLabel} but for an array of LabelDoc for improved performance.
   */
  static async topicLabels(labels: LabelDoc[]) {
    let all_topics = [];
    for (const label of labels) {
      const items = await Topicing.idsToTitles(label.items);
      all_topics.push(items);
    }
    // const topics = await Topicing.idsToTitles(labels.map((label) => label.items.map((item) => label.items)));
    return labels.map((label, i) => ({ ...label, topic: all_topics[i] }));
  }

  /**
   * Convert FriendRequestDoc into more readable format for the frontend
   * by converting the ids into usernames.
   */
  static async friendRequests(requests: FriendRequestDoc[]) {
    const from = requests.map((request) => request.from);
    const to = requests.map((request) => request.to);
    const usernames = await Authing.idsToUsernames(from.concat(to));
    return requests.map((request, i) => ({ ...request, from: usernames[i], to: usernames[i + requests.length] }));
  }
}

Router.registerError(TopicAuthorNotMatchError, async (e) => {
  const username = (await Authing.getUserById(e.author)).username;
  // const topic = (await Topicing.getTopicById(e._id)).title;
  return e.formatWith(username, e._id);
});

Router.registerError(ResponseAuthorNotMatchError, async (e) => {
  const username = (await Authing.getUserById(e.author)).username;
  return e.formatWith(username, e._id);
});

Router.registerError(NoSideFoundForUserError, async (e) => {
  const username = (await Authing.getUserById(e.author)).username;
  const topic = (await Topicing.getTopicById(e._id)).title;
  return e.formatWith(username, topic);
});

Router.registerError(UserAlreadyHasTopicSideError, async (e) => {
  const username = (await Authing.getUserById(e.author)).username;
  const topic = (await Topicing.getTopicById(e._id)).title;
  return e.formatWith(username, topic);
});

Router.registerError(FriendRequestAlreadyExistsError, async (e) => {
  const [user1, user2] = await Promise.all([Authing.getUserById(e.from), Authing.getUserById(e.to)]);
  return e.formatWith(user1.username, user2.username);
});

Router.registerError(FriendNotFoundError, async (e) => {
  const [user1, user2] = await Promise.all([Authing.getUserById(e.user1), Authing.getUserById(e.user2)]);
  return e.formatWith(user1.username, user2.username);
});

Router.registerError(FriendRequestNotFoundError, async (e) => {
  const [user1, user2] = await Promise.all([Authing.getUserById(e.from), Authing.getUserById(e.to)]);
  return e.formatWith(user1.username, user2.username);
});

Router.registerError(AlreadyFriendsError, async (e) => {
  const [user1, user2] = await Promise.all([Authing.getUserById(e.user1), Authing.getUserById(e.user2)]);
  return e.formatWith(user1.username, user2.username);
});
