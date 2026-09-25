import numpy as np

n = int(input())
pred = []
answer = []
for i in range(n):
    pred.append(int(input()))
    answer.append(int(input()))
pred = np.array(pred)
answer = np.array(answer)

accuracy = (pred == answer).mean()
ones = answer.sum()
zeros = len(answer) - ones
if ones >= zeros:
    baseline = ones / len(answer)
else:
    baseline = zeros / len(answer)

print(round(accuracy, 2))
print(round(baseline, 2))
