largest = int(input())
numbers = [int(input()), int(input()), int(input()), int(input())]
for value in numbers:
    if value > largest:
        largest = value
print(largest)
