import pandas as pd
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split

df = pd.read_csv("train.csv")
df["Sex"] = df["Sex"].map({"male": 0, "female": 1})

X = df[["Pclass", "Sex", "Fare"]]
y = df["Survived"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=1)

model = DecisionTreeClassifier(random_state=0)
model.fit(X_train, y_train)
print(round((model.predict(X_train) == y_train).mean(), 3))
print(round((model.predict(X_test) == y_test).mean(), 3))
print(round((y_test == 0).mean(), 3))
