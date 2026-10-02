first_survived = int(input())
first_died = int(input())
second_survived = int(input())
second_died = int(input())
third_survived = int(input())
third_died = int(input())

passengers = first_survived + first_died + second_survived + second_died + third_survived + third_died

rule = (first_survived + second_died + third_died) / passengers
all_died = (first_died + second_died + third_died) / passengers
print(f"1等なら生存: {round(rule, 3)}")
print(f"全員亡くなった: {round(all_died, 3)}")
print(f"差: {round(rule - all_died, 3)}")
