def show_egg(minutes):
    if minutes < 7:
        print("半熟")
    elif minutes < 10:
        print("固ゆで")
    else:
        print("ゆですぎ")

minutes = int(input())
show_egg(minutes)
