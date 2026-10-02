budget = int(input())
count = 0
line = input()
while line != "終わり":
    price = int(line)
    if price <= budget:
        budget = budget - price
        count = count + 1
    line = input()
print(count)
print(budget)
