numbers = []
for i in range(5):
    numbers.append(int(input()))
kept = []
for value in numbers:
    if value % 2 == 0:
        kept.append(value)
print(kept)
