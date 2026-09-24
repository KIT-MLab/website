import numpy as np

threshold = 60
weights = np.array([[0.3], [0.3], [0.4]])
count = int(input())
flat = []
for i in range(count * 3):
    flat.append(int(input()))
scores = np.array(flat).reshape(count, 3)
averages = np.round(scores.mean(axis=1), 1)
diffs = np.round(scores - scores.mean(axis=0), 1)
weighted = np.round((scores @ weights)[:, 0], 1)
z = (scores - scores.mean(axis=0)) / scores.std(axis=0)
deviation = np.round(50 + 10 * z, 1)

for i in range(count):
    if averages[i] >= threshold:
        print(f"平均{averages[i]}点 合格")
    else:
        print(f"平均{averages[i]}点 不合格")
    print(diffs[i])
    if weighted[i] >= threshold:
        print(f"配点平均{weighted[i]}点 合格")
    else:
        print(f"配点平均{weighted[i]}点 不合格")
    print(deviation[i])
