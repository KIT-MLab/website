import numpy as np

n = int(input())
pred = []
answer = []
for i in range(n):
    pred.append(int(input()))
    answer.append(int(input()))
pred = np.array(pred)
answer = np.array(answer)

hit = np.sum((pred == 1) & (answer == 1))
miss = np.sum((pred == 0) & (answer == 1))
false_alarm = np.sum((pred == 1) & (answer == 0))
correct_reject = np.sum((pred == 0) & (answer == 0))

print(hit, miss, false_alarm, correct_reject)
