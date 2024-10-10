type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type InputTag = "input" | "textarea" | "json";
type Field = InputTag | { [key: string]: Field };
type Fields = Record<string, Field>;

type Operation = {
  name: string;
  endpoint: string;
  method: HttpMethod;
  fields: Fields;
};

/**
 * This list of operations is used to generate the manual testing UI.
 */
const operations: Operation[] = [
  {
    name: "Get Session User (logged in user)",
    endpoint: "/api/session",
    method: "GET",
    fields: {},
  },
  {
    name: "Create User",
    endpoint: "/api/users",
    method: "POST",
    fields: { username: "input", password: "input" },
  },
  {
    name: "Login",
    endpoint: "/api/login",
    method: "POST",
    fields: { username: "input", password: "input" },
  },
  {
    name: "Logout",
    endpoint: "/api/logout",
    method: "POST",
    fields: {},
  },
  {
    name: "Update Password",
    endpoint: "/api/users/password",
    method: "PATCH",
    fields: { currentPassword: "input", newPassword: "input" },
  },
  {
    name: "Delete User",
    endpoint: "/api/users",
    method: "DELETE",
    fields: {},
  },
  {
    name: "Get Users (empty for all)",
    endpoint: "/api/users/:username",
    method: "GET",
    fields: { username: "input" },
  },
  {
    name: "Search All Topics by Title",
    endpoint: "/api/topics",
    method: "GET",
    fields: { search: "input" },
  },
  {
    name: "Create Topic",
    endpoint: "/api/topic",
    method: "POST",
    fields: { title: "input", description: "input" },
  },
  {
    name: "Delete Topic",
    endpoint: "/api/topic/:title",
    method: "DELETE",
    fields: { title: "input" },
  },
  {
    name: "Get Responses to Topics (empty for all)",
    endpoint: "/api/responses/topic",
    method: "GET",
    fields: { author: "input", topic: "input" },
  },
  {
    name: "Create Response to Topic",
    endpoint: "/api/responses/topic/:topic",
    method: "POST",
    fields: { title: "input", content: "input", topic: "input" },
  },
  {
    name: "Update Title of Response to Topic",
    endpoint: "/api/responses/topic/:id/title",
    method: "PATCH",
    fields: { id: "input", title: "input"},
  },
  {
    name: "Update Content of Response to Topic",
    endpoint: "/api/responses/topic/:id/content",
    method: "PATCH",
    fields: { id: "input", content: "input"},
  },
  {
    name: "Delete Response to Topic",
    endpoint: "/api/responses/topic/:id",
    method: "DELETE",
    fields: { id: "input" },
  },
  {
    name: "Get Responses to Responses (empty for all)",
    endpoint: "/api/responses/response",
    method: "GET",
    fields: { author: "input", targetId: "input" },
  },
  {
    name: "Create Response to Response",
    endpoint: "/api/responses/response/:targetId",
    method: "POST",
    fields: { title: "input", content: "input", targetId: "input" },
  },
  {
    name: "Update Title of Response to Response",
    endpoint: "/api/responses/response/:id/title",
    method: "PATCH",
    fields: { id: "input", title: "input"},
  },
  {
    name: "Update Content of Response to Response",
    endpoint: "/api/responses/response/:id/content",
    method: "PATCH",
    fields: { id: "input", content: "input"},
  },
  {
    name: "Delete Response to Response",
    endpoint: "/api/responses/response/:id",
    method: "DELETE",
    fields: { id: "input" },
  },
  {
    name: "Get sides of user for topic (all if not topic) *must specificy user*",
    endpoint: "/api/side",
    method: "GET",
    fields: { user: "input", topic: "input" },
  },
  {
    name: "Create Side to Topic (possible degrees: Strongly Disagree, Disagree, Slightly Disagree, Neutral, Slightly Agree, Agree, Strongly Agree, Undecided)",
    endpoint: "/api/side/new/:topic",
    method: "POST",
    fields: { topic: "input", degree: "input" },
  },
  {
    name: "Update Side",
    endpoint: "/api/side/update/:topic",
    method: "PATCH",
    fields: { topic: "input", newside: "input"},
  },
  {
    name: "Get all Topic Labels",
    endpoint: "/api/label/topic",
    method: "GET",
    fields: {  },
  },
  {
    name: "Create Topic Label",
    endpoint: "/api/label/topic",
    method: "POST",
    fields: { label: "input" },
  },
  {
    name: "Delete Topic Label",
    endpoint: "/api/label/topic/:title",
    method: "DELETE",
    fields: { title: "input" },
  },
  {
    name: "Add Label to Topic",
    endpoint: "/api/label/:label/add/topic/:topic",
    method: "PATCH",
    fields: { label: "input", topic: "input"},
  },
  {
    name: "Remove Label from Topic",
    endpoint: "/api/label/:label/remove/topic/:topic",
    method: "PATCH",
    fields: { label: "input", topic: "input"},
  },
  {
    name: "Get all Response Labels",
    endpoint: "/api/label/response",
    method: "GET",
    fields: {  },
  },
  {
    name: "Create Response Label",
    endpoint: "/api/label/response",
    method: "POST",
    fields: { label: "input" },
  },
  {
    name: "Delete Response Label",
    endpoint: "/api/label/response/:title",
    method: "DELETE",
    fields: { title: "input" },
  },
  {
    name: "Add Label to Response to Topic",
    endpoint: "/api/label/:label/add/response/:id",
    method: "PATCH",
    fields: { label: "input", id: "input"},
  },
  {
    name: "Remove Label from Response to Topic",
    endpoint: "/api/label/:label/remove/response/:id",
    method: "PATCH",
    fields: { label: "input", id: "input"},
  },
  {
    name: "Set vote to response to upvote",
    endpoint: "/api/vote/upvote/:id",
    method: "PATCH",
    fields: { id: "input" },
  },
  {
    name: "Set vote to response to downvote",
    endpoint: "/api/vote/downvote/:id",
    method: "PATCH",
    fields: { id: "input" },
  },
  {
    name: "Set vote to response to not voting anymore",
    endpoint: "/api/vote/unvote/:id",
    method: "PATCH",
    fields: { id: "input" },
  },
  {
    name: "Get count of response (upvotes - downvotes)",
    endpoint: "/api/vote/count",
    method: "GET",
    fields: { id: "input" },
  },
  {
    name: "Get all topics by given sort (newest, random, engagement)",
    endpoint: "/api/topics/sort",
    method: "GET",
    fields: { sort: "input" },
  },
  {
    name: "Get all responses to topics by given sort (newest, random, upvotes, downvotes, controversial)",
    endpoint: "/api/responses/topic/:topicid/sort/:sort",
    method: "GET",
    fields: { topicid: "input", sort: "input" },
  },
  {
    name: "Get all topics with label given",
    endpoint: "/api/topics/label/:label",
    method: "GET",
    fields: { label: "input" },
  },
  {
    name: "Get all responses to given topic with label",
    endpoint: "/api/responses/topic/:topic/label/:label",
    method: "GET",
    fields: { label: "input", topic: "input" },
  },
  {
    name: "Get all responses to given topic with degree of opinion",
    endpoint: "/api/responses/topic/:topic/degree/:degree",
    method: "GET",
    fields: { topic: "input", degree: "input" },
  },
  {
    name: "Get degree of opinion given response to topic",
    endpoint: "/api/responses/response/:id/degree",
    method: "GET",
    fields: { id: "input" },
  },
];

