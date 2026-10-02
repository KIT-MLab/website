def show_growth(week, before, after):
    print(f"{week}週目: {after - before}cm伸びた")

previous = int(input())
n = int(input())
for week in range(1, n + 1):
    height = int(input())
    show_growth(week, previous, height)
    previous = height
