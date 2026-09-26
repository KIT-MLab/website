import numpy as np

n = int(input())
before_list = []
for i in range(n):
    before_list.append(int(input()))
after_list = []
for i in range(n):
    after_list.append(int(input()))
before = np.array(before_list)
after = np.array(after_list)
diff = after - before
print(after[diff > 0])
