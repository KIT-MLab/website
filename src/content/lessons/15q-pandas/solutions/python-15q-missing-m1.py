import pandas as pd

df = pd.read_csv("train.csv")
df["Embarked"] = df["Embarked"].fillna("S")
print(df["Embarked"].isna().sum())
print(len(df[df["Embarked"] == "S"]))
