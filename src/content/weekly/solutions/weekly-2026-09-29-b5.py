import math

d1 = int(input())
d2 = int(input())
area1 = math.pi * (d1 / 2) ** 2
area2 = math.pi * (d2 / 2) ** 2
ratio = area2 / area1
print(f"1枚目 {round(area1, 1)}平方cm")
print(f"2枚目 {round(area2, 1)}平方cm")
print(f"2枚目は1枚目の{round(ratio, 2)}倍")
