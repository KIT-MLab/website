n = int(input())
values = []
for i in range(n):
    values.append(int(input()))
diff = 0
for i in range(n):
    if values[i] != values[n - 1 - i]:
        diff = diff + 1
if diff == 0:
    print("同じ")
else:
    print("違う")
