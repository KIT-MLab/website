def heavy_readers(counts, threshold=5):
    result = 0
    for value in counts:
        if value >= threshold:
            result = result + 1
    return result

n = int(input())
counts = []
for i in range(n):
    counts.append(int(input()))

print(f"5冊以上 {heavy_readers(counts)}人")
print(f"3冊以上 {heavy_readers(counts, 3)}人")
