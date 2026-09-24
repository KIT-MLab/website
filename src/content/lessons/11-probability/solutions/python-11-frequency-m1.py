records = ["雨", "雨", "雨", "雨", "雨", "雨", "雨", "晴れ", "晴れ", "曇り"]

count = 0
for day in records:
    if day == "雨":
        count = count + 1

print(count / len(records))
