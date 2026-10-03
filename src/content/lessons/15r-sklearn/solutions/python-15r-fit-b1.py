import numpy as np
from sklearn.tree import DecisionTreeClassifier


def tree_test(ages, survived, n):
    ages = np.array(ages)
    survived = np.array(survived)
    X_train = ages[:n].reshape(n, 1)
    y_train = survived[:n]
    X_test = ages[n:].reshape(len(ages) - n, 1)
    y_test = survived[n:]
    model = DecisionTreeClassifier(max_depth=1)
    model.fit(X_train, y_train)
    return (model.predict(X_test) == y_test).mean()
