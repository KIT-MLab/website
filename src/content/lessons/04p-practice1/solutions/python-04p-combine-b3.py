d = int(input())
temps = []
for i in range(d):
    temps.append(int(input()))
count = 0
for i in range(1, d):
    if temps[i] > temps[i - 1]:
        count = count + 1
print(f"上がった日 {count}日")
