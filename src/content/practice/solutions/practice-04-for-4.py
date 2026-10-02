pages = int(input())
per_day = int(input())
days = int(input())
for day in range(1, days + 1):
    pages = pages + per_day
    print(f"{day}日後 {pages}ページ")
