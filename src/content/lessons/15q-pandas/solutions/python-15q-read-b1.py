import pandas as pd

df = pd.read_csv("train.csv")
print(len(df))
print(round(df["Fare"].mean(), 2))
print(df["Age"].max())
