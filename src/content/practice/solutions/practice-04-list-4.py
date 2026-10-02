previous = int(input())
balances = [int(input()), int(input()), int(input())]
for balance in balances:
    print(balance - previous)
    previous = balance
