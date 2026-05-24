import React, { useState } from 'react';
import { FileText, Folder, HardDrive, Clock, Play, Square, RefreshCw, Trash2, Archive, History, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useBackupStore } from '../hooks/useBackupStore';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { BackupInfo } from '../types';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export const Announcement = () => {
  const { announcements } = useBackupStore();
  const latest = announcements[announcements.length - 1];
  
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 rounded-full p-2">
            <AlertCircle className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-blue-800">公告</span>
            <span className="text-sm text-blue-700">
              {latest ? `【${latest.date}】 ${latest.content}` : '暂无公告'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FileSelect = () => {
  const { global_config, setSourcePath, setBackupDir, setStatusMessage } = useBackupStore();

  const handleSelectSource = async (isDirectory: boolean) => {
    const demoPath = isDirectory ? '/path/to/source/folder' : '/path/to/source/file.txt';
    setSourcePath(demoPath, isDirectory);
    setStatusMessage(`已选择${isDirectory ? '文件夹' : '文件'}: ${demoPath}`);
  };

  const handleSelectBackup = async () => {
    const demoPath = '/path/to/backups';
    setBackupDir(demoPath);
    setStatusMessage(`已选择备份目录: ${demoPath}`);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-600" />
        文件设置
      </h3>

      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">源文件/文件夹</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={global_config.source_path}
              readOnly
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              placeholder="选择需要备份的文件或文件夹"
            />
            <button
              onClick={() => handleSelectSource(false)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              选择文件
            </button>
            <button
              onClick={() => handleSelectSource(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Folder className="w-4 h-4" />
              选择文件夹
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">备份目录</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={global_config.backup_dir}
              readOnly
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              placeholder="选择备份存储目录"
            />
            <button
              onClick={handleSelectBackup}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <HardDrive className="w-4 h-4" />
              浏览
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const BackupSettings = () => {
  const { global_config, setInterval, toggleAutoBackup, isAutoBackupRunning, performBackup, setStatusMessage } = useBackupStore();

  const handleBackup = async () => {
    await performBackup();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-emerald-600" />
        备份设置
      </h3>

      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">备份间隔（分钟）</label>
          <input
            type="number"
            min="1"
            max="1440"
            value={global_config.interval}
            onChange={(e) => setInterval(parseInt(e.target.value) || 5)}
            className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-center"
          />
        </div>

        <div className="flex-1" />

        <button
          onClick={handleBackup}
          className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <RefreshCw className="w-4 h-4" />
          立即备份
        </button>

        <button
          onClick={toggleAutoBackup}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]",
            isAutoBackupRunning
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-green-600 hover:bg-green-700 text-white"
          )}
        >
          {isAutoBackupRunning ? (
            <>
              <Square className="w-4 h-4" />
              停止自动备份
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              开始自动备份
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export const BackupList = () => {
  const { backups, removeBackup, restoreBackup, addLog, setStatusMessage } = useBackupStore();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; backup: BackupInfo } | null>(null);

  const handleRightClick = (e: React.MouseEvent, backup: BackupInfo) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, backup });
  };

  const handleRestore = async () => {
    if (contextMenu) {
      await restoreBackup(contextMenu.backup);
      setContextMenu(null);
    }
  };

  const handleDelete = () => {
    if (contextMenu) {
      removeBackup(contextMenu.backup.timestamp);
      
      const timestamp = Date.now().toString();
      const date = new Date().toLocaleString('zh-CN');
      
      addLog({
        timestamp,
        date,
        action: 'delete',
        backup_info: contextMenu.backup,
      });
      
      setStatusMessage('备份已删除');
      setContextMenu(null);
    }
  };

  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Archive className="w-5 h-5 text-purple-600" />
          备份历史
        </h3>
      </div>

      <div className="flex-1 overflow-auto">
        {backups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
            <Archive className="w-12 h-12 mb-3 opacity-50" />
            <p>暂无备份记录</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">备份文件</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {backups.map((backup) => (
              <tr
                key={backup.timestamp}
                className="hover:bg-gray-50 transition-colors"
                onContextMenu={(e) => handleRightClick(e, backup)}
              >
                <td className="px-6 py-4 text-sm text-gray-600">{backup.date}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium",
                    backup.is_directory ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                  )}>
                    {backup.is_directory ? '文件夹' : '文件'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 truncate max-w-xs">
                  {backup.backup_path.split('/').pop()}
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        )}
      </div>

      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={handleRestore}
            className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm hover:bg-blue-50 text-gray-700 hover:text-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            还原备份
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            删除备份
          </button>
        </div>
      )}
    </div>
  );
};

export const StatusBar = () => {
  const { statusMessage, version } = useBackupStore();

  return (
    <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span className="text-gray-400">{statusMessage}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-gray-400">v{version}</span>
      </div>
    </div>
  );
};
