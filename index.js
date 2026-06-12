#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const BASE_URL = "https://api.bugsmash.io/api/v2";

function getApiKey() {
  const key = process.env.BUGSMASH_API_KEY;
  if (!key) throw new Error("BUGSMASH_API_KEY environment variable is not set");
  return key;
}

async function api(method, path, { body, params } = {}) {
  let url = `${BASE_URL}${path}`;

  if (params) {
    const parts = [];
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) {
        for (const item of v)
          parts.push(`${encodeURIComponent(k)}[]=${encodeURIComponent(item)}`);
      } else {
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
      }
    }
    if (parts.length) url += `?${parts.join("&")}`;
  }

  const headers = { "X-API-Key": getApiKey(), Accept: "application/json" };
  const options = { method, headers };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { status: false, message: text };
  }
}

const TOOLS = [
  // ── FOLDERS ──────────────────────────────────────────────────────────────

  {
    name: "bugsmash_list_folders",
    description: "List all folders in your BugSmash workspace.",
    inputSchema: { type: "object", properties: {} },
    run: () => api("GET", "/folders"),
  },
  {
    name: "bugsmash_get_folder",
    description:
      "Get full details of a BugSmash folder by UUID, including its projects and user list.",
    inputSchema: {
      type: "object",
      properties: { folderId: { type: "string", description: "UUID of the folder" } },
      required: ["folderId"],
    },
    run: ({ folderId }) => api("GET", `/folder/${folderId}`),
  },
  {
    name: "bugsmash_create_folder",
    description: "Create a new folder in your BugSmash workspace.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Display name for the folder" },
        projectIds: {
          type: "array",
          items: { type: "string" },
          description: "Optional UUIDs of projects to attach at creation",
        },
        parentId: {
          type: "string",
          description: "Optional UUID of a parent folder to nest this folder under",
        },
      },
      required: ["name"],
    },
    run: ({ name, projectIds, parentId }) => {
      const body = { name };
      if (projectIds !== undefined) body.projectIds = projectIds;
      if (parentId !== undefined) body.parentId = parentId;
      return api("POST", "/folder", { body });
    },
  },
  {
    name: "bugsmash_update_folder",
    description:
      "Update a BugSmash folder's name, access level, or project membership. At least one field required.",
    inputSchema: {
      type: "object",
      properties: {
        folderId: { type: "string", description: "UUID of the folder to update" },
        name: { type: "string", description: "New display name" },
        access: { type: "string", enum: ["public", "private"], description: "Access level" },
        addProjectIds: {
          type: "array",
          items: { type: "string" },
          description: "Project UUIDs to add to the folder",
        },
        removeProjectIds: {
          type: "array",
          items: { type: "string" },
          description: "Project UUIDs to remove from the folder",
        },
      },
      required: ["folderId"],
    },
    run: ({ folderId, name, access, addProjectIds, removeProjectIds }) => {
      const body = {};
      if (name !== undefined) body.name = name;
      if (access !== undefined) body.access = access;
      if (addProjectIds !== undefined) body.addProjectIds = addProjectIds;
      if (removeProjectIds !== undefined) body.removeProjectIds = removeProjectIds;
      return api("PATCH", `/folder/${folderId}`, { body });
    },
  },
  {
    name: "bugsmash_delete_folder",
    description:
      "Permanently delete a BugSmash folder. Projects inside the folder are preserved.",
    inputSchema: {
      type: "object",
      properties: { folderId: { type: "string", description: "UUID of the folder to delete" } },
      required: ["folderId"],
    },
    run: ({ folderId }) => api("DELETE", `/folder/${folderId}`),
  },

  // ── VERSIONS ─────────────────────────────────────────────────────────────

  {
    name: "bugsmash_list_versions",
    description: "List all versions for a BugSmash project.",
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string", description: "UUID of the project" } },
      required: ["projectId"],
    },
    run: ({ projectId }) => api("GET", "/versions", { params: { projectId } }),
  },
  {
    name: "bugsmash_get_version",
    description:
      "Get full details of a BugSmash version, including file URLs, project type, and review link.",
    inputSchema: {
      type: "object",
      properties: { versionId: { type: "string", description: "UUID of the version" } },
      required: ["versionId"],
    },
    run: ({ versionId }) => api("GET", `/version/${versionId}`),
  },
  {
    name: "bugsmash_create_version",
    description: "Add a new website version to an existing BugSmash project.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "UUID of the project to add the version to" },
        websiteUrl: { type: "string", description: "URL of the website to capture" },
      },
      required: ["projectId", "websiteUrl"],
    },
    run: ({ projectId, websiteUrl }) =>
      api("POST", "/version", { body: { projectId, websiteUrl } }),
  },
  {
    name: "bugsmash_delete_version",
    description:
      "Permanently delete a BugSmash version. All associated files and comments are removed.",
    inputSchema: {
      type: "object",
      properties: { versionId: { type: "string", description: "UUID of the version to delete" } },
      required: ["versionId"],
    },
    run: ({ versionId }) => api("DELETE", `/version/${versionId}`),
  },

  // ── PROJECTS ─────────────────────────────────────────────────────────────

  {
    name: "bugsmash_create_project",
    description:
      "Create a new BugSmash review project from a website URL and return a shareable review link.",
    inputSchema: {
      type: "object",
      properties: {
        projectName: { type: "string", description: "Display name for the project" },
        websiteUrl: { type: "string", description: "URL of the website to review" },
        anonymousComments: {
          type: "boolean",
          description: "Allow guests to leave comments without logging in",
        },
        privateComments: {
          type: "boolean",
          description:
            "Each guest sees only their own comments. Requires anonymousComments: false.",
        },
      },
      required: ["projectName", "websiteUrl"],
    },
    run: ({ projectName, websiteUrl, anonymousComments, privateComments }) => {
      const body = { projectName, projectType: "website", websiteUrl };
      if (anonymousComments !== undefined) body.anonymousComments = anonymousComments;
      if (privateComments !== undefined) body.privateComments = privateComments;
      return api("POST", "/project/generate-review-link", { body });
    },
  },
  {
    name: "bugsmash_list_projects",
    description:
      "List BugSmash projects with optional pagination and filtering by folder or content type.",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "integer", description: "Page number (default 1)" },
        limit: { type: "integer", description: "Results per page, max 50" },
        folder_id: {
          type: "string",
          description: "Filter by folder UUID. Use the string 'null' for root-level projects.",
        },
        types: {
          type: "array",
          items: {
            type: "string",
            enum: ["image", "video", "pdf", "audio", "website", "ppt", "email"],
          },
          description: "Filter by one or more content types",
        },
      },
    },
    run: ({ page, limit, folder_id, types } = {}) => {
      const params = {};
      if (page !== undefined) params.page = page;
      if (limit !== undefined) params.limit = limit;
      if (folder_id !== undefined) params.folderId = folder_id;
      if (types !== undefined) params.types = types;
      return api("GET", "/projects", { params });
    },
  },
  {
    name: "bugsmash_get_project",
    description:
      "Get full details of a BugSmash project, including all versions and collaborators.",
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string", description: "UUID of the project" } },
      required: ["projectId"],
    },
    run: ({ projectId }) => api("GET", `/project/${projectId}`),
  },
  {
    name: "bugsmash_update_project",
    description:
      "Update a BugSmash project's name, access level, anonymous comment setting, or review language.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "UUID of the project" },
        name: { type: "string", description: "New display name" },
        share_access: { type: "string", enum: ["public", "private"] },
        anonymous_comments: { type: "boolean", description: "Allow anonymous comments" },
        review_language: {
          type: "string",
          description: "Language code for the review interface, e.g. 'en', 'de', 'pl'",
        },
      },
      required: ["projectId"],
    },
    run: ({ projectId, name, share_access, anonymous_comments, review_language }) => {
      const body = {};
      if (name !== undefined) body.name = name;
      if (share_access !== undefined) body.share_access = share_access;
      if (anonymous_comments !== undefined) body.anonymous_comments = anonymous_comments;
      if (review_language !== undefined) body.review_language = review_language;
      return api("PATCH", `/project/${projectId}`, { body });
    },
  },
  {
    name: "bugsmash_delete_project",
    description:
      "Permanently delete a BugSmash project and all its versions, comments, and review links.",
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string", description: "UUID of the project to delete" } },
      required: ["projectId"],
    },
    run: ({ projectId }) => api("DELETE", `/project/${projectId}`),
  },

  // ── COMMENTS ─────────────────────────────────────────────────────────────

  {
    name: "bugsmash_list_comments",
    description: "Fetch all reviewer comments on a BugSmash project.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "UUID of the project" },
        plainText: {
          type: "boolean",
          description: "Return comment text as plain text instead of HTML (default false)",
        },
      },
      required: ["projectId"],
    },
    run: ({ projectId, plainText }) => {
      const params = {};
      if (plainText !== undefined) params.plainText = plainText;
      return api("GET", `/project/${projectId}/comments`, { params });
    },
  },
  {
    name: "bugsmash_get_comment",
    description:
      "Get full details of a single BugSmash comment, including its replies.",
    inputSchema: {
      type: "object",
      properties: {
        commentId: { type: "string", description: "UUID of the comment" },
        plain_text: {
          type: "boolean",
          description: "Return text as plain text instead of HTML (default false)",
        },
      },
      required: ["commentId"],
    },
    run: ({ commentId, plain_text }) => {
      const params = {};
      if (plain_text !== undefined) params.plain_text = plain_text;
      return api("GET", `/comment/${commentId}`, { params });
    },
  },
  {
    name: "bugsmash_update_comment",
    description:
      "Update a BugSmash comment's text, status, priority, or visibility. At least one field required.",
    inputSchema: {
      type: "object",
      properties: {
        commentId: { type: "string", description: "UUID of the comment" },
        text: { type: "string", description: "Updated comment text" },
        status: { type: "string", enum: ["Active", "Resolved"] },
        priority: { type: "string", enum: ["Unset", "P1", "P2", "P3", "P4"] },
        isPrivate: { type: "boolean", description: "Make the comment private" },
      },
      required: ["commentId"],
    },
    run: ({ commentId, text, status, priority, isPrivate }) => {
      const body = {};
      if (text !== undefined) body.text = text;
      if (status !== undefined) body.status = status;
      if (priority !== undefined) body.priority = priority;
      if (isPrivate !== undefined) body.isPrivate = isPrivate;
      return api("PATCH", `/comment/${commentId}`, { body });
    },
  },
  {
    name: "bugsmash_delete_comment",
    description:
      "Permanently delete a BugSmash comment and all of its replies.",
    inputSchema: {
      type: "object",
      properties: { commentId: { type: "string", description: "UUID of the comment to delete" } },
      required: ["commentId"],
    },
    run: ({ commentId }) => api("DELETE", `/comment/${commentId}`),
  },
  {
    name: "bugsmash_list_replies",
    description: "List all replies in a BugSmash comment thread.",
    inputSchema: {
      type: "object",
      properties: {
        commentId: { type: "string", description: "UUID of the parent comment" },
        plain_text: {
          type: "boolean",
          description: "Return text as plain text instead of HTML (default false)",
        },
      },
      required: ["commentId"],
    },
    run: ({ commentId, plain_text }) => {
      const params = {};
      if (plain_text !== undefined) params.plain_text = plain_text;
      return api("GET", `/comment/${commentId}/replies`, { params });
    },
  },
  {
    name: "bugsmash_post_reply",
    description: "Post a reply to an existing BugSmash comment thread.",
    inputSchema: {
      type: "object",
      properties: {
        commentId: { type: "string", description: "UUID of the parent comment" },
        text: { type: "string", description: "Reply text" },
        isPrivate: { type: "boolean", description: "Make the reply private (default false)" },
      },
      required: ["commentId", "text"],
    },
    run: ({ commentId, text, isPrivate }) => {
      const body = { commentId, text };
      if (isPrivate !== undefined) body.isPrivate = isPrivate;
      return api("POST", "/reply", { body });
    },
  },
  {
    name: "bugsmash_delete_reply",
    description: "Permanently delete a single reply from a BugSmash comment thread.",
    inputSchema: {
      type: "object",
      properties: { replyId: { type: "string", description: "UUID of the reply to delete" } },
      required: ["replyId"],
    },
    run: ({ replyId }) => api("DELETE", `/reply/${replyId}`),
  },

  // ── WEBHOOKS ─────────────────────────────────────────────────────────────

  {
    name: "bugsmash_list_webhooks",
    description: "List all webhook subscriptions configured for your BugSmash workspace.",
    inputSchema: { type: "object", properties: {} },
    run: () => api("GET", "/webhooks"),
  },
  {
    name: "bugsmash_create_webhook",
    description:
      "Subscribe a URL to BugSmash workspace events. Returns a one-time signing secret — store it immediately.",
    inputSchema: {
      type: "object",
      properties: {
        webhookUrl: { type: "string", description: "Destination URL to receive event payloads" },
        events: {
          type: "array",
          items: {
            type: "string",
            enum: ["new_comment", "comment_replied", "status_changed", "comment_updated"],
          },
          description: "Events to subscribe to",
        },
      },
      required: ["webhookUrl", "events"],
    },
    run: ({ webhookUrl, events }) =>
      api("POST", "/webhook", { body: { webhookUrl, events } }),
  },
  {
    name: "bugsmash_update_webhook",
    description:
      "Update the events list or destination URL of a BugSmash webhook. The signing secret is preserved.",
    inputSchema: {
      type: "object",
      properties: {
        webhookId: { type: "string", description: "UUID of the webhook to update" },
        webhookUrl: { type: "string", description: "New destination URL" },
        events: {
          type: "array",
          items: {
            type: "string",
            enum: ["new_comment", "comment_replied", "status_changed", "comment_updated"],
          },
          description: "Updated events list",
        },
      },
      required: ["webhookId", "webhookUrl", "events"],
    },
    run: ({ webhookId, webhookUrl, events }) =>
      api("PATCH", `/webhook/${webhookId}`, { body: { webhookUrl, events } }),
  },
  {
    name: "bugsmash_delete_webhook",
    description: "Permanently delete a BugSmash webhook subscription.",
    inputSchema: {
      type: "object",
      properties: { webhookId: { type: "string", description: "UUID of the webhook to delete" } },
      required: ["webhookId"],
    },
    run: ({ webhookId }) => api("DELETE", `/webhook/${webhookId}`),
  },
  {
    name: "bugsmash_test_webhook",
    description:
      "Fire a test event to all BugSmash webhooks subscribed to the given event type, to verify your endpoint and signature verification.",
    inputSchema: {
      type: "object",
      properties: {
        event: {
          type: "string",
          enum: ["new_comment", "comment_replied", "status_changed", "comment_updated"],
          description: "Event type to simulate",
        },
      },
      required: ["event"],
    },
    run: ({ event }) => api("POST", "/webhook/test", { body: { event } }),
  },
];

const toolMap = new Map(TOOLS.map((t) => [t.name, t]));

const server = new Server(
  { name: "bugsmash-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = toolMap.get(request.params.name);
  if (!tool) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${request.params.name}` }],
      isError: true,
    };
  }
  try {
    const result = await tool.run(request.params.arguments ?? {});
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
