numbers = [int(input()), int(input()), int(input()), int(input()), int(input())]
kept = []
for value in numbers:
    if value % 2 == 0:
        kept.append(value)
for value in kept:
    print(value)
