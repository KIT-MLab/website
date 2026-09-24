import numpy as np

def goal_days(steps, goal=8000):
    return len(steps[steps >= goal])

n = int(input())
values = []
for i in range(n):
    values.append(int(input()))
steps = np.array(values)
print(f"8000歩以上 {goal_days(steps)}日")
print(f"10000歩以上 {goal_days(steps, goal=10000)}日")
