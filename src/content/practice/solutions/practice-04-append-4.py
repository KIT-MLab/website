n = int(input())
late = []
for i in range(n):
    minute = int(input())
    if minute > 0:
        late.append(i + 1)
print(late)
