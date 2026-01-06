
a=int(input("Enter A\n"))
b=int(input("Enter B\n"))
operator=input("+, -, *, /")
if operator=="a":
    print(a+b)
elif operator=="-":
    print(a-b)
elif operator=="*":
    print(a*b)
elif operator=="/":
    print(a/b)
else:
    print("Invalid")