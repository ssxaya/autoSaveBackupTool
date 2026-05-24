import os
import shutil
import json
import time
import threading
import copy
import webbrowser
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder='static', static_url_path='/static')

VERSION = "v0.6.2"

ANNOUNCEMENTS = [
    {"content": "v0.2版本更新：支持文件夹备份，可以备份整个游戏存档目录", "date": "2025-04-28"},
    {"content": "v0.4版本更新：新增日志与日志详情，右键日志即可进行回溯操作。优化窗口位置", "date": "2025-04-29"},
    {"content": "dev-v0.5版本更新：配置系统更新，数据配置文件(如历史、日志)保存在存档目录路径，基础设置保存用户目录", "date": "2025-4-29"},
    {"content": "dev-v0.5.1版本更新：公告更新，鼠标移动到公告栏会开始滚动，避免字数过长导致按钮位置问题", "date": "2025-5-6"},
    {"content": r"dev-v0.5.2版本更新：兼容旧版本配置文件，启动时检测C:\Users\~\.game_backup_tool目录下的config.json文件", "date": "2025-5-6"},
    {"content": "v0.5.3版本更新：新增旧版本配置迁移的历史记录与日志", "date": "2025-5-6"},
    {"content": "v0.6版本更新：新增历史备份目录列表进行管理（右键有更多选项）", "date": "2025-5-7"},
    {"content": "v0.6.1版本更新：右键备份列表可以还原与删除", "date": "2025-5-7"},
    {"content": "v0.6.2版本更新：状态栏状态数量更新、备份文件名时间戳精度提升至毫秒，修复了历史备份目录列表中删除某个目录后还会显示的问题", "date": "2025-5-8"},
]

global_config = {
    "source_path": "",
    "is_directory": False,
    "backup_dir": "",
    "backup_dirs": [],
    "interval": 5,
}

backup_config = {
    "backups": [],
    "logs": [],
}

global_config_file = os.path.join(os.path.expanduser("~"), "autoSaveBackupTool_config.json")
backup_config_file = None
old_config_file = os.path.join(os.path.expanduser("~"), ".game_backup_tool", "config.json")

is_running = False
backup_thread = None
auto_backup_lock = threading.Lock()


def format_size(size_bytes):
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.2f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.2f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"


def get_directory_stats(directory):
    stats = {
        "created_time": "",
        "modified_time": "",
        "size": "0 B",
        "backup_count": 0,
        "log_count": 0,
        "file_count": 0,
        "dir_count": 0,
    }
    try:
        if os.path.exists(directory):
            created_time = datetime.fromtimestamp(os.path.getctime(directory)).strftime("%Y-%m-%d %H:%M:%S")
            modified_time = datetime.fromtimestamp(os.path.getmtime(directory)).strftime("%Y-%m-%d %H:%M:%S")
            stats["created_time"] = created_time
            stats["modified_time"] = modified_time

        total_size = 0
        file_count = 0
        dir_count = 0
        for root, dirs, files in os.walk(directory):
            dir_count += len(dirs)
            for f in files:
                fp = os.path.join(root, f)
                if os.path.exists(fp) and os.path.isfile(fp):
                    file_count += 1
                    total_size += os.path.getsize(fp)
        stats["size"] = format_size(total_size)
        stats["file_count"] = file_count
        stats["dir_count"] = dir_count

        config_path = os.path.join(directory, "config.json")
        if os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                config_data = json.load(f)
                if "backups" in config_data:
                    stats["backup_count"] = len(config_data["backups"])
                if "logs" in config_data:
                    stats["log_count"] = len(config_data["logs"])
    except Exception as e:
        print(f"获取目录统计信息失败: {str(e)}")
    return stats


