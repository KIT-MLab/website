import numpy as np

def predict(hours, a, b):
    return a * hours + b

n = int(input())
hours_list = []
for i in range(n):
    hours_list.append(float(input()))
hours = np.array(hours_list)

a = float(input())
b = float(input())
print(predict(hours, a, b))
