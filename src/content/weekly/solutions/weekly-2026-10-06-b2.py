count = int(input())
passed = 0
for i in range(count):
    score = int(input())
    if score >= 80:
        passed = passed + 1
print(f"80点以上 {passed}科目")
