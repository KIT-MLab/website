def accuracy(ages, survived, border):
    hits = 0
    for i in range(len(ages)):
        if ages[i] < border:
            pred = 1
        else:
            pred = 0
        if pred == survived[i]:
            hits = hits + 1
    return hits / len(ages)


def learn(ages, survived):
    best = 0
    for border in range(1, 81):
        if accuracy(ages, survived, border) > accuracy(ages, survived, best):
            best = border
    return best
