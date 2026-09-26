items = int(input())
size = int(input())
boxes = (items + size - 1) // size
print(boxes)
print(boxes * size - items)
