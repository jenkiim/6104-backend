import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Authing, Friending, RespondingToTopic, Sessioning, Topicing } from "./app";
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

  @Router.delete("/topic/:id")
  async deleteTopic(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Topicing.assertAuthorIsUser(oid, user);
    return Topicing.delete(oid);
  }

  //// RESPONDING TO TOPICS

  @Router.get("/responses/topic")
  @Router.validate(z.object({ author: z.string().optional(), topic: z.string().optional() }))
  async getResponsesToTopics(author?: string, topic?: string) {
    let responses;
    if (author && !topic) {
      const id = (await Authing.getUserByUsername(author))._id;
      responses = await RespondingToTopic.getByAuthor(id);
    }
    else if (!author && topic) {
      const id = (await Topicing.getTopicByTitle(topic))._id;
      responses = await RespondingToTopic.getByTarget(id);
    }
    else {
      responses = await RespondingToTopic.getResponses();
    }
    return Responses.responses(responses);
  }

  @Router.post("/responses/topic")
  async createResponseToTopic(session: SessionDoc, title: string, content: string, topicId: string) { //, options?: PostOptions
    const user = Sessioning.getUser(session);
    const topic = new ObjectId(topicId);
    const created = await RespondingToTopic.create(user, title, content, topic);
    return { msg: created.msg, response: await Responses.respond(created.response) };
  }

  @Router.patch("/responses/topic/:id/title")
  async updateResponseTitleToTopic(session: SessionDoc, id: string, title?: string) { //, options?: PostOptions
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await RespondingToTopic.assertAuthorIsUser(oid, user);
    return await RespondingToTopic.updateTitle(oid, title); //, options
  }

  @Router.patch("/responses/topic/:id/content")
  async updateResponseToTopic(session: SessionDoc, id: string, content?: string) { //, options?: PostOptions
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await RespondingToTopic.assertAuthorIsUser(oid, user);
    return await RespondingToTopic.updateContent(oid, content); //, options
  }

  @Router.delete("/responses/topic/:id")
  async deleteResponseToTopic(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await RespondingToTopic.assertAuthorIsUser(oid, user);
    return RespondingToTopic.delete(oid);
  }

  //// FRIENDING

  @Router.get("/friends")
  async getFriends(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.idsToUsernames(await Friending.getFriends(user));
  }

  @Router.delete("/friends/:friend")
  async removeFriend(session: SessionDoc, friend: string) {
    const user = Sessioning.getUser(session);
    const friendOid = (await Authing.getUserByUsername(friend))._id;
    return await Friending.removeFriend(user, friendOid);
  }

  @Router.get("/friend/requests")
  async getRequests(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Responses.friendRequests(await Friending.getRequests(user));
  }

  @Router.post("/friend/requests/:to")
  async sendFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.sendRequest(user, toOid);
  }

  @Router.delete("/friend/requests/:to")
  async removeFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.removeRequest(user, toOid);
  }

  @Router.put("/friend/accept/:from")
  async acceptFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.acceptRequest(fromOid, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.rejectRequest(fromOid, user);
  }

  ///// SIDEING

  @Router.get("/side/:user")
  @Router.validate(z.object({ issue: z.string().optional() }))
  async getSidesOfUser(user: string, issue?: string) {
    // get sides of specified username and filter by issue if given
  }

  @Router.post("/side/:topicid/:degree")
  async createSide(session: SessionDoc, topicid: string, degree: string) {
    // validate degree
    // make a new side for current user on given topic

    // const user = Sessioning.getUser(session);
    // const topic = new ObjectId(topicid);
    // const created = await RespondingToTopic.create(user, content, topic);
    // return { msg: created.msg, response: await Responses.respond(created.response) };
  }

  @Router.patch("/side/:sideid/:newside")
  async updateDegreeOfSide(session: SessionDoc, sideid: string, newside: string) {
    // validate newside
    // update the corresponding side object to have newside

    // const user = Sessioning.getUser(session);
    // const oid = new ObjectId(id);
    // await RespondingToTopic.assertAuthorIsUser(oid, user);
    // return await RespondingToTopic.update(oid, content); //, options
  }

  ////// LABELING for Topics

  @Router.get("/label/topic")
  async getAllTopicLabels() {
    // get all labels for topics
  }

  @Router.post("/label/topic/:tag")
  async makeTopicLabel(session: SessionDoc, tag: string) {
    // make a new label for topics (must have unique tag)
  }

  @Router.delete("/label/topic/:id")
  async deleteTopicLabel(session: SessionDoc, id: string) {
    // delete topic label with given id
  }

  @Router.patch("/label/topic/:id/:tag")
  async addLabelToTopic(session: SessionDoc, id: string, tag: string) {
    // attach given tag (unique so get tag object from it) to the given topic (id)
  }

  @Router.patch("/label/topic/:id/:tag")
  async removeLabelToTopic(session: SessionDoc, id: string, tag: string) {
    // remove given tag (unique so get tag object from it) to the given topic (id)
    // make sure tag exists on topic? (might be done in labeling concept)
  }

  ////// LABELING for Responses

  @Router.get("/label/response")
  async getAllResponseLabels() {
    // get all labels for responses
  }

  @Router.post("/label/response/:title")
  async makeResponseLabel(session: SessionDoc, title: string) {
    // make a new label for responses (must have unique title)
  }

  @Router.delete("/label/response/:id")
  async deleteResponseLabel(session: SessionDoc, id: string) {
    // delete response label with given id
  }

  @Router.patch("/label/response/:id/:tag")
  async addLabelToResponse(session: SessionDoc, id: string, tag: string) {
    // attach given tag (unique so get tag object from it) to the given response (id)
  }

  @Router.patch("/label/response/:id/:tag")
  async removeLabelToResponse(session: SessionDoc, id: string, tag: string) {
    // remove given tag (unique so get tag object from it) to the given response (id)
    // make sure tag exists on response? (might be done in labeling concept)
  }

  ////// UPVOTING for responses

  @Router.post("/vote/upvote/:id")
  async upvote(session: SessionDoc, id: string) {
    // current user upvotes a response
    // validate that user has not already upvoted for performing action
    // undo vote if was downvoting before
  }

  @Router.post("/vote/downvote/:id")
  async downvote(session: SessionDoc, id: string) {
    // current user downvotes a response
    // validate that user has not already downvoted for performing action
    // undo vote if was upvoting before
  }

  @Router.delete("/vote/unvote/:id")
  async unvote(session: SessionDoc, id: string) {
    // take away the current user's vote on given response
    // only do this if they have upvoted or downvoted previously
  }

  @Router.get("/vote/count/:id")
  async getCount(id: string) {
    // get count (upvotes - downvotes) for a response
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

  @Router.get("/responses/:topicid/label/:tag")
  async getResponsesByLabel(topicid: string, tag: string) {
    // get all responses to the given topic with the given tag
  }


  //// Get all responses on given topic with given opinion degree for home page
  @Router.get("/responses/:topicid/:degree")
  async getResponsesForTopicDegree(topicid: string, degree: string) {
    // get all responses to topic with given degree of opinion
  }

  //// Get degree of opinion from response to topics
  @Router.get("/responses/:id/:degree")
  async getDegreeFromResponse(id: string, degree: string) {
    // get all responses to topic with given degree of opinion
  }


  //// questions
  /// for upvoting, should i throw an error if user has upvoted already
}

/** The web app. */
export const app = new Routes();

/** The Express router. */
export const appRouter = getExpressRouter(app);
