import numpy as np

threshold = 60
count = int(input())
table = []
for i in range(count):
    table.append([int(input()), int(input()), int(input())])
scores = np.array(table)
averages = np.round(scores.mean(axis=1), 1)

for i in range(count):
    if averages[i] >= threshold:
        print(f"平均{averages[i]}点 合格")
    else:
        print(f"平均{averages[i]}点 不合格")
