import pandas as pd

df = pd.read_csv("train.csv")
df["Embarked"] = df["Embarked"].fillna("S")
df["Embarked"] = df["Embarked"].map({"S": 1, "C": 2, "Q": 3})
print(df["Embarked"].mean())
