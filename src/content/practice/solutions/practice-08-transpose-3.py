import numpy as np

table = []
table.append([int(input()), int(input())])
table.append([int(input()), int(input())])
table.append([int(input()), int(input())])
jumps = np.array(table)
by_event = jumps.T
print(by_event)
print(by_event.max(axis=1))
