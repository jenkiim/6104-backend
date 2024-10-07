import AuthenticatingConcept from "./concepts/authenticating";
import FriendingConcept from "./concepts/friending";
import RespondingConcept from "./concepts/responding";
import SessioningConcept from "./concepts/sessioning";
import SideingConcept from "./concepts/sideing";
import TopicingConcept from "./concepts/topicing";

// The app is a composition of concepts instantiated here
// and synchronized together in `routes.ts`.
export const Sessioning = new SessioningConcept();
export const Authing = new AuthenticatingConcept("users");
export const Topicing = new TopicingConcept("topics");
export const RespondingToTopic = new RespondingConcept("responsesToTopics");
export const RespondingToResponse = new RespondingConcept("responsesToResponses");
export const Sideing = new SideingConcept("sides");
export const Friending = new FriendingConcept("friends");
