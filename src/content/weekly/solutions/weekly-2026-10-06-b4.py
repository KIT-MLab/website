balance = 0
expenses = 0
line = input()
while line != "終わり":
    amount = int(line)
    balance = balance + amount
    if amount < 0:
        expenses = expenses + 1
    line = input()
print(f"残高 {balance}円")
print(f"支出 {expenses}回")
