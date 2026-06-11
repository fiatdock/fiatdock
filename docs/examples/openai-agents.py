# FiatDock via OpenAI Agents SDK — plain REST function tools (no MCP needed).
# pip install openai-agents httpx
# Schemas for all four tools: GET https://fiatdock.com/tools.json
# Paid endpoints answer HTTP 402 (x402) until paid — quotes & status are free.
import httpx
from agents import Agent, Runner, function_tool

BASE = "https://fiatdock.com"


@function_tool
def get_quote(side: str = "SELL", cryptoAmount: float | None = None,
              fiatAmount: float | None = None, fiatCurrency: str = "EUR") -> str:
    """Free FiatDock quote: rate + all fees itemised (incl. the 1% commission).
    side=SELL (USDC->fiat, needs cryptoAmount) or BUY (fiat->USDC, needs fiatAmount)."""
    params = {k: v for k, v in dict(side=side, cryptoAmount=cryptoAmount,
                                    fiatAmount=fiatAmount, fiatCurrency=fiatCurrency).items() if v is not None}
    return httpx.get(f"{BASE}/v1/quote", params=params).text


@function_tool
def get_order_status(partnerOrderId: str) -> str:
    """Free status of a FiatDock on/off-ramp order by partnerOrderId."""
    return httpx.get(f"{BASE}/v1/orders/{partnerOrderId}").text


agent = Agent(
    name="treasurer",
    instructions="You manage the owner's USDC. Own-account rule: wallet and bank "
                 "account must belong to the same person — the agent's owner.",
    tools=[get_quote, get_order_status],
)

result = Runner.run_sync(agent, "What would I receive for selling 50 USDC to EUR?")
print(result.final_output)
