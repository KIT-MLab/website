import pandas as pd
from sklearn.tree import DecisionTreeClassifier

df = pd.read_csv("train.csv")
age_mean = df["Age"].mean()
df["Age"] = df["Age"].fillna(age_mean)
df["Sex"] = df["Sex"].map({"male": 0, "female": 1})

features = ["Pclass", "Age"]
X = df[features]
y = df["Survived"]

model = DecisionTreeClassifier(max_depth=1)
model.fit(X, y)
pred = model.predict(X)
print((pred == y).mean())
