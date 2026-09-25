def hourly_wage(pay, hours):
    if hours == 0:
        return "勤務時間が0です"
    return round(pay / hours)

pay = int(input())
hours = int(input())
print(hourly_wage(pay, hours))
