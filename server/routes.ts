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

  @Router.get("/topics")
  async getTopics() {
    let topics;
    topics = await Topicing.getTopics();
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

  @Router.get("/responses/topic")
  @Router.validate(z.object({ author: z.string().optional(), title: z.string().optional() }))
  async getResponsesToTopics(author?: string, title?: string) {
    let responses;
    if (author && !title) {
      const id = (await Authing.getUserByUsername(author))._id;
      responses = await RespondingToTopic.getByAuthor(id);
    }
    else if (!author && title) {
      const id = (await Topicing.getTopicByTitle(title))._id;
      responses = await RespondingToTopic.getByTarget(id);
    }
    else {
      responses = await RespondingToTopic.getResponses();
    }
    return Responses.responses(responses);
  }

  @Router.post("/responses/topic")
  async createResponseToTopic(session: SessionDoc, content: string, topicId: string) { //, options?: PostOptions
    const user = Sessioning.getUser(session);
    const topic = new ObjectId(topicId);
    const created = await RespondingToTopic.create(user, content, topic);
    return { msg: created.msg, response: await Responses.respond(created.response) };
  }

  @Router.patch("/responses/topic/:id")
  async updateResponseToTopic(session: SessionDoc, id: string, content?: string) { //, options?: PostOptions
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await RespondingToTopic.assertAuthorIsUser(oid, user);
    return await RespondingToTopic.update(oid, content); //, options
  }

  @Router.delete("/responses/topic/:id")
  async deleteResponseToTopic(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await RespondingToTopic.assertAuthorIsUser(oid, user);
    return RespondingToTopic.delete(oid);
  }

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
}

/** The web app. */
export const app = new Routes();

/** The Express router. */
export const appRouter = getExpressRouter(app);
