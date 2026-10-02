n = int(input())
records = []
for i in range(n):
    records.append(int(input()))
longest = records[0]
shortest = records[0]
for record in records:
    if record > longest:
        longest = record
    if record < shortest:
        shortest = record
print(longest)
print(shortest)
