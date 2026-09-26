money = int(input())
rate = int(input())
years = int(input())
result = money * (1 + rate / 100) ** years
print(round(result, 2))
