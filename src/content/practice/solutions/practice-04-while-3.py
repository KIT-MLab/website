goal = int(input())
count = 0
height = 0
while height < goal:
    block = int(input())
    height = height + block
    count = count + 1
print(count)
print(height)
