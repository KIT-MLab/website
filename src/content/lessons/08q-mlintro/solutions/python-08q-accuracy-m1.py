passengers = 891
female_survived = 233
female_died = 81
male_survived = 109
male_died = 468

rule = (male_survived + female_died) / passengers
print(f"男性なら生存: {round(rule, 3)}")
