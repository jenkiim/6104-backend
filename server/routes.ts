import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Authing, RespondingToResponse, RespondingToTopic, ResponseLabeling, Sessioning, Sideing, TopicLabeling, Topicing, Upvoting } from "./app";
// import { ResponseOptions } from "./concepts/responding";
import { SessionDoc } from "./concepts/sessioning";
import Responses from "./responses";

import { z } from "zod";

/**
 * Web server routes for the app. Implements synchronizations between concepts.
 */
class Routes {
  // Synchronize the concepts from `app.ts`.

  ///// SESSIONING and AUTHING

  @Router.get("/session")
  async getSessionUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await Authing.getUsers();
  }

  @Router.get("/users/:username")
  @Router.validate(z.object({ username: z.string().min(1) }))
  async getUser(username: string) {
    return await Authing.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: SessionDoc, username: string, password: string) {
    Sessioning.isLoggedOut(session);
    return await Authing.create(username, password);
  }

  @Router.patch("/users/username")
  async updateUsername(session: SessionDoc, username: string) {
    const user = Sessioning.getUser(session);
    return await Authing.updateUsername(user, username);
  }

  @Router.patch("/users/password")
  async updatePassword(session: SessionDoc, currentPassword: string, newPassword: string) {
    const user = Sessioning.getUser(session);
    return Authing.updatePassword(user, currentPassword, newPassword);
  }

  @Router.delete("/users")
  async deleteUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    Sessioning.end(session);
    return await Authing.delete(user);
  }

  @Router.post("/login")
  async logIn(session: SessionDoc, username: string, password: string) {
    const u = await Authing.authenticate(username, password);
    Sessioning.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: SessionDoc) {
    Sessioning.end(session);
    return { msg: "Logged out!" };
  }

  ////// TOPCING

  @Router.get("/topics")
  @Router.validate(z.object({ search: z.string().optional() }))
  async getTopics(search?: string) {
    let topics;
    if (search) {
      topics = await Topicing.searchTopicTitles(search);
    } else {
      topics = await Topicing.getAllTopics();
    }
    return Responses.topics(topics);
  }

  @Router.post("/topic")
  async createTopic(session: SessionDoc, title: string, description: string) {
    const user = Sessioning.getUser(session);
    const created = await Topicing.create(user, title, description);
    return { msg: created.msg, response: await Responses.topic(created.topic) };
  }

  @Router.delete("/topic/:title")
  async deleteTopic(session: SessionDoc, title: string) {
    const user = Sessioning.getUser(session);
    const oid = (await Topicing.getTopicByTitle(title))._id;
    await Topicing.assertAuthorIsUser(oid, user);
    return Topicing.delete(oid);
  }

  ///// RESPONDING
  
  @Router.get("/responses") //////// could add functionality to speciify title of topic or response in result
  @Router.validate(z.object({ author: z.string().optional(), id: z.string().optional() }))
  async getResponses(author?: string, id?: string) {
    let responses;
    if (author && !id) {
      const authorId = (await Authing.getUserByUsername(author))._id;
      responses = await RespondingToTopic.getByAuthor(authorId);
      responses.push(...await RespondingToResponse.getByAuthor(authorId));
    }
    else if (!author && id) {
      const oid = new ObjectId(id);
      const responsesToTopic = await RespondingToTopic.getByTarget(oid);
      if (responsesToTopic.length === 0) {
        responses = await RespondingToResponse.getByTarget(oid);
      } else {
        responses = responsesToTopic;
      }
    }
    else if (author && id) {
      const authorId = (await Authing.getUserByUsername(author))._id;
      const oid = new ObjectId(id);
      const responsesToTopic = await RespondingToTopic.getByAuthorAndTarget(authorId, oid);
      if (responsesToTopic.length === 0) {
        responses = await RespondingToResponse.getByAuthorAndTarget(authorId, oid);
      } else {
        responses = responsesToTopic;
      }
    }
    else {
      responses = await RespondingToResponse.getResponses();
      responses.push(...await RespondingToTopic.getResponses());
    }
    return Responses.responses(responses);
  }

  //// RESPONDING TO TOPICS

  @Router.get("/responses/topic")
  @Router.validate(z.object({ author: z.string().optional(), topic: z.string().optional() }))
  async getResponsesToTopic(author?: string, topic?: string) {
    let responses;
    if (author && !topic) {
      const id = (await Authing.getUserByUsername(author))._id;
      responses = await RespondingToTopic.getByAuthor(id);
    }
    else if (!author && topic) {
      const id = (await Topicing.getTopicByTitle(topic))._id;
      responses = await RespondingToTopic.getByTarget(id);
    }
    else if (author && topic) {
      const authorId = (await Authing.getUserByUsername(author))._id;
      const topicId = (await Topicing.getTopicByTitle(topic))._id;
      responses = await RespondingToTopic.getByAuthorAndTarget(authorId, topicId);
    }
    else {
      responses = await RespondingToTopic.getResponses();
    }
    return Responses.responsesToTopic(responses);
  }

  @Router.post("/responses/topic/:topic")
  async createResponseToTopic(session: SessionDoc, title: string, content: string, topic: string) {
    const user = Sessioning.getUser(session);
    const topicObject = (await Topicing.getTopicByTitle(topic))._id;
    const created = await RespondingToTopic.create(user, title, content, topicObject);
    return { msg: created.msg, response: await Responses.respond(created.response) };
  }

  @Router.patch("/responses/topic/:id/title")
  async updateResponseTitleToTopic(session: SessionDoc, id: string, title?: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await RespondingToTopic.assertAuthorIsUser(oid, user);
    return await RespondingToTopic.updateTitle(oid, title);
  }

  @Router.patch("/responses/topic/:id/content")
  async updateResponseToTopic(session: SessionDoc, id: string, content?: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await RespondingToTopic.assertAuthorIsUser(oid, user);
    return await RespondingToTopic.updateContent(oid, content);
  }

  @Router.delete("/responses/topic/:id")
  async deleteResponseToTopic(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await RespondingToTopic.assertAuthorIsUser(oid, user);
    return RespondingToTopic.delete(oid);
  }

  //// RESPONDING TO RESPONSES

  @Router.get("/responses/response")
  @Router.validate(z.object({ author: z.string().optional(), id: z.string().optional() }))
  async getResponsesToResponse(author?: string, id?: string) {
    let responses;
    if (author && !id) {
      const authorId = (await Authing.getUserByUsername(author))._id;
      responses = await RespondingToResponse.getByAuthor(authorId);
    }
    else if (!author && id) {
      const oid = new ObjectId(id);
      responses = await RespondingToResponse.getByTarget(oid);
    }
    else if (author && id) {
      const authorId = (await Authing.getUserByUsername(author))._id;
      const oid = new ObjectId(id);
      responses = await RespondingToResponse.getByAuthorAndTarget(authorId, oid);
    }
    else {
      responses = await RespondingToResponse.getResponses();
    }
    return Responses.responses(responses);
  }

  @Router.post("/responses/response/:responseId")
  async createResponseToResponse(session: SessionDoc, title: string, content: string, responseId: string) {
    const user = Sessioning.getUser(session);
    const response = new ObjectId(responseId);
    const created = await RespondingToResponse.create(user, title, content, response);
    return { msg: created.msg, response: await Responses.respond(created.response) };
  }

  @Router.patch("/responses/response/:id/title")
  async updateResponseTitleToResponse(session: SessionDoc, id: string, title?: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await RespondingToResponse.assertAuthorIsUser(oid, user);
    return await RespondingToResponse.updateTitle(oid, title);
  }

  @Router.patch("/responses/response/:id/content")
  async updateResponseToResponse(session: SessionDoc, id: string, content?: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await RespondingToResponse.assertAuthorIsUser(oid, user);
    return await RespondingToResponse.updateContent(oid, content);
  }

  @Router.delete("/responses/response/:id")
  async deleteResponseToResponse(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await RespondingToResponse.assertAuthorIsUser(oid, user);
    return RespondingToResponse.delete(oid);
  }

  ///// SIDEING

  @Router.get("/side")
  @Router.validate(z.object({ user: z.string(), topic: z.string().optional() }))
  async getSidesOfUser(user: string, topic?: string) {
    let sides;
    if (topic) {
      const topicId = (await Topicing.getTopicByTitle(topic))._id;
      const userId = (await Authing.getUserByUsername(user))._id;
      sides = await Sideing.getSideByUserAndIssue(userId, topicId);
    } else {
      const userId = (await Authing.getUserByUsername(user))._id;
      sides = await Sideing.getSideByUser(userId);
    }
    return Responses.sides(sides);
  }

  @Router.post("/side/:topic")
  async createSide(session: SessionDoc, topic: string, degree: string) {
    const user = Sessioning.getUser(session);
    const topicId = (await Topicing.getTopicByTitle(topic))._id;
    const created = await Sideing.create(user, topicId, degree);
    return { msg: created.msg, response: await Responses.side(created.side) };
  }

  @Router.patch("/side/:topic")
  async updateDegreeOfSide(session: SessionDoc, topic: string, newside?: string) {
    const user = Sessioning.getUser(session);
    const topicId = (await Topicing.getTopicByTitle(topic))._id;
    await Sideing.assertUserHasSide(user, topicId);
    return await Sideing.update(user, topicId, newside);
  }

  ////// LABELING for Topics

  @Router.get("/label/topic")
  async getAllTopicLabels() {
    return Responses.topicLabels(await TopicLabeling.getAllLabels());
  }

  @Router.post("/label/topic")
  async makeTopicLabel(session: SessionDoc, label: string) {
    // make a new label for topics (must have unique label)
    const user = Sessioning.getUser(session);
    const created = await TopicLabeling.create(user, label);
    return { msg: created.msg, response: await Responses.topicLabel(created.label) };
  }

  @Router.delete("/label/topic/:title")
  async deleteTopicLabel(session: SessionDoc, title: string) {
    // delete topic label with given id
    const user = Sessioning.getUser(session);
    const label = await TopicLabeling.getLabelByTitle(title);
    await TopicLabeling.assertAuthorIsUser(title, user);
    return TopicLabeling.delete(label._id);
  }

  @Router.patch("/label/:label/add/topic/:topic")
  async addLabelToTopic(session: SessionDoc, topic: string, label: string) {
    // attach given label (unique so get label object from it) to the given topic
    // validate that label is not already added to topic
    const user = Sessioning.getUser(session);
    const topicId = (await Topicing.getTopicByTitle(topic))._id;
    await Topicing.assertAuthorIsUser(topicId, user);
    const updated = await TopicLabeling.addLabelToItem(topicId, label);
    return { msg: updated.msg, response: await Responses.topicLabel(updated.label) };
  }

  @Router.patch("/label/:label/remove/topic/:topic")
  async removeLabelToTopic(session: SessionDoc, topic: string, label: string) {
    // remove given label (unique so get label object from it) to the given topic (id)
    // make sure label exists on topic? (might be done in labeling concept)
    const user = Sessioning.getUser(session);
    const topicId = (await Topicing.getTopicByTitle(topic))._id;
    await Topicing.assertAuthorIsUser(topicId, user);
    const updated = await TopicLabeling.removeLabelFromItem(topicId, label);
    return { msg: updated.msg, response: await Responses.topicLabel(updated.label) };
  }

  ////// LABELING for Responses

  @Router.get("/label/response")
  async getAllResponseLabels() {
    // get all labels for responses
    return Responses.responseLabels(await ResponseLabeling.getAllLabels());
  }

  @Router.post("/label/response")
  async makeResponseLabel(session: SessionDoc, label: string) {
    // make a new label for responses (must have unique tag)
    const user = Sessioning.getUser(session);
    const created = await ResponseLabeling.create(user, label);
    return { msg: created.msg, response: await Responses.responseLabel(created.label) };
  }

  @Router.delete("/label/response/:title")
  async deleteResponseLabel(session: SessionDoc, title: string) {
    // delete response label with given id
    const user = Sessioning.getUser(session);
    // const responseId = new ObjectId(id);
    const label = await ResponseLabeling.getLabelByTitle(title);
    await ResponseLabeling.assertAuthorIsUser(title, user);
    return ResponseLabeling.delete(label._id);
  }

  @Router.patch("/label/:label/add/response/:id")
  async addLabelToResponse(session: SessionDoc, label: string, id: string) {
    // attach given tag (unique so get tag object from it) to the given response (id)
    const user = Sessioning.getUser(session);
    const responseId = new ObjectId(id);
    await RespondingToTopic.assertAuthorIsUser(responseId, user); ///////////////////////////// this throws error if responseId doesn't exist in RespondingToTopic, but what if it exists in respondingToResponse, so how do i make message more descriptive to say that responseId isn't a valid response to label?
    const updated = await ResponseLabeling.addLabelToItem(responseId, label);
    return { msg: updated.msg, response: await Responses.responseLabel(updated.label) };
  }
  @Router.patch("/label/:label/remove/response/:id")
  async removeLabelToResponse(session: SessionDoc, label: string, id: string) {
    // remove given tag (unique so get tag object from it) to the given response (id)
    const user = Sessioning.getUser(session);
    const responseId = new ObjectId(id);
    await RespondingToTopic.assertAuthorIsUser(responseId, user); //////////////////////////// same as above
    const updated = await ResponseLabeling.removeLabelFromItem(responseId, label);
    return { msg: updated.msg, response: await Responses.responseLabel(updated.label) };
  }

  ////// UPVOTING for responses

  @Router.patch("/vote/upvote/:id")
  async upvote(session: SessionDoc, id: string) {
    // current user upvotes a response
    // undo vote if was downvoting before
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    const title = await RespondingToTopic.getTitle(oid);
    const upvoted = await Upvoting.upvote(oid, user, title);
    return upvoted;
  }

  @Router.patch("/vote/downvote/:id")
  async downvote(session: SessionDoc, id: string) {
    // current user downvotes a response
    // undo vote if was upvoting before
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    const title = await RespondingToTopic.getTitle(oid);
    const downvoted = await Upvoting.downvote(oid, user, title);
    return downvoted;
  }

  @Router.patch("/vote/unvote/:id")
  async unvote(session: SessionDoc, id: string) {
    // take away the current user's vote on given response
    // only do this if they have upvoted or downvoted previously
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    const title = await RespondingToTopic.getTitle(oid);
    const unvoted = await Upvoting.unvote(oid, user, title);
    return unvoted;
  }

  @Router.get("/vote/count")
  async getCount(id: string) {
    // get count (upvotes - downvotes) for a response
    const oid = new ObjectId(id);
    const title = await RespondingToTopic.getTitle(oid);
    const count = await Upvoting.getCount(oid)
    return { msg: `Count of response with title ${title} and id ${id} is ${count}`, count: count };
  }

  ///// SORTING

  @Router.get("/topics/:sort")
  async sortTopic(id: string, sort: string) {
    // sort can be by engagement or random
    // return all topics in given sorted order
  }

  @Router.get("/responses/:topicid/:sort")
  async sortResponsesOnTopic(topicid: string, sort: string) {
    // sort can be by upvotes, downvotes, controversial (upvotes - downvotes), time, random?
    // return responses to topic in given sorted order
  }

  ///// FILTERING

  @Router.get("/topics/label/:tag")
  async getTopicsByLabel(tag: string) {
    // get all topics with the given tag
  }

  @Router.get("/responses/topic/:topicid/label/:tag")
  async getResponsesByLabel(topicid: string, tag: string) {
    // get all responses to the given topic with the given tag
  }


  //// Get all responses on given topic with given opinion degree for home page
  @Router.get("/responses/topic/:topicid/:degree")
  async getResponsesForTopicDegree(topicid: string, degree: string) {
    // get all responses to topic with given degree of opinion
  }

  //// Get degree of opinion from response to topic
  @Router.get("/responses/response/:id/:degree")
  async getDegreeFromResponse(id: string, degree: string) {
    // get degree of opinion from given response to topic
  }
}

