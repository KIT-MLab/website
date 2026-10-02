need = int(input())
bucket = int(input())
water = 0
count = 0
while water < need:
    water = water + bucket
    count = count + 1
print(count)
