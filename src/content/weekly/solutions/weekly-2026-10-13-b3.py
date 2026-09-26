def heavy_readers(counts, threshold):
    result = 0
    for value in counts:
        if value >= threshold:
            result = result + 1
    return result

n = int(input())
counts = []
for i in range(n):
    counts.append(int(input()))

print(heavy_readers(counts, 5))
print(heavy_readers(counts, 3))
