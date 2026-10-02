def trip_cost(fare, nights=0, meals=0):
    return fare + nights * 7000 + meals * 1000

fare = int(input())
meals = int(input())
print(trip_cost(fare, meals=meals))
