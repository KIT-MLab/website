accepted = []
line = input()
while line != "終わり":
    height = int(line)
    if height >= 100 and height <= 250:
        accepted.append(height)
    else:
        print("範囲外")
    line = input()
total = 0
for value in accepted:
    total = total + value
average = total / len(accepted)
print(f"平均 {round(average, 1)}cm")
