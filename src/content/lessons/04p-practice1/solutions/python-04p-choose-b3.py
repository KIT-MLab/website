n = int(input())
values = []
for i in range(n):
    values.append(int(input()))
same = True
for i in range(n):
    if values[i] != values[n - 1 - i]:
        same = False
if same:
    print("同じ")
else:
    print("違う")
