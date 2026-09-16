# FiatDock Integrations — every major agent client, copy-paste ready

FiatDock speaks three protocols; pick the row that matches your stack:

| Path | Best for | Auto-pays the x402 fee? |
|---|---|---|
| **MCP stdio** — `npx fiatdock-mcp` | Claude Desktop/Code, Cursor, VS Code, Windsurf, Gemini CLI, any local MCP host | ✅ yes, with `AGENT_PRIVATE_KEY` |
| **MCP remote** — `https://fiatdock.com/mcp` (Streamable HTTP, stateless, CORS-enabled) | Hosted agents, browser clients, frameworks with HTTP-MCP support | ❌ no — paid tools return the x402 402 challenge for your agent to sign and resubmit |
| **Plain REST** — [`/openapi.json`](https://fiatdock.com/openapi.json) + [`/tools.json`](https://fiatdock.com/tools.json) function-calling schemas | OpenAI/Gemini function calling, LangChain, CrewAI, anything without MCP | ❌ no — handle the 402 challenge (or use free endpoints) |

**Five tools are free** on every path, with no key, no wallet and no payment:
`get_quote`, `get_order_status`, `token_price`, `search_services`, `get_service`.
Everything else is priced per call — $0.001 (a Base chain read) to $0.05 (the full token report),
with the ramp session endpoints at $0.01. The live per-tool prices are in
[`mcp.md`](./mcp.md) and in the 402 challenge itself.

**Compliance (binding, all paths):** own-account rule — the wallet sending crypto and the bank account receiving fiat must belong to the same person (the agent's owner). No third-party funds, no aggregation, no P2P. 18+. Coverage follows the **provider's** rails, not a FiatDock policy (ADR-0058): bank transfer in any of 18 currencies, both ways (EUR across the SEPA zone including Portugal); buying USDC can also use card/Apple/Google Pay in ~160 countries — excluding US persons, Russian citizens and the provider's restricted-country list; the UK is out of scope for us separately. The authoritative list is the `fiatdock://coverage` MCP resource and the annex in the terms. Quotes indicative; not investment advice. Terms: https://fiatdock.com/terms

Environment variables for the stdio package:

| Variable | Required | Purpose |
|---|---|---|
| `FIATDOCK_URL` | no (default `https://fiatdock.com`) | API base URL |
| `AGENT_PRIVATE_KEY` | only for paid tools | dedicated low-balance agent wallet that signs the USDC x402 payment — **never your main key** |
| `FIATDOCK_TOOLS` | no (default: all) | narrow the surface to tool GROUPS — `ramp`, `data`, `marketplace` (comma-separated). An unknown value falls back to all tools, never to none |
| `FIATDOCK_MAX_PRICE_USD` | no (default: no ceiling) | refuse to auto-pay a marketplace `call_service` whose 402 totals more than this |

**Payments are x402 protocol v2 on Base mainnet.** Use the **`@x402/*`** scope
([`@x402/fetch`](https://www.npmjs.com/package/@x402/fetch), `@x402/evm`) if you sign payments
yourself. The unscoped `x402-fetch` / `x402-express` / `x402` packages are the **v1** line: they
emit a v1 payload and will be refused even from a funded wallet. The published request header is
**`PAYMENT-SIGNATURE`** (`X-PAYMENT`, the v1 name, is still accepted); the settlement result comes
back on **`PAYMENT-RESPONSE`**.

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

## The marketplace — buying another seller's MCP service

Every config above also connects your agent to the **FiatDock Marketplace**: a catalog of
third-party MCP services an agent can discover and pay for **per call**, without a human, an
account, a subscription or an API key. Three of the eighteen tools cover it:

| Tool | Price | What it does |
|---|---|---|
| `search_services` | **free** | Search the catalog (`q`, `category`, `verifiedOnly`, `sort`). Every row carries the price plus `callHint` — how to actually buy that listing, or why not to (over REST, `callHint` is opt-in: `?include=callhint`) |
| `get_service` | **free** | One listing in full — price, tools, seller badge, and `callable` (a tri-state: `true`, `false` with a reason, or **absent** when we have not checked) |
| `call_service` | **per listing** | Invoke it. `id`*, `args?`, `payment?` (a base64 x402 v2 payload you signed), `maxPriceUsd?` (local package only) |

**The money never touches us.** A paid call is settled as **direct wallet-to-wallet x402
payments on Base**: the buyer signs one authorization paying the seller and, once the seller is
past their launch window, a second one paying the 1% platform commission. The gateway verifies
both, forwards the call, and settles on-chain **only after the seller has actually answered** —
a call that produces no answer costs you nothing. FiatDock never holds, routes or pools the
funds, and the seller's real endpoint is never exposed to you (you call `/s/:id`). Full flow:
[`marketplace-gateway.md`](./marketplace-gateway.md).

**Transport limit — read this before you wire it up.** Auto-payment needs the **local stdio**
server, because only it holds a key:

- **Local (`npx fiatdock-mcp` with `AGENT_PRIVATE_KEY`)** — `call_service` reads the 402, signs
  **every leg it lists** (one or two, whatever the challenge says) and completes the purchase in a
  single tool call. Set `FIATDOCK_MAX_PRICE_USD` (or pass `maxPriceUsd`) to refuse anything above
  a ceiling before signing.
- **Remote (`https://fiatdock.com/mcp`)** — holds **no key** and can sign nothing. `call_service`
  returns the 402 challenge as tool output, with `howToPay` naming the exact next call. Sign it
  with your own wallet, then call `call_service` **again** with the base64 payload in the optional
  **`payment`** argument. That second call completes the purchase without leaving MCP. A 402 is a
  price, not a bill — nothing is charged for receiving one.

Discovery costs nothing either way: searching, reading a listing and being quoted a price are all
free, on both transports.

Selling instead of buying? See [`marketplace-hosting.md`](./marketplace-hosting.md) and the
publish routes in [`API.md`](./API.md).

---

## No MCP at all? Use function calling + REST

`GET https://fiatdock.com/tools.json` returns all **eighteen** tools as ready-made
JSON Schema function declarations (OpenAI `tools` / Gemini `functionDeclarations`
format) with the REST call each one maps to — including the `headerParams` entry that tells your
client the signed x402 payload belongs in the **`PAYMENT-SIGNATURE`** header and **not** in the
JSON body (put it in the body and it is forwarded to the seller as ordinary data). Full API
reference: [`/openapi.json`](https://fiatdock.com/openapi.json) ·
runnable examples: [`docs/examples/`](examples/) (OpenAI, LangChain, CrewAI).

The free first call, from anywhere:

```bash
curl "https://fiatdock.com/v1/quote?side=SELL&cryptoAmount=50"
```
