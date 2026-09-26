first = int(input())
first_survived = int(input())
second = int(input())
second_survived = int(input())
third = int(input())
third_survived = int(input())

passengers = first + second + third
second_died = second - second_survived
third_died = third - third_survived

rule = (first_survived + second_died + third_died) / passengers
all_died = (first - first_survived + second_died + third_died) / passengers
print(f"1等なら生存: {round(rule, 3)}")
print(f"全員亡くなった: {round(all_died, 3)}")
print(f"差: {round(rule - all_died, 3)}")
