import numpy as np

z = np.array([-1.0, 0.0, 1.0])
exp_form = np.exp(z) / (np.exp(0) + np.exp(z))
sig_form = 1 / (1 + np.exp(-z))
print(np.round(exp_form, 3))
print(np.round(sig_form, 3))
