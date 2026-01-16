import math
import time
import tkinter as tk
from dataclasses import dataclass, field


W, H = 980, 640
ARENA_PAD = 20

BG = "#fff7e6"
CARD = "#ffffff"
INK = "#1f2937"
MUTED = "#6b7280"
BRAND = "#d97706"
BRAND2 = "#f59e0b"
BORDER = "#eadcc5"
OK = "#166534"
DANGER = "#b91c1c"


def clamp(v, a, b):
    return max(a, min(b, v))


def deg_to_rad(d):
    return d * math.pi / 180.0


def rad_to_deg(r):
    return r * 180.0 / math.pi


@dataclass
class Drone:
    x: float = 180.0
    y: float = 300.0
    heading_deg: float = 0.0     # 0 = east, 90 = north
    speed: float = 120.0         # px per second (forward motion)
    turn_speed: float = 120.0    # deg per second
    altitude: float = 0.0        # "virtual altitude"
    flying: bool = False
    battery: float = 100.0       # %
    home: tuple = (180.0, 300.0)
    path: list = field(default_factory=list)

    def reset(self):
        self.x, self.y = self.home
        self.heading_deg = 0.0
        self.altitude = 0.0
        self.flying = False
        self.battery = 100.0
        self.path = [(self.x, self.y)]