def load_global_config():
    global global_config
    if os.path.exists(global_config_file):
        try:
            with open(global_config_file, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                for key, value in loaded.items():
                    if key in global_config:
                        global_config[key] = value
                if "backup_dirs" not in loaded and "backup_dir" in loaded and loaded["backup_dir"]:
                    global_config["backup_dirs"] = [loaded["backup_dir"]]
        except Exception as e:
            print(f"加载全局配置失败: {str(e)}")


def save_global_config():
    global global_config
    try:
        os.makedirs(os.path.dirname(global_config_file), exist_ok=True)
        with open(global_config_file, "w", encoding="utf-8") as f:
            json.dump(global_config, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"保存全局配置失败: {str(e)}")


def load_backup_config():
    global backup_config, backup_config_file
    if not global_config["backup_dir"]:
        return
    backup_config_file = os.path.join(global_config["backup_dir"], "config.json")
    if os.path.exists(backup_config_file):
        try:
            with open(backup_config_file, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                for key, value in loaded.items():
                    if key in backup_config:
                        backup_config[key] = value
        except Exception as e:
            print(f"加载备份目录配置失败: {str(e)}")


def save_backup_config():
    global backup_config, backup_config_file
    if not global_config["backup_dir"] or not os.path.exists(global_config["backup_dir"]):
        return
    if not backup_config_file:
        backup_config_file = os.path.join(global_config["backup_dir"], "config.json")
    try:
        with open(backup_config_file, "w", encoding="utf-8") as f:
            json.dump(backup_config, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"保存备份目录配置失败: {str(e)}")


def add_log(action_type, backup_info):
    global backup_config
    log_entry = {
        "timestamp": datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:19],
        "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "action": action_type,
        "backup_info": copy.deepcopy(backup_info),
    }
    backup_config["logs"].append(log_entry)
    save_backup_config()


def perform_backup():
    global backup_config
    source_path = global_config["source_path"]
    backup_dir = global_config["backup_dir"]
    is_directory = global_config["is_directory"]

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
        "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }

    backup_config["backups"].append(backup_info)
    add_log("backup", backup_info)
    save_global_config()
    save_backup_config()

    return backup_info


def auto_backup_task():
    global is_running
    while is_running:
        try:
            perform_backup()
            interval_seconds = global_config["interval"] * 60
            for _ in range(interval_seconds):
                if not is_running:
                    break
                time.sleep(1)
        except Exception as e:
            print(f"自动备份出错: {str(e)}")
            is_running = False
            break


def check_old_config():
    global global_config, backup_config, backup_config_file
    if os.path.exists(old_config_file) and os.path.isfile(old_config_file):
        try:
            with open(old_config_file, "r", encoding="utf-8") as f:
                old_config = json.load(f)
            for key, value in old_config.items():
                if key in global_config:
                    global_config[key] = value
            save_global_config()

            if global_config["backup_dir"] and os.path.exists(global_config["backup_dir"]):
                backup_config_file = os.path.join(global_config["backup_dir"], "config.json")
                if "backups" in old_config and old_config["backups"]:
                    backup_config["backups"] = old_config["backups"]
                if "logs" in old_config and old_config["logs"]:
                    backup_config["logs"] = old_config["logs"]
                save_backup_config()

            try:
                os.remove(old_config_file)
                old_config_dir = os.path.dirname(old_config_file)
                if os.path.exists(old_config_dir) and len(os.listdir(old_config_dir)) == 0:
                    os.rmdir(old_config_dir)
            except Exception:
                pass
        except Exception as e:
            print(f"处理旧版本配置文件时出错: {str(e)}")


def init_app():
    check_old_config()
    load_global_config()
    if global_config["backup_dir"]:
        load_backup_config()


@app.route("/")
def index():
    return send_from_directory("templates", "index.html")


@app.route("/api/announcements")
def api_announcements():
    return jsonify({"announcements": ANNOUNCEMENTS})


@app.route("/api/config")
def api_get_config():
    return jsonify({
        "global": global_config,
        "backup": backup_config,
        "version": VERSION,
        "is_running": is_running,
    })


@app.route("/api/config", methods=["POST"])
def api_save_config():
    global global_config
    data = request.json
    if "source_path" in data:
        global_config["source_path"] = data["source_path"]
    if "is_directory" in data:
        global_config["is_directory"] = data["is_directory"]
    if "backup_dir" in data:
        global_config["backup_dir"] = data["backup_dir"]
    if "interval" in data:
        global_config["interval"] = data["interval"]
    save_global_config()
    return jsonify({"success": True})


@app.route("/api/backup/manual", methods=["POST"])
def api_manual_backup():
    source_path = global_config["source_path"]
    backup_dir = global_config["backup_dir"]

    if not source_path:
        return jsonify({"success": False, "error": "请选择源文件或文件夹"}), 400
    if not os.path.exists(source_path):
        return jsonify({"success": False, "error": "源文件或文件夹不存在"}), 400
    if not backup_dir:
        return jsonify({"success": False, "error": "请选择备份目录"}), 400

    try:
        backup_info = perform_backup()
        return jsonify({"success": True, "backup": backup_info})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/backup/auto/start", methods=["POST"])
def api_start_auto():
    global is_running, backup_thread
    source_path = global_config["source_path"]
    backup_dir = global_config["backup_dir"]

    if not source_path:
        return jsonify({"success": False, "error": "请选择源文件或文件夹"}), 400
    if not os.path.exists(source_path):
        return jsonify({"success": False, "error": "源文件或文件夹不存在"}), 400
    if not backup_dir:
        return jsonify({"success": False, "error": "请选择备份目录"}), 400

    if is_running:
        return jsonify({"success": False, "error": "自动备份已在运行中"}), 400

    is_running = True
    if backup_thread is None or not backup_thread.is_alive():
        backup_thread = threading.Thread(target=auto_backup_task, daemon=True)
        backup_thread.start()

    return jsonify({"success": True})


@app.route("/api/backup/auto/stop", methods=["POST"])
def api_stop_auto():
    global is_running
    is_running = False
    return jsonify({"success": True})


@app.route("/api/backups")
def api_list_backups():
    result = []
    for b in reversed(backup_config["backups"]):
        exists = os.path.exists(b["backup_path"])
        is_dir = b.get("is_directory", False)
        result.append({
            **b,
            "exists": exists,
            "type_indicator": "[文件夹]" if is_dir else "[文件]",
            "filename": os.path.basename(b["backup_path"]),
        })
    return jsonify({"backups": result, "count": len([b for b in result if b["exists"]])})


@app.route("/api/backup/restore", methods=["POST"])
def api_restore_backup():
    data = request.json
    timestamp = data.get("timestamp")

    backup_info = None
    for b in backup_config["backups"]:
        if b["timestamp"] == timestamp:
            backup_info = b
            break

    if not backup_info:
        return jsonify({"success": False, "error": "找不到备份信息"}), 404

    try:
        perform_backup()

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

        add_log("restore", backup_info)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/backup/delete", methods=["POST"])
def api_delete_backup():
    data = request.json
    timestamp = data.get("timestamp")

    backup_index = -1
    for i, b in enumerate(backup_config["backups"]):
        if b["timestamp"] == timestamp:
            backup_index = i
            break

    if backup_index == -1:
        return jsonify({"success": False, "error": "找不到备份信息"}), 404

    try:
        backup_info = backup_config["backups"][backup_index]
        is_directory = backup_info.get("is_directory", False)

        if os.path.exists(backup_info["backup_path"]):
            if is_directory:
                shutil.rmtree(backup_info["backup_path"])
            else:
                os.remove(backup_info["backup_path"])

        backup_config["backups"].pop(backup_index)
        add_log("delete", backup_info)
        save_backup_config()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/logs")
def api_list_logs():
    result = []
    action_map = {
        "backup": "备份",
        "restore": "还原",
        "delete": "删除",
        "restore_deleted": "恢复删除的备份",
        "rollback": "回溯操作",
    }
    for log in reversed(backup_config["logs"]):
        is_dir = log["backup_info"].get("is_directory", False)
        result.append({
            "timestamp": log["timestamp"],
            "date": log["date"],
            "action": log["action"],
            "action_text": action_map.get(log["action"], log["action"]),
            "backup_path": log["backup_info"]["backup_path"],
            "original": log["backup_info"]["original"],
            "is_directory": is_dir,
            "type_indicator": "[文件夹]" if is_dir else "[文件]",
            "filename": os.path.basename(log["backup_info"]["backup_path"]),
        })
    return jsonify({"logs": result})


@app.route("/api/log/rollback", methods=["POST"])
def api_rollback_log():
    data = request.json
    timestamp = data.get("timestamp")

    log_entry = None
    for log in backup_config["logs"]:
        if log["timestamp"] == timestamp:
            log_entry = log
            break

    if not log_entry:
        return jsonify({"success": False, "error": "找不到日志信息"}), 404

    action_type = log_entry["action"]
    backup_info = log_entry["backup_info"]

    try:
        if action_type == "delete":
            backup_path = backup_info["backup_path"]
            if os.path.exists(backup_path):
                return jsonify({"success": False, "error": "该备份文件已存在，无需恢复"}), 400

            is_directory = backup_info.get("is_directory", False)
            original_path = backup_info["original"]
            backup_dir = os.path.dirname(backup_path)
            if not os.path.exists(backup_dir):
                os.makedirs(backup_dir)

            if os.path.exists(original_path):
                if is_directory:
                    shutil.copytree(original_path, backup_path)
                else:
                    shutil.copy2(original_path, backup_path)
                backup_config["backups"].append(backup_info)
                add_log("restore_deleted", backup_info)
                save_backup_config()
                return jsonify({"success": True})
            else:
                return jsonify({"success": False, "error": "原始文件不存在，无法恢复备份"}), 400

        elif action_type in ("backup", "restore"):
            backup_path = backup_info["backup_path"]
            if not os.path.exists(backup_path):
                return jsonify({"success": False, "error": "备份文件已不存在，无法回溯"}), 400

            perform_backup()

            is_directory = backup_info.get("is_directory", False)
            original_path = backup_info["original"]

            if os.path.exists(original_path):
                if is_directory:
                    shutil.rmtree(original_path)
                else:
                    os.remove(original_path)

            if is_directory:
                shutil.copytree(backup_path, original_path)
            else:
                shutil.copy2(backup_path, original_path)

            add_log("rollback", backup_info)
            return jsonify({"success": True})

        else:
            return jsonify({"success": False, "error": f"不支持回溯操作类型: {action_type}"}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/log/status", methods=["POST"])
def api_log_status():
    data = request.json
    timestamp = data.get("timestamp")

    log_entry = None
    for log in backup_config["logs"]:
        if log["timestamp"] == timestamp:
            log_entry = log
            break

    if not log_entry:
        return jsonify({"success": False, "error": "找不到日志信息"}), 404

    backup_info = log_entry["backup_info"]
    backup_path = backup_info["backup_path"]
    exists = os.path.exists(backup_path)

    content_preview = None
    dir_contents = None
    is_directory = backup_info.get("is_directory", False)

    if exists:
        if not is_directory:
            try:
                with open(backup_path, "r", encoding="utf-8", errors="ignore") as f:
                    content_preview = f.read(2000)
            except Exception:
                content_preview = None
        else:
            try:
                items = os.listdir(backup_path)
                dir_contents = []
                for item in items:
                    item_path = os.path.join(backup_path, item)
                    dir_contents.append({
                        "name": item,
                        "is_directory": os.path.isdir(item_path),
                    })
            except Exception:
                dir_contents = None

    return jsonify({
        "success": True,
        "action": log_entry["action"],
        "backup_info": backup_info,
        "exists": exists,
        "content_preview": content_preview,
        "dir_contents": dir_contents,
    })


@app.route("/api/backup-dirs")
def api_backup_dirs():
    valid_dirs = [d for d in global_config["backup_dirs"] if os.path.exists(d)]
    if global_config["backup_dirs"] != valid_dirs:
        global_config["backup_dirs"] = valid_dirs
        save_global_config()

    result = []
    for d in valid_dirs:
        stats = get_directory_stats(d)
        result.append({"path": d, "stats": stats})

    return jsonify({"dirs": result})


@app.route("/api/backup-dirs/select", methods=["POST"])
def api_select_backup_dir():
    global backup_config, backup_config_file
    data = request.json
    directory = data.get("directory")

    if not directory or not os.path.exists(directory):
        return jsonify({"success": False, "error": "目录不存在"}), 400

    if global_config["backup_dir"] and os.path.exists(global_config["backup_dir"]):
        save_backup_config()

    global_config["backup_dir"] = directory
    backup_config_file = os.path.join(directory, "config.json")

    if os.path.exists(backup_config_file):
        load_backup_config()
    else:
        backup_config = {"backups": [], "logs": []}
        save_backup_config()

    if directory not in global_config["backup_dirs"]:
        global_config["backup_dirs"].append(directory)

    save_global_config()
    return jsonify({"success": True})


@app.route("/api/backup-dirs/remove", methods=["POST"])
def api_remove_backup_dir():
    data = request.json
    directory = data.get("directory")

    if directory in global_config["backup_dirs"]:
        global_config["backup_dirs"].remove(directory)
        save_global_config()

    return jsonify({"success": True})


@app.route("/api/backup-folder/delete", methods=["POST"])
def api_delete_backup_folder():
    global backup_config, backup_config_file
    data = request.json
    backup_dir = data.get("backup_dir")
    delete_config = data.get("delete_config", True)
    delete_backups = data.get("delete_backups", True)

    if not backup_dir:
        return jsonify({"success": False, "error": "备份目录路径无效"}), 400

    try:
        temp_config_file = os.path.join(backup_dir, "config.json")

        if delete_backups:
            if os.path.exists(temp_config_file):
                with open(temp_config_file, "r", encoding="utf-8") as f:
                    temp_config = json.load(f)
                    if "backups" in temp_config:
                        for backup in temp_config["backups"]:
                            bp = backup["backup_path"]
                            if os.path.exists(bp):
                                if backup.get("is_directory", False):
                                    shutil.rmtree(bp)
                                else:
                                    os.remove(bp)

        if delete_config and os.path.exists(temp_config_file):
            os.remove(temp_config_file)

        if backup_dir in global_config["backup_dirs"]:
            global_config["backup_dirs"].remove(backup_dir)
            save_global_config()

        if backup_dir == global_config["backup_dir"]:
            backup_config = {"backups": [], "logs": []}
            global_config["backup_dir"] = ""
            backup_config_file = None
            save_global_config()

        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/directory-info")
def api_directory_info():
    directory = request.args.get("directory")
    if not directory:
        return jsonify({"success": False, "error": "目录路径无效"}), 400
    if not os.path.exists(directory):
        return jsonify({"success": False, "error": "目录不存在"}), 400

    stats = get_directory_stats(directory)
    return jsonify({"success": True, "stats": stats})


@app.route("/api/browse/file")
def api_browse_file():
    path = request.args.get("path", "/")
    if not os.path.exists(path):
        path = "/"

    items = []
    try:
        for item in sorted(os.listdir(path)):
            full_path = os.path.join(path, item)
            try:
                is_dir = os.path.isdir(full_path)
                items.append({
                    "name": item,
                    "path": full_path,
                    "is_directory": is_dir,
                    "size": os.path.getsize(full_path) if not is_dir else 0,
                })
            except PermissionError:
                continue
    except PermissionError:
        pass

    parent = os.path.dirname(path) if path != "/" else None
    return jsonify({
        "current_path": path,
        "parent": parent,
        "items": items,
    })


@app.route("/api/browse/directory")
def api_browse_directory():
    return api_browse_file()


@app.route("/api/file-content")
def api_file_content():
    path = request.args.get("path")
    if not path or not os.path.exists(path) or not os.path.isfile(path):
        return jsonify({"success": False, "error": "文件不存在"}), 400

    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read(5000)
        return jsonify({"success": True, "content": content})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


init_app()

if __name__ == "__main__":
    port = 51234
    webbrowser.open(f"http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=False)
