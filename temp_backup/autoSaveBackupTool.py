import os
import shutil
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from datetime import datetime
import json
import time
import threading
import copy


class AutoSaveBackupTool:
    
    VERSION = "v0.6.2"
    # 公告信息常量，直接存储在源代码中
    ANNOUNCEMENTS = [

        {
            "content": "v0.2版本更新：支持文件夹备份，可以备份整个游戏存档目录",
            "date": "2025-04-28"
        },
        {
            "content": "v0.4版本更新：新增日志与日志详情，右键日志即可进行回溯操作。优化窗口位置",
            "date": "2025-04-29"
        },
        {
            "content": "dev-v0.5版本更新：配置系统更新，数据配置文件(如历史、日志)保存在存档目录路径，基础设置保存用户目录",
            "date": "2025-4-29"
        },
        {
            "content": "dev-v0.5.1版本更新：公告更新，鼠标移动到公告栏会开始滚动，避免字数过长导致按钮位置问题",
            "date": "2025-5-6"
        },
        {
            "content": r"dev-v0.5.2版本更新：兼容旧版本配置文件，启动时检测C:\Users\~\.game_backup_tool目录下的config.json文件",
            "date": "2025-5-6"
        },
        {
            "content": "v0.5.3版本更新：新增旧版本配置迁移的历史记录与日志",
            "date": "2025-5-6"
        },
        {
            "content": "v0.6版本更新：新增历史备份目录列表进行管理（右键有更多选项）",
            "date": "2025-5-7"
        },
        {
            "content": "v0.6.1版本更新：右键备份列表可以还原与删除",
            "date": "2025-5-7"
        },
        {
            "content": "v0.6.2版本更新：状态栏状态数量更新、备份文件名时间戳精度提升至毫秒，修复了历史备份目录列表中删除某个目录后还会显示的问题",
            "date": "2025-5-8"
        }
    ]
    
    def __init__(self, root):
        self.root = root
        self.root.title(f"ASBT · 自动存档备份工具 {self.VERSION} | by@Yanxiao")
        self.root.geometry("700x620")
        self.root.resizable(True, True)
        
        # 将窗口居中显示
        self.center_window(self.root)

        # 默认全局配置
        self.global_config = {
            "source_path": "",
            "is_directory": False,
            "backup_dir": "",
            "backup_dirs": [],  # 历史备份目录列表
            "interval": 5,  # 默认备份间隔（分钟）
        }
        
        # 默认备份目录配置
        self.backup_config = {
            "backups": [],
            "logs": []  # 日志记录列表
        }
        
        # 合并配置用于兼容现有代码
        self.config = {**self.global_config, **self.backup_config}
        
        # 配置文件路径
        self.global_config_file = os.path.join(os.path.expanduser("~"), "autoSaveBackupTool_config.json")
        self.backup_config_file = None
        
        # 旧版本配置文件路径
        self.old_config_file = os.path.join(os.path.expanduser("~"), ".game_backup_tool", "config.json")
        
        # 检查旧版本配置文件
        self.check_old_config()
        
        # 加载全局配置
        self.load_global_config()

        # 备份线程控制
        self.backup_thread = None
        self.is_running = False

        # 创建界面
        self.create_widgets()
        
        # 如果有备份目录，加载备份目录配置
        if self.global_config["backup_dir"]:
            self.load_backup_config()

        # 更新备份列表
        self.update_backup_list()
    # 创建滚动文本
    def create_scrolling_text(self, parent, announcement_var, width=500, speed=100, font=("微软雅黑", 10)):
        canvas = tk.Canvas(parent, width=width, height=25, bg="white", highlightthickness=0)
        text_id = canvas.create_text(0, 12, text=announcement_var.get(), anchor='w', font=font)
        
        # 滚动标志，默认为False（不滚动）
        is_scrolling = False
        scroll_id = None
        # 标记文本是否需要滚动（文本宽度是否超出画布宽度）
        needs_scrolling = False
        
        # 检查文本是否需要滚动
        def check_if_needs_scrolling():
            nonlocal needs_scrolling
            # 获取文本的边界框
            x1, _, x2, _ = canvas.bbox(text_id)
            # 计算文本宽度
            text_width = x2 - x1
            # 如果文本宽度大于画布宽度，则需要滚动
            needs_scrolling = text_width > width
            return needs_scrolling
        
        def scroll():
            nonlocal scroll_id
            # 如果不在滚动状态，则不继续滚动
            if not is_scrolling:
                return
                
            # 更新文本内容，每次滚动时重新获取 announcement_var 的值
            current_text = announcement_var.get()
            canvas.itemconfig(text_id, text=current_text)

            canvas.move(text_id, -10, 0)  # 滚动效果
            x1, _, x2, _ = canvas.bbox(text_id)  # 获取文本位置
            if x2 < 0:  # 当文本完全滚动出视野时，重新开始
                canvas.move(text_id, canvas.winfo_width() - x1, 0)
            scroll_id = canvas.after(speed, scroll)  # 重复滚动
        
        # 重置文本位置到开头
        def reset_text_position():
            x1, _, _, _ = canvas.bbox(text_id)  # 获取文本位置
            if x1 < 0:  # 如果文本已经滚动，则重置位置
                canvas.coords(text_id, 0, 12)  # 重置到初始位置
        
        # 鼠标进入事件处理函数
        def on_enter(event):
            nonlocal is_scrolling
            # 只有当文本需要滚动时才启用滚动功能
            if check_if_needs_scrolling():
                is_scrolling = True
                scroll()  # 开始滚动
        
        # 鼠标离开事件处理函数
        def on_leave(event):
            nonlocal is_scrolling, scroll_id
            is_scrolling = False
            if scroll_id:
                canvas.after_cancel(scroll_id)  # 取消滚动定时器
                scroll_id = None
            reset_text_position()  # 重置文本位置到开头
        
        # 绑定鼠标进入和离开事件
        canvas.bind("<Enter>", on_enter)
        canvas.bind("<Leave>", on_leave)
        
        # 初始检查文本是否需要滚动
        check_if_needs_scrolling()
        
        return canvas
    
    def create_widgets(self):
        # 创建主框架
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # 公告区域 - 简化为横向标题栏
        announcement_frame = ttk.Frame(main_frame)
        announcement_frame.pack(fill=tk.X, pady=2)
        
        # 公告标签和内容
        self.announcement_var = tk.StringVar()
        # 先设置公告内容，确保在创建滚动文本前已有内容
        self.update_announcement_display()
        announcement = self.create_scrolling_text(announcement_frame, self.announcement_var, width=570)
        announcement.pack(side=tk.LEFT, padx=5, pady=2)
        # announcement_label = ttk.Label(announcement_frame, textvariable=self.announcement_var, anchor=tk.W)
        # announcement_label.pack(side=tk.LEFT, fill=tk.X, expand=False, padx=5, pady=2)
        
        # 公告按钮
        ttk.Button(announcement_frame, text="查看公告", command=self.show_announcements, width=10).pack(side=tk.RIGHT, padx=5, pady=2)

        # 文件选择区域
        file_frame = ttk.LabelFrame(main_frame, text="存档文件设置", padding="10")
        file_frame.pack(fill=tk.X, pady=5)

        ttk.Label(file_frame, text="源文件/文件夹:").grid(row=0, column=0, sticky=tk.W, pady=5)
        self.source_entry = ttk.Entry(file_frame, width=50)
        self.source_entry.grid(row=0, column=1, sticky=tk.W + tk.E, padx=5, pady=5)
        self.source_entry.insert(0, self.config["source_path"])
        
        source_btn_frame = ttk.Frame(file_frame)
        source_btn_frame.grid(row=0, column=2, padx=5, pady=5)
        ttk.Button(source_btn_frame, text="选择文件", command=lambda: self.select_source(False)).pack(side=tk.LEFT, padx=2)
        ttk.Button(source_btn_frame, text="选择文件夹", command=lambda: self.select_source(True)).pack(side=tk.LEFT, padx=2)

        ttk.Label(file_frame, text="备份目录:").grid(row=1, column=0, sticky=tk.W, pady=5)
        
        # 创建备份目录选择框架
        backup_dir_frame = ttk.Frame(file_frame)
        backup_dir_frame.grid(row=1, column=1, sticky=tk.W + tk.E, padx=5, pady=5)
        
        # 创建备份目录输入框
        self.backup_dir_entry = ttk.Entry(backup_dir_frame, width=50)
        self.backup_dir_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        self.backup_dir_entry.insert(0, self.config["backup_dir"])
        
        # 创建浏览和历史备份目录按钮的框架
        backup_btn_frame = ttk.Frame(file_frame)
        backup_btn_frame.grid(row=1, column=2, padx=5, pady=5)
        
        # 创建浏览按钮
        browse_btn = ttk.Button(backup_btn_frame, text="浏览", command=self.select_backup_dir)
        browse_btn.pack(side=tk.LEFT, padx=2)
        
        # 创建历史备份目录按钮
        history_btn = ttk.Button(backup_btn_frame, text="历史备份目录", command=self.show_backup_dirs_list)
        history_btn.pack(side=tk.LEFT, padx=2)

        # 备份设置区域
        settings_frame = ttk.LabelFrame(main_frame, text="备份设置", padding="10")
        settings_frame.pack(fill=tk.X, pady=5)

        ttk.Label(settings_frame, text="备份间隔(分钟):").grid(row=0, column=0, sticky=tk.W, pady=5)
        self.interval_spinbox = ttk.Spinbox(settings_frame, from_=1, to=1440, width=10)
        self.interval_spinbox.grid(row=0, column=1, sticky=tk.W, padx=5, pady=5)
        self.interval_spinbox.insert(0, str(self.config["interval"]))

        self.backup_btn = ttk.Button(settings_frame, text="立即备份", command=self.manual_backup)
        self.backup_btn.grid(row=0, column=2, padx=5, pady=5)

        self.start_auto_btn = ttk.Button(settings_frame, text="开始自动备份", command=self.toggle_auto_backup)
        self.start_auto_btn.grid(row=0, column=3, padx=5, pady=5)

        # 备份列表区域
        list_frame = ttk.LabelFrame(main_frame, text="备份历史", padding="10")
        list_frame.pack(fill=tk.BOTH, expand=True, pady=5)

        # 创建备份列表的树形视图
        columns = ("时间", "文件名")
        self.backup_tree = ttk.Treeview(list_frame, columns=columns, show="headings")
        for col in columns:
            self.backup_tree.heading(col, text=col)
        self.backup_tree.column("时间", width=150)
        self.backup_tree.column("文件名", width=400)
        self.backup_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        # 添加滚动条
        scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=self.backup_tree.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.backup_tree.configure(yscrollcommand=scrollbar.set)

        # 添加右键菜单
        self.context_menu = tk.Menu(self.root, tearoff=0)
        self.context_menu.add_command(label="还原", command=self.restore_backup)
        self.context_menu.add_command(label="删除", command=self.delete_backup)
        self.context_menu.add_separator()
        self.context_menu.add_command(label="删除备份文件夹", command=self.delete_backup_folder)

        self.backup_tree.bind("<Button-3>", self.show_context_menu)

        # 添加日志按钮
        log_btn = ttk.Button(main_frame, text="查看日志", command=self.show_logs,width=10)
        log_btn.pack(side=tk.RIGHT, padx=(30, 10), pady=2)
        
        # 状态栏
        self.status_var = tk.StringVar()
        self.status_var.set(f"准备就绪，当前版本 {self.VERSION}")
        status_bar = ttk.Label(main_frame, textvariable=self.status_var, relief=tk.SUNKEN, anchor=tk.W)
        status_bar.pack(fill=tk.X, pady=5)
        
        # 更新公告显示 - 确保在界面创建后立即显示最新公告
        self.update_announcement_display()

    def select_source(self, is_directory=False):
        if is_directory:
            path = filedialog.askdirectory(title="选择要备份的文件夹")
        else:
            path = filedialog.askopenfilename(title="选择要备份的文件")
            
        if path:
            self.source_entry.delete(0, tk.END)
            self.source_entry.insert(0, path)
            
            # 更新全局配置
            self.global_config["source_path"] = path
            self.global_config["is_directory"] = is_directory
            
            # 更新合并配置以保持兼容性
            self.config["source_path"] = path
            self.config["is_directory"] = is_directory
            
            # 保存全局配置
            self.save_global_config()
            
            # 更新状态栏
            file_type = "文件夹" if is_directory else "文件"
            self.status_var.set(f"已选择{file_type}: {path}")

    def show_backup_dirs_list(self):
        """显示历史备份目录列表窗口"""
        # 创建一个新窗口
        dirs_window = tk.Toplevel(self.root)
        dirs_window.title("历史备份目录")
        dirs_window.geometry("500x400")
        dirs_window.transient(self.root)  # 设置为主窗口的临时窗口
        dirs_window.grab_set()  # 模态对话框
        
        # 居中显示
        dirs_window.update_idletasks()
        width = dirs_window.winfo_width()
        height = dirs_window.winfo_height()
        x = (dirs_window.winfo_screenwidth() // 2) - (width // 2)
        y = (dirs_window.winfo_screenheight() // 2) - (height // 2)
        dirs_window.geometry(f"{width}x{height}+{x}+{y}")
        
        # 创建一个框架
        frame = ttk.Frame(dirs_window, padding="10")
        frame.pack(fill=tk.BOTH, expand=True)
        
        # 添加说明文本
        ttk.Label(frame, text="选择一个备份目录打开或右键进行操作：", anchor=tk.W).pack(fill=tk.X, pady=(0, 10))
        
        # 创建列表框和滚动条
        list_frame = ttk.Frame(frame)
        list_frame.pack(fill=tk.BOTH, expand=True)
        
        scrollbar = ttk.Scrollbar(list_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # 过滤掉不存在的目录
        valid_dirs = [d for d in self.global_config["backup_dirs"] if os.path.exists(d)]
        # 更新全局配置中的备份目录列表
        if self.global_config["backup_dirs"] != valid_dirs:
            self.global_config["backup_dirs"] = valid_dirs
            self.save_global_config()
        
        # 创建列表框
        dirs_listbox = tk.Listbox(list_frame, yscrollcommand=scrollbar.set, font=("微软雅黑", 10))
        dirs_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.config(command=dirs_listbox.yview)
        
        # 添加目录到列表框
        if valid_dirs:
            for directory in valid_dirs:
                dirs_listbox.insert(tk.END, directory)
        else:
            dirs_listbox.insert(tk.END, "<无历史备份目录>")
            dirs_listbox.config(state=tk.DISABLED)  # 如果没有目录，禁用列表框
        
        # 创建右键菜单
        dirs_context_menu = tk.Menu(dirs_window, tearoff=0)
        # dirs_context_menu.add_command(label="选择", command=lambda: on_select())
        # dirs_context_menu.add_separator()
        dirs_context_menu.add_command(label="状态", command=lambda: show_dir_info())
        dirs_context_menu.add_separator()
        dirs_context_menu.add_command(label="从历史中删除", command=lambda: on_delete())
        dirs_context_menu.add_command(label="删除备份文件夹", command=lambda: on_delete_folder())
        
        
        # 显示右键菜单
        def show_dirs_context_menu(event):
            # 先选中点击的项
            clicked_index = dirs_listbox.nearest(event.y)
            if clicked_index >= 0 and valid_dirs:  # 确保有效点击且有有效目录
                dirs_listbox.selection_clear(0, tk.END)
                dirs_listbox.selection_set(clicked_index)
                dirs_listbox.activate(clicked_index)
                dirs_context_menu.post(event.x_root, event.y_root)
        
        # 绑定右键菜单
        dirs_listbox.bind("<Button-3>", show_dirs_context_menu)
        
        # 创建按钮框架
        btn_frame = ttk.Frame(frame)
        btn_frame.pack(fill=tk.X, pady=(10, 0))
        
        # 选择按钮
        def on_select():
            selection = dirs_listbox.curselection()
            if selection and valid_dirs:  # 确保有选择且有有效目录
                try:
                    # 刷新valid_dirs列表，确保只包含存在的目录
                    valid_dirs.clear()
                    valid_dirs.extend([d for d in self.global_config["backup_dirs"] if os.path.exists(d)])
                    
                    # 如果刷新后列表为空，更新显示并返回
                    if not valid_dirs:
                        dirs_listbox.delete(0, tk.END)
                        dirs_listbox.insert(tk.END, "<无历史备份目录>")
                        dirs_listbox.config(state=tk.DISABLED)
                        messagebox.showinfo("提示", "没有有效的备份目录")
                        return
                    
                    # 添加索引检查，防止索引越界
                    if selection[0] < len(valid_dirs):
                        selected_dir = valid_dirs[selection[0]]
                        # 检查目录是否存在
                        if os.path.exists(selected_dir):
                            # 更新输入框
                            self.backup_dir_entry.delete(0, tk.END)
                            self.backup_dir_entry.insert(0, selected_dir)
                            # 切换到选择的备份目录
                            self.switch_backup_dir(selected_dir)
                            # 关闭窗口
                            dirs_window.destroy()
                        else:
                            # 目录不存在，询问是否从历史记录中移除
                            self.show_delete_folder_dialog(selected_dir, dirs_window, dirs_listbox, valid_dirs)
                    else:
                        # 如果索引超出范围，提示用户重新选择
                        messagebox.showinfo("提示", "选择无效，请重新选择")
                        # 刷新列表显示
                        dirs_listbox.delete(0, tk.END)
                        for directory in valid_dirs:
                            dirs_listbox.insert(tk.END, directory)
                except Exception as e:
                    messagebox.showerror("错误", f"选择备份目录时出错: {str(e)}")
                    # 刷新列表
                    dirs_listbox.delete(0, tk.END)
                    valid_dirs.clear()
                    valid_dirs.extend([d for d in self.global_config["backup_dirs"] if os.path.exists(d)])
                    if valid_dirs:
                        for directory in valid_dirs:
                            dirs_listbox.insert(tk.END, directory)
                    else:
                        dirs_listbox.insert(tk.END, "<无历史备份目录>")
                        dirs_listbox.config(state=tk.DISABLED)
        
        # 删除按钮
        def on_delete():
            selection = dirs_listbox.curselection()
            if selection and valid_dirs:  # 确保有选择且有有效目录
                try:
                    # 添加索引检查，防止索引越界
                    if selection[0] < len(valid_dirs):
                        selected_dir = valid_dirs[selection[0]]
                        
                        # 确认删除
                        if messagebox.askyesno("确认删除", f"确定要从历史记录中删除此目录吗？\n{selected_dir}"):
                            # 从列表和配置中删除
                            valid_dirs.pop(selection[0])
                            # 确保全局配置与valid_dirs同步
                            self.global_config["backup_dirs"] = copy.deepcopy(valid_dirs)
                            self.save_global_config()
                            
                            # 刷新列表框
                            dirs_listbox.delete(0, tk.END)
                            if valid_dirs:
                                for directory in valid_dirs:
                                    dirs_listbox.insert(tk.END, directory)
                            else:
                                dirs_listbox.insert(tk.END, "<无历史备份目录>")
                                dirs_listbox.config(state=tk.DISABLED)
                    else:
                        messagebox.showinfo("提示", "选择无效，请重新选择")
                except Exception as e:
                    messagebox.showerror("错误", f"删除历史记录时出错: {str(e)}")
                    # 确保valid_dirs与全局配置同步
                    valid_dirs.clear()
                    valid_dirs.extend([d for d in self.global_config["backup_dirs"] if os.path.exists(d)])
                    # 刷新列表
                    dirs_listbox.delete(0, tk.END)
                    if valid_dirs:
                        for directory in valid_dirs:
                            dirs_listbox.insert(tk.END, directory)
                    else:
                        dirs_listbox.insert(tk.END, "<无历史备份目录>")
                        dirs_listbox.config(state=tk.DISABLED)
        
        # 删除备份文件夹按钮（包括内容）
        def on_delete_folder():
            selection = dirs_listbox.curselection()
            if selection and valid_dirs:  # 确保有选择且有有效目录
                try:
                    # 刷新valid_dirs列表，确保只包含存在的目录
                    valid_dirs.clear()
                    valid_dirs.extend([d for d in self.global_config["backup_dirs"] if os.path.exists(d)])
                    
                    # 如果刷新后列表为空，更新显示并返回
                    if not valid_dirs:
                        dirs_listbox.delete(0, tk.END)
                        dirs_listbox.insert(tk.END, "<无历史备份目录>")
                        dirs_listbox.config(state=tk.DISABLED)
                        messagebox.showinfo("提示", "没有有效的备份目录")
                        return
                    
                    # 检查选择的索引是否有效
                    if selection[0] >= len(valid_dirs):
                        messagebox.showinfo("提示", "选择无效，请重新选择")
                        # 刷新列表显示
                        dirs_listbox.delete(0, tk.END)
                        for directory in valid_dirs:
                            dirs_listbox.insert(tk.END, directory)
                        return
                    
                    selected_dir = valid_dirs[selection[0]]
                    
                    # 检查目录是否存在
                    if not os.path.exists(selected_dir):
                        # 如果目录不存在，询问是否从历史记录中移除
                        if messagebox.askyesno("提示", f"备份文件夹不存在:\n{selected_dir}\n\n是否从历史记录中移除此目录?"):
                            # 从列表和配置中删除
                            valid_dirs.pop(selection[0])
                            # 确保全局配置与valid_dirs同步
                            self.global_config["backup_dirs"] = copy.deepcopy(valid_dirs)
                            self.save_global_config()
                            
                            # 刷新列表框
                            dirs_listbox.delete(0, tk.END)
                            if valid_dirs:
                                for directory in valid_dirs:
                                    dirs_listbox.insert(tk.END, directory)
                            else:
                                dirs_listbox.insert(tk.END, "<无历史备份目录>")
                                dirs_listbox.config(state=tk.DISABLED)
                            
                            # 确保窗口刷新
                            dirs_window.update()
                            dirs_window.update_idletasks()
                            
                            messagebox.showinfo("成功", "已从历史记录中移除此目录")
                            self.status_var.set(f"移除目录: {selected_dir}")
                            return
                    
                    # 创建自定义对话框进行确认
                    self.show_delete_folder_dialog(selected_dir, dirs_window, dirs_listbox, valid_dirs)
                except Exception as e:
                    messagebox.showerror("错误", f"删除备份文件夹时出错: {str(e)}")
                    # 确保valid_dirs与全局配置同步
                    valid_dirs.clear()
                    valid_dirs.extend([d for d in self.global_config["backup_dirs"] if os.path.exists(d)])
                    # 刷新列表
                    dirs_listbox.delete(0, tk.END)
                    if valid_dirs:
                        for directory in valid_dirs:
                            dirs_listbox.insert(tk.END, directory)
                    else:
                        dirs_listbox.insert(tk.END, "<无历史备份目录>")
                        dirs_listbox.config(state=tk.DISABLED)
        
        # 查看文件信息
        def show_dir_info():
            selection = dirs_listbox.curselection()
            if selection and valid_dirs:  # 确保有选择且有有效目录
                selected_dir = valid_dirs[selection[0]]
                self.show_directory_info(selected_dir, dirs_window)
        
        # 添加按钮
        ttk.Button(btn_frame, text="关闭", command=dirs_window.destroy).pack(side=tk.RIGHT, padx=(5, 10))
        # ttk.Button(btn_frame, text="从历史中删除", command=on_delete).pack(side=tk.LEFT, padx=5)
        # ttk.Button(btn_frame, text="删除备份文件夹", command=on_delete_folder).pack(side=tk.LEFT, padx=5)
        # ttk.Button(btn_frame, text="查看文件信息", command=show_dir_info).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="选择", command=on_select).pack(side=tk.RIGHT, padx=(10, 5))
    
    def show_delete_folder_dialog(self, backup_dir, parent_window=None, listbox=None, valid_dirs=None):
        """显示删除备份文件夹的确认对话框"""
        if not backup_dir:
            messagebox.showinfo("提示", "备份目录路径无效")
            return
            
        # 检查目录是否存在，如果不存在，询问用户是否从历史记录中移除
        if not os.path.exists(backup_dir):
            if messagebox.askyesno("提示", f"备份文件夹不存在:\n{backup_dir}\n\n是否从历史记录中移除此目录?"):
                # 从历史备份目录列表中移除
                if backup_dir in self.global_config["backup_dirs"]:
                    self.global_config["backup_dirs"].remove(backup_dir)
                    self.save_global_config()
                
                # 如果是从列表窗口调用的，更新列表
                if listbox and valid_dirs is not None:
                    # 确保valid_dirs是最新的，与全局配置同步
                    valid_dirs.clear()
                    valid_dirs.extend([d for d in self.global_config["backup_dirs"] if os.path.exists(d)])
                    
                    # 更新列表显示
                    listbox.delete(0, tk.END)
                    if valid_dirs:
                        for directory in valid_dirs:
                            listbox.insert(tk.END, directory)
                    else:
                        listbox.insert(tk.END, "<无历史备份目录>")
                        listbox.config(state=tk.DISABLED)
                    
                    # 确保parent_window刷新
                    if parent_window:
                        parent_window.update()
                        parent_window.update_idletasks()  # 确保所有挂起的任务都被处理
                
                messagebox.showinfo("成功", "已从历史记录中移除此目录")
            return
            
        # 创建自定义对话框
        dialog = tk.Toplevel(parent_window if parent_window else self.root)
        dialog.title("删除备份文件夹")
        dialog.geometry("400x200")
        dialog.resizable(False, False)
        dialog.transient(parent_window if parent_window else self.root)  # 设置为主窗口的临时窗口
        dialog.grab_set()  # 模态对话框
        
        # 居中显示
        dialog.update_idletasks()
        width = dialog.winfo_width()
        height = dialog.winfo_height()
        x = (dialog.winfo_screenwidth() // 2) - (width // 2)
        y = (dialog.winfo_screenheight() // 2) - (height // 2)
        dialog.geometry(f"{width}x{height}+{x}+{y}")
        
        # 添加说明文本
        ttk.Label(dialog, text=f"确定要删除以下备份文件夹吗？\n{backup_dir}", 
                 wraplength=380, justify="center").pack(pady=10)
        
        # 添加选项
        delete_config_var = tk.BooleanVar(value=True)
        delete_backups_var = tk.BooleanVar(value=True)
        
        ttk.Checkbutton(dialog, text="删除配置文件", variable=delete_config_var).pack(anchor="w", padx=20, pady=5)
        ttk.Checkbutton(dialog, text="删除所有备份文件", variable=delete_backups_var).pack(anchor="w", padx=20, pady=5)
        
        # 添加按钮
        button_frame = ttk.Frame(dialog)
        button_frame.pack(side="bottom", pady=10)
        
        def on_confirm():
            try:
                delete_config = delete_config_var.get()
                delete_backups = delete_backups_var.get()
                
                if not delete_config and not delete_backups:
                    messagebox.showinfo("提示", "未选择任何删除选项")
                    return
                
                # 定义配置文件路径
                temp_config_file = os.path.join(backup_dir, "config.json")
                
                # 删除备份文件
                if delete_backups:
                    # 加载该目录的配置
                    if os.path.exists(temp_config_file):
                        with open(temp_config_file, 'r', encoding='utf-8') as f:
                            temp_config = json.load(f)
                            if "backups" in temp_config:
                                for backup in temp_config["backups"]:
                                    backup_path = backup["backup_path"]
                                    if os.path.exists(backup_path):
                                        if backup.get("is_directory", False):
                                            shutil.rmtree(backup_path)
                                        else:
                                            os.remove(backup_path)
                
                # 删除配置文件
                if delete_config and os.path.exists(temp_config_file):
                    os.remove(temp_config_file)
                
                # 从历史备份目录列表中移除
                if backup_dir in self.global_config["backup_dirs"]:
                    self.global_config["backup_dirs"].remove(backup_dir)
                    self.save_global_config()
                
                # 如果是当前选中的备份目录，则清空
                if backup_dir == self.global_config["backup_dir"]:
                    # 重置备份配置
                    self.backup_config = {
                        "backups": [],
                        "logs": []
                    }
                    # 更新合并配置
                    self.config.update(self.backup_config)
                    # 清空备份目录输入框
                    self.backup_dir_entry.delete(0, tk.END)
                    # 更新全局配置
                    self.global_config["backup_dir"] = ""
                    self.config["backup_dir"] = ""
                    self.save_global_config()
                
                # 如果是从列表窗口调用的，更新列表
                if listbox and valid_dirs is not None:
                    # 确保valid_dirs是最新的，与全局配置同步
                    valid_dirs.clear()
                    valid_dirs.extend([d for d in self.global_config["backup_dirs"] if os.path.exists(d)])
                    
                    # 更新列表显示
                    listbox.delete(0, tk.END)
                    if valid_dirs:
                        for directory in valid_dirs:
                            listbox.insert(tk.END, directory)
                    else:
                        listbox.insert(tk.END, "<无历史备份目录>")
                        listbox.config(state=tk.DISABLED)
                    
                    # 确保parent_window刷新，如果是历史备份目录窗口
                    if parent_window:
                        parent_window.update()
                        parent_window.update_idletasks()  # 确保所有挂起的任务都被处理
                
                # 更新备份列表
                self.update_backup_list()
                
                # 关闭对话框
                dialog.destroy()
                
                # 提示用户操作成功
                messagebox.showinfo("成功", "备份文件夹已删除")
                self.status_var.set(f"已删除备份文件夹: {backup_dir}")
                
            except Exception as e:
                messagebox.showerror("错误", f"删除失败: {str(e)}")
                dialog.destroy()
        
        ttk.Button(button_frame, text="确定", command=on_confirm).pack(side="left", padx=10)
        ttk.Button(button_frame, text="取消", command=dialog.destroy).pack(side="left", padx=10)
    
    def switch_backup_dir(self, directory):
        """切换到指定的备份目录"""
        # 保存当前备份配置（如果有）
        if self.global_config["backup_dir"] and os.path.exists(self.global_config["backup_dir"]):
            self.save_backup_config()
        
        # 更新全局配置中的备份目录
        self.global_config["backup_dir"] = directory
        self.config["backup_dir"] = directory
        
        # 更新备份配置文件路径
        self.backup_config_file = os.path.join(directory, "config.json")
        
        # 如果新目录中已有配置文件，则加载该配置
        if os.path.exists(self.backup_config_file):
            self.load_backup_config()
            self.status_var.set(f"已加载备份目录中的配置文件")
        else:
            # 如果新目录中没有配置文件，则创建一个新的空白配置
            # 重置备份配置为初始空白状态
            self.backup_config = {
                "backups": [],
                "logs": []
            }
            # 更新合并配置
            self.config.update(self.backup_config)
            # 保存新的空白配置到新目录
            self.save_backup_config()
            self.status_var.set(f"已为新备份目录创建空白配置文件")
        
        # 保存全局配置
        self.save_global_config()
            
        # 更新备份列表
        self.update_backup_list()
        
        # 如果日志窗口已打开，刷新日志显示
        self.refresh_log_display_if_open()
    
    def refresh_log_display_if_open(self):
        """如果日志窗口已打开，刷新日志显示"""
        if hasattr(self, 'log_tree') and self.log_tree.winfo_exists():
            # 清空当前日志列表
            for item in self.log_tree.get_children():
                self.log_tree.delete(item)
            
            # 重新添加日志记录到列表
            for log in reversed(self.backup_config["logs"]):
                action_map = {
                    "backup": "备份",
                    "restore": "还原",
                    "delete": "删除",
                    "restore_deleted": "恢复删除的备份",
                    "rollback": "回溯操作"
                }
                action_text = action_map.get(log["action"], log["action"])
                
                backup_info = log["backup_info"]
                is_directory = backup_info.get("is_directory", False)
                type_indicator = "[文件夹]" if is_directory else "[文件]"
                filename = os.path.basename(backup_info["backup_path"])
                display_name = f"{type_indicator} {filename}"
                
                self.log_tree.insert("", tk.END, values=(log["date"], action_text, display_name),
                                    tags=(log["timestamp"],))
            
            # 更新状态栏
            self.status_var.set(f"已切换备份目录并刷新日志显示")
        else:
            self.status_var.set(f"已切换备份目录并刷新备份列表")
    
    def select_backup_dir(self):
        directory = filedialog.askdirectory(title="选择备份目录")
        if directory:
            # 更新UI
            self.backup_dir_entry.delete(0, tk.END)
            self.backup_dir_entry.insert(0, directory)
            
            # 切换到选择的备份目录
            self.switch_backup_dir(directory)
            
            # 将新目录添加到历史备份目录列表中（如果不存在）
            if directory not in self.global_config["backup_dirs"]:
                self.global_config["backup_dirs"].append(directory)
                # 保存全局配置
                self.save_global_config()
                
            if hasattr(self, 'log_tree') and self.log_tree.winfo_exists():
                # 清空当前日志列表
                for item in self.log_tree.get_children():
                    self.log_tree.delete(item)
                
                # 重新添加日志记录到列表
                for log in reversed(self.backup_config["logs"]):
                    action_map = {
                        "backup": "备份",
                        "restore": "还原",
                        "delete": "删除",
                        "restore_deleted": "恢复删除的备份",
                        "rollback": "回溯操作"
                    }
                    action_text = action_map.get(log["action"], log["action"])
                    
                    backup_info = log["backup_info"]
                    is_directory = backup_info.get("is_directory", False)
                    type_indicator = "[文件夹]" if is_directory else "[文件]"
                    filename = os.path.basename(backup_info["backup_path"])
                    display_name = f"{type_indicator} {filename}"
                    
                    self.log_tree.insert("", tk.END, values=(log["date"], action_text, display_name),
                                        tags=(log["timestamp"],))
                
                # 更新状态栏
                self.status_var.set(f"已切换备份目录并刷新日志显示")
            else:
                self.status_var.set(f"已切换备份目录并刷新备份列表")

    def toggle_auto_backup(self):
        if self.is_running:
            self.is_running = False
            self.start_auto_btn.config(text="开始自动备份")
            self.status_var.set("自动备份已停止")
        else:
            if not self.validate_settings():
                return

            self.is_running = True
            self.start_auto_btn.config(text="停止自动备份")
            self.status_var.set("自动备份已启动")

            # 更新备份间隔
            try:
                interval = int(self.interval_spinbox.get())
                # 更新全局配置
                self.global_config["interval"] = interval
                # 更新合并配置以保持兼容性
                self.config["interval"] = interval
                # 保存全局配置
                self.save_global_config()
            except ValueError:
                messagebox.showerror("错误", "请输入有效的备份间隔")
                return

            # 启动备份线程
            if self.backup_thread is None or not self.backup_thread.is_alive():
                self.backup_thread = threading.Thread(target=self.auto_backup_task)
                self.backup_thread.daemon = True
                self.backup_thread.start()

    def auto_backup_task(self):
        while self.is_running:
            try:
                self.perform_backup()
                # 转换间隔为秒
                interval_seconds = self.global_config["interval"] * 60
                # 每秒检查一次是否需要停止
                for _ in range(interval_seconds):
                    if not self.is_running:
                        break
                    time.sleep(1)
            except Exception as e:
                self.status_var.set(f"自动备份出错: {str(e)}")
                self.is_running = False
                self.root.after(0, lambda: self.start_auto_btn.config(text="开始自动备份"))
                break

    def manual_backup(self):
        if not self.validate_settings():
            return

        try:
            self.perform_backup()
            # messagebox.showinfo("成功", "手动备份完成")
        except Exception as e:
            messagebox.showerror("错误", f"备份失败: {str(e)}")

    def perform_backup(self):
        source_path = self.global_config["source_path"]
        backup_dir = self.global_config["backup_dir"]
        is_directory = self.global_config["is_directory"]

        # 确保目录存在
        if not os.path.exists(backup_dir):
            os.makedirs(backup_dir)

        # 生成带时间戳的文件名（添加毫秒级精度，确保同一秒内的备份文件名也是唯一的）
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:19]  # 取前19位，包含到毫秒级别
        source_name = os.path.basename(source_path)
        backup_path = os.path.join(backup_dir, f"{source_name}_{timestamp}")

        # 执行备份
        if is_directory:
            # 如果是目录，使用shutil.copytree复制整个目录结构
            shutil.copytree(source_path, backup_path)
        else:
            # 如果是文件，使用shutil.copy2复制单个文件
            shutil.copy2(source_path, backup_path)

        # 记录备份信息
        backup_info = {
            "timestamp": timestamp,
            "original": source_path,
            "backup_path": backup_path,
            "is_directory": is_directory,
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        # 添加到备份配置中的备份列表
        self.backup_config["backups"].append(backup_info)
        # 更新合并配置以保持兼容性
        self.config["backups"] = self.backup_config["backups"]
        
        # 添加日志记录
        self.add_log("backup", backup_info)
        
        self.save_config()

        # 更新UI
        self.root.after(0, self.update_backup_list)
        self.root.after(0, lambda: self.status_var.set(f"备份完成: {source_name} 于 {backup_info['date']}"))

    def update_announcement_display(self):
        # 更新公告显示
        # 从类常量获取公告列表
        announcements = self.ANNOUNCEMENTS
        
        if announcements:
            # 显示最新的公告
            latest_announcement = announcements[-1]
            self.announcement_var.set(f"【{latest_announcement['date']}】 {latest_announcement['content']}")
        else:
            self.announcement_var.set("暂无公告")
    
    def show_announcements(self):
        # 创建模态对话框
        dialog = tk.Toplevel(self.root)
        dialog.title("公告信息")
        dialog.geometry("374x300")
        dialog.resizable(True, True)
        dialog.transient(self.root)  # 设置为主窗口的子窗口
        dialog.grab_set()  # 模态窗口
        
        # 将对话框居中显示
        self.center_window(dialog)
        
        # 创建内容框架
        content_frame = ttk.Frame(dialog, padding="10")
        content_frame.pack(fill=tk.BOTH, expand=True)
        
        # 创建公告内容显示区域
        announcement_text = tk.Text(content_frame, wrap=tk.WORD)
        announcement_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # 添加滚动条
        scrollbar = ttk.Scrollbar(content_frame, orient=tk.VERTICAL, command=announcement_text.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        announcement_text.configure(yscrollcommand=scrollbar.set)
        
        # 显示所有公告
        announcements = self.ANNOUNCEMENTS
        if announcements:
            for i, announcement in enumerate(reversed(announcements)):
                announcement_text.insert(tk.END, f"【{announcement['date']}】\n")
                announcement_text.insert(tk.END, f"{announcement['content']}\n")
                if i < len(announcements) - 1:
                    announcement_text.insert(tk.END, "\n" + "-"*50 + "\n\n")
        else:
            announcement_text.insert(tk.END, "暂无公告")
        
        announcement_text.config(state=tk.DISABLED)  # 设置为只读
        
        # 添加关闭按钮
        button_frame = ttk.Frame(dialog)
        button_frame.pack(fill=tk.X, pady=10)
        ttk.Button(button_frame, text="关闭", command=dialog.destroy).pack(side=tk.RIGHT, padx=10)
    
    # 公告管理相关函数已移除，公告现在直接存储在源代码中的ANNOUNCEMENTS常量中
    
    def update_backup_list(self):
        # 清空当前列表
        for item in self.backup_tree.get_children():
            self.backup_tree.delete(item)

        # 添加备份记录到列表
        count = 0
        for backup in reversed(self.backup_config["backups"]):
            if os.path.exists(backup["backup_path"]):
                # 添加类型标识
                is_directory = backup.get("is_directory", False)
                type_indicator = "[文件夹]" if is_directory else "[文件]"
                filename = os.path.basename(backup["backup_path"])
                display_name = f"{type_indicator} {filename}"
                
                self.backup_tree.insert("", tk.END, values=(backup["date"], display_name),
                                        tags=(backup["timestamp"],))
                count += 1
        
        # 更新状态栏
        self.status_var.set(f"已更新备份列表，数量：{count}")

    def show_context_menu(self, event):
        # 获取选中的项
        item = self.backup_tree.identify_row(event.y)
        if item:
            self.backup_tree.selection_set(item)
            self.context_menu.post(event.x_root, event.y_root)

    def restore_backup(self):
        selected = self.backup_tree.selection()
        if not selected:
            messagebox.showinfo("提示", "请先选择一个备份")
            return

        # 获取所选备份的时间戳
        timestamp = self.backup_tree.item(selected[0], "tags")[0]

        # 查找对应的备份信息
        backup_info = None
        for backup in self.backup_config["backups"]:
            if backup["timestamp"] == timestamp:
                backup_info = backup
                break

        if not backup_info:
            messagebox.showerror("错误", "找不到备份信息")
            return

        # 确认还原
        confirm = messagebox.askyesno("确认", "还原将覆盖当前存档，确定要继续吗？")
        if not confirm:
            return

        try:
            # 先备份当前文件或文件夹
            self.perform_backup()

            # 获取是否为目录的信息
            is_directory = backup_info.get("is_directory", False)
            original_path = backup_info["original"]
            backup_path = backup_info["backup_path"]
            
            # 如果目标路径存在，先删除
            if os.path.exists(original_path):
                if is_directory:
                    shutil.rmtree(original_path)
                else:
                    os.remove(original_path)
            
            # 还原备份
            if is_directory:
                shutil.copytree(backup_path, original_path)
            else:
                shutil.copy2(backup_path, original_path)
                
            messagebox.showinfo("成功", "存档已还原")
            self.status_var.set(f"已还原: {os.path.basename(backup_path)}")
            
            # 添加日志记录
            self.add_log("restore", backup_info)
        except Exception as e:
            messagebox.showerror("错误", f"还原失败: {str(e)}")

    def delete_backup(self):
        selected = self.backup_tree.selection()
        if not selected:
            messagebox.showinfo("提示", "请先选择一个备份")
            return

        # 获取所选备份的时间戳
        timestamp = self.backup_tree.item(selected[0], "tags")[0]

        # 查找对应的备份信息
        backup_index = -1
        for i, backup in enumerate(self.backup_config["backups"]):
            if backup["timestamp"] == timestamp:
                backup_index = i
                break

        if backup_index == -1:
            messagebox.showerror("错误", "找不到备份信息")
            return

        # 确认删除
        confirm = messagebox.askyesno("确认", "确定要删除这个备份吗？")
        if not confirm:
            return

        try:
            backup_info = self.backup_config["backups"][backup_index]
            is_directory = backup_info.get("is_directory", False)

            # 删除备份文件或文件夹
            if os.path.exists(backup_info["backup_path"]):
                if is_directory:
                    shutil.rmtree(backup_info["backup_path"])
                else:
                    os.remove(backup_info["backup_path"])

            # 从配置中移除
            backup_info = self.backup_config["backups"].pop(backup_index)
            # 更新合并配置以保持兼容性
            self.config["backups"] = self.backup_config["backups"]
            # 保存备份目录配置
            self.save_backup_config()

            # 添加日志记录
            self.add_log("delete", backup_info)

            # 更新列表
            self.update_backup_list()
            messagebox.showinfo("成功", "备份已删除")
        except Exception as e:
            messagebox.showerror("错误", f"删除失败: {str(e)}")
            
    def delete_backup_folder(self):
        """删除当前备份文件夹及其内容"""
        # 获取当前备份目录
        backup_dir = self.global_config["backup_dir"]
        
        if not backup_dir or not os.path.exists(backup_dir):
            messagebox.showinfo("提示", "当前没有选择备份文件夹或文件夹不存在")
            return
        
        # 调用通用的删除备份文件夹对话框
        self.show_delete_folder_dialog(backup_dir)
    
    def show_directory_info(self, directory, parent_window=None):
        """显示备份目录的详细信息"""
        if not directory:
            messagebox.showinfo("提示", "备份目录路径无效")
            return
            
        # 检查目录是否存在
        if not os.path.exists(directory):
            # 如果目录不存在，询问用户是否从历史记录中移除
            if messagebox.askyesno("提示", f"备份文件夹不存在:\n{directory}\n\n是否从历史记录中移除此目录?"):
                # 从历史备份目录列表中移除
                if directory in self.global_config["backup_dirs"]:
                    self.global_config["backup_dirs"].remove(directory)
                    self.save_global_config()
                    messagebox.showinfo("成功", "已从历史记录中移除此目录")
            return
            
        try:
            # 创建信息窗口
            info_window = tk.Toplevel(parent_window if parent_window else self.root)
            info_window.title("状态")
            info_window.geometry("400x300")
            info_window.resizable(False, False)
            info_window.transient(parent_window if parent_window else self.root)  # 设置为主窗口的临时窗口
            info_window.grab_set()  # 模态对话框
            
            # 居中显示
            info_window.update_idletasks()
            width = info_window.winfo_width()
            height = info_window.winfo_height()
            x = (info_window.winfo_screenwidth() // 2) - (width // 2)
            y = (info_window.winfo_screenheight() // 2) - (height // 2)
            info_window.geometry(f"{width}x{height}+{x}+{y}")
            
            # 创建框架
            frame = ttk.Frame(info_window, padding=(20, 20, 20, 0))
            frame.pack(fill=tk.BOTH, expand=True)
            
            # 添加标题
            # ttk.Label(frame, text="备份目录详细信息", font=("微软雅黑", 12, "bold")).pack(pady=(0, 20),anchor=tk.W)
            
            # 创建信息框架
            info_frame = ttk.Frame(frame)
            info_frame.pack(fill=tk.BOTH, expand=True)
            
            # 获取目录信息
            dir_stats = self.get_directory_stats(directory)
            
            # 显示基本信息
            height = 0
            row = 0
            ttk.Label(info_frame, text="目录路径:", anchor=tk.W, font=("微软雅黑", 10)).grid(row=row, column=0, sticky=tk.W, pady=height)
            ttk.Label(info_frame, text=directory, anchor=tk.W, wraplength=350).grid(row=row, column=1, sticky=tk.W, pady=height)
            
            row += 1
            ttk.Label(info_frame, text="创建时间:", anchor=tk.W, font=("微软雅黑", 10)).grid(row=row, column=0, sticky=tk.W, pady=height)
            ttk.Label(info_frame, text=dir_stats["created_time"], anchor=tk.W).grid(row=row, column=1, sticky=tk.W, pady=height)
            
            row += 1
            ttk.Label(info_frame, text="修改时间:", anchor=tk.W, font=("微软雅黑", 10)).grid(row=row, column=0, sticky=tk.W, pady=height)
            ttk.Label(info_frame, text=dir_stats["modified_time"], anchor=tk.W).grid(row=row, column=1, sticky=tk.W, pady=height)
            
            row += 1
            ttk.Label(info_frame, text="目录大小:", anchor=tk.W, font=("微软雅黑", 10)).grid(row=row, column=0, sticky=tk.W, pady=height)
            ttk.Label(info_frame, text=dir_stats["size"], anchor=tk.W).grid(row=row, column=1, sticky=tk.W, pady=height)
            
            row += 1
            ttk.Label(info_frame, text="备份数量:", anchor=tk.W, font=("微软雅黑", 10)).grid(row=row, column=0, sticky=tk.W, pady=height)
            ttk.Label(info_frame, text=str(dir_stats["backup_count"]), anchor=tk.W).grid(row=row, column=1, sticky=tk.W, pady=height)
            
            row += 1
            ttk.Label(info_frame, text="日志数量:", anchor=tk.W, font=("微软雅黑", 10)).grid(row=row, column=0, sticky=tk.W, pady=height)
            ttk.Label(info_frame, text=str(dir_stats["log_count"]), anchor=tk.W).grid(row=row, column=1, sticky=tk.W, pady=height)
            
            row += 1
            ttk.Label(info_frame, text="文件数量:", anchor=tk.W, font=("微软雅黑", 10)).grid(row=row, column=0, sticky=tk.W, pady=height)
            ttk.Label(info_frame, text=str(dir_stats["file_count"]), anchor=tk.W).grid(row=row, column=1, sticky=tk.W, pady=height)
            
            row += 1
            ttk.Label(info_frame, text="文件夹数量:", anchor=tk.W, font=("微软雅黑", 10)).grid(row=row, column=0, sticky=tk.W, pady=height)
            ttk.Label(info_frame, text=str(dir_stats["dir_count"]), anchor=tk.W).grid(row=row, column=1, sticky=tk.W, pady=height)
            
            # 添加关闭按钮
            ttk.Button(frame, text="关闭", command=info_window.destroy).pack(pady=20)
            
        except Exception as e:
            if parent_window:
                messagebox.showerror("错误", f"获取目录信息失败: {str(e)}")
            else:
                self.status_var.set(f"获取目录信息失败: {str(e)}")
    
    def get_directory_stats(self, directory):
        """获取目录的统计信息"""
        stats = {
            "created_time": "",
            "modified_time": "",
            "size": "0 B",
            "backup_count": 0,
            "log_count": 0,
            "file_count": 0,
            "dir_count": 0
        }
        
        try:
            # 获取创建和修改时间
            if os.path.exists(directory):
                created_timestamp = os.path.getctime(directory)
                modified_timestamp = os.path.getmtime(directory)
                
                created_time = datetime.fromtimestamp(created_timestamp).strftime("%Y-%m-%d %H:%M:%S")
                modified_time = datetime.fromtimestamp(modified_timestamp).strftime("%Y-%m-%d %H:%M:%S")
                
                stats["created_time"] = created_time
                stats["modified_time"] = modified_time
            
            # 计算目录大小和文件数量
            total_size = 0
            file_count = 0
            dir_count = 0
            
            for root, dirs, files in os.walk(directory):
                dir_count += len(dirs)
                for file in files:
                    file_path = os.path.join(root, file)
                    if os.path.exists(file_path) and os.path.isfile(file_path):
                        file_count += 1
                        total_size += os.path.getsize(file_path)
            
            # 转换大小为可读格式
            size_str = self.format_size(total_size)
            stats["size"] = size_str
            stats["file_count"] = file_count
            stats["dir_count"] = dir_count
            
            # 获取备份和日志数量
            config_file = os.path.join(directory, "config.json")
            if os.path.exists(config_file):
                with open(config_file, 'r', encoding='utf-8') as f:
                    config_data = json.load(f)
                    if "backups" in config_data:
                        stats["backup_count"] = len(config_data["backups"])
                    if "logs" in config_data:
                        stats["log_count"] = len(config_data["logs"])
        
        except Exception as e:
            print(f"获取目录统计信息失败: {str(e)}")
        
        return stats
    
    def format_size(self, size_bytes):
        """将字节大小转换为可读格式"""
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.2f} KB"
        elif size_bytes < 1024 * 1024 * 1024:
            return f"{size_bytes / (1024 * 1024):.2f} MB"
        else:
            return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"

    def validate_settings(self):
        source_path = self.source_entry.get()
        backup_dir = self.backup_dir_entry.get()

        if not source_path:
            messagebox.showerror("错误", "请选择源文件或文件夹")
            return False

        if not os.path.exists(source_path):
            messagebox.showerror("错误", "源文件或文件夹不存在")
            return False

        if not backup_dir:
            messagebox.showerror("错误", "请选择备份目录")
            return False

        # 更新全局配置
        self.global_config["source_path"] = source_path
        self.global_config["backup_dir"] = backup_dir
        # 检测是否为目录
        self.global_config["is_directory"] = os.path.isdir(source_path)
        
        # 更新合并配置以保持兼容性
        self.config["source_path"] = source_path
        self.config["backup_dir"] = backup_dir
        self.config["is_directory"] = self.global_config["is_directory"]

        try:
            interval = int(self.interval_spinbox.get())
            if interval <= 0:
                messagebox.showerror("错误", "备份间隔必须大于0")
                return False
            # 更新全局配置和合并配置
            self.global_config["interval"] = interval
            self.config["interval"] = interval
        except ValueError:
            messagebox.showerror("错误", "请输入有效的备份间隔")
            return False

        # 保存全局配置
        self.save_global_config()
        return True

    def check_old_config(self):
        """检查旧版本配置文件是否存在，并提示用户选择保留哪个配置文件"""
        if os.path.exists(self.old_config_file) and os.path.isfile(self.old_config_file):
            try:
                # 读取旧配置文件
                with open(self.old_config_file, 'r', encoding='utf-8') as f:
                    old_config = json.load(f)
                
                # 创建自定义对话框
                dialog = tk.Toplevel(self.root)
                dialog.title("旧版本config兼容")
                dialog.geometry("400x250")
                dialog.resizable(False, False)
                dialog.transient(self.root)  # 设置为主窗口的子窗口
                dialog.grab_set()  # 模态窗口
                
                # 将对话框居中显示
                self.center_window(dialog)
                
                # 创建内容框架
                content_frame = ttk.Frame(dialog, padding="20")
                content_frame.pack(fill=tk.BOTH, expand=True)
                
                # 提示信息
                ttk.Label(content_frame, text="检测到旧版本配置文件，请选择操作：", 
                          font=("微软雅黑", 10)).pack(pady=(0, 10),anchor="w")
                
                # 选项框架
                options_frame = ttk.Frame(content_frame)
                options_frame.pack(fill=tk.X, pady=5)
                
                # 配置选择
                config_var = tk.StringVar(value="old")
                ttk.Radiobutton(options_frame, text="使用旧版本配置", variable=config_var, 
                                value="old").pack(anchor=tk.W, pady=2)
                ttk.Radiobutton(options_frame, text="使用当前配置", variable=config_var, 
                                value="current").pack(anchor=tk.W, pady=2)
                
                # 历史记录选项
                history_var = tk.BooleanVar(value=True)
                ttk.Checkbutton(options_frame, text="迁移历史记录和日志到备份目录", 
                               variable=history_var).pack(anchor=tk.W, pady=(10, 5))
                
                # 删除选项
                delete_var = tk.BooleanVar(value=True)
                ttk.Checkbutton(options_frame, text="删除旧版本配置文件", 
                               variable=delete_var).pack(anchor=tk.W, pady=(5, 5))
                
                # 按钮框架
                button_frame = ttk.Frame(content_frame)
                button_frame.pack(fill=tk.X, pady=(15, 0))
                
                # 结果变量
                result = {"config": None, "history": None, "delete": None}
                
                # 确认按钮回调
                def on_confirm():
                    result["config"] = config_var.get()
                    result["history"] = history_var.get()
                    result["delete"] = delete_var.get()
                    dialog.destroy()
                
                # 取消按钮回调
                def on_cancel():
                    dialog.destroy()
                
                # 添加按钮
                ttk.Button(button_frame, text="取消", command=on_cancel, width=10).pack(side=tk.RIGHT, padx=5)
                ttk.Button(button_frame, text="确认", command=on_confirm, width=10).pack(side=tk.RIGHT, padx=5)
                
                
                # 等待对话框关闭
                self.root.wait_window(dialog)
                
                # 处理用户选择
                if "config" in result and result["config"] is not None:
                    if result["config"] == "old":  # 用户选择使用旧版本配置
                        # 更新全局配置（仅包括全局设置部分）
                        for key, value in old_config.items():
                            if key in self.global_config:
                                self.global_config[key] = value
                        
                        # 保存全局配置
                        self.save_global_config()
                        
                        # 如果用户选择迁移历史记录和日志，并且有备份目录
                        if result["history"] and self.global_config["backup_dir"] and os.path.exists(self.global_config["backup_dir"]):
                            # 更新备份配置文件路径
                            self.backup_config_file = os.path.join(self.global_config["backup_dir"], "config.json")
                            
                            # 迁移历史记录和日志
                            if "backups" in old_config and old_config["backups"]:
                                self.backup_config["backups"] = old_config["backups"]
                                self.config["backups"] = old_config["backups"]
                            
                            if "logs" in old_config and old_config["logs"]:
                                self.backup_config["logs"] = old_config["logs"]
                                self.config["logs"] = old_config["logs"]
                            
                            # 保存备份配置
                            self.save_backup_config()
                            messagebox.showinfo("配置迁移", "已成功导入旧版本配置并迁移历史记录和日志到备份目录")
                        else:
                            messagebox.showinfo("配置迁移", "已成功导入旧版本配置")
                    
                    # 根据用户选择删除旧配置文件
                    if result["delete"]:
                        # 删除旧配置文件及其目录
                        os.remove(self.old_config_file)
                        old_config_dir = os.path.dirname(self.old_config_file)
                        if os.path.exists(old_config_dir) and len(os.listdir(old_config_dir)) == 0:
                            os.rmdir(old_config_dir)
                        messagebox.showinfo("配置清理", "已删除旧版本配置文件")
            
            except Exception as e:
                messagebox.showerror("错误", f"处理旧版本配置文件时出错: {str(e)}")
    
    def load_global_config(self):
        """加载全局配置文件"""
        if os.path.exists(self.global_config_file):
            try:
                with open(self.global_config_file, 'r', encoding='utf-8') as f:
                    loaded_config = json.load(f)
                    # 更新全局配置，保留默认值
                    for key, value in loaded_config.items():
                        if key in self.global_config:
                            self.global_config[key] = value
                    
                    # 确保backup_dirs字段存在（兼容旧版本配置）
                    if "backup_dirs" not in loaded_config and "backup_dir" in loaded_config and loaded_config["backup_dir"]:
                        # 如果配置中有备份目录但没有历史记录，则添加当前备份目录到历史记录中
                        self.global_config["backup_dirs"] = [loaded_config["backup_dir"]]
                    
                    # 更新合并配置
                    self.config.update(self.global_config)
            except Exception as e:
                messagebox.showerror("错误", f"加载全局配置失败: {str(e)}")
    
    def save_global_config(self):
        """保存全局配置文件"""
        try:
            # 确保目录存在
            os.makedirs(os.path.dirname(self.global_config_file), exist_ok=True)
            with open(self.global_config_file, 'w', encoding='utf-8') as f:
                json.dump(self.global_config, f, ensure_ascii=False, indent=2)
        except Exception as e:
            messagebox.showerror("错误", f"保存全局配置失败: {str(e)}")
    
    def load_backup_config(self):
        """加载备份目录特定的配置文件"""
        if not self.global_config["backup_dir"]:
            return
            
        self.backup_config_file = os.path.join(self.global_config["backup_dir"], "config.json")
        
        if os.path.exists(self.backup_config_file):
            try:
                with open(self.backup_config_file, 'r', encoding='utf-8') as f:
                    loaded_config = json.load(f)
                    # 更新备份配置
                    for key, value in loaded_config.items():
                        if key in self.backup_config:
                            self.backup_config[key] = value
                    
                    # 更新合并配置
                    self.config.update(self.backup_config)
            except Exception as e:
                messagebox.showerror("错误", f"加载备份目录配置失败: {str(e)}")
    
    def save_backup_config(self):
        """保存备份目录特定的配置文件"""
        if not self.global_config["backup_dir"] or not os.path.exists(self.global_config["backup_dir"]):
            self.status_var.set("未设置备份目录或目录不存在，无法保存配置")
            return
            
        if not self.backup_config_file:
            self.backup_config_file = os.path.join(self.global_config["backup_dir"], "config.json")
            
        try:
            with open(self.backup_config_file, 'w', encoding='utf-8') as f:
                json.dump(self.backup_config, f, ensure_ascii=False, indent=2)
            # 更新状态栏
            self.status_var.set(f"已保存备份配置到: {self.backup_config_file}")
        except Exception as e:
            messagebox.showerror("错误", f"保存备份目录配置失败: {str(e)}")
            self.status_var.set(f"保存备份目录配置失败: {str(e)}")
    
    def load_config(self):
        """兼容旧版本的配置加载方法"""
        self.load_global_config()
        self.load_backup_config()

    def save_config(self):
        """兼容旧版本的配置保存方法"""
        # 从合并配置中更新全局配置和备份配置
        for key in self.global_config:
            if key in self.config:
                self.global_config[key] = self.config[key]
                
        for key in self.backup_config:
            if key in self.config:
                self.backup_config[key] = self.config[key]
        
        # 保存配置
        self.save_global_config()
        self.save_backup_config()
        
        # 更新状态栏
        self.status_var.set("已保存所有配置文件")
            
    def add_log(self, action_type, backup_info):
        """添加日志记录
        
        参数:
            action_type: 操作类型，可以是 'backup', 'restore', 'delete', 'restore_deleted', 'rollback'
            backup_info: 备份信息字典
        """
        log_entry = {
            "timestamp": datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:19],  # 取前19位，包含到毫秒级别
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "action": action_type,
            "backup_info": copy.deepcopy(backup_info)
        }
        
        # 添加到备份配置中的日志列表
        self.backup_config["logs"].append(log_entry)
        # 更新合并配置以保持兼容性
        self.config["logs"] = self.backup_config["logs"]
        # 保存备份目录配置
        self.save_backup_config()
        
        # 更新状态栏
        action_map = {
            "backup": "备份",
            "restore": "还原",
            "delete": "删除",
            "restore_deleted": "恢复删除的备份",
            "rollback": "回溯操作"
        }
        action_text = action_map.get(action_type, action_type)
        self.status_var.set(f"已记录{action_text}操作到日志")
    
    def show_logs(self):
        """显示日志窗口"""
        # 创建日志窗口
        log_window = tk.Toplevel(self.root)
        log_window.title("日志")
        log_window.geometry("500x500")
        log_window.resizable(True, True)
        log_window.transient(self.root)  # 设置为主窗口的子窗口
        
        # 将窗口居中显示
        self.center_window(log_window)
        
        # # 更新状态栏
        # self.status_var.set("已打开日志窗口")
        
        # 创建主框架
        main_frame = ttk.Frame(log_window, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # 创建日志列表的树形视图
        columns = ("时间", "操作类型", "文件名")
        self.log_tree = ttk.Treeview(main_frame, columns=columns, show="headings")
        for col in columns:
            self.log_tree.heading(col, text=col)
        self.log_tree.column("时间", width=150)
        self.log_tree.column("操作类型", width=100)
        self.log_tree.column("文件名", width=200)
        self.log_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # 添加滚动条
        scrollbar = ttk.Scrollbar(main_frame, orient=tk.VERTICAL, command=self.log_tree.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.log_tree.configure(yscrollcommand=scrollbar.set)
        
        # 添加日志记录到列表
        for log in reversed(self.backup_config["logs"]):
            action_map = {
                "backup": "备份",
                "restore": "还原",
                "delete": "删除",
                "restore_deleted": "恢复删除的备份",
                "rollback": "回溯操作"
            }
            action_text = action_map.get(log["action"], log["action"])
            
            backup_info = log["backup_info"]
            is_directory = backup_info.get("is_directory", False)
            type_indicator = "[文件夹]" if is_directory else "[文件]"
            filename = os.path.basename(backup_info["backup_path"])
            display_name = f"{type_indicator} {filename}"
            
            self.log_tree.insert("", tk.END, values=(log["date"], action_text, display_name),
                                tags=(log["timestamp"],))
        
        # 添加右键菜单
        self.log_context_menu = tk.Menu(log_window, tearoff=0)
        self.log_context_menu.add_command(label="状态", command=self.view_file_status_from_log)
        self.log_context_menu.add_command(label="回溯", command=self.rollback_log_action)
        
        self.log_tree.bind("<Button-3>", self.show_log_context_menu)
        
        # 添加关闭按钮
        button_frame = ttk.Frame(log_window)
        button_frame.pack(fill=tk.X, pady=10)
        ttk.Button(button_frame, text="关闭", command=log_window.destroy).pack(side=tk.RIGHT, padx=10)
    
    def show_log_context_menu(self, event):
        """显示日志右键菜单"""
        # 获取选中的项
        item = self.log_tree.identify_row(event.y)
        if item:
            self.log_tree.selection_set(item)
            self.log_context_menu.post(event.x_root, event.y_root)
    
    def view_file_status_from_log(self):
        """从日志中查看文件状态"""
        selected = self.log_tree.selection()
        if not selected:
            messagebox.showinfo("提示", "请先选择一个日志记录")
            return
        
        # 获取所选日志的时间戳
        timestamp = self.log_tree.item(selected[0], "tags")[0]
        
        # 查找对应的日志信息
        log_entry = None
        for log in self.config["logs"]:
            if log["timestamp"] == timestamp:
                log_entry = log
                break
        
        if not log_entry:
            messagebox.showerror("错误", "找不到日志信息")
            return
        
        backup_info = log_entry["backup_info"]
        backup_path = backup_info["backup_path"]
        
        # 检查备份文件是否存在
        if not os.path.exists(backup_path):
            messagebox.showerror("错误", "备份文件已不存在")
            return
        
        # 显示文件信息窗口
        self.show_file_info(backup_info, log_entry["action"])
    
    def rollback_log_action(self):
        """回溯日志中的操作"""
        selected = self.log_tree.selection()
        if not selected:
            messagebox.showinfo("提示", "请先选择一个日志记录")
            return
        
        # 获取所选日志的时间戳
        timestamp = self.log_tree.item(selected[0], "tags")[0]
        
        # 查找对应的日志信息
        log_entry = None
        for log in self.config["logs"]:
            if log["timestamp"] == timestamp:
                log_entry = log
                break
        
        if not log_entry:
            messagebox.showerror("错误", "找不到日志信息")
            return
        
        action_type = log_entry["action"]
        backup_info = log_entry["backup_info"]
        
        # 根据操作类型执行不同的回溯操作
        if action_type == "delete":
            # 对于删除操作，恢复被删除的备份
            self.rollback_delete_action(backup_info)
        elif action_type == "backup" or action_type == "restore":
            # 对于备份或还原操作，恢复到该操作时的文件状态
            self.rollback_to_file_state(backup_info)
    
    def rollback_delete_action(self, backup_info):
        """回溯删除操作，恢复被删除的备份"""
        # 检查备份路径是否已存在
        backup_path = backup_info["backup_path"]
        if os.path.exists(backup_path):
            messagebox.showinfo("提示", "该备份文件已存在，无需恢复")
            return
        
        # 确认恢复
        confirm = messagebox.askyesno("确认", "确定要恢复这个被删除的备份吗？")
        if not confirm:
            return
        
        try:
            # 获取备份信息
            is_directory = backup_info.get("is_directory", False)
            original_path = backup_info["original"]
            timestamp = backup_info["timestamp"]
            date = backup_info["date"]
            
            # 重新创建备份目录结构
            backup_dir = os.path.dirname(backup_path)
            if not os.path.exists(backup_dir):
                os.makedirs(backup_dir)
            
            # 从原始文件创建新的备份
            if os.path.exists(original_path):
                if is_directory:
                    shutil.copytree(original_path, backup_path)
                else:
                    shutil.copy2(original_path, backup_path)
                
                # 将备份信息重新添加到配置中
                self.config["backups"].append(backup_info)
                
                # 添加日志记录
                self.add_log("restore_deleted", backup_info)
                
                self.save_config()
                self.update_backup_list()
                
                messagebox.showinfo("成功", "已恢复被删除的备份")
                self.status_var.set(f"已恢复被删除的备份: {os.path.basename(backup_path)}")
            else:
                messagebox.showerror("错误", "原始文件不存在，无法恢复备份")
        except Exception as e:
            messagebox.showerror("错误", f"恢复备份失败: {str(e)}")
    
    def rollback_to_file_state(self, backup_info):
        """回溯到备份或还原操作时的文件状态"""
        backup_path = backup_info["backup_path"]
        
        # 检查备份文件是否存在
        if not os.path.exists(backup_path):
            messagebox.showerror("错误", "备份文件已不存在，无法回溯")
            return
        
        # 确认回溯
        confirm = messagebox.askyesno("确认", "回溯将使用此备份覆盖当前存档，确定要继续吗？")
        if not confirm:
            return
        
        try:
            # 先备份当前文件或文件夹
            self.perform_backup()
            
            # 获取是否为目录的信息
            is_directory = backup_info.get("is_directory", False)
            original_path = backup_info["original"]
            
            # 如果目标路径存在，先删除
            if os.path.exists(original_path):
                if is_directory:
                    shutil.rmtree(original_path)
                else:
                    os.remove(original_path)
            
            # 还原备份
            if is_directory:
                shutil.copytree(backup_path, original_path)
            else:
                shutil.copy2(backup_path, original_path)
            
            # 添加日志记录
            self.add_log("rollback", backup_info)
            
            messagebox.showinfo("成功", "已回溯到所选操作时的文件状态")
            self.status_var.set(f"已回溯: {os.path.basename(backup_path)}")
        except Exception as e:
            messagebox.showerror("错误", f"回溯失败: {str(e)}")
    
    def show_file_info(self, backup_info, action_type):
        """显示文件信息窗口"""
        # 创建文件信息窗口
        info_window = tk.Toplevel(self.root)
        info_window.title("文件状态信息")
        info_window.geometry("600x400")
        info_window.resizable(True, True)
        info_window.transient(self.root)  # 设置为主窗口的子窗口
        
        # 将窗口居中显示
        self.center_window(info_window)
        
        # 创建主框架
        main_frame = ttk.Frame(info_window, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # 显示文件基本信息
        info_frame = ttk.LabelFrame(main_frame, text="文件信息", padding="10")
        info_frame.pack(fill=tk.X, pady=5)
        
        # 操作类型
        action_map = {
            "backup": "备份",
            "restore": "还原",
            "delete": "删除"
        }
        action_text = action_map.get(action_type, action_type)
        
        ttk.Label(info_frame, text=f"操作类型: {action_text}").grid(row=0, column=0, sticky=tk.W, pady=2)
        ttk.Label(info_frame, text=f"操作时间: {backup_info['date']}").grid(row=1, column=0, sticky=tk.W, pady=2)
        
        # 文件类型和路径
        is_directory = backup_info.get("is_directory", False)
        type_text = "文件夹" if is_directory else "文件"
        ttk.Label(info_frame, text=f"类型: {type_text}").grid(row=2, column=0, sticky=tk.W, pady=2)
        
        # 原始路径
        ttk.Label(info_frame, text="原始路径:").grid(row=3, column=0, sticky=tk.W, pady=2)
        original_entry = ttk.Entry(info_frame, width=50)
        original_entry.grid(row=3, column=1, sticky=tk.W + tk.E, padx=5, pady=2)
        original_entry.insert(0, backup_info["original"])
        original_entry.config(state="readonly")
        
        # 备份路径
        ttk.Label(info_frame, text="备份路径:").grid(row=4, column=0, sticky=tk.W, pady=2)
        backup_entry = ttk.Entry(info_frame, width=50)
        backup_entry.grid(row=4, column=1, sticky=tk.W + tk.E, padx=5, pady=2)
        backup_entry.insert(0, backup_info["backup_path"])
        backup_entry.config(state="readonly")
        
        # 添加文件内容预览（如果是文本文件）
        if not is_directory and os.path.exists(backup_info["backup_path"]):
            try:
                # 尝试读取文件内容（仅适用于文本文件）
                with open(backup_info["backup_path"], "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read(2000)  # 只读取前2000个字符
                
                # 创建内容预览区域
                content_frame = ttk.LabelFrame(main_frame, text="文件内容预览", padding="10")
                content_frame.pack(fill=tk.BOTH, expand=True, pady=5)
                
                content_text = tk.Text(content_frame, wrap=tk.WORD, height=10)
                content_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
                
                # 添加滚动条
                scrollbar = ttk.Scrollbar(content_frame, orient=tk.VERTICAL, command=content_text.yview)
                scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
                content_text.configure(yscrollcommand=scrollbar.set)
                
                content_text.insert(tk.END, content)
                content_text.config(state=tk.DISABLED)  # 设置为只读
            except:
                # 如果不是文本文件，显示提示信息
                ttk.Label(main_frame, text="无法预览非文本文件内容").pack(pady=10)
        elif is_directory:
            # 如果是目录，显示目录内容
            dir_frame = ttk.LabelFrame(main_frame, text="目录内容", padding="10")
            dir_frame.pack(fill=tk.BOTH, expand=True, pady=5)
            
            dir_text = tk.Text(dir_frame, wrap=tk.WORD, height=10)
            dir_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
            
            # 添加滚动条
            scrollbar = ttk.Scrollbar(dir_frame, orient=tk.VERTICAL, command=dir_text.yview)
            scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
            dir_text.configure(yscrollcommand=scrollbar.set)
            
            # 列出目录内容
            try:
                dir_content = os.listdir(backup_info["backup_path"])
                for item in dir_content:
                    item_path = os.path.join(backup_info["backup_path"], item)
                    if os.path.isdir(item_path):
                        dir_text.insert(tk.END, f"[目录] {item}\n")
                    else:
                        dir_text.insert(tk.END, f"[文件] {item}\n")
            except Exception as e:
                dir_text.insert(tk.END, f"无法读取目录内容: {str(e)}")
            
            dir_text.config(state=tk.DISABLED)  # 设置为只读
        
        # 添加关闭按钮
        button_frame = ttk.Frame(info_window)
        button_frame.pack(fill=tk.X, pady=10)
        ttk.Button(button_frame, text="关闭", command=info_window.destroy).pack(side=tk.RIGHT, padx=10)
    
    def center_window(self, window):
        """将窗口居中显示在屏幕上"""
        window.update_idletasks()
        width = window.winfo_width()
        height = window.winfo_height()
        screen_width = window.winfo_screenwidth()
        screen_height = window.winfo_screenheight()
        x = (screen_width - width) // 2
        y = (screen_height - height) // 2
        window.geometry(f"{width}x{height}+{x}+{y}")


if __name__ == "__main__":
    root = tk.Tk()
    app = AutoSaveBackupTool(root)
    root.mainloop()