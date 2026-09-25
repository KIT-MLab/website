def judge_day(count, limit=3):
    if count >= limit:
        return "注意"
    return "問題なし"

warnings = 0
line = input()
while line != "終わり":
    count = int(line)
    result = judge_day(count)
    print(result)
    if result == "注意":
        warnings = warnings + 1
    line = input()
print(f"注意 {warnings}日")
