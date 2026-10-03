import pandas as pd
from sklearn.tree import DecisionTreeClassifier

df = pd.read_csv("train.csv")
age_mean = df["Age"].mean()
df["Age"] = df["Age"].fillna(age_mean)
df["Sex"] = df["Sex"].map({"male": 0, "female": 1})
df["Embarked"] = df["Embarked"].fillna("S")
df["Embarked"] = df["Embarked"].map({"S": 0, "C": 1, "Q": 2})


def train_accuracy(columns):
    X = df[columns]
    y = df["Survived"]
    model = DecisionTreeClassifier(max_depth=1)
    model.fit(X, y)
    pred = model.predict(X)
    return (pred == y).mean()
