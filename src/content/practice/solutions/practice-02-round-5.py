height = int(input())
weight = float(input())
meters = height / 100
bmi = weight / (meters * meters)
print("BMI", round(bmi, 1))
