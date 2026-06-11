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

const server = new McpServer({ name: "fiatdock", title: "FiatDock", version: "1.0.3", websiteUrl: "https://fiatdock.com" });

// Compliance wording shared by paid tools (binding — mirrors /terms):
const COMPLIANCE =
  " COMPLIANCE: own-account rule — the sending wallet and the receiving bank account must belong to the SAME person (the agent's owner); no third-party funds, no aggregation, no P2P transfers. 18+; service area: Portugal + Transak-supported EU/EEA countries (NOT the UK). Crypto is volatile; not investment advice.";

// output shapes — mirror exactly what the REST API returns on success
// (error responses, incl. the x402 402 challenge, come back as isError text)
const QUOTE_OUTPUT = {
  side: z.enum(["SELL", "BUY"]).describe("Quote direction"),
  rate: z.number().describe("Exchange rate used (fiat per USDC)"),
  youSend: z.string().describe("Amount the sender pays, e.g. '50 USDC'"),
  youReceive: z.string().describe("Amount received after all fees, e.g. '44.6 EUR'"),
  totalFee: z.number().describe("Total fees in fiat, all itemised (incl. the 1% service commission)"),
  feeBreakdown: z.array(z.record(z.any())).describe("Provider's itemised fee list"),
  paymentMethod: z.string().optional().describe("Settlement method, e.g. sepa_bank_transfer"),
  network: z.string().optional().describe("USDC network the quote assumes"),
  note: z.string().optional().describe("Human-readable caveat (quotes are indicative)"),
};
const SESSION_OUTPUT = {
  partnerOrderId: z.string().describe("Order id — track it with get_order_status"),
  checkoutUrl: z.string().describe("One-time branded checkout URL (valid ~5 minutes, single use) — forward to the human owner"),
  note: z.string().optional().describe("Next-step instructions"),
  customerKey: z.string().optional().describe("Returned ONCE on the first session with a new customerId — store securely"),
  customerKeyNote: z.string().optional().describe("How to use customerKey"),
};
const ORDER_OUTPUT = {
  status: z.string().describe("SESSION_CREATED -> PROCESSING -> COMPLETED | FAILED | CANCELLED | EXPIRED"),
  isBuyOrSell: z.enum(["BUY", "SELL"]).optional().describe("Order direction"),
  customerId: z.string().optional().describe("Customer id the session was created with"),
  ref: z.string().optional().describe("Referral code if one was set"),
  createdAt: z.string().optional().describe("ISO 8601 session creation time"),
  updatedAt: z.string().optional().describe("ISO 8601 time of the last webhook update"),
};

// tools declare outputSchema: success (2xx, always JSON) carries structuredContent;
// non-2xx (incl. an unpaid 402 challenge when AGENT_PRIVATE_KEY is missing) is isError
async function toResult(r) {
  const raw = await r.text();
  if (!r.ok) return { content: [{ type: "text", text: raw }], isError: true };
  return { content: [{ type: "text", text: raw }], structuredContent: JSON.parse(raw) };
}

async function post(path, body) {
  const r = await payFetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return toResult(r);
}

// annotations are MCP-spec hints (read-only / non-destructive / idempotency /
// open-world) — clients and directory quality scores use them
server.registerTool(
  "create_offramp_session",
  {
    title: "Create off-ramp session (USDC → bank)",
    description:
      "Convert the agent's USDC to fiat in the owner's OWN bank account. Returns a one-time checkoutUrl (forward it to the human owner; valid 5 minutes, single use) and a partnerOrderId to track." + COMPLIANCE,
    inputSchema: {
      cryptoAmount: z.number().describe("USDC amount to sell"),
      fiatCurrency: z.string().optional().describe("e.g. EUR, default EUR"),
      network: z.string().optional().describe("USDC network, default base"),
      email: z.string().optional().describe("Owner's Transak account email"),
      customerId: z.string().optional().describe("Stable agent/customer id"),
      ref: z.string().optional().describe("Optional referral code (1-64 chars: letters, digits, _ or -)"),
    },
    outputSchema: SESSION_OUTPUT,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  (args) => post("/v1/offramp/session", args)
);

server.registerTool(
  "create_onramp_session",
  {
    title: "Create on-ramp session (fiat → USDC)",
    description:
      "Buy USDC with the owner's OWN fiat and deliver it to the agent's wallet (address locked). Returns checkoutUrl + partnerOrderId." + COMPLIANCE,
    inputSchema: {
      fiatAmount: z.number().describe("Fiat amount to spend"),
      walletAddress: z.string().describe("Agent wallet that receives USDC"),
      fiatCurrency: z.string().optional().describe("e.g. EUR, default EUR"),
      network: z.string().optional().describe("USDC network, default base"),
      email: z.string().optional().describe("Owner's Transak account email"),
      customerId: z.string().optional().describe("Stable agent/customer id"),
      ref: z.string().optional().describe("Optional referral code (1-64 chars: letters, digits, _ or -)"),
    },
    outputSchema: SESSION_OUTPUT,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  (args) => post("/v1/onramp/session", args)
);

server.registerTool(
  "get_quote",
  {
    title: "Get a free quote",
    description:
      "Free quote before paying: exchange rate, total fees (all itemised, incl. the 1% service commission), and amount received. Quotes are indicative, not guaranteed. side=SELL (USDC->fiat) or BUY (fiat->USDC).",
    inputSchema: {
      side: z.enum(["SELL", "BUY"]).default("SELL").describe("SELL = USDC to fiat, BUY = fiat to USDC"),
      cryptoAmount: z.number().optional().describe("USDC amount (required for SELL)"),
      fiatAmount: z.number().optional().describe("Fiat amount (for BUY)"),
      fiatCurrency: z.string().optional().describe("e.g. EUR, default EUR"),
      network: z.string().optional().describe("USDC network, default base"),
    },
    outputSchema: QUOTE_OUTPUT,
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  },
  async (args) => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(args).filter(([, v]) => v !== undefined)));
    const r = await fetch(`${BASE}/v1/quote?${q}`, { headers: { accept: "application/json" } });
    return toResult(r);
  }
);

server.registerTool(
  "get_order_status",
  {
    title: "Get order status",
    description: "Check the status of an on/off-ramp order by partnerOrderId.",
    inputSchema: { partnerOrderId: z.string().describe("Order id returned when the session was created") },
    outputSchema: ORDER_OUTPUT,
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  },
  async ({ partnerOrderId }) => {
    const r = await fetch(`${BASE}/v1/orders/${encodeURIComponent(partnerOrderId)}`);
    return toResult(r);
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
