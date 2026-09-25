import math

width = int(input())
height = int(input())
diagonal = round(math.sqrt(width ** 2 + height ** 2), 1)
print(f"対角線 {diagonal}")
