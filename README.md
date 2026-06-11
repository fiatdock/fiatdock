# fiatdock-mcp

Move value between USDC and a bank account from any AI agent — **non-custodially** (conversion, KYC and custody are handled by Transak, a licensed provider; FiatDock never touches funds).

```bash
npx -y fiatdock-mcp        # that's it — 4 MCP tools over stdio
# optional env: AGENT_PRIVATE_KEY=0x... auto-pays the $0.05 x402 fee for paid tools
```

| Tool | Cost | What it does |
|---|---|---|
| `get_quote` | free | Live rate + all fees itemised (incl. the 1% service commission) |
| `create_offramp_session` | $0.05 USDC via x402 | Agent's USDC → owner's own bank account; returns a one-time `checkoutUrl` |
| `create_onramp_session` | $0.05 USDC via x402 | Owner's own fiat → USDC to the agent's wallet (address locked) |
| `get_order_status` | free | Track an order by `partnerOrderId` |

- **Remote endpoint (no install):** `https://fiatdock.com/mcp` — Streamable HTTP, stateless, CORS-enabled. Paid tools return the x402 402 challenge there (remote can't sign payments).
- **Official MCP Registry:** [`com.fiatdock/fiatdock-mcp`](https://registry.modelcontextprotocol.io/v0.1/servers?search=com.fiatdock/fiatdock-mcp)
- **No MCP?** `GET https://fiatdock.com/tools.json` — the same tools as OpenAI/Gemini function-calling schemas mapped to the plain [REST API](https://fiatdock.com/openapi.json).
- **Per-client setup** (Claude Desktop/Code, Cursor, VS Code, Windsurf, Gemini CLI, OpenAI Agents SDK, LangChain, CrewAI): [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) · runnable examples: [docs/examples/](docs/examples/)

**Compliance (binding):** users must be 18+, in Portugal or Transak-supported EU/EEA countries (not available in the UK or restricted countries). **Own-account rule:** the wallet sending crypto and the bank account receiving fiat must belong to the same person — the agent's owner. No third-party funds, no aggregation, no person-to-person transfers. Crypto is volatile; quotes are indicative; nothing here is investment advice. [Terms](https://fiatdock.com/terms) · [Privacy](https://fiatdock.com/privacy) · [Risk warning](https://fiatdock.com/risk)

## Environment

| Variable | Required | Purpose |
|---|---|---|
| `FIATDOCK_URL` | no (default `https://fiatdock.com`) | FiatDock API base URL |
| `AGENT_PRIVATE_KEY` | only for paid tools | Agent wallet key used to auto-pay the $0.05 x402 fee. Without it, free tools still work and paid tools return the 402 challenge. **Use a dedicated low-balance wallet; never your main key.** |

## Claude Desktop / Cursor / Windsurf / Gemini CLI

All four read the same `mcpServers` shape (file: `claude_desktop_config.json`, `~/.cursor/mcp.json`, `~/.codeium/windsurf/mcp_config.json`, `~/.gemini/settings.json`):

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
claude mcp add fiatdock -e AGENT_PRIVATE_KEY=0x... -- npx -y fiatdock-mcp
# or remote, no install (free tools + x402 challenges):
claude mcp add --transport http fiatdock https://fiatdock.com/mcp
```

## VS Code (Copilot agent mode)

`.vscode/mcp.json`:

```json
{
  "servers": {
    "fiatdock": { "type": "stdio", "command": "npx", "args": ["-y", "fiatdock-mcp"], "env": { "AGENT_PRIVATE_KEY": "0x..." } }
  }
}
```

## OpenAI Agents SDK / LangChain / CrewAI

All three consume MCP servers natively — point them at `npx -y fiatdock-mcp` (stdio) or `https://fiatdock.com/mcp` (Streamable HTTP):

```python
# OpenAI Agents SDK
from agents.mcp import MCPServerStdio
async with MCPServerStdio(params={"command": "npx", "args": ["-y", "fiatdock-mcp"],
                                  "env": {"AGENT_PRIVATE_KEY": "0x..."}}) as fiatdock: ...

# LangChain (langchain-mcp-adapters)
from langchain_mcp_adapters.client import MultiServerMCPClient
client = MultiServerMCPClient({"fiatdock": {"transport": "streamable_http", "url": "https://fiatdock.com/mcp"}})

# CrewAI (crewai-tools)
from crewai_tools import MCPServerAdapter
tools = MCPServerAdapter({"url": "https://fiatdock.com/mcp", "transport": "streamable-http"})
```

## How a typical off-ramp flows

1. `get_quote` (free) — agent checks the rate and the full fee breakdown.
2. `create_offramp_session` — pays $0.05 in USDC automatically via x402, receives `checkoutUrl` + `partnerOrderId`.
3. The agent forwards `checkoutUrl` to its human owner (valid ~5 minutes, single use). KYC happens once, ever, at the provider.
4. `get_order_status` (or a signed callback) confirms `COMPLETED`.

## Security

Found a vulnerability? Please report it privately to **osama@fiatdock.com** — see [SECURITY.md](SECURITY.md). Never open a public issue for security reports.

## License

[MIT](LICENSE)