class Simulator:
    def __init__(self, root: tk.Tk):
        self.root = root
        root.title("Drone Programming Simulator — Python (Tkinter)")

        self.drone = Drone()
        self.drone.path = [(self.drone.x, self.drone.y)]

        self.running = False
        self.last_t = time.time()

        self.obstacles = [
            # rectangles: (x1,y1,x2,y2)
            (420, 140, 580, 240),
            (700, 360, 880, 500),
            (330, 420, 520, 560),
        ]

        # UI layout
        self.frame = tk.Frame(root, bg=BG)
        self.frame.pack(fill="both", expand=True)

        self.left = tk.Frame(self.frame, bg=BG)
        self.left.pack(side="left", fill="both", expand=True, padx=12, pady=12)

        self.right = tk.Frame(self.frame, bg=BG, width=340)
        self.right.pack(side="right", fill="y", padx=(0, 12), pady=12)

        # Canvas "arena"
        self.canvas = tk.Canvas(self.left, width=W, height=H, bg=CARD,
                                highlightthickness=1, highlightbackground=BORDER)
        self.canvas.pack(fill="both", expand=True)

        # Controls panel
        self.make_panel()

        # Bindings
        root.bind("<space>", lambda e: self.toggle_run())
        root.bind("<Escape>", lambda e: self.stop())
        root.bind("r", lambda e: self.reset())
        root.bind("t", lambda e: self.takeoff())
        root.bind("l", lambda e: self.land())
        root.bind("h", lambda e: self.return_home())

        # Script queue (each item is a generator step)
        self.command_queue = []
        self.status(
            "Ready. Space = Run/Pause • T=Takeoff • L=Land • R=Reset • H=Home • Esc=Stop")

        self.draw_static()
        self.redraw()

        self.tick()

    # ---------- UI ----------
    def make_panel(self):
        title = tk.Label(self.right, text="Mission Control",
                         bg=BG, fg=INK, font=("Segoe UI", 14, "bold"))
        title.pack(anchor="w")

        sub = tk.Label(
            self.right,
            text="Write a mission script below and press Run Script.\nCommands: TAKEOFF, LAND, MOVE, TURN, GOTO, WAIT, HOME, SETSPEED",
            bg=BG, fg=MUTED, justify="left"
        )
        sub.pack(anchor="w", pady=(4, 10))

        # Script editor
        self.script = tk.Text(self.right, height=18,
                              wrap="none", bd=1, relief="solid")
        self.script.pack(fill="x")
        self.script.insert("1.0", self.default_script())

        btns = tk.Frame(self.right, bg=BG)
        btns.pack(fill="x", pady=10)

        def b(text, cmd, col=BRAND2):
            return tk.Button(btns, text=text, command=cmd, bd=0, padx=10, pady=8,
                             bg=col, fg="white", activebackground=BRAND, activeforeground="white",
                             font=("Segoe UI", 10, "bold"), cursor="hand2")

        b("Run Script", self.run_script).pack(side="left", padx=(0, 8))
        b("Run/Pause (Space)", self.toggle_run, col=BRAND).pack(side="left")

        btns2 = tk.Frame(self.right, bg=BG)
        btns2.pack(fill="x", pady=(0, 10))

        def b2(text, cmd): return tk.Button(btns2, text=text, command=cmd, bd=0, padx=10, pady=8,
                                            bg="#ffffff", fg=BRAND, activebackground="#fff2d6",
                                            font=("Segoe UI", 10, "bold"), cursor="hand2",
                                            highlightthickness=1, highlightbackground=BORDER)
        b2("Takeoff (T)", self.takeoff).pack(side="left", padx=(0, 8))
        b2("Land (L)", self.land).pack(side="left", padx=(0, 8))
        b2("Home (H)", self.return_home).pack(side="left", padx=(0, 8))
        b2("Reset (R)", self.reset).pack(side="left")

        # HUD / status
        self.hud = tk.Label(self.right, text="", bg=BG, fg=INK, justify="left")
        self.hud.pack(anchor="w", pady=(4, 8))

        self.status_label = tk.Label(
            self.right, text="", bg=BG, fg=MUTED, justify="left", wraplength=330)
        self.status_label.pack(anchor="w", pady=(0, 8))

        help_box = tk.Label(
            self.right,
            text=(
                "Keyboard:\n"
                "  Space: Run/Pause\n"
                "  T: Takeoff   L: Land\n"
                "  H: Return Home\n"
                "  R: Reset     Esc: Stop\n\n"
                "Mission tips:\n"
                "  MOVE uses current heading\n"
                "  TURN positive=left, negative=right\n"
                "  GOTO x y goes to coordinate\n"
            ),
            bg="#fff2d6", fg=INK, justify="left", padx=10, pady=10,
            highlightthickness=1, highlightbackground=BORDER
        )
        help_box.pack(fill="x", pady=(10, 0))

    def default_script(self):
        return (
            "TAKEOFF\n"
            "SETSPEED 140\n"
            "MOVE 160\n"
            "TURN 90\n"
            "MOVE 90\n"
            "TURN -45\n"
            "MOVE 140\n"
            "WAIT 0.4\n"
            "HOME\n"
            "LAND\n"
        )

    def status(self, msg):
        self.status_label.config(text=msg)

    # ---------- Drawing ----------
    def draw_static(self):
        self.canvas.delete("static")

        # Arena border
        self.canvas.create_rectangle(
            ARENA_PAD, ARENA_PAD, W-ARENA_PAD, H-ARENA_PAD,
            outline=BORDER, width=2, tags=("static",)
        )

        # Obstacles
        for (x1, y1, x2, y2) in self.obstacles:
            self.canvas.create_rectangle(
                x1, y1, x2, y2, fill="#fff2d6", outline=BORDER, width=2, tags=("static",))
            self.canvas.create_text((x1+x2)/2, (y1+y2)/2, text="OBSTACLE",
                                    fill=MUTED, font=("Segoe UI", 9, "bold"), tags=("static",))

        # Home marker
        hx, hy = self.drone.home
        self.canvas.create_oval(hx-8, hy-8, hx+8, hy+8,
                                fill=OK, outline="", tags=("static",))
        self.canvas.create_text(
            hx+36, hy, text="HOME", fill=OK, font=("Segoe UI", 10, "bold"), tags=("static",))

    def redraw(self):
        self.canvas.delete("dyn")

        # Path
        if len(self.drone.path) > 1:
            for i in range(1, len(self.drone.path)):
                x1, y1 = self.drone.path[i-1]
                x2, y2 = self.drone.path[i]
                self.canvas.create_line(
                    x1, y1, x2, y2, fill=BRAND2, width=2, tags=("dyn",))

        # Drone body
        x, y = self.drone.x, self.drone.y
        r = 14 if self.drone.flying else 12
        self.canvas.create_oval(
            x-r, y-r, x+r, y+r, fill=BRAND, outline="", tags=("dyn",))

        # Heading arrow
        ang = deg_to_rad(self.drone.heading_deg)
        # screen y grows down, so use -sin for "up"
        ax = x + math.cos(ang) * 24
        ay = y - math.sin(ang) * 24
        self.canvas.create_line(
            x, y, ax, ay, fill="white", width=3, arrow="last", tags=("dyn",))

        # Drone label
        self.canvas.create_text(x, y-26, text="DRONE" if self.drone.flying else "DRONE (GROUND)",
                                fill=INK if self.drone.flying else MUTED, font=("Segoe UI", 10, "bold"), tags=("dyn",))

    # ---------- Physics / Safety ----------
    def in_bounds(self, x, y):
        return (ARENA_PAD+10) <= x <= (W-ARENA_PAD-10) and (ARENA_PAD+10) <= y <= (H-ARENA_PAD-10)

    def hits_obstacle(self, x, y):
        # treat drone as a small circle
        rr = 12
        for (x1, y1, x2, y2) in self.obstacles:
            # clamp point to rect
            cx = clamp(x, x1, x2)
            cy = clamp(y, y1, y2)
            dx = x - cx
            dy = y - cy
            if dx*dx + dy*dy <= rr*rr:
                return True
        return False

    def battery_drain(self, dt):
        if self.drone.flying:
            self.drone.battery = max(
                0.0, self.drone.battery - (0.4 * dt))  # % per second
            if self.drone.battery <= 5.0:
                self.status("Battery critically low! Auto-landing…")
                self.land()

    # ---------- Actions (instant) ----------
    def reset(self):
        self.stop()
        self.drone.reset()
        self.draw_static()
        self.redraw()
        self.status("Reset complete.")

    def stop(self):
        self.running = False
        self.command_queue.clear()
        self.status("Stopped. (Queue cleared)")

    def toggle_run(self):
        self.running = not self.running
        self.status("Running…" if self.running else "Paused.")

    def takeoff(self):
        if self.drone.flying:
            self.status("Already flying.")
            return
        if self.drone.battery <= 2:
            self.status("Battery too low. Reset or recharge (sim).")
            return
        self.drone.flying = True
        self.drone.altitude = 1.0
        self.drone.path.append((self.drone.x, self.drone.y))
        self.status("Takeoff ✅")
        self.redraw()

    def land(self):
        if not self.drone.flying:
            self.status("Already on ground.")
            return
        self.drone.flying = False
        self.drone.altitude = 0.0
        self.status("Landing ✅")
        self.redraw()

    def return_home(self):
        # add a GOTO to home
        hx, hy = self.drone.home
        self.command_queue.append(self.cmd_goto(hx, hy))
        self.status("Queued: Return Home")

    # ---------- Command Generators ----------
    def cmd_wait(self, seconds: float):
        start = time.time()
        while time.time() - start < seconds:
            yield

    def cmd_turn(self, degrees: float):
        if not self.drone.flying:
            self.status("TURN ignored (not flying).")
            return
            yield  # never reached
        remaining = degrees
        while abs(remaining) > 0.5:
            dt = self.dt
            step = math.copysign(
                min(abs(remaining), self.drone.turn_speed * dt), remaining)
            self.drone.heading_deg = (self.drone.heading_deg + step) % 360
            remaining -= step
            yield

    def cmd_move(self, distance: float):
        if not self.drone.flying:
            self.status("MOVE ignored (not flying).")
            return
            yield
        remaining = distance
        while abs(remaining) > 0.8:
            dt = self.dt
            step = math.copysign(
                min(abs(remaining), self.drone.speed * dt), remaining)
            ang = deg_to_rad(self.drone.heading_deg)
            nx = self.drone.x + math.cos(ang) * step
            # minus because screen y-down
            ny = self.drone.y - math.sin(ang) * step

            # Safety: boundaries + obstacles
            if not self.in_bounds(nx, ny):
                self.status("⚠️ Boundary reached. Movement stopped.")
                return
            if self.hits_obstacle(nx, ny):
                self.status(
                    "⚠️ Obstacle collision detected. Movement stopped.")
                return

            self.drone.x, self.drone.y = nx, ny
            self.drone.path.append((self.drone.x, self.drone.y))
            remaining -= step
            yield

    def cmd_goto(self, x: float, y: float):
        if not self.drone.flying:
            self.status("GOTO ignored (not flying).")
            return
            yield
        # move in small turns + forward steps (simple steering)
        while True:
            dx = x - self.drone.x
            dy = self.drone.y - y  # invert for "math y-up"
            dist = math.hypot(dx, dy)
            if dist < 10:
                return

            target = (rad_to_deg(math.atan2(dy, dx))) % 360
            # shortest turn
            cur = self.drone.heading_deg
            diff = (target - cur + 540) % 360 - 180

            # turn a bit toward target
            if abs(diff) > 3:
                # one tick of turn
                dt = self.dt
                step = math.copysign(
                    min(abs(diff), self.drone.turn_speed * dt), diff)
                self.drone.heading_deg = (self.drone.heading_deg + step) % 360
                yield
                continue

            # move forward a bit
            move_step = min(dist, self.drone.speed * self.dt)
            ang = deg_to_rad(self.drone.heading_deg)
            nx = self.drone.x + math.cos(ang) * move_step
            ny = self.drone.y - math.sin(ang) * move_step

            if not self.in_bounds(nx, ny):
                self.status("⚠️ Boundary reached during GOTO. Stopping.")
                return
            if self.hits_obstacle(nx, ny):
                self.status("⚠️ Obstacle hit during GOTO. Stopping.")
                return

            self.drone.x, self.drone.y = nx, ny
            self.drone.path.append((self.drone.x, self.drone.y))
            yield

    # ---------- Script Parser ----------
    def run_script(self):
        txt = self.script.get("1.0", "end").strip()
        if not txt:
            self.status("No script to run.")
            return

        self.command_queue.clear()

        lines = [ln.strip() for ln in txt.splitlines() if ln.strip()
                 and not ln.strip().startswith("#")]
        for i, ln in enumerate(lines, start=1):
            parts = ln.split()
            cmd = parts[0].upper()

            def bad():
                self.status(f"Script error on line {i}: {ln}")
            try:
                if cmd == "TAKEOFF":
                    self.command_queue.append(self._wrap_instant(self.takeoff))
                elif cmd == "LAND":
                    self.command_queue.append(self._wrap_instant(self.land))
                elif cmd == "HOME":
                    hx, hy = self.drone.home
                    self.command_queue.append(self.cmd_goto(hx, hy))
                elif cmd == "WAIT":
                    sec = float(parts[1])
                    self.command_queue.append(self.cmd_wait(sec))
                elif cmd == "TURN":
                    deg = float(parts[1])
                    self.command_queue.append(self.cmd_turn(deg))
                elif cmd == "MOVE":
                    dist = float(parts[1])
                    self.command_queue.append(self.cmd_move(dist))
                elif cmd == "GOTO":
                    x = float(parts[1])
                    y = float(parts[2])
                    self.command_queue.append(self.cmd_goto(x, y))
                elif cmd == "SETSPEED":
                    sp = float(parts[1])
                    self.command_queue.append(
                        self._wrap_instant(lambda: self.set_speed(sp)))
                else:
                    bad()
                    return
            except Exception:
                bad()
                return

        self.running = True
        self.status(
            f"Script queued: {len(self.command_queue)} commands. Running…")

    def _wrap_instant(self, fn):
        # generator that runs once
        def gen():
            fn()
            yield
        return gen()

    def set_speed(self, sp):
        self.drone.speed = clamp(sp, 40, 300)
        self.status(f"Speed set to {self.drone.speed:.0f}")

    # ---------- Main Loop ----------
    def tick(self):
        now = time.time()
        self.dt = now - self.last_t
        self.last_t = now

        # battery drain when flying
        self.battery_drain(self.dt)

        # execute queue
        if self.running and self.command_queue:
            try:
                # advance current command one step per frame
                cur = self.command_queue[0]
                next(cur)
            except StopIteration:
                self.command_queue.pop(0)
                if not self.command_queue:
                    self.status("Mission complete ✅ (Queue empty)")
                    self.running = False

        # update HUD
        self.hud.config(text=self.hud_text())

        # redraw
        self.redraw()

        # schedule
        self.root.after(16, self.tick)  # ~60 FPS

    def hud_text(self):
        return (
            f"State: {'FLYING' if self.drone.flying else 'GROUND'}\n"
            f"Pos: ({self.drone.x:.1f}, {self.drone.y:.1f})\n"
            f"Heading: {self.drone.heading_deg:.1f}°\n"
            f"Speed: {self.drone.speed:.0f}px/s\n"
            f"Battery: {self.drone.battery:.1f}%\n"
            f"Queue: {len(self.command_queue)} commands"
        )


def main():
    root = tk.Tk()
    root.configure(bg=BG)
    Simulator(root)
    root.mainloop()


if __name__ == "__main__":
    main()
