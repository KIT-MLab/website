scores = {"佐藤": 72, "鈴木": 85, "田中": 64}
name = input()
if name in scores:
    print(scores[name])
else:
    print("名簿にありません")
