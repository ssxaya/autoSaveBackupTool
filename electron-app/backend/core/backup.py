#!/usr/bin/env python3
import sys
import os
import json
import shutil
from datetime import datetime
from typing import Optional, Dict, List, Any
import copy

class BackupCore:
    """备份核心业务逻辑 - 与 UI 完全分离"""

    VERSION = "1.0.0"

    ANNOUNCEMENTS = [
        {"content": "Electron版本发布，支持Web界面", "date": "2025-05-24"}
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

        self.global_config_file = os.path.join(
            os.path.expanduser("~"),
            "autoSaveBackupTool_electron_config.json"
        )
        self.backup_config_file = None

        self.is_running = False
        self.backup_thread = None

        self.load_global_config()

    def load_global_config(self) -> bool:
        """加载全局配置"""
        try:
            if os.path.exists(self.global_config_file):
                with open(self.global_config_file, 'r', encoding='utf-8') as f:
                    loaded_config = json.load(f)
                    for key, value in loaded_config.items():
                        if key in self.global_config:
                            self.global_config[key] = value

                    if "backup_dirs" not in loaded_config and "backup_dir" in loaded_config:
                        self.global_config["backup_dirs"] = [loaded_config["backup_dir"]]
        except Exception as e:
            print(f"加载配置失败: {e}")
        return True

    def save_global_config(self) -> bool:
        """保存全局配置"""
        try:
            os.makedirs(os.path.dirname(self.global_config_file), exist_ok=True)
            with open(self.global_config_file, 'w', encoding='utf-8') as f:
                json.dump(self.global_config, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"保存配置失败: {e}")
            return False

    def load_backup_config(self) -> bool:
        """加载备份目录配置"""
        if not self.global_config["backup_dir"]:
            return False

        self.backup_config_file = os.path.join(
            self.global_config["backup_dir"],
            "config.json"
        )

        try:
            if os.path.exists(self.backup_config_file):
                with open(self.backup_config_file, 'r', encoding='utf-8') as f:
                    loaded_config = json.load(f)
                    for key, value in loaded_config.items():
                        if key in self.backup_config:
                            self.backup_config[key] = value
                return True
        except Exception as e:
            print(f"加载备份配置失败: {e}")
        return False

    def save_backup_config(self) -> bool:
        """保存备份目录配置"""
        if not self.global_config["backup_dir"]:
            return False

        if not self.backup_config_file:
            self.backup_config_file = os.path.join(
                self.global_config["backup_dir"],
                "config.json"
            )

        try:
            if not os.path.exists(self.global_config["backup_dir"]):
                os.makedirs(self.global_config["backup_dir"], exist_ok=True)

            with open(self.backup_config_file, 'w', encoding='utf-8') as f:
                json.dump(self.backup_config, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"保存备份配置失败: {e}")
            return False

    def validate_settings(self, source_path: str, backup_dir: str, interval: int) -> Dict[str, Any]:
        """验证设置"""
        errors = []

        if not source_path:
            errors.append("请选择源文件或文件夹")
        elif not os.path.exists(source_path):
            errors.append("源文件或文件夹不存在")

        if not backup_dir:
            errors.append("请选择备份目录")

        if interval <= 0:
            errors.append("备份间隔必须大于0")

        if errors:
            return {"valid": False, "errors": errors}

        self.global_config["source_path"] = source_path
        self.global_config["backup_dir"] = backup_dir
        self.global_config["is_directory"] = os.path.isdir(source_path)
        self.global_config["interval"] = interval

        self.save_global_config()

        self.backup_config_file = os.path.join(backup_dir, "config.json")
        self.load_backup_config()

        return {"valid": True}

    def perform_backup(self) -> Dict[str, Any]:
        """执行备份"""
        source_path = self.global_config["source_path"]
        backup_dir = self.global_config["backup_dir"]
        is_directory = self.global_config["is_directory"]

        if not source_path or not backup_dir:
            return {"success": False, "error": "未设置源路径或备份目录"}

        try:
            if not os.path.exists(backup_dir):
                os.makedirs(backup_dir)

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

            return {"success": True, "backup_info": backup_info}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def restore_backup(self, timestamp: str) -> Dict[str, Any]:
        """还原备份"""
        backup_info = None
        for backup in self.backup_config["backups"]:
            if backup["timestamp"] == timestamp:
                backup_info = backup
                break

        if not backup_info:
            return {"success": False, "error": "找不到备份信息"}

        try:
            self.perform_backup()

            is_directory = backup_info.get("is_directory", False)
            original_path = backup_info["original"]
            backup_path = backup_info["backup_path"]

            if os.path.exists(original_path):
                if is_directory:
                    shutil.rmtree(original_path)
                else:
                    os.remove(original_path)

            if is_directory:
                shutil.copytree(backup_path, original_path)
            else:
                shutil.copy2(backup_path, original_path)

            self.add_log("restore", backup_info)
            self.save_backup_config()

            return {"success": True, "backup_info": backup_info}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def delete_backup(self, timestamp: str) -> Dict[str, Any]:
        """删除备份"""
        backup_index = -1
        for i, backup in enumerate(self.backup_config["backups"]):
            if backup["timestamp"] == timestamp:
                backup_index = i
                break

        if backup_index == -1:
            return {"success": False, "error": "找不到备份信息"}

        try:
            backup_info = self.backup_config["backups"][backup_index]
            is_directory = backup_info.get("is_directory", False)

            if os.path.exists(backup_info["backup_path"]):
                if is_directory:
                    shutil.rmtree(backup_info["backup_path"])
                else:
                    os.remove(backup_info["backup_path"])

            removed_backup = self.backup_config["backups"].pop(backup_index)
            self.add_log("delete", removed_backup)
            self.save_backup_config()

            return {"success": True}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def add_log(self, action_type: str, backup_info: Dict) -> None:
        """添加日志记录"""
        log_entry = {
            "timestamp": datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:19],
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "action": action_type,
            "backup_info": copy.deepcopy(backup_info)
        }

        self.backup_config["logs"].append(log_entry)

    def get_backup_list(self) -> List[Dict]:
        """获取备份列表"""
        result = []
        for backup in reversed(self.backup_config["backups"]):
            if os.path.exists(backup["backup_path"]):
                result.append(backup)
        return result

    def get_logs(self) -> List[Dict]:
        """获取日志列表"""
        return list(reversed(self.backup_config["logs"]))

    def switch_backup_dir(self, directory: str) -> Dict[str, Any]:
        """切换备份目录"""
        if self.global_config["backup_dir"] and os.path.exists(self.global_config["backup_dir"]):
            self.save_backup_config()

        self.global_config["backup_dir"] = directory
        self.backup_config_file = os.path.join(directory, "config.json")

        self.backup_config = {"backups": [], "logs": []}

        if os.path.exists(self.backup_config_file):
            self.load_backup_config()
        else:
            self.save_backup_config()

        self.save_global_config()

        if directory not in self.global_config["backup_dirs"]:
            self.global_config["backup_dirs"].append(directory)
            self.save_global_config()

        return {"success": True}

    def get_directory_stats(self, directory: str) -> Dict[str, Any]:
        """获取目录统计信息"""
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

            stats["size"] = self._format_size(total_size)
            stats["file_count"] = file_count
            stats["dir_count"] = dir_count

            config_file = os.path.join(directory, "config.json")
            if os.path.exists(config_file):
                with open(config_file, 'r', encoding='utf-8') as f:
                    config_data = json.load(f)
                    stats["backup_count"] = len(config_data.get("backups", []))
                    stats["log_count"] = len(config_data.get("logs", []))

        except Exception as e:
            print(f"获取目录统计失败: {e}")

        return stats

    def _format_size(self, size_bytes: int) -> str:
        """格式化文件大小"""
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.2f} KB"
        elif size_bytes < 1024 * 1024 * 1024:
            return f"{size_bytes / (1024 * 1024):.2f} MB"
        else:
            return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"

    def get_state(self) -> Dict[str, Any]:
        """获取当前状态"""
        return {
            "version": self.VERSION,
            "global_config": self.global_config,
            "backup_config": {
                "backups": self.get_backup_list(),
                "logs": self.get_logs()
            },
            "announcements": self.ANNOUNCEMENTS,
            "is_running": self.is_running
        }

    def update_config(self, config: Dict) -> Dict[str, Any]:
        """更新配置"""
        try:
            for key, value in config.items():
                if key in self.global_config:
                    self.global_config[key] = value
                elif key in self.backup_config:
                    self.backup_config[key] = value

            self.save_global_config()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
