def rate(x1, y1, x2, y2):
    return (y2 - y1) / (x2 - x1)

hours_a = int(input())
score_a = int(input())
hours_b = int(input())
score_b = int(input())
print(round(rate(hours_a, score_a, hours_b, score_b), 2))
