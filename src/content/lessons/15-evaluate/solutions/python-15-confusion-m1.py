import numpy as np

passed = np.array([1, 1, 1, 0, 0, 0, 0, 0])
pred_a = np.array([1, 0, 0, 0, 0, 0, 0, 1])
pred_b = np.array([1, 1, 1, 1, 1, 0, 0, 0])

def show_counts(pred, passed):
    hit = np.sum((pred == 1) & (passed == 1))
    miss = np.sum((pred == 0) & (passed == 1))
    false_alarm = np.sum((pred == 1) & (passed == 0))
    correct_reject = np.sum((pred == 0) & (passed == 0))
    print(hit, miss, false_alarm, correct_reject)

print((pred_a == passed).mean())
show_counts(pred_a, passed)
print((pred_b == passed).mean())
show_counts(pred_b, passed)
