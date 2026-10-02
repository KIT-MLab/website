scores = [int(input()), int(input()), int(input()), int(input()), int(input())]
count_a = 0
for score in scores:
    if score >= 80:
        print("A")
        count_a = count_a + 1
    elif score >= 50:
        print("B")
    else:
        print("C")
print(count_a)
