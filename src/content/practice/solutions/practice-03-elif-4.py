yesterday = int(input())
today = int(input())
if today > yesterday:
    print("昨日より高い")
elif today == yesterday:
    print("昨日と同じ")
else:
    print("昨日より低い")
