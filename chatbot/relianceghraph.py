import yfinance as yf
import pandas as pd
import matplotlib.pyplot as plt

# If downloading directly (uncomment if needed)
# data = yf.download("RELIANCE.NS", start="2024-01-01", end="2026-02-20")
# data.to_csv("RELIANCE_NS_data.csv")

# Load saved CSV
data = pd.read_csv("RELIANCE_NS_data.csv")

# Convert Date column to datetime (important for plotting)
# data["Date"] = pd.to_datetime(data["Date"])

# Sort by date (just in case)
# data = data.sort_values("Date")

print(data["Close"])
print("Saved successfully!")

# -----------------------------
# 📊 Plot 1: Closing Price
# -----------------------------
plt.figure()
plt.plot( [1,2,3], [4,5,6])
# plt.title("RELIANCE Closing Price")
# plt.xlabel("Date")
# plt.ylabel("Price (INR)")
# plt.xticks(rotation=45)
# plt.tight_layout()
plt.show()
 