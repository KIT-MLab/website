import numpy as np
from sklearn.tree import DecisionTreeClassifier

ages = np.array([22, 30, 31, 27, 42, 32, 30, 16, 27, 51, 38, 22, 19, 18, 35, 29, 59, 5, 24, 44, 8, 19, 33, 29, 22, 30, 44, 25, 24, 37, 54, 29, 62, 30, 41, 29, 30, 35, 50, 3])
survived = np.array([0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1])
X_train = ages[10:].reshape(30, 1)
y_train = survived[10:]
X_test = ages[:10].reshape(10, 1)
y_test = survived[:10]

model = DecisionTreeClassifier(max_depth=1)
model.fit(X_train, y_train)
train = (model.predict(X_train) == y_train).mean()
test = (model.predict(X_test) == y_test).mean()
print(round(train, 3), round(test, 3))
new = np.array([10, 16, 18, 30]).reshape(4, 1)
print(model.predict(new))
