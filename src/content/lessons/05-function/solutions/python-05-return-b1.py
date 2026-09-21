def largest(a, b, c):
    biggest = a
    if b > biggest:
        biggest = b
    if c > biggest:
        biggest = c
    return biggest

a = int(input())
b = int(input())
c = int(input())
print(largest(a, b, c))
