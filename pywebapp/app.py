import os
import sys
import webview
import json
import shutil
from datetime import datetime
import threading
import time
import copy


class AutoSaveBackupTool:
    VERSION = "v1.0.0"
    
    ANNOUNCEMENTS = [
        {
            "content": "Web版本发布！保留了所有原版功能，包括文件/文件夹备份、自动备份、日志记录等。",
            "date": "2025-05-24"
        },
        {
            "content": "v0.6.2版本更新：状态栏状态数量更新、备份文件名时间戳精度提升至毫秒，修复了历史备份目录列表中删除某个目录后还会显示的问题",
            "date": "2025-05-08"
        }
    ]
    
    def __init__(self):
        self.global_config = {
            "source_path": "",
            "is_directory": False,
            "backup_dir": "",
            "backup_dirs": [],
            "interval": 5,
        }
        
        self.backup_config = {
            "backups": [],
            "logs": []
        }
        
        self.global_config_file = os.path.join(os.path.expanduser("~"), "autoSaveBackupTool_config.json")
        self.backup_config_file = None
        
        self.check_old_config()
        self.load_global_config()
        
        self.is_running = False
        self.auto_backup_timer = None
    
    def check_old_config(self):
        old_config_file = os.path.join(os.path.expanduser("~"), ".game_backup_tool", "config.json")
        if os.path.exists(old_config_file):
            try:
                with open(old_config_file, 'r', encoding='utf-8') as f:
                    old_config = json.load(f)
                
                for key, value in old_config.items():
                    if key in self.global_config:
                        self.global_config[key] = value
                
                if self.global_config["backup_dir"]:
                    if "backup_dirs" not in self.global_config:
                        self.global_config["backup_dirs"] = []
                    if self.global_config["backup_dir"] not in self.global_config["backup_dirs"]:
                        self.global_config["backup_dirs"].append(self.global_config["backup_dir"])
                
                self.save_global_config()
            except Exception as e:
                print(f"处理旧配置失败: {e}")
    
    def load_global_config(self):
        if os.path.exists(self.global_config_file):
            try:
                with open(self.global_config_file, 'r', encoding='utf-8') as f:
                    loaded_config = json.load(f)
                    for key, value in loaded_config.items():
                        if key in self.global_config:
                            self.global_config[key] = value
                    
                    if "backup_dirs" not in loaded_config and "backup_dir" in loaded_config:
                        self.global_config["backup_dirs"] = [loaded_config["backup_dir"]]
            except Exception as e:
                print(f"加载配置失败: {e}")
    
    def save_global_config(self):
        try:
            os.makedirs(os.path.dirname(self.global_config_file), exist_ok=True)
            with open(self.global_config_file, 'w', encoding='utf-8') as f:
                json.dump(self.global_config, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"保存配置失败: {e}")
    
    def load_backup_config(self):
        if not self.global_config["backup_dir"]:
            return
        
        self.backup_config_file = os.path.join(self.global_config["backup_dir"], "config.json")
        
        if os.path.exists(self.backup_config_file):
            try:
                with open(self.backup_config_file, 'r', encoding='utf-8') as f:
                    loaded_config = json.load(f)
                    for key, value in loaded_config.items():
                        if key in self.backup_config:
                            self.backup_config[key] = value
            except Exception as e:
                print(f"加载备份配置失败: {e}")
    
    def save_backup_config(self):
        if not self.global_config["backup_dir"]:
            return
        
        if not self.backup_config_file:
            self.backup_config_file = os.path.join(self.global_config["backup_dir"], "config.json")
        
        try:
            os.makedirs(self.global_config["backup_dir"], exist_ok=True)
            with open(self.backup_config_file, 'w', encoding='utf-8') as f:
                json.dump(self.backup_config, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"保存备份配置失败: {e}")
    
    def select_source(self, is_directory=False):
        result = None
        if is_directory:
            result = window.create_file_dialog(webview.FOLDER_DIALOG)[0]
        else:
            result = window.create_file_dialog(webview.OPEN_DIALOG)[0]
        
        if result:
            self.global_config["source_path"] = result
            self.global_config["is_directory"] = is_directory
            self.save_global_config()
            return {"type": "directory" if is_directory else "file", "path": result}
        return None
    
    def select_backup_dir(self):
        result = window.create_file_dialog(webview.FOLDER_DIALOG)[0]
        if result:
            if self.global_config["backup_dir"] and self.global_config["backup_dir"] != result:
                self.save_backup_config()
            
            self.global_config["backup_dir"] = result
            
            if result not in self.global_config["backup_dirs"]:
                self.global_config["backup_dirs"].append(result)
            
            self.save_global_config()
            
            self.backup_config_file = os.path.join(result, "config.json")
            if os.path.exists(self.backup_config_file):
                self.load_backup_config()
            else:
                self.backup_config = {"backups": [], "logs": []}
                self.save_backup_config()
            
            return result
        return None
    
    def perform_backup(self):
        source_path = self.global_config["source_path"]
        backup_dir = self.global_config["backup_dir"]
        is_directory = self.global_config["is_directory"]
        
        os.makedirs(backup_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:19]
        source_name = os.path.basename(source_path)
        backup_path = os.path.join(backup_dir, f"{source_name}_{timestamp}")
        
        if is_directory:
            shutil.copytree(source_path, backup_path)
        else:
            shutil.copy2(source_path, backup_path)
        
        backup_info = {
            "timestamp": timestamp,
            "original": source_path,
            "backup_path": backup_path,
            "is_directory": is_directory,
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        self.backup_config["backups"].append(backup_info)
        self.add_log("backup", backup_info)
        self.save_backup_config()
        
        return backup_info
    
    def add_log(self, action_type, backup_info):
        log_entry = {
            "timestamp": datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:19],
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "action": action_type,
            "backup_info": copy.deepcopy(backup_info)
        }
        
        self.backup_config["logs"].append(log_entry)
        self.save_backup_config()
    
    def restore_backup(self, timestamp):
        for backup in self.backup_config["backups"]:
            if backup["timestamp"] == timestamp:
                self.perform_backup()
                
                is_directory = backup.get("is_directory", False)
                original_path = backup["original"]
                backup_path = backup["backup_path"]
                
                if os.path.exists(original_path):
                    if is_directory:
                        shutil.rmtree(original_path)
                    else:
                        os.remove(original_path)
                
                if is_directory:
                    shutil.copytree(backup_path, original_path)
                else:
                    shutil.copy2(backup_path, original_path)
                
                self.add_log("restore", backup)
                return True
        return False
    
    def delete_backup(self, timestamp):
        for i, backup in enumerate(self.backup_config["backups"]):
            if backup["timestamp"] == timestamp:
                if os.path.exists(backup["backup_path"]):
                    if backup.get("is_directory", False):
                        shutil.rmtree(backup["backup_path"])
                    else:
                        os.remove(backup["backup_path"])
                
                self.backup_config["backups"].pop(i)
                self.add_log("delete", backup)
                self.save_backup_config()
                return True
        return False
    
    def get_directory_stats(self, directory):
        stats = {
            "created_time": "",
            "modified_time": "",
            "size": "0 B",
            "file_count": 0,
            "dir_count": 0
        }
        
        try:
            if os.path.exists(directory):
                created_timestamp = os.path.getctime(directory)
                modified_timestamp = os.path.getmtime(directory)
                
                stats["created_time"] = datetime.fromtimestamp(created_timestamp).strftime("%Y-%m-%d %H:%M:%S")
                stats["modified_time"] = datetime.fromtimestamp(modified_timestamp).strftime("%Y-%m-%d %H:%M:%S")
                
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
                
                stats["size"] = self.format_size(total_size)
                stats["file_count"] = file_count
                stats["dir_count"] = dir_count
        except Exception as e:
            print(f"获取目录统计失败: {e}")
        
        return stats
    
    def format_size(self, size_bytes):
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.2f} KB"
        elif size_bytes < 1024 * 1024 * 1024:
            return f"{size_bytes / (1024 * 1024):.2f} MB"
        else:
            return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"


