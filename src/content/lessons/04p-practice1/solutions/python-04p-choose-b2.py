count = int(input())
times = []
for i in range(count):
    times.append(int(input()))
total = 0
for value in times:
    total = total + value
longest = times[0]
for value in times:
    if value > longest:
        longest = value
hours = total // 60
minutes = total % 60
print(f"合計 {hours}時間{minutes}分")
print(f"最長 {longest}分")
