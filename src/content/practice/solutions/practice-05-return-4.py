def parking_fee(minutes):
    if minutes <= 30:
        return 0
    else:
        return (minutes - 30) * 5
