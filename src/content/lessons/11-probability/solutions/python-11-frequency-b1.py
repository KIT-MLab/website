n = int(input())
sunny = 0
rain = 0
cloud = 0
for i in range(n):
    day = input()
    if day == "晴れ":
        sunny = sunny + 1
    elif day == "雨":
        rain = rain + 1
    elif day == "曇り":
        cloud = cloud + 1

print(f"晴れの確率{round(sunny / n, 2)}")
print(f"雨の確率{round(rain / n, 2)}")
print(f"曇りの確率{round(cloud / n, 2)}")
