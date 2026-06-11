# FiatDock Integrations — every major agent client, copy-paste ready

FiatDock speaks three protocols; pick the row that matches your stack:

| Path | Best for | Auto-pays the $0.05 x402 fee? |
|---|---|---|
| **MCP stdio** — `npx fiatdock-mcp` | Claude Desktop/Code, Cursor, VS Code, Windsurf, Gemini CLI, any local MCP host | ✅ yes, with `AGENT_PRIVATE_KEY` |
| **MCP remote** — `https://fiatdock.com/mcp` (Streamable HTTP, stateless, CORS-enabled) | Hosted agents, browser clients, frameworks with HTTP-MCP support | ❌ no — paid tools return the x402 402 challenge for your agent to settle |
| **Plain REST** — [`/openapi.json`](https://fiatdock.com/openapi.json) + [`/tools.json`](https://fiatdock.com/tools.json) function-calling schemas | OpenAI/Gemini function calling, LangChain, CrewAI, anything without MCP | ❌ no — handle the 402 challenge (or use free endpoints) |

Free tools (`get_quote`, `get_order_status`) work on every path with no key and no payment.

**Compliance (binding, all paths):** own-account rule — the wallet sending crypto and the bank account receiving fiat must belong to the same person (the agent's owner). No third-party funds, no aggregation, no P2P. 18+. Portugal + Transak-supported EU/EEA countries (not the UK). Quotes indicative; not investment advice. Terms: https://fiatdock.com/terms

Environment variables for the stdio package:

| Variable | Required | Purpose |
|---|---|---|
| `FIATDOCK_URL` | no (default `https://fiatdock.com`) | API base URL |
| `AGENT_PRIVATE_KEY` | only for paid tools | dedicated low-balance agent wallet that signs the $0.05 USDC x402 payment — **never your main key** |

---

## Claude Desktop

`claude_desktop_config.json` (Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "fiatdock": {
      "command": "npx",
      "args": ["-y", "fiatdock-mcp"],
      "env": { "AGENT_PRIVATE_KEY": "0x..." }
    }
  }
}
```

## Claude Code

```bash
# local (auto-pays x402):
claude mcp add fiatdock -e AGENT_PRIVATE_KEY=0x... -- npx -y fiatdock-mcp

# or remote (no install, free tools + 402 challenges):
claude mcp add --transport http fiatdock https://fiatdock.com/mcp
```

## Cursor

`~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (per project):

```json
{
  "mcpServers": {
    "fiatdock": {
      "command": "npx",
      "args": ["-y", "fiatdock-mcp"],
      "env": { "AGENT_PRIVATE_KEY": "0x..." }
    }
  }
}
```

Remote variant: `{ "mcpServers": { "fiatdock": { "url": "https://fiatdock.com/mcp" } } }`

## VS Code (GitHub Copilot agent mode)

`.vscode/mcp.json`:

```json
{
  "servers": {
    "fiatdock": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "fiatdock-mcp"],
      "env": { "AGENT_PRIVATE_KEY": "0x..." }
    }
  }
}
```

Remote variant: `{ "servers": { "fiatdock": { "type": "http", "url": "https://fiatdock.com/mcp" } } }`

## Windsurf

`~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "fiatdock": {
      "command": "npx",
      "args": ["-y", "fiatdock-mcp"],
      "env": { "AGENT_PRIVATE_KEY": "0x..." }
    }
  }
}
```

Remote variant: `{ "mcpServers": { "fiatdock": { "serverUrl": "https://fiatdock.com/mcp" } } }`

## Gemini CLI

`~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "fiatdock": {
      "command": "npx",
      "args": ["-y", "fiatdock-mcp"],
      "env": { "AGENT_PRIVATE_KEY": "0x..." }
    }
  }
}
```

Remote variant: `{ "mcpServers": { "fiatdock": { "httpUrl": "https://fiatdock.com/mcp" } } }`

## OpenAI Agents SDK (Python — native MCP support)

```python
from agents import Agent, Runner
from agents.mcp import MCPServerStdio  # or MCPServerStreamableHttp

async with MCPServerStdio(
    params={"command": "npx", "args": ["-y", "fiatdock-mcp"],
            "env": {"AGENT_PRIVATE_KEY": "0x..."}}
) as fiatdock:
    agent = Agent(name="treasurer", instructions="Manage the owner's USDC.",
                  mcp_servers=[fiatdock])
    result = await Runner.run(agent, "Quote selling 50 USDC to EUR")
```

Remote variant: `MCPServerStreamableHttp(params={"url": "https://fiatdock.com/mcp"})`

## LangChain / LangGraph (langchain-mcp-adapters)

```python
from langchain_mcp_adapters.client import MultiServerMCPClient

client = MultiServerMCPClient({
    "fiatdock": {"transport": "streamable_http", "url": "https://fiatdock.com/mcp"},
    # or local: {"transport": "stdio", "command": "npx",
    #            "args": ["-y", "fiatdock-mcp"], "env": {"AGENT_PRIVATE_KEY": "0x..."}},
})
tools = await client.get_tools()  # bind to any LangChain/LangGraph agent
```

## CrewAI (crewai-tools)

```python
from crewai import Agent
from crewai_tools import MCPServerAdapter
from mcp import StdioServerParameters

params = StdioServerParameters(command="npx", args=["-y", "fiatdock-mcp"],
                               env={"AGENT_PRIVATE_KEY": "0x..."})
with MCPServerAdapter(params) as tools:
    treasurer = Agent(role="Treasurer", goal="Move agent USDC to the owner's bank",
                      backstory="...", tools=tools)
```

Remote variant: `MCPServerAdapter({"url": "https://fiatdock.com/mcp", "transport": "streamable-http"})`

---

## No MCP at all? Use function calling + REST

`GET https://fiatdock.com/tools.json` returns the same four tools as ready-made
JSON Schema function declarations (OpenAI `tools` / Gemini `functionDeclarations`
format) with the REST call each one maps to. Full API reference:
[`/openapi.json`](https://fiatdock.com/openapi.json) ·
runnable examples: [`docs/examples/`](examples/) (OpenAI, LangChain, CrewAI).

The free first call, from anywhere:

```bash
curl "https://fiatdock.com/v1/quote?side=SELL&cryptoAmount=50"
```
