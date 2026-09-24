n = int(input())
count = 0
for i in range(1, n + 1):
    if i % 3 == 0 or i % 7 == 0:
        count = count + 1
print(f"{count}個")
