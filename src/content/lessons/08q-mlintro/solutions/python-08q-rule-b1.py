n = int(input())
hits = 0
for i in range(n):
    sex = input()
    pclass = int(input())
    survived = int(input())
    if sex == "女" and pclass != 3:
        pred = 1
    else:
        pred = 0
    if pred == survived:
        hits = hits + 1
print(f"当たり {hits}人 / {n}人")
print(f"正解率 {round(hits / n, 3)}")
