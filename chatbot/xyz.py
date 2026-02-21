import yfinance as yf
import pandas as pd

# Download data
# data = yf.download("RELIANCE.NS", start="2024-01-01", end="2026-02-20")

# Save to CSV
# data.to_csv("RELIANCE_NS_data.csv")
data = pd.read_csv("RELIANCE_NS_data.csv")
# print(data["Close"])
# print(data.columns[2])
# print("Saved successfully!")
# print(data["Close"])      # Column
nrows = len(data)
ncols = len(data.columns)
print(nrows, ncols)
for r in range(nrows):
    for c in range(ncols):
        # print(r, c, end=",")
        # print(data.iloc[r,c],end=",")
        
        print(data["Close"].loc[r])
    print()
# for i in range(n):
#     print(data.loc[i])
# print(data.loc[0])          # Row by index label
# print(data.iloc[1, 1])      # Row 1, Column 1 (0-based)
