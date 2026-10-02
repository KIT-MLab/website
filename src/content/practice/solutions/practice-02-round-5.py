height = int(input())
weight = float(input())
meters = height / 100
square = meters * meters
bmi = weight / square
standard = 22 * square
print("BMI", round(bmi, 1))
print("標準体重", round(standard, 1))
