japanese = int(input())
mathematics = int(input())
english = int(input())
total = japanese + mathematics + english
average = round(total / 3, 1)
print(f"国語 {japanese}点 数学 {mathematics}点 英語 {english}点")
print(f"合計 {total}点")
print(f"満点まであと {300 - total}点")
print(f"平均 {average}点")
