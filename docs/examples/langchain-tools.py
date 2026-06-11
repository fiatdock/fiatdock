# FiatDock via LangChain — REST-backed StructuredTools (no MCP needed).
# pip install langchain langchain-anthropic httpx
# (Prefer MCP? langchain-mcp-adapters + https://fiatdock.com/mcp — see docs/INTEGRATIONS.md)
import httpx
from langchain_core.tools import tool
from langchain_anthropic import ChatAnthropic

BASE = "https://fiatdock.com"


@tool
def get_quote(side: str = "SELL", cryptoAmount: float | None = None,
              fiatAmount: float | None = None, fiatCurrency: str = "EUR") -> str:
    """Free FiatDock quote: rate + all fees itemised (incl. the 1% commission).
    side=SELL needs cryptoAmount; side=BUY needs fiatAmount."""
    params = {k: v for k, v in dict(side=side, cryptoAmount=cryptoAmount,
                                    fiatAmount=fiatAmount, fiatCurrency=fiatCurrency).items() if v is not None}
    return httpx.get(f"{BASE}/v1/quote", params=params).text


@tool
def get_order_status(partnerOrderId: str) -> str:
    """Free status of a FiatDock order by partnerOrderId."""
    return httpx.get(f"{BASE}/v1/orders/{partnerOrderId}").text


llm = ChatAnthropic(model="claude-fable-5").bind_tools([get_quote, get_order_status])
print(llm.invoke("What would I receive for selling 50 USDC to EUR?").tool_calls)
