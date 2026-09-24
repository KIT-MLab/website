answer = int(input())
count = 0
guess = int(input())
count = count + 1
while guess != answer:
    if guess > answer:
        print("大きい")
    else:
        print("小さい")
    guess = int(input())
    count = count + 1
print(f"当たり {count}回目")
