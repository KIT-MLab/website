answer = int(input())
count = 0
guess = int(input())
count = count + 1
while guess != answer:
    if guess > answer and guess - answer <= 10:
        print("少し大きい")
    elif guess > answer:
        print("大きい")
    elif answer - guess <= 10:
        print("少し小さい")
    else:
        print("小さい")
    guess = int(input())
    count = count + 1
print(f"当たり {count}回目")
