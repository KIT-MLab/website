n = int(input())
orders = []
for i in range(n):
    orders.append(int(input()))
canceled = int(input())
orders.remove(canceled)
print(orders)
