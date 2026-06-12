# BugSmash MCP Server

An MCP (Model Context Protocol) server that exposes the [BugSmash.io](https://bugsmash.io) API as tools for Claude, OpenCode, and any other MCP-compatible AI agent.

## Tools

26 tools across 5 resource groups:

### Folders
| Tool | Description |
|------|-------------|
| `bugsmash_list_folders` | List all folders in your workspace |
| `bugsmash_get_folder` | Get a folder by UUID, including its projects and users |
| `bugsmash_create_folder` | Create a new folder, optionally with projects and a parent |
| `bugsmash_update_folder` | Rename, change access level, or add/remove projects |
| `bugsmash_delete_folder` | Delete a folder (projects inside are preserved) |

### Versions
| Tool | Description |
|------|-------------|
| `bugsmash_list_versions` | List all versions for a project |
| `bugsmash_get_version` | Get version details including file URLs |
| `bugsmash_create_version` | Add a new website version to a project |
| `bugsmash_delete_version` | Delete a version and all its files and comments |

### Projects
| Tool | Description |
|------|-------------|
| `bugsmash_create_project` | Create a review project from a website URL |
| `bugsmash_list_projects` | List projects with pagination and type/folder filtering |
| `bugsmash_get_project` | Get project details including versions and collaborators |
| `bugsmash_update_project` | Update name, access, anonymous comments, or language |
| `bugsmash_delete_project` | Delete a project and all its versions and comments |

### Comments
| Tool | Description |
|------|-------------|
| `bugsmash_list_comments` | Fetch all comments on a project |
| `bugsmash_get_comment` | Get a single comment including its replies |
| `bugsmash_update_comment` | Update text, status, priority, or visibility |
| `bugsmash_delete_comment` | Delete a comment and all its replies |
| `bugsmash_list_replies` | List all replies in a comment thread |
| `bugsmash_post_reply` | Post a reply to a comment |
| `bugsmash_delete_reply` | Delete a single reply |

### Webhooks
| Tool | Description |
|------|-------------|
| `bugsmash_list_webhooks` | List all webhook subscriptions |
| `bugsmash_create_webhook` | Create a webhook and receive the one-time signing secret |
| `bugsmash_update_webhook` | Update a webhook's events or destination URL |
| `bugsmash_delete_webhook` | Delete a webhook |
| `bugsmash_test_webhook` | Fire a test event to verify your endpoint |

> **Note:** `bugsmash_create_project` and `bugsmash_create_version` support **website URL** projects only. File/image upload variants require multipart form data and are not supported over MCP.

## Requirements

- Node.js 18+
- A BugSmash API key ([get one in your workspace settings](https://app.bugsmash.io))

## Installation

```bash
git clone https://github.com/btolle89/bugmsashio_mcp.git
cd bugmsashio_mcp
npm install
```

## Configuration

The server reads your API key from the `BUGSMASH_API_KEY` environment variable. Set it in your MCP client config (see below) — never hard-code it in the source.

### Claude Code

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "bugsmash": {
      "command": "node",
      "args": ["/path/to/bugmsashio_mcp/index.js"],
      "env": {
        "BUGSMASH_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### OpenCode

Add to your OpenCode config (typically `~/.config/opencode/config.json`):

```json
{
  "mcp": {
    "bugsmash": {
      "command": "node",
      "args": ["/path/to/bugmsashio_mcp/index.js"],
      "env": {
        "BUGSMASH_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Any MCP-compatible client

The server speaks the standard MCP stdio transport. Point your client at:

```
node /path/to/bugmsashio_mcp/index.js
```

with `BUGSMASH_API_KEY` in the environment.

## Usage examples

Once connected, you can ask your AI agent things like:

- *"List all my BugSmash projects"*
- *"Create a review project for https://example.com called 'Homepage Redesign'"*
- *"Show me all unresolved comments on project [UUID]"*
- *"Mark comment [UUID] as Resolved with priority P1"*
- *"Add a new version of [project] pointing to https://staging.example.com"*
- *"Set up a webhook for new_comment and comment_replied events on https://my-server.com/hooks/bugsmash"*

## License

MIT
