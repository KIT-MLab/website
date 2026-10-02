def show_fare(km):
    print(f"{km}km: {140 + km * 30}円")

n = int(input())
for i in range(n):
    km = int(input())
    show_fare(km)
