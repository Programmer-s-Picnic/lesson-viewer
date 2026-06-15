import tkinter as tk
from tkinter import messagebox

def say_hello():
    name = name_var.get().strip()
    if not name:
        messagebox.showwarning("Missing Name", "Please enter your name.")
        return
    messagebox.showinfo("Welcome", f"Hello, {name}! Your app is working.")

root = tk.Tk()
root.title("Tkinter Installer Demo")
root.geometry("500x300")
root.resizable(False, False)

title_label = tk.Label(root, text="Tkinter Installer Demo", font=("Arial", 18, "bold"))
title_label.pack(pady=20)

desc_label = tk.Label(
    root,
    text="This desktop app will later be packaged as an installer.",
    font=("Arial", 11)
)
desc_label.pack(pady=10)

name_var = tk.StringVar()

entry = tk.Entry(root, textvariable=name_var, font=("Arial", 12), width=30)
entry.pack(pady=10)

button = tk.Button(root, text="Click Me", command=say_hello, font=("Arial", 12), width=15)
button.pack(pady=20)

root.mainloop()