import { Authing, Topicing } from "./app";
import { AlreadyFriendsError, FriendNotFoundError, FriendRequestAlreadyExistsError, FriendRequestDoc, FriendRequestNotFoundError } from "./concepts/friending";
import { ResponseAuthorNotMatchError, ResponseDoc } from "./concepts/responding";
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
