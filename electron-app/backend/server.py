#!/usr/bin/env python3
import sys
import json
from core.backup import BackupCore

class BackupServer:
    """备份服务 - 处理前端请求"""

    def __init__(self):
        self.core = BackupCore()
        print("BackupServer initialized")

    def handle_request(self, request: dict) -> dict:
        """处理前端请求"""
        action = request.get("action")
        data = request.get("data", {})

        handlers = {
            "get_state": self._get_state,
            "validate_settings": self._validate_settings,
            "perform_backup": self._perform_backup,
            "restore_backup": self._restore_backup,
            "delete_backup": self._delete_backup,
            "switch_backup_dir": self._switch_backup_dir,
            "get_backup_list": self._get_backup_list,
            "get_logs": self._get_logs,
            "update_config": self._update_config,
            "get_directory_stats": self._get_directory_stats,
        }

        handler = handlers.get(action)
        if handler:
            return handler(data)
        else:
            return {"error": f"Unknown action: {action}"}

    def _get_state(self, data: dict) -> dict:
        return self.core.get_state()

    def _validate_settings(self, data: dict) -> dict:
        return self.core.validate_settings(
            source_path=data.get("source_path", ""),
            backup_dir=data.get("backup_dir", ""),
            interval=data.get("interval", 5)
        )

    def _perform_backup(self, data: dict) -> dict:
        return self.core.perform_backup()

    def _restore_backup(self, data: dict) -> dict:
        return self.core.restore_backup(data.get("timestamp", ""))

    def _delete_backup(self, data: dict) -> dict:
        return self.core.delete_backup(data.get("timestamp", ""))

    def _switch_backup_dir(self, data: dict) -> dict:
        return self.core.switch_backup_dir(data.get("directory", ""))

    def _get_backup_list(self, data: dict) -> dict:
        return {"backups": self.core.get_backup_list()}

    def _get_logs(self, data: dict) -> dict:
        return {"logs": self.core.get_logs()}

    def _update_config(self, data: dict) -> dict:
        return self.core.update_config(data)

    def _get_directory_stats(self, data: dict) -> dict:
        return self.core.get_directory_stats(data.get("directory", ""))


def main():
    server = BackupServer()

    print("Server ready, waiting for requests...")

    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break

            request = json.loads(line.strip())
            response = server.handle_request(request)

            print(json.dumps({
                "id": request.get("id"),
                "result": response
            }, ensure_ascii=False))

            sys.stdout.flush()

        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}", file=sys.stderr)
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)


if __name__ == "__main__":
    main()
