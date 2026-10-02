count = int(input())
total = 0
for i in range(count):
    minutes_in = int(input())
    total = total + minutes_in
hours = total // 60
minutes = total % 60
print(f"合計 {hours}時間{minutes}分")
