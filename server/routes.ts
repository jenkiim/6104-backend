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
  /**
     * @param title The title of the topic. Must not be empty.
     * @param description The description of the topic. Can be empty.
     */
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

  //// RESPONDING TO TOPICS

  @Router.get("/responses/topic")
  @Router.validate(z.object({ author: z.string().optional(), topic: z.string().optional() }))
  async getResponsesToTopic(author?: string, topic?: string) {
    let responses;
    let authorId = undefined;
    let topicId = undefined;
    if (author) {
      authorId = (await Authing.getUserByUsername(author))._id;
    }
    if (topic) {
      topicId = (await Topicing.getTopicByTitle(topic))._id;
    }
    responses = await RespondingToTopic.getByAuthorAndTarget(authorId, topicId);
    return Responses.responsesToTopic(responses);
  }

  /**
     * @param title The title of the response. Must not be empty.
     * @param content The content of the response. Must not be empty.
     */
  @Router.post("/responses/topic/:topic")
  async createResponseToTopic(session: SessionDoc, title: string, content: string, topic: string) {
    const user = Sessioning.getUser(session);
    const topicObject = (await Topicing.getTopicByTitle(topic))._id;
    await Sideing.assertUserHasSide(user, topicObject);
    const created = await RespondingToTopic.create(user, title, content, topicObject);
    await Upvoting.create(created.response._id);
    return { msg: created.msg, response: await Responses.respondToTopic(created.response) };
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
  @Router.validate(z.object({ author: z.string().optional(), targetId: z.string().optional() }))
  async getResponsesToResponse(author?: string, targetId?: string) {
    let responses;
    let authorId = undefined;
    let targetOid = undefined;
    if (author) {
      authorId = (await Authing.getUserByUsername(author))._id;
    }
    if (targetId) {
      targetOid = new ObjectId(targetId);
    }
    responses = await RespondingToResponse.getByAuthorAndTarget(authorId, targetOid);
    return Responses.responses(responses);
  }

  @Router.post("/responses/response/:targetId")
  async createResponseToResponse(session: SessionDoc, title: string, content: string, targetId: string) {
    const user = Sessioning.getUser(session);
    const response = new ObjectId(targetId);
    const possible1 = await RespondingToTopic.assertResponseExists(response);
    const possible2 = await RespondingToResponse.assertResponseExists(response);
    if (!possible1 && !possible2) {
      return { msg: "Response to respond to does not exist!" };
    }
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
      sides = [await Sideing.getSideByUserAndItem(userId, topicId)];
    } else {
      const userId = (await Authing.getUserByUsername(user))._id;
      sides = await Sideing.getSideByUser(userId);
    }
    return Responses.sides(sides);
  }

  @Router.post("/side/new/:topic")
  async createSide(session: SessionDoc, topic: string, degree: string) {
    const user = Sessioning.getUser(session);
    const topicId = (await Topicing.getTopicByTitle(topic))._id;
    const created = await Sideing.create(user, topicId, degree);
    return { msg: created.msg, response: await Responses.side(created.side) };
  }

  @Router.patch("/side/update/:topic")
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
    const user = Sessioning.getUser(session);
    const topicId = (await Topicing.getTopicByTitle(topic))._id;
    await Topicing.assertAuthorIsUser(topicId, user);
    const updated = await TopicLabeling.addLabelToItem(topicId, label);
    return { msg: updated.msg, response: await Responses.topicLabel(updated.label) };
  }

  @Router.patch("/label/:label/remove/topic/:topic")
  async removeLabelToTopic(session: SessionDoc, topic: string, label: string) {
    // remove given label (unique so get label object from it) to the given topic (id)
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
    const label = await ResponseLabeling.getLabelByTitle(title);
    await ResponseLabeling.assertAuthorIsUser(title, user);
    return ResponseLabeling.delete(label._id);
  }

  @Router.patch("/label/:label/add/response/:id")
  async addLabelToResponse(session: SessionDoc, label: string, id: string) {
    // attach given tag (unique so get tag object from it) to the given response (id)
    const user = Sessioning.getUser(session);
    const responseId = new ObjectId(id);
    await RespondingToTopic.assertAuthorIsUser(responseId, user);
    const updated = await ResponseLabeling.addLabelToItem(responseId, label);
    return { msg: updated.msg, response: await Responses.responseLabel(updated.label) };
  }

  @Router.patch("/label/:label/remove/response/:id")
  async removeLabelToResponse(session: SessionDoc, label: string, id: string) {
    // remove given tag (unique so get tag object from it) to the given response (id)
    const user = Sessioning.getUser(session);
    const responseId = new ObjectId(id);
    await RespondingToTopic.assertAuthorIsUser(responseId, user);
    const updated = await ResponseLabeling.removeLabelFromItem(responseId, label);
    return { msg: updated.msg, response: await Responses.responseLabel(updated.label) };
  }

  ////// UPVOTING for responses

  @Router.patch("/vote/upvote/:id")
  async upvote(session: SessionDoc, id: string) {
    // current user upvotes a response
    // undo vote if was downvoting before
    // if was upvoting before, do nothing
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    const responseToTopic = await RespondingToTopic.inCollection(oid);
    let title;
    // can vote on responses to topics and responses to responses
    if (responseToTopic) {
      title = (await RespondingToTopic.getById(oid)).title;
    } else {
      title = (await RespondingToResponse.getById(oid)).title;
    }
    const upvoted = await Upvoting.upvote(oid, user, title);
    return upvoted;
  }

  @Router.patch("/vote/downvote/:id")
  async downvote(session: SessionDoc, id: string) {
    // current user downvotes a response
    // undo vote if was upvoting before
    // if was downvoting before, do nothing
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    const responseToTopic = await RespondingToTopic.inCollection(oid);
    let title;
    // can vote on responses to topics and responses to responses
    if (responseToTopic) {
      title = (await RespondingToTopic.getById(oid)).title;
    } else {
      title = (await RespondingToResponse.getById(oid)).title;
    }
    const downvoted = await Upvoting.downvote(oid, user, title);
    return downvoted;
  }

  @Router.patch("/vote/unvote/:id")
  async unvote(session: SessionDoc, id: string) {
    // take away the current user's vote on given response
    // only do this if they have upvoted or downvoted previously
    // if wasn't voting before, do nothing
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    const responseToTopic = await RespondingToTopic.inCollection(oid);
    let title;
    // can vote on responses to topics and responses to responses
    if (responseToTopic) {
      title = (await RespondingToTopic.getById(oid)).title;
    } else {
      title = (await RespondingToResponse.getById(oid)).title;
    }
    const unvoted = await Upvoting.unvote(oid, user, title);
    return unvoted;
  }

  @Router.get("/vote/count")
  async getCount(id: string) {
    // get count (upvotes - downvotes) for a response
    const oid = new ObjectId(id);
    const responseToTopic = await RespondingToTopic.inCollection(oid);
    let title;
    // can vote on responses to topics and responses to responses
    if (responseToTopic) {
      title = (await RespondingToTopic.getById(oid)).title;
    } else {
      title = (await RespondingToResponse.getById(oid)).title;
    }
    const count = await Upvoting.getCount(oid)
    return { msg: `Count of response with title ${title} and id ${id} is ${count}`, count: count };
  }

  ///// SORTING

  @Router.get("/topics/sort")
  async sortTopic(sort: string) {
    // sort can be by engagement or random
    // return all topics in given sorted order
    const sortedByEngagement = await RespondingToTopic.getSortedByResponseCount();
    const topics = await Topicing.getSorted(sort, sortedByEngagement)
    return { msg: `Successfully sorted topics by ${sort}`, topics: topics };
  }

  @Router.get("/responses/topic/:topicid/sort/:sort")
  async sortResponsesOnTopic(topicid: string, sort: string) {
    // sort can be by upvotes, downvotes, controversial (abs(upvotes - downvotes)), time, random
    // return responses to topic in given sorted order
    const topic = await Topicing.getTopicById(new ObjectId(topicid));
    const responsesToTopic = (await RespondingToTopic.getByTarget(new ObjectId(topicid))).map(response => response._id);
    const sortByUpvoteIds = await Upvoting.sortItemsByCount(responsesToTopic);
    const sortByControversyIds = await Upvoting.sortItemsByControversy(responsesToTopic);
    const responses = await RespondingToTopic.getSorted(sort, topic._id, sortByUpvoteIds, sortByControversyIds);
    return { msg: `Successfully sorted responses to ${topic.title} by ${sort}`, topics: responses };
  }

  ///// FILTERING

  @Router.get("/topics/label/:label")
  async getTopicsByLabel(label: string) {
    // get all topics with the given label
    const topics = await TopicLabeling.getItems(label);
    const allTopics = await Topicing.idToObjects(topics.items);
    return { msg: topics.msg, topics: allTopics };
  }

  @Router.get("/responses/topic/:topic/label/:label")
  async getResponsesByLabel(topic: string, label: string) {
    // get all responses to the given topic with the given label
    const topicid = (await Topicing.getTopicByTitle(topic))._id;
    const responses = await RespondingToTopic.getByTarget(new ObjectId(topicid));
    const responseIds = responses.map(response => response._id);
    const labeledResponses = await ResponseLabeling.filterByLabelFromGiven(responseIds, label);
    const finalResponses = await RespondingToTopic.idsToResponses(labeledResponses); // translates ids to actual responses
    return { msg: `Found all responses to topic ${topic} labeled with ${label}`, responses: finalResponses };
  }


  //// Get all responses on given topic with given opinion degree for home page
  @Router.get("/responses/topic/:topic/degree/:degree")
  async getResponsesForTopicDegree(topic: string, degree: string) {
    // get all responses to topic with given degree of opinion
    const topicid = (await Topicing.getTopicByTitle(topic))._id;
    const responses = await RespondingToTopic.getByAuthorAndTarget(undefined, new ObjectId(topicid));
    const results = await Promise.all(
      responses.filter(async (response) => {
        const side = await Sideing.getSideByUserAndItem(response.author, topicid);
        return side?.degree === degree;
      })
    ); // filters responses to given topic by degree of opinion we want
    return { msg: `Found all responses to topic ${topic} with degree of opinion ${degree}`, responses: results };
  }

  //// Get degree of opinion from response to topic
  @Router.get("/responses/response/:id/degree")
  async getDegreeFromResponse(id: string) {
    // get degree of opinion from given response to topic
    const response = await RespondingToTopic.getById(new ObjectId(id));
    const user = await Authing.getUserById(response.author);
    const side = await Sideing.getSideByUserAndItem(user._id, response.target);
    return { msg: "Successfully got the side of the user on the given issue!", side: side.degree };
  }
}

/** The web app. */
export const app = new Routes();

/** The Express router. */
export const appRouter = getExpressRouter(app);