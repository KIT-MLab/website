import numpy as np


def gap(pred, survived, n):
    pred = np.array(pred)
    survived = np.array(survived)
    train = (pred[:n] == survived[:n]).mean()
    test = (pred[n:] == survived[n:]).mean()
    return round(train - test, 3)