/** The web app. */
export const app = new Routes();

/** The Express router. */
export const appRouter = getExpressRouter(app);


  // //// FRIENDING

  // @Router.get("/friends")
  // async getFriends(session: SessionDoc) {
  //   const user = Sessioning.getUser(session);
  //   return await Authing.idsToUsernames(await Friending.getFriends(user));
  // }

  // @Router.delete("/friends/:friend")
  // async removeFriend(session: SessionDoc, friend: string) {
  //   const user = Sessioning.getUser(session);
  //   const friendOid = (await Authing.getUserByUsername(friend))._id;
  //   return await Friending.removeFriend(user, friendOid);
  // }

  // @Router.get("/friend/requests")
  // async getRequests(session: SessionDoc) {
  //   const user = Sessioning.getUser(session);
  //   return await Responses.friendRequests(await Friending.getRequests(user));
  // }

  // @Router.post("/friend/requests/:to")
  // async sendFriendRequest(session: SessionDoc, to: string) {
  //   const user = Sessioning.getUser(session);
  //   const toOid = (await Authing.getUserByUsername(to))._id;
  //   return await Friending.sendRequest(user, toOid);
  // }

  // @Router.delete("/friend/requests/:to")
  // async removeFriendRequest(session: SessionDoc, to: string) {
  //   const user = Sessioning.getUser(session);
  //   const toOid = (await Authing.getUserByUsername(to))._id;
  //   return await Friending.removeRequest(user, toOid);
  // }

  // @Router.put("/friend/accept/:from")
  // async acceptFriendRequest(session: SessionDoc, from: string) {
  //   const user = Sessioning.getUser(session);
  //   const fromOid = (await Authing.getUserByUsername(from))._id;
  //   return await Friending.acceptRequest(fromOid, user);
  // }

  // @Router.put("/friend/reject/:from")
  // async rejectFriendRequest(session: SessionDoc, from: string) {
  //   const user = Sessioning.getUser(session);
  //   const fromOid = (await Authing.getUserByUsername(from))._id;
  //   return await Friending.rejectRequest(fromOid, user);
  // }
