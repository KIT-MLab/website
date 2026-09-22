def price_with_tax(amount, rate=0.1, shipping=0):
    return amount * (1 + rate) + shipping

print(price_with_tax(1000, shipping=500))
