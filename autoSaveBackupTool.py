import os
import shutil
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from datetime import datetime
import json
import time
import threading
import copy


class GameSaveBackupTool:
    
    VERSION = "v0.4"
    # 公告信息常量，直接存储在源代码中
    ANNOUNCEMENTS = [
        {
            "content": "右键备份列表可以还原与删除",
            "date": "2025-04-20"
        },
        {
            "content": "v0.2版本更新：支持文件夹备份，可以备份整个游戏存档目录",
            "date": "2025-04-28"
        },
        {
            "content": "v0.4版本更新：新增日志与日志详情，右键日志即可进行回溯操作。优化窗口位置",
            "date": "2025-04-29"
        }
    ]
    
    def __init__(self, root):
        self.root = root
        self.root.title(f"游戏存档备份工具 {self.VERSION} | by@Yanxiao")
        self.root.geometry("700x620")
        self.root.resizable(True, True)
        
        # 将窗口居中显示
        self.center_window(self.root)

        # 配置文件路径
        self.config_dir = os.path.join(os.path.expanduser("~"), ".game_backup_tool")
        self.config_file = os.path.join(self.config_dir, "config.json")

        # 创建配置目录
        if not os.path.exists(self.config_dir):
            os.makedirs(self.config_dir)

        # 默认配置
        self.config = {
            "source_path": "",
            "is_directory": False,
            "backup_dir": "",
            "interval": 5,  # 默认备份间隔（分钟）
            "backups": [],
            "logs": []  # 添加日志记录列表
        }

        # 加载配置
        self.load_config()

        # 备份线程控制
        self.backup_thread = None
        self.is_running = False

        # 创建界面
        self.create_widgets()

        # 更新备份列表
        self.update_backup_list()

    def create_widgets(self):
        # 创建主框架
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # 公告区域 - 简化为横向标题栏
        announcement_frame = ttk.Frame(main_frame)
        announcement_frame.pack(fill=tk.X, pady=2)
        
        # 公告标签和内容
        self.announcement_var = tk.StringVar()
        self.announcement_var.set("暂无公告")
        announcement_label = ttk.Label(announcement_frame, textvariable=self.announcement_var, anchor=tk.W)
        announcement_label.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5, pady=2)
        
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
        self.backup_dir_entry = ttk.Entry(file_frame, width=50)
        self.backup_dir_entry.grid(row=1, column=1, sticky=tk.W + tk.E, padx=5, pady=5)
        self.backup_dir_entry.insert(0, self.config["backup_dir"])
        ttk.Button(file_frame, text="浏览", command=self.select_backup_dir).grid(row=1, column=2, padx=5, pady=5)

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

        self.backup_tree.bind("<Button-3>", self.show_context_menu)

        # 添加日志按钮
        log_btn = ttk.Button(main_frame, text="查看日志", command=self.show_logs,width=10)
        log_btn.pack( side=tk.RIGHT, padx=(30, 10), pady=2)
        
        # 状态栏
        self.status_var = tk.StringVar()
        self.status_var.set(f"准备就绪，当前版本 {self.VERSION}")
        status_bar = ttk.Label(main_frame, textvariable=self.status_var, relief=tk.SUNKEN, anchor=tk.W)
        status_bar.pack(fill=tk.X, pady=5)
        
        # 更新公告显示
        self.update_announcement_display()

    def select_source(self, is_directory=False):
        if is_directory:
            path = filedialog.askdirectory(title="选择要备份的文件夹")
        else:
            path = filedialog.askopenfilename(title="选择要备份的文件")
            
        if path:
            self.source_entry.delete(0, tk.END)
            self.source_entry.insert(0, path)
            self.config["source_path"] = path
            self.config["is_directory"] = is_directory
            self.save_config()

    def select_backup_dir(self):
        directory = filedialog.askdirectory(title="选择备份目录")
        if directory:
            self.backup_dir_entry.delete(0, tk.END)
            self.backup_dir_entry.insert(0, directory)
            self.config["backup_dir"] = directory
            self.save_config()
            self.update_backup_list()

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
                self.config["interval"] = interval
                self.save_config()
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
                interval_seconds = self.config["interval"] * 60
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
            messagebox.showinfo("成功", "手动备份完成")
        except Exception as e:
            messagebox.showerror("错误", f"备份失败: {str(e)}")

    def perform_backup(self):
        source_path = self.config["source_path"]
        backup_dir = self.config["backup_dir"]
        is_directory = self.config["is_directory"]

        # 确保目录存在
        if not os.path.exists(backup_dir):
            os.makedirs(backup_dir)

        # 生成带时间戳的文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
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

        self.config["backups"].append(backup_info)
        
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
        dialog.geometry("500x300")
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
        for backup in reversed(self.config["backups"]):
            if os.path.exists(backup["backup_path"]):
                # 添加类型标识
                is_directory = backup.get("is_directory", False)
                type_indicator = "[文件夹]" if is_directory else "[文件]"
                filename = os.path.basename(backup["backup_path"])
                display_name = f"{type_indicator} {filename}"
                
                self.backup_tree.insert("", tk.END, values=(backup["date"], display_name),
                                        tags=(backup["timestamp"],))

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
        for backup in self.config["backups"]:
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
        for i, backup in enumerate(self.config["backups"]):
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
            backup_info = self.config["backups"][backup_index]
            is_directory = backup_info.get("is_directory", False)

            # 删除备份文件或文件夹
            if os.path.exists(backup_info["backup_path"]):
                if is_directory:
                    shutil.rmtree(backup_info["backup_path"])
                else:
                    os.remove(backup_info["backup_path"])

            # 从配置中移除
            backup_info = self.config["backups"].pop(backup_index)
            self.save_config()

            # 添加日志记录
            self.add_log("delete", backup_info)

            # 更新列表
            self.update_backup_list()
            messagebox.showinfo("成功", "备份已删除")
        except Exception as e:
            messagebox.showerror("错误", f"删除失败: {str(e)}")

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

        # 更新配置
        self.config["source_path"] = source_path
        self.config["backup_dir"] = backup_dir
        # 检测是否为目录
        self.config["is_directory"] = os.path.isdir(source_path)

        try:
            interval = int(self.interval_spinbox.get())
            if interval <= 0:
                messagebox.showerror("错误", "备份间隔必须大于0")
                return False
            self.config["interval"] = interval
        except ValueError:
            messagebox.showerror("错误", "请输入有效的备份间隔")
            return False

        self.save_config()
        return True

    def load_config(self):
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    loaded_config = json.load(f)
                    # 更新配置，保留默认值
                    for key, value in loaded_config.items():
                        self.config[key] = value
            except Exception as e:
                messagebox.showerror("错误", f"加载配置失败: {str(e)}")

    def save_config(self):
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, ensure_ascii=False, indent=2)
        except Exception as e:
            messagebox.showerror("错误", f"保存配置失败: {str(e)}")
            
    def add_log(self, action_type, backup_info):
        """添加日志记录
        
        参数:
            action_type: 操作类型，可以是 'backup', 'restore', 'delete', 'restore_deleted', 'rollback'
            backup_info: 备份信息字典
        """
        log_entry = {
            "timestamp": datetime.now().strftime("%Y%m%d_%H%M%S"),
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "action": action_type,
            "backup_info": copy.deepcopy(backup_info)
        }
        
        self.config["logs"].append(log_entry)
        self.save_config()
    
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
        for log in reversed(self.config["logs"]):
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
    app = GameSaveBackupTool(root)
    root.mainloop()