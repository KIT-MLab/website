smallest = int(input())
numbers = [int(input()), int(input()), int(input()), int(input())]
for value in numbers:
    if value < smallest:
        smallest = value
print(smallest)
