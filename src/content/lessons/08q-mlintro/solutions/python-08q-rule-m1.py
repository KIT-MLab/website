sex = ["男", "男", "女", "女", "男", "女", "男", "男", "男", "男", "男", "男", "男", "男", "女", "男", "男", "女", "男", "男"]
pclass = [3, 2, 1, 3, 2, 1, 2, 3, 2, 3, 1, 3, 2, 2, 1, 3, 2, 3, 2, 2]
survived = [0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0]

hits = 0
for i in range(len(sex)):
    if sex[i] == "女" or pclass[i] == 1:
        pred = 1
    else:
        pred = 0
    if pred == survived[i]:
        hits = hits + 1
print(f"当たり {hits}人 / {len(sex)}人")
print(f"正解率 {round(hits / len(sex), 3)}")
