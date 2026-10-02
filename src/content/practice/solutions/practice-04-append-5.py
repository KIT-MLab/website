n = int(input())
points = []
for i in range(n):
    points.append(int(input()))
highest = points[0]
for point in points:
    if point > highest:
        highest = point
points.remove(highest)
print(points)
