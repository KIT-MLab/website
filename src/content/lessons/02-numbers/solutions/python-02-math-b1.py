import math
r = float(input())
circumference = round(2 * math.pi * r, 2)
area = round(math.pi * r ** 2, 2)
print(f"円周:{circumference} 面積:{area}")
