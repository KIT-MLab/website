numbers = []
line = input()
while line != "終わり":
    numbers.append(int(line))
    line = input()
mid = len(numbers) // 2
print(numbers[mid])
print(len(numbers))