/*
 * You should not need to edit below.
 * Please ask if you have questions about what this test code is doing!
 */

function updateResponse(code: string, response: string) {
  document.querySelector("#status-code")!.innerHTML = code;
  document.querySelector("#response-text")!.innerHTML = response;
}

async function request(method: HttpMethod, endpoint: string, params?: unknown) {
  try {
    if (method === "GET" && params) {
      console.log("Params before URLSearchParams:", params);
      endpoint += "?" + new URLSearchParams(params as Record<string, string>).toString();
      params = undefined;
    }

    const res = fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: params ? JSON.stringify(params) : undefined,
    });

    return {
      $statusCode: (await res).status,
      $response: await (await res).json(),
    };
  } catch (e) {
    console.log(e);
    return {
      $statusCode: "???",
      $response: { error: "Something went wrong, check your console log.", details: e },
    };
  }
}

function fieldsToHtml(fields: Record<string, Field>, indent = 0, prefix = ""): string {
  return Object.entries(fields)
    .map(([name, tag]) => {
      const htmlTag = tag === "json" ? "textarea" : tag;
      return `
        <div class="field" style="margin-left: ${indent}px">
          <label>${name}:
          ${typeof tag === "string" ? `<${htmlTag} name="${prefix}${name}"></${htmlTag}>` : fieldsToHtml(tag, indent + 10, prefix + name + ".")}
          </label>
        </div>`;
    })
    .join("");
}

function getHtmlOperations() {
  return operations.map((operation) => {
    return `<li class="operation">
      <h3>${operation.name}</h3>
      <form class="operation-form">
        <input type="hidden" name="$endpoint" value="${operation.endpoint}" />
        <input type="hidden" name="$method" value="${operation.method}" />
        ${fieldsToHtml(operation.fields)}
        <button type="submit">Submit</button>
      </form>
    </li>`;
  });
}

function prefixedRecordIntoObject(record: Record<string, string>) {
  const obj: any = {}; // eslint-disable-line
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    const keys = key.split(".");
    const lastKey = keys.pop()!;
    let currentObj = obj;
    for (const key of keys) {
      if (!currentObj[key]) {
        currentObj[key] = {};
      }
      currentObj = currentObj[key];
    }
    currentObj[lastKey] = value;
  }
  return obj;
}

async function submitEventHandler(e: Event) {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const { $method, $endpoint, ...reqData } = Object.fromEntries(new FormData(form));

  // Replace :param with the actual value.
  const endpoint = ($endpoint as string).replace(/:(\w+)/g, (_, key) => {
    const param = reqData[key] as string;
    delete reqData[key];
    return param;
  });

  const op = operations.find((op) => op.endpoint === $endpoint && op.method === $method);
  const pairs = Object.entries(reqData);
  for (const [key, val] of pairs) {
    if (val === "") {
      delete reqData[key];
      continue;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const type = key.split(".").reduce((obj, key) => obj[key], op?.fields as any);
    if (type === "json") {
      reqData[key] = JSON.parse(val as string);
    }
  }

  const data = prefixedRecordIntoObject(reqData as Record<string, string>);

  updateResponse("", "Loading...");
  const response = await request($method as HttpMethod, endpoint as string, Object.keys(data).length > 0 ? data : undefined);
  updateResponse(response.$statusCode.toString(), JSON.stringify(response.$response, null, 2));
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#operations-list")!.innerHTML = getHtmlOperations().join("");
  document.querySelectorAll(".operation-form").forEach((form) => form.addEventListener("submit", submitEventHandler));
});
