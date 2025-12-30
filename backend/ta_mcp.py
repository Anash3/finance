import yfinance as yf
import pandas as pd
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("technicalanalysisserver")

def rsi(series, period=14):
    delta = series.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)

    avg_gain = gain.rolling(period).mean()
    avg_loss = loss.rolling(period).mean()

    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))

@mcp.tool()
def momentum(stock_ticker: str) -> str:
    """
    RSI-based momentum indicator.
    """
    data = yf.Ticker(stock_ticker).history(period="3mo")
    rsi_value = rsi(data["Close"]).iloc[-1]

    if rsi_value > 70:
        signal = "Overbought"
    elif rsi_value < 30:
        signal = "Oversold"
    else:
        signal = "Neutral"

    return f"{stock_ticker} RSI(14): {round(rsi_value,2)} → {signal}"

@mcp.tool()
def trend(stock_ticker: str) -> str:
    """
    Trend detection using moving averages.
    """
    data = yf.Ticker(stock_ticker).history(period="1y")
    close = data["Close"]

    ma50 = close.rolling(50).mean().iloc[-1]
    ma200 = close.rolling(200).mean().iloc[-1]
    last = close.iloc[-1]

    if last > ma50 > ma200:
        trend = "Strong Uptrend"
    elif last < ma50 < ma200:
        trend = "Strong Downtrend"
    else:
        trend = "Sideways / Consolidation"

    return (
        f"{stock_ticker} Trend Analysis:\n"
        f"Price: {round(last,2)}\n"
        f"50 DMA: {round(ma50,2)}\n"
        f"200 DMA: {round(ma200,2)}\n"
        f"Trend: {trend}"
    )

@mcp.tool()
def volatility(stock_ticker: str) -> str:
    """
    30-day historical volatility.
    """
    data = yf.Ticker(stock_ticker).history(period="2mo")
    returns = data["Close"].pct_change()

    vol = returns.std() * (252 ** 0.5)
    return f"{stock_ticker} Annualized Volatility: {round(vol*100,2)}%"

if __name__ == "__main__":
    mcp.run(transport="stdio")
