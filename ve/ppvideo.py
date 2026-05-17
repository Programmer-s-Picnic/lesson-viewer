import os
import threading
import tkinter as tk
from tkinter import filedialog, messagebox

import customtkinter as ctk
from moviepy import VideoFileClip
from PIL import Image, ImageTk


ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")


class VideoVolumeChangerApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Video Volume Changer")
        self.geometry("1200x720")
        self.minsize(1050, 650)

        self.video_path = None
        self.output_folder = None
        self.volume_percent = tk.IntVar(value=100)

        self.video_duration = "00:00:00"
        self.video_resolution = "-"
        self.video_size = "-"
        self.video_format = "-"
        self.video_audio = "-"

        self.build_ui()

    def build_ui(self):
        self.configure(fg_color="#07111f")

        self.grid_columnconfigure(0, weight=0)
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(1, weight=1)

        self.create_title_bar()
        self.create_sidebar()
        self.create_main_area()
        self.create_status_bar()

    def create_title_bar(self):
        self.title_bar = ctk.CTkFrame(
            self,
            height=58,
            fg_color="#1d2366",
            corner_radius=0
        )
        self.title_bar.grid(row=0, column=0, columnspan=2, sticky="ew")

        self.title_bar.grid_columnconfigure(0, weight=1)

        title = ctk.CTkLabel(
            self.title_bar,
            text="🔊  Video Volume Changer",
            font=("Segoe UI", 24, "bold"),
            text_color="white"
        )
        title.grid(row=0, column=0, padx=24, pady=12, sticky="w")

    def create_sidebar(self):
        self.sidebar = ctk.CTkFrame(
            self,
            width=170,
            fg_color="#0d1b31",
            corner_radius=0
        )
        self.sidebar.grid(row=1, column=0, sticky="ns")
        self.sidebar.grid_propagate(False)

        buttons = [
            ("🏠  Home", self.show_home),
            ("📁  Open Video", self.select_video),
            ("🔊  Change Volume", self.focus_volume),
            ("📄  Export", self.export_video_start),
            ("ℹ️  About", self.show_about),
        ]

        for i, (text, command) in enumerate(buttons):
            btn = ctk.CTkButton(
                self.sidebar,
                text=text,
                command=command,
                height=48,
                corner_radius=10,
                fg_color="#7c3aed" if i == 0 else "transparent",
                hover_color="#6d28d9",
                text_color="white",
                font=("Segoe UI", 15),
                anchor="w"
            )
            btn.pack(fill="x", padx=12, pady=(42 if i == 0 else 12, 0))

    def create_main_area(self):
        self.main = ctk.CTkFrame(
            self,
            fg_color="#07111f",
            corner_radius=0
        )
        self.main.grid(row=1, column=1, sticky="nsew", padx=20, pady=20)

        self.main.grid_columnconfigure(0, weight=1)
        self.main.grid_columnconfigure(1, weight=1)
        self.main.grid_rowconfigure(0, weight=1)

        self.left_panel = ctk.CTkFrame(
            self.main,
            fg_color="#07111f",
            corner_radius=0
        )
        self.left_panel.grid(row=0, column=0, sticky="nsew", padx=(0, 10))

        self.right_panel = ctk.CTkFrame(
            self.main,
            fg_color="#07111f",
            corner_radius=0
        )
        self.right_panel.grid(row=0, column=1, sticky="nsew", padx=(10, 0))

        self.create_preview_section()
        self.create_file_info_section()
        self.create_volume_section()
        self.create_output_section()

    def section_title(self, parent, text):
        label = ctk.CTkLabel(
            parent,
            text=f"▌ {text}",
            font=("Segoe UI", 20, "bold"),
            text_color="white"
        )
        label.pack(anchor="w", pady=(0, 12))

    def create_preview_section(self):
        preview_container = ctk.CTkFrame(
            self.left_panel,
            fg_color="transparent"
        )
        preview_container.pack(fill="x", pady=(0, 18))

        self.section_title(preview_container, "Preview")

        self.preview_box = ctk.CTkFrame(
            preview_container,
            height=340,
            fg_color="#101c31",
            border_width=1,
            border_color="#263855",
            corner_radius=12
        )
        self.preview_box.pack(fill="x")
        self.preview_box.pack_propagate(False)

        self.preview_label = ctk.CTkLabel(
            self.preview_box,
            text="No video selected\n\nClick Open Video to choose a file",
            font=("Segoe UI", 18),
            text_color="#b8c4d9"
        )
        self.preview_label.pack(expand=True)

        controls = ctk.CTkFrame(
            self.preview_box,
            fg_color="transparent"
        )
        controls.pack(fill="x", padx=16, pady=14)

        play_btn = ctk.CTkButton(
            controls,
            text="▶",
            width=48,
            height=40,
            corner_radius=8,
            fg_color="#1b2a44",
            hover_color="#263855"
        )
        play_btn.pack(side="left", padx=(0, 10))

        stop_btn = ctk.CTkButton(
            controls,
            text="■",
            width=48,
            height=40,
            corner_radius=8,
            fg_color="#1b2a44",
            hover_color="#263855"
        )
        stop_btn.pack(side="left", padx=(0, 14))

        self.fake_progress = ctk.CTkSlider(
            controls,
            from_=0,
            to=100,
            number_of_steps=100,
            progress_color="#8b5cf6",
            button_color="#a78bfa",
            button_hover_color="#c4b5fd"
        )
        self.fake_progress.set(20)
        self.fake_progress.pack(side="left", fill="x",
                                expand=True, padx=(0, 14))

        self.time_label = ctk.CTkLabel(
            controls,
            text="00:00:00 / 00:00:00",
            font=("Segoe UI", 13),
            text_color="white"
        )
        self.time_label.pack(side="right")

    def create_file_info_section(self):
        info_container = ctk.CTkFrame(
            self.left_panel,
            fg_color="transparent"
        )
        info_container.pack(fill="x")

        self.section_title(info_container, "File Information")

        self.info_box = ctk.CTkFrame(
            info_container,
            fg_color="#101c31",
            border_width=1,
            border_color="#263855",
            corner_radius=12
        )
        self.info_box.pack(fill="x", ipady=18)

        self.file_name_label = self.info_row(
            self.info_box, "📄 File Name:", "-")
        self.duration_label = self.info_row(self.info_box, "⏱ Duration:", "-")
        self.format_label = self.info_row(self.info_box, "🧾 Format:", "-")
        self.resolution_label = self.info_row(
            self.info_box, "▣ Resolution:", "-")
        self.size_label = self.info_row(self.info_box, "💾 Size:", "-")
        self.audio_label = self.info_row(self.info_box, "🔊 Audio:", "-")

    def info_row(self, parent, label_text, value_text):
        row = ctk.CTkFrame(parent, fg_color="transparent")
        row.pack(fill="x", padx=22, pady=7)

        label = ctk.CTkLabel(
            row,
            text=label_text,
            width=120,
            anchor="w",
            font=("Segoe UI", 14),
            text_color="#dbe5f5"
        )
        label.pack(side="left")

        value = ctk.CTkLabel(
            row,
            text=value_text,
            anchor="w",
            font=("Segoe UI", 14),
            text_color="white"
        )
        value.pack(side="left", fill="x", expand=True)

        return value

    def create_volume_section(self):
        volume_container = ctk.CTkFrame(
            self.right_panel,
            fg_color="transparent"
        )
        volume_container.pack(fill="x", pady=(0, 22))

        self.section_title(volume_container, "Change Volume")

        self.volume_box = ctk.CTkFrame(
            volume_container,
            fg_color="#101c31",
            border_width=1,
            border_color="#263855",
            corner_radius=12
        )
        self.volume_box.pack(fill="x", ipady=18)

        label = ctk.CTkLabel(
            self.volume_box,
            text="Volume:",
            font=("Segoe UI", 18),
            text_color="#e5ecf8"
        )
        label.pack(anchor="w", padx=22, pady=(10, 5))

        self.big_volume_label = ctk.CTkLabel(
            self.volume_box,
            text="100%",
            font=("Segoe UI", 56, "bold"),
            text_color="white"
        )
        self.big_volume_label.pack(pady=(10, 0))

        sub = ctk.CTkLabel(
            self.volume_box,
            text="Volume",
            font=("Segoe UI", 22, "bold"),
            text_color="#a855f7"
        )
        sub.pack()

        self.volume_slider = ctk.CTkSlider(
            self.volume_box,
            from_=0,
            to=300,
            number_of_steps=300,
            progress_color="#8b5cf6",
            button_color="#a78bfa",
            button_hover_color="#c4b5fd",
            command=self.on_volume_change
        )
        self.volume_slider.set(100)
        self.volume_slider.pack(fill="x", padx=28, pady=(30, 8))

        scale_row = ctk.CTkFrame(self.volume_box, fg_color="transparent")
        scale_row.pack(fill="x", padx=28)

        ctk.CTkLabel(scale_row, text="0%",
                     text_color="white").pack(side="left")
        ctk.CTkLabel(scale_row, text="100%\nOriginal",
                     text_color="white").pack(side="left", expand=True)
        ctk.CTkLabel(scale_row, text="300%",
                     text_color="white").pack(side="right")

        preset_row = ctk.CTkFrame(self.volume_box, fg_color="transparent")
        preset_row.pack(fill="x", padx=22, pady=(22, 4))

        presets = [
            ("🔇 Mute", 0),
            ("50%", 50),
            ("100%", 100),
            ("150%", 150),
            ("200%", 200),
        ]

        for text, value in presets:
            btn = ctk.CTkButton(
                preset_row,
                text=text,
                command=lambda v=value: self.set_volume(v),
                height=42,
                fg_color="#15233a" if value != 150 else "#7c3aed",
                hover_color="#6d28d9",
                border_width=1,
                border_color="#334663",
                corner_radius=8,
                font=("Segoe UI", 14, "bold")
            )
            btn.pack(side="left", expand=True, fill="x", padx=5)

    def create_output_section(self):
        output_container = ctk.CTkFrame(
            self.right_panel,
            fg_color="#101c31",
            border_width=1,
            border_color="#263855",
            corner_radius=12
        )
        output_container.pack(fill="x", ipady=18)

        title = ctk.CTkLabel(
            output_container,
            text="Output",
            font=("Segoe UI", 20, "bold"),
            text_color="white"
        )
        title.pack(anchor="w", padx=22, pady=(12, 14))

        file_row = ctk.CTkFrame(output_container, fg_color="transparent")
        file_row.pack(fill="x", padx=22, pady=6)

        ctk.CTkLabel(
            file_row,
            text="Output File:",
            width=110,
            anchor="w",
            font=("Segoe UI", 14),
            text_color="#dbe5f5"
        ).pack(side="left")

        self.output_file_entry = ctk.CTkEntry(
            file_row,
            height=38,
            fg_color="#15233a",
            border_color="#334663",
            text_color="white"
        )
        self.output_file_entry.pack(
            side="left", fill="x", expand=True, padx=(10, 10))

        browse_file_btn = ctk.CTkButton(
            file_row,
            text="Browse",
            width=90,
            height=38,
            fg_color="#15233a",
            hover_color="#263855",
            border_width=1,
            border_color="#7c3aed",
            command=self.choose_output_file
        )
        browse_file_btn.pack(side="right")

        folder_row = ctk.CTkFrame(output_container, fg_color="transparent")
        folder_row.pack(fill="x", padx=22, pady=12)

        ctk.CTkLabel(
            folder_row,
            text="Save To:",
            width=110,
            anchor="w",
            font=("Segoe UI", 14),
            text_color="#dbe5f5"
        ).pack(side="left")

        self.output_folder_entry = ctk.CTkEntry(
            folder_row,
            height=38,
            fg_color="#15233a",
            border_color="#334663",
            text_color="white"
        )
        self.output_folder_entry.pack(
            side="left", fill="x", expand=True, padx=(10, 10))

        browse_folder_btn = ctk.CTkButton(
            folder_row,
            text="Browse",
            width=90,
            height=38,
            fg_color="#15233a",
            hover_color="#263855",
            border_width=1,
            border_color="#7c3aed",
            command=self.choose_output_folder
        )
        browse_folder_btn.pack(side="right")

        self.export_btn = ctk.CTkButton(
            output_container,
            text="⬆  Export Video",
            height=54,
            corner_radius=10,
            fg_color="#7c3aed",
            hover_color="#6d28d9",
            font=("Segoe UI", 18, "bold"),
            command=self.export_video_start
        )
        self.export_btn.pack(fill="x", padx=22, pady=(18, 4))

    def create_status_bar(self):
        self.status_bar = ctk.CTkFrame(
            self,
            height=48,
            fg_color="#07111f",
            corner_radius=0
        )
        self.status_bar.grid(row=2, column=0, columnspan=2, sticky="ew")
        self.status_bar.grid_columnconfigure(0, weight=1)

        self.status_label = ctk.CTkLabel(
            self.status_bar,
            text="✅ Ready",
            font=("Segoe UI", 15),
            text_color="#6ee787"
        )
        self.status_label.grid(row=0, column=0, sticky="w", padx=190, pady=10)

        self.progress = ctk.CTkProgressBar(
            self.status_bar,
            width=260,
            progress_color="#8b5cf6"
        )
        self.progress.grid(row=0, column=1, padx=25)
        self.progress.set(0)

    def show_home(self):
        self.set_status("✅ Ready", "#6ee787")

    def focus_volume(self):
        self.volume_slider.focus()

    def show_about(self):
        messagebox.showinfo(
            "About",
            "Video Volume Changer\n\n"
            "A simple Python GUI app made with CustomTkinter and MoviePy.\n\n"
            "Use it to mute, reduce, or increase video volume."
        )

    def select_video(self):
        path = filedialog.askopenfilename(
            title="Select Video",
            filetypes=[
                ("Video Files", "*.mp4 *.mov *.avi *.mkv *.webm"),
                ("All Files", "*.*")
            ]
        )

        if not path:
            return

        self.video_path = path
        self.output_folder = os.path.dirname(path)

        name = os.path.basename(path)
        base, _ = os.path.splitext(name)
        output_name = f"{base}_volume_{self.volume_percent.get()}.mp4"

        self.output_file_entry.delete(0, "end")
        self.output_file_entry.insert(0, output_name)

        self.output_folder_entry.delete(0, "end")
        self.output_folder_entry.insert(0, self.output_folder)

        self.load_video_info(path)
        self.set_status("✅ Video loaded", "#6ee787")

    def load_video_info(self, path):
        try:
            clip = VideoFileClip(path)

            duration_seconds = int(clip.duration or 0)
            self.video_duration = self.format_time(duration_seconds)

            width, height = clip.size
            self.video_resolution = f"{width} x {height}"

            file_size_mb = os.path.getsize(path) / (1024 * 1024)
            self.video_size = f"{file_size_mb:.1f} MB"

            ext = os.path.splitext(path)[1].replace(".", "").upper()
            self.video_format = ext

            if clip.audio is None:
                self.video_audio = "No audio track"
            else:
                self.video_audio = "Audio detected"

            clip.close()

            self.file_name_label.configure(text=os.path.basename(path))
            self.duration_label.configure(text=self.video_duration)
            self.format_label.configure(text=self.video_format)
            self.resolution_label.configure(text=self.video_resolution)
            self.size_label.configure(text=self.video_size)
            self.audio_label.configure(text=self.video_audio)

            self.time_label.configure(text=f"00:00:00 / {self.video_duration}")

            self.preview_label.configure(
                text=f"Video Selected\n\n{os.path.basename(path)}\n\nPreview area"
            )

        except Exception as e:
            messagebox.showerror("Error", f"Could not read video:\n{e}")

    def on_volume_change(self, value):
        value = int(float(value))
        self.volume_percent.set(value)
        self.big_volume_label.configure(text=f"{value}%")
        self.update_output_name()

    def set_volume(self, value):
        self.volume_slider.set(value)
        self.volume_percent.set(value)
        self.big_volume_label.configure(text=f"{value}%")
        self.update_output_name()

    def update_output_name(self):
        if not self.video_path:
            return

        base = os.path.splitext(os.path.basename(self.video_path))[0]
        output_name = f"{base}_volume_{self.volume_percent.get()}.mp4"

        self.output_file_entry.delete(0, "end")
        self.output_file_entry.insert(0, output_name)

    def choose_output_folder(self):
        folder = filedialog.askdirectory(title="Choose Output Folder")

        if folder:
            self.output_folder = folder
            self.output_folder_entry.delete(0, "end")
            self.output_folder_entry.insert(0, folder)

    def choose_output_file(self):
        path = filedialog.asksaveasfilename(
            title="Choose Output File",
            defaultextension=".mp4",
            filetypes=[
                ("MP4 Video", "*.mp4"),
                ("All Files", "*.*")
            ]
        )

        if path:
            folder = os.path.dirname(path)
            filename = os.path.basename(path)

            self.output_folder = folder

            self.output_folder_entry.delete(0, "end")
            self.output_folder_entry.insert(0, folder)

            self.output_file_entry.delete(0, "end")
            self.output_file_entry.insert(0, filename)

    def export_video_start(self):
        if not self.video_path:
            messagebox.showerror("Error", "Please select a video first.")
            return

        output_file = self.output_file_entry.get().strip()
        output_folder = self.output_folder_entry.get().strip()

        if not output_file:
            messagebox.showerror("Error", "Please enter output file name.")
            return

        if not output_folder:
            messagebox.showerror("Error", "Please select output folder.")
            return

        if not output_file.lower().endswith(".mp4"):
            output_file += ".mp4"

        output_path = os.path.join(output_folder, output_file)

        self.export_btn.configure(state="disabled", text="Processing...")
        self.progress.set(0.2)
        self.set_status("🔄 Processing video...", "#93c5fd")

        thread = threading.Thread(
            target=self.export_video,
            args=(self.video_path, output_path, self.volume_percent.get()),
            daemon=True
        )
        thread.start()

    def export_video(self, input_path, output_path, volume_percent):
        try:
            video = VideoFileClip(input_path)

            if video.audio is None:
                self.after(0, self.export_failed,
                           "This video has no audio track.")
                return

            volume_factor = volume_percent / 100

            new_audio = video.audio.with_volume_scaled(volume_factor)
            final_video = video.with_audio(new_audio)

            self.after(0, lambda: self.progress.set(0.5))

            final_video.write_videofile(
                output_path,
                codec="libx264",
                audio_codec="aac",
                fps=video.fps,
                logger=None
            )

            video.close()
            final_video.close()

            self.after(0, self.export_success, output_path)

        except Exception as e:
            self.after(0, self.export_failed, str(e))

    def export_success(self, output_path):
        self.progress.set(1)
        self.export_btn.configure(state="normal", text="⬆  Export Video")
        self.set_status("✅ Export complete", "#6ee787")

        messagebox.showinfo(
            "Success",
            f"New video saved successfully:\n\n{output_path}"
        )

    def export_failed(self, error_message):
        self.progress.set(0)
        self.export_btn.configure(state="normal", text="⬆  Export Video")
        self.set_status("❌ Export failed", "#f87171")

        messagebox.showerror(
            "Export Failed",
            error_message
        )

    def set_status(self, text, color):
        self.status_label.configure(text=text, text_color=color)

    @staticmethod
    def format_time(seconds):
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"


if __name__ == "__main__":
    app = VideoVolumeChangerApp()
    app.mainloop()
