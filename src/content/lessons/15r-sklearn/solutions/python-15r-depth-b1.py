import pandas as pd
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split

df = pd.read_csv("train.csv")
age_mean = df["Age"].mean()
df["Age"] = df["Age"].fillna(age_mean)
df["Sex"] = df["Sex"].map({"male": 0, "female": 1})


def gap(columns, depth):
    X = df[columns]
    y = df["Survived"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=0)
    model = DecisionTreeClassifier(max_depth=depth, random_state=0)
    model.fit(X_train, y_train)
    train = (model.predict(X_train) == y_train).mean()
    test = (model.predict(X_test) == y_test).mean()
    return round(train - test, 3)
