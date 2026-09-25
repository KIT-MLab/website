count1 = 0
pass1 = 0
count2 = 0
pass2 = 0
count3 = 0
pass3 = 0

n = int(input())
for i in range(n):
    hours = float(input())
    score = float(input())
    passed = score >= 60
    if hours < 3:
        count1 = count1 + 1
        if passed:
            pass1 = pass1 + 1
    elif hours < 6:
        count2 = count2 + 1
        if passed:
            pass2 = pass2 + 1
    else:
        count3 = count3 + 1
        if passed:
            pass3 = pass3 + 1

print(round(pass1 / count1, 2))
print(round(pass2 / count2, 2))
print(round(pass3 / count3, 2))
