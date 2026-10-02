import pandas as pd

df = pd.read_csv("train.csv")
fare = df["Fare"]
print(fare.max())
