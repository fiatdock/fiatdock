#!/usr/bin/env node
// FiatDock MCP server — lets any MCP-capable AI agent (Claude, etc.) use
// FiatDock as native tools. Pays x402 fees automatically from AGENT_PRIVATE_KEY.
//
// Config example (claude_desktop_config.json / any MCP client):
// { "mcpServers": { "fiatdock": { "command": "npx", "args": ["fiatdock-mcp"],
//   "env": { "FIATDOCK_URL": "https://fiatdock.com", "AGENT_PRIVATE_KEY": "0x..." } } } }

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment } from "x402-fetch";

const BASE = process.env.FIATDOCK_URL || "https://fiatdock.com";

// x402-paying fetch (falls back to plain fetch if no key — free endpoints still work)
let payFetch = fetch;
if (process.env.AGENT_PRIVATE_KEY) {
  const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY);
  payFetch = wrapFetchWithPayment(fetch, account);
}

const server = new McpServer({ name: "fiatdock", title: "FiatDock", version: "1.0.2", websiteUrl: "https://fiatdock.com" });

// Compliance wording shared by paid tools (binding — mirrors /terms):
const COMPLIANCE =
  " COMPLIANCE: own-account rule — the sending wallet and the receiving bank account must belong to the SAME person (the agent's owner); no third-party funds, no aggregation, no P2P transfers. 18+; service area: Portugal + Transak-supported EU/EEA countries (NOT the UK). Crypto is volatile; not investment advice.";

async function post(path, body) {
  const r = await payFetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { content: [{ type: "text", text: await r.text() }] };
}

server.tool(
  "create_offramp_session",
  "Convert the agent's USDC to fiat in the owner's OWN bank account. Returns a one-time checkoutUrl (forward it to the human owner; valid 5 minutes, single use) and a partnerOrderId to track." + COMPLIANCE,
  {
    cryptoAmount: z.number().describe("USDC amount to sell"),
    fiatCurrency: z.string().optional().describe("e.g. EUR, default EUR"),
    network: z.string().optional().describe("USDC network, default base"),
    email: z.string().optional().describe("Owner's Transak account email"),
    customerId: z.string().optional().describe("Stable agent/customer id"),
    ref: z.string().optional().describe("Optional referral code (1-64 chars: letters, digits, _ or -)"),
  },
  (args) => post("/v1/offramp/session", args)
);

server.tool(
  "create_onramp_session",
  "Buy USDC with the owner's OWN fiat and deliver it to the agent's wallet (address locked). Returns checkoutUrl + partnerOrderId." + COMPLIANCE,
  {
    fiatAmount: z.number().describe("Fiat amount to spend"),
    walletAddress: z.string().describe("Agent wallet that receives USDC"),
    fiatCurrency: z.string().optional(),
    network: z.string().optional(),
    email: z.string().optional(),
    customerId: z.string().optional(),
    ref: z.string().optional().describe("Optional referral code (1-64 chars: letters, digits, _ or -)"),
  },
  (args) => post("/v1/onramp/session", args)
);

server.tool(
  "get_quote",
  "Free quote before paying: exchange rate, total fees (all itemised, incl. the 1% service commission), and amount received. Quotes are indicative, not guaranteed. side=SELL (USDC->fiat) or BUY (fiat->USDC).",
  {
    side: z.enum(["SELL", "BUY"]).default("SELL"),
    cryptoAmount: z.number().optional().describe("USDC amount (required for SELL)"),
    fiatAmount: z.number().optional().describe("Fiat amount (for BUY)"),
    fiatCurrency: z.string().optional(),
    network: z.string().optional(),
  },
  async (args) => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(args).filter(([, v]) => v !== undefined)));
    const r = await fetch(`${BASE}/v1/quote?${q}`);
    return { content: [{ type: "text", text: await r.text() }] };
  }
);

server.tool(
  "get_order_status",
  "Check the status of an on/off-ramp order by partnerOrderId.",
  { partnerOrderId: z.string() },
  async ({ partnerOrderId }) => {
    const r = await fetch(`${BASE}/v1/orders/${encodeURIComponent(partnerOrderId)}`);
    return { content: [{ type: "text", text: await r.text() }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
