import matplotlib.pyplot as plt
import numpy as np
plt.Circle((0, 0), 1)
plt.Circle((-0.35, 0.35), 0.12)
plt.Circle((0.35, 0.35), 0.12)
x = np.linspace(-0.5, 0.5, 200)
y = -0.4 * np.sqrt(1 - (x / 0.5)**2) - 0.1
plt.plot(x, y, linewidth=3)
plt.Circle((-0.6, -0.1), 0.12, alpha=0.3)
plt.Circle((0.6, -0.1), 0.12, alpha=0.3)

plt.show()