import pandas as pd

df = pd.read_csv("train.csv")


def survival_rate(pclass, sex):
    group = df[(df["Pclass"] == pclass) & (df["Sex"] == sex)]
    return group["Survived"].mean()
