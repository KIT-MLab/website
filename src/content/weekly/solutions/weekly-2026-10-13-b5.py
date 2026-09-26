count = int(input())
fee = int(input())


def ice_cream_bill(count, price=300, topping_fee=0):
    return count * price + topping_fee


print(ice_cream_bill(count, topping_fee=fee))
