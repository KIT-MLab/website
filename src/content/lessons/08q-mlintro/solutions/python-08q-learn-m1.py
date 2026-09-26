sex = ["男", "男", "女", "女", "男", "女", "男", "男", "男", "男", "男", "男", "男", "男", "女", "男", "男", "女", "男", "男", "女", "男", "男", "男", "男", "男", "男", "女", "女", "男", "男", "女", "男", "男", "女", "女", "女", "女", "女", "男"]
ages = [22, 30, 31, 27, 42, 32, 30, 16, 27, 51, 38, 22, 19, 18, 35, 29, 59, 5, 24, 44, 8, 19, 33, 29, 22, 30, 44, 25, 24, 37, 54, 29, 62, 30, 41, 29, 30, 35, 50, 3]
survived = [0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1]

def accuracy(border, start, end):
    hits = 0
    for i in range(start, end):
        if sex[i] == "女" or ages[i] < border:
            pred = 1
        else:
            pred = 0
        if pred == survived[i]:
            hits = hits + 1
    return hits / (end - start)

best = 0
for border in range(1, 81):
    if accuracy(border, 0, 30) > accuracy(best, 0, 30):
        best = border
print(f"境目 {best}歳 学習用 {round(accuracy(best, 0, 30), 3)}")
print(f"テスト用 {round(accuracy(best, 30, 40), 3)}")
