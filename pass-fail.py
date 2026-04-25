import matplotlib.pyplot as facial
passingmarks = 40
marks = [45, 60, 23, 98, 17]
result = [1, 1, 0, 1, 0]
marks.sort()


# facial.plot(marks, result,color="Red")
# facial.title('Marks vs Result')  # Set the title of the plot
# facial.xlabel('Marks Obtained')  # Set the label for the x-axis
# facial.ylabel('Result')  # Set the label for the y-axis
result = [0 if x < passingmarks else 1 for x in marks]

facial.plot(marks, result, color="Blue")
facial.title('Marks vs Result')  # Set the title of the plot
facial.xlabel('Marks Obtained')  # Set the label for the x-axis
facial.ylabel('Result')  # Set the label for the y-axis
facial.show()
