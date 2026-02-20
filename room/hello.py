import yfinance as yf

# Download data
data = yf.download("RELIANCE.NS", start="2024-01-01", end="2026-02-20")

# Save to CSV
data.to_csv("RELIANCE_NS_data.csv")

print("Saved successfully!")