hour = int(input())
minute = int(input())
travel = int(input())
arrive = hour * 60 + minute + travel
arrive_hour = arrive // 60 % 24
arrive_minute = arrive % 60
print(f"到着は {arrive_hour}時{arrive_minute}分です")
