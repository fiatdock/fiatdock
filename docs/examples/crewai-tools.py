# FiatDock via CrewAI — REST-backed custom tool (no MCP needed).
# pip install crewai crewai-tools httpx
# (Prefer MCP? MCPServerAdapter + https://fiatdock.com/mcp — see docs/INTEGRATIONS.md)
import httpx
from crewai import Agent, Crew, Task
from crewai.tools import tool

BASE = "https://fiatdock.com"


@tool("FiatDock quote")
def get_quote(side: str = "SELL", cryptoAmount: float = 0, fiatCurrency: str = "EUR") -> str:
    """Free FiatDock quote: rate + all fees itemised (incl. the 1% commission).
    side=SELL (USDC->fiat, needs cryptoAmount) or BUY (fiat->USDC)."""
    params = {"side": side, "fiatCurrency": fiatCurrency}
    if cryptoAmount:
        params["cryptoAmount"] = cryptoAmount
    return httpx.get(f"{BASE}/v1/quote", params=params).text


treasurer = Agent(
    role="Treasurer",
    goal="Report what the owner would receive when cashing out agent USDC",
    backstory="Manages the owner's funds. Own-account rule: wallet and bank "
              "account belong to the same person — the agent's owner.",
    tools=[get_quote],
)

crew = Crew(agents=[treasurer],
            tasks=[Task(description="Quote selling 50 USDC to EUR and summarise the fees.",
                        expected_output="Rate, total fees, amount received.",
                        agent=treasurer)])
print(crew.kickoff())
