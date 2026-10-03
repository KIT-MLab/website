import pandas as pd

df = pd.read_csv("train.csv")
print(df["Age"].isna().sum())
age_mean = df["Age"].mean()
df["Age"] = df["Age"].fillna(age_mean)
print(df["Age"].isna().sum())
print(len(df[df["Age"] >= 17]))
