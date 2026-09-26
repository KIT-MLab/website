import math

diameter = int(input())
width = int(input())
around = diameter * math.pi
print(round(around, 1))
print(int(around // width))
