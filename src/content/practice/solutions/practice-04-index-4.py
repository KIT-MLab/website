rain = [int(input()), int(input()), int(input()), int(input()), int(input())]
step = int(input())
for i in range(len(rain)):
    if i % step == 0:
        print(rain[i])
