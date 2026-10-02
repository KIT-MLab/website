import pandas as pd

df = pd.read_csv("train.csv")
rich = df[df["Fare"] > 100]
print(len(rich))
print(rich["Survived"].mean())
