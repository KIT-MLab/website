import pandas as pd

df = pd.read_csv("train.csv")
df["Sex"] = df["Sex"].map({"male": 0, "female": 1})
print(df["Sex"].sum())
print(df["Sex"].mean())
women = df[df["Sex"] == 1]
print(women["Survived"].mean())