class Api:
    def __init__(self, tool):
        self.tool = tool
    
    def get_version(self):
        return self.tool.VERSION
    
    def get_announcements(self):
        return self.tool.ANNOUNCEMENTS
    
    def get_global_config(self):
        return self.tool.global_config
    
    def get_backup_config(self):
        return self.tool.backup_config
    
    def select_source(self, is_directory):
        return self.tool.select_source(is_directory)
    
    def select_backup_dir(self):
        return self.tool.select_backup_dir()
    
    def save_global_config(self, config):
        self.tool.global_config.update(config)
        self.tool.save_global_config()
    
    def perform_backup(self):
        return self.tool.perform_backup()
    
    def restore_backup(self, timestamp):
        return self.tool.restore_backup(timestamp)
    
    def delete_backup(self, timestamp):
        return self.tool.delete_backup(timestamp)
    
    def get_directory_stats(self, directory):
        return self.tool.get_directory_stats(directory)
    
    def path_exists(self, path):
        return os.path.exists(path)
    
    def remove_directory(self, path):
        if os.path.exists(path):
            shutil.rmtree(path)
            return True
        return False
    
    def remove_file(self, path):
        if os.path.exists(path):
            os.remove(path)
            return True
        return False
    
    def show_message(self, title, message):
        window.destroy()


if __name__ == "__main__":
    tool = AutoSaveBackupTool()
    
    if tool.global_config["backup_dir"]:
        tool.load_backup_config()
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    html_path = os.path.join(base_dir, "index.html")
    
    api = Api(tool)
    
    window = webview.create_window(
        title=f"ASBT · 自动存档备份工具 {tool.VERSION} | by@Yanxiao",
        html=html_path if os.path.exists(html_path) else "<h1>请确保 index.html 文件存在于应用程序目录中</h1>",
        width=700,
        height=650,
        resizable=True,
        min_size=(650, 600)
    )
    
    webview.start(debug=False, func=api)
