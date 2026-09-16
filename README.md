# fiatdock-mcp

**Cash out an agent's USDC to a real bank account.** That is the one thing here no public RPC and no other pay-per-call service does: your agent holds USDC, and its owner receives euros in their own bank — conversion, KYC and custody handled by a licensed, regulated payment partner, and FiatDock never touches the funds.

Also included: first-party on-chain Base data and token-safety screening, and a marketplace where agents discover and **pay each other per call in USDC** over x402 — settlement goes straight to the seller's wallet, so there are no accounts, no API keys and no subscriptions.

## Setup — two steps

```bash
# 1. Give the agent a payment wallet (the step everyone skips — without it every paid
#    tool stops at an HTTP 402 "payment required" challenge and NOTHING works past free):
#    create a FRESH wallet, fund it with a few USDC on Base, and export its key:
export AGENT_PRIVATE_KEY=0x...   # dedicated low-balance wallet — never your main key

# 2. Run the server — 18 MCP tools over stdio, paid calls settle automatically:
npx -y fiatdock-mcp
```

No wallet yet? Everything marked **free** below still works — start with `get_quote` and `token_price`, add the wallet when you want the paid tools.

**4 ramp tools** (USDC ↔ your own bank) + **11 data tools** (crypto + on-chain intelligence) + **3 marketplace tools** (discover & call other agents' MCP services) — all non-custodial. Take only the group you need with [`FIATDOCK_TOOLS`](#pick-your-tools--fiatdock_tools):

| Tool | Cost | What it does |
|---|---|---|
| `get_quote` | free | Live rate + the exact amount received, net of every provider fee (incl. the 1% service commission) |
| `create_offramp_session` | $0.01 USDC via x402 | Agent's USDC → owner's own bank account; returns a one-time `checkoutUrl` |
| `create_onramp_session` | $0.01 USDC via x402 | Owner's own fiat → USDC to the agent's wallet (address locked) |
| `get_order_status` | free | Track an order by `partnerOrderId` |
| `token_price` | free | Real-time price/liquidity/volume/change for any EVM token by contract address (DexScreener), or a major symbol spot price |
| `token_safety` | $0.01 USDC via x402 | On-chain safety verdict (honeypot / tax / owner-privilege / holder-concentration) `safe\|caution\|danger` (GoPlus + DexScreener); not charged if data unavailable |
| `stablecoin_intel` | $0.002 USDC via x402 | Stablecoin supply, $1.00 peg deviation & per-chain breakdown incl. Base (DefiLlama); not charged if data unavailable |
| `gas_price` | $0.001 USDC via x402 | Base gas price (wei + gwei) |
| `block_number` | $0.001 USDC via x402 | Base latest block height + timestamp |
| `eth_balance` | $0.001 USDC via x402 | ETH balance of any address on Base |
| `usdc_balance` | $0.001 USDC via x402 | USDC balance of any address on Base |
| `token_metadata` | $0.002 USDC via x402 | ERC-20 name / symbol / decimals / total supply on Base |
| `tx_status` | $0.001 USDC via x402 | Base tx: success or failed, block, confirmations, gas, from/to |
| `address_intel` | $0.005 USDC via x402 | Enrich any Base address — EOA/contract/ERC-20, nonce, ETH+USDC balance, keyless security verdict (phishing / sanctioned / mixer) |
| `token_report` | $0.05 USDC via x402 | Full ERC-20 report in ONE call: price + liquidity + volume **and** the complete safety verdict |
| `search_services` | free | Search the FiatDock marketplace of MCP services — matches each listed server's own tool names, not just its description. Returns the **top 20** best-matching listings by default (`limit`, max 50); `truncated`/`total` tell you when there are more |
| `get_service` | free | One listing's full detail + how to call it |
| `call_service` | per-listing (x402) | Invoke a listed service. Paid calls settle 99% → seller + 1% → FiatDock (100% → seller during that seller's first month), non-custodially. Pays automatically from `AGENT_PRIVATE_KEY`, **or** pass your own signed `payment` — see below |

- **Remote endpoint (no install):** `https://fiatdock.com/mcp` — Streamable HTTP, stateless, CORS-enabled. It holds no key, so paid tools answer with the x402 402 challenge — **and you can complete the purchase from there** by signing it yourself (below).

### Buying with your own wallet

`AGENT_PRIVATE_KEY` is the easy path, but it is **one** wallet chosen at install time. If your agent has its own signer — Coinbase AgentKit, a wallet MCP server, anything — buy in two calls on either transport:

```
1. call_service({id, args})            -> 402: { paymentRequired, howToPay }
2. sign every entry in paymentRequired.accepts, base64 the x402 payload
3. call_service({id, args, payment})   -> the seller's response
```

Send the **same** `id` and `args` on the second call — the request quoted in the 402 is the request that gets paid for. A caller-supplied `payment` takes precedence over `AGENT_PRIVATE_KEY` (and skips `FIATDOCK_MAX_PRICE_USD`, which exists to bound *automatic* spending, not yours). A 402 charges nothing — it is the price, not a bill, so retrying is always safe.
- **Official MCP Registry:** [`com.fiatdock/fiatdock-mcp`](https://registry.modelcontextprotocol.io/v0.1/servers?search=com.fiatdock/fiatdock-mcp)
- **No MCP?** `GET https://fiatdock.com/tools.json` — the same tools as OpenAI/Gemini function-calling schemas mapped to the plain [REST API](https://fiatdock.com/openapi.json).
- **Per-client setup** (Claude Desktop/Code, Cursor, VS Code, Windsurf, Gemini CLI, OpenAI Agents SDK, LangChain, CrewAI): [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) · runnable examples: [docs/examples/](docs/examples/)

**Compliance (binding):** users must be 18+, in Portugal or supported EU/EEA countries (not available in the UK or restricted countries). **Own-account rule:** the wallet sending crypto and the bank account receiving fiat must belong to the same person — the agent's owner. No third-party funds, no aggregation, no person-to-person transfers. Crypto is volatile; quotes are indicative; nothing here is investment advice. [Terms](https://fiatdock.com/terms) · [Privacy](https://fiatdock.com/privacy) · [Risk warning](https://fiatdock.com/risk)

## Environment

| Variable | Required | Purpose |
|---|---|---|
| `FIATDOCK_URL` | no (default `https://fiatdock.com`) | FiatDock API base URL |
| `FIATDOCK_TOOLS` | no (default `all`) | Install only the tool groups you need, so the rest don't take up your agent's context. See below. |
| `AGENT_PRIVATE_KEY` | only for paid tools | Agent wallet key used to auto-pay the x402 fee — **$0.001–$0.05 depending on the tool**, plus whatever a marketplace seller charges for `call_service`. Without it, the five free tools still work and paid tools return the 402 challenge instead of buying. **Use a dedicated low-balance wallet; never your main key.** |
| `FIATDOCK_MAX_PRICE_USD` | no (default: no ceiling) | Price-bait guard for `call_service`: refuse to pay if a paid gateway call's **total** x402 charge exceeds this many USD. Overridable per call via the `maxPriceUsd` argument. |

### Pick your tools — `FIATDOCK_TOOLS`

All 18 tools install by default. A tool list is the first thing a model reads, so if you only
came for one thing, take only that:

| Group | Tools | For |
|---|---|---|
| `ramp` | 4 | Quotes, USDC↔bank sessions, order status |
| `data` | 11 | Token price/safety/report, gas, balances, tx status, address intelligence |
| `marketplace` | 3 | Find, inspect and pay for other agents' MCP services |

```bash
FIATDOCK_TOOLS=ramp                # just the cash-out surface (4 tools)
FIATDOCK_TOOLS=ramp,marketplace    # cash out + buy from other agents (7 tools)
# unset, or "all"                  # everything (18 tools)
```

An unrecognised value serves **all** tools rather than none — a typo should never leave you
with an empty server. Switching off `marketplace` also withdraws the `fiatdock://catalog`
resource, so nothing marketplace-related enters your context.

### Resources

`fiatdock://fees` · `fiatdock://coverage` · **`fiatdock://catalog`** — the live marketplace
catalog (name, price per call, category, tool count and a sample of tool names), so your agent
knows what is for sale without spending a tool call to ask.

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
2. `create_offramp_session` — pays $0.01 in USDC automatically via x402, receives `checkoutUrl` + `partnerOrderId`.
3. The agent forwards `checkoutUrl` to its human owner (valid ~2 hours). The owner gives the provider a phone number and email; identity documents are needed only above ~CHF 999 per rolling 30 days — no account, no password.
4. `get_order_status` (or a signed callback) confirms `COMPLETED`.

## Security

Found a vulnerability? Please report it privately to **osama@fiatdock.com** — see [SECURITY.md](SECURITY.md). Never open a public issue for security reports.

## License

[MIT](LICENSE)
