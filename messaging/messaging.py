class Member:
    def __init__(self, username, password, name):
        self.username = username
        self.password = password
        self.name = name

    def __str__(self):
        return f"User( {self.username}, {self.password},{self.name} )"


class Message:
    def __init__(self, sender, reciever, msg):
        self.sender = sender
        self.reciever = reciever
        self.msg = msg

    def __str__(self):
        return f"Message ( {self.sender}, {self.reciever},{self.msg} )"
