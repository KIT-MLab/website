minutes = int(input())
if minutes < 60:
    print(f"{minutes}分")
else:
    hours = minutes // 60
    rest = minutes % 60
    print(f"{hours}時間{rest}分")
