import yfinance as yf
import pandas as pd

# Download data
# data = yf.download("RELIANCE.NS", start="2024-01-01", end="2026-02-20")

# Save to CSV
# data.to_csv("RELIANCE_NS_data.csv")
data=pd.read_csv("RELIANCE_NS_data.csv")
print(data["Close"])
# print(data.columns[2])
print("Saved successfully!")
