import numpy as np

threshold = 60
count = int(input())
flat = []
for i in range(count * 3):
    flat.append(int(input()))
scores = np.array(flat).reshape(count, 3)
averages = np.round(scores.mean(axis=1), 1)
diffs = np.round(scores - scores.mean(axis=0), 1)

for i in range(count):
    if averages[i] >= threshold:
        print(f"平均{averages[i]}点 合格")
    else:
        print(f"平均{averages[i]}点 不合格")
    print(diffs[i])
