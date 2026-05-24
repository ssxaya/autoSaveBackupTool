import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { FileSelector } from '../components/FileSelector';
import { 
  Folder, File, Play, Square, RefreshCw, Trash2, Clock, 
  ArrowUpRight, AlertCircle, CheckCircle, History
} from 'lucide-react';
import { BackupInfo } from '../../shared/types';
import { Link } from 'react-router-dom';

export const HomePage: React.FC = () => {
  const {
    config, backups, isAutoBackupRunning, status, announcements,
    setConfig, loadConfig, saveConfig, loadBackups, loadAnnouncements,
    performBackup, restoreBackup, deleteBackup, toggleAutoBackup
  } = useAppStore();

  const [showSourceSelector, setShowSourceSelector] = useState(false);
  const [showBackupSelector, setShowBackupSelector] = useState(false);
  const [showHistoryDirs, setShowHistoryDirs] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<BackupInfo | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BackupInfo | null>(null);

  useEffect(() => {
    loadConfig();
    loadAnnouncements();
  }, []);

  useEffect(() => {
    if (config.backupDir) {
      loadBackups();
    }
  }, [config.backupDir]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoBackupRunning) {
      interval = setInterval(() => {
        performBackup();
      }, config.interval * 60 * 1000);
    }
    return () => clearInterval(interval);
  }, [isAutoBackupRunning, config.interval]);

  const handleSourceSelect = (path: string, isDirectory: boolean) => {
    setConfig({ sourcePath: path, isDirectory });
    saveConfig();
    setShowSourceSelector(false);
  };

  const handleBackupDirSelect = (path: string, isDirectory: boolean) => {
    setConfig({ backupDir: path });
    saveConfig();
    setShowBackupSelector(false);
  };

  const handleHistoryDirSelect = (dir: string) => {
    setConfig({ backupDir: dir });
    saveConfig();
    setShowHistoryDirs(false);
  };

  const handleToggleAutoBackup = async () => {
    if (!isAutoBackupRunning) {
      await saveConfig();
    }
    toggleAutoBackup();
  };

  const getLatestAnnouncement = () => {
    if (announcements.length > 0) {
      return announcements[announcements.length - 1];
    }
    return null;
  };

  const latestAnnouncement = getLatestAnnouncement();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <History className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">ASBT - 自动存档备份工具</h1>
                <p className="text-sm text-gray-500">Web 版本 v1.0</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                to="/logs"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <Clock size={18} />
                查看日志
              </Link>
              <Link
                to="/announcements"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <AlertCircle size={18} />
                公告
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Announcement Banner */}
      {latestAnnouncement && (
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} />
                <span className="font-medium">【{latestAnnouncement.date}】</span>
                <span className="truncate">{latestAnnouncement.content}</span>
              </div>
              <Link
                to="/announcements"
                className="text-white underline hover:no-underline"
              >
                查看全部 →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* File Settings */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Folder size={20} className="text-blue-500" />
              存档文件设置
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Source File */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">源文件/文件夹</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={config.sourcePath}
                    readOnly
                    className="flex-1 px-4 py-2 border rounded-lg bg-gray-50"
                    placeholder="请选择源文件或文件夹"
                  />
                  <button
                    onClick={() => setShowSourceSelector(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <File size={18} />
                    选择文件
                  </button>
                  <button
                    onClick={() => setShowSourceSelector(true)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <Folder size={18} />
                    选择文件夹
                  </button>
                </div>
                {config.sourcePath && (
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    {config.isDirectory ? <Folder size={14} /> : <File size={14} />}
                    当前为{config.isDirectory ? '文件夹' : '文件'}
                  </div>
                )}
              </div>

              {/* Backup Directory */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">备份目录</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={config.backupDir}
                    readOnly
                    className="flex-1 px-4 py-2 border rounded-lg bg-gray-50"
                    placeholder="请选择备份目录"
                  />
                  <button
                    onClick={() => setShowBackupSelector(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <Folder size={18} />
                    浏览
                  </button>
                  {config.backupDirs.length > 0 && (
                    <button
                      onClick={() => setShowHistoryDirs(true)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                      <History size={18} />
                      历史
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Backup Settings */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock size={20} className="text-blue-500" />
              备份设置
            </h2>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">备份间隔（分钟）</label>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={config.interval}
                  onChange={(e) => setConfig({ interval: parseInt(e.target.value) || 5 })}
                  className="w-24 px-4 py-2 border rounded-lg"
                />
              </div>

              <div className="flex gap-3 ml-auto">
                <button
                  onClick={performBackup}
                  disabled={!config.sourcePath || !config.backupDir}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <RefreshCw size={18} />
                  立即备份
                </button>
                <button
                  onClick={handleToggleAutoBackup}
                  disabled={!config.sourcePath || !config.backupDir}
                  className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    isAutoBackupRunning
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isAutoBackupRunning ? <Square size={18} /> : <Play size={18} />}
                  {isAutoBackupRunning ? '停止自动备份' : '开始自动备份'}
                </button>
              </div>
            </div>

            {isAutoBackupRunning && (
              <div className="mt-4 flex items-center gap-2 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm">自动备份运行中，每 {config.interval} 分钟备份一次</span>
              </div>
            )}
          </div>

          {/* Backup List */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <History size={20} className="text-blue-500" />
              备份历史
              <span className="text-sm text-gray-500 font-normal">
                ({backups.length} 个备份)
              </span>
            </h2>

            {backups.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <History size={48} className="mx-auto mb-4 opacity-50" />
                <p>暂无备份记录</p>
                <p className="text-sm mt-2">选择源文件和备份目录后点击「立即备份」开始</p>
              </div>
            ) : (
              <div className="space-y-3">
                {backups.map((backup) => (
                  <div
                    key={backup.timestamp}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        backup.isDirectory ? 'bg-yellow-100' : 'bg-blue-100'
                      }`}>
                        {backup.isDirectory ? (
                          <Folder size={24} className="text-yellow-600" />
                        ) : (
                          <File size={24} className="text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">
                          {backup.isDirectory ? '[文件夹] ' : '[文件] '}
                          {backup.backupPath.split('/').pop()}
                        </p>
                        <p className="text-sm text-gray-500">{backup.date}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmRestore(backup)}
                        className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors flex items-center gap-1"
                      >
                        <ArrowUpRight size={16} />
                        还原
                      </button>
                      <button
                        onClick={() => setConfirmDelete(backup)}
                        className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors flex items-center gap-1"
                      >
                        <Trash2 size={16} />
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CheckCircle size={16} className="text-green-500" />
            <span>{status}</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {showSourceSelector && (
        <FileSelector
          onSelect={handleSourceSelect}
          onClose={() => setShowSourceSelector(false)}
        />
      )}

      {showBackupSelector && (
        <FileSelector
          onSelect={handleBackupDirSelect}
          onClose={() => setShowBackupSelector(false)}
          selectDirectory
        />
      )}

      {showHistoryDirs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">历史备份目录</h2>
              <button onClick={() => setShowHistoryDirs(false)} className="text-gray-500">✕</button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              {config.backupDirs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无历史备份目录</p>
              ) : (
                <div className="space-y-2">
                  {config.backupDirs.map((dir) => (
                    <button
                      key={dir}
                      onClick={() => handleHistoryDirSelect(dir)}
                      className="w-full text-left p-3 border rounded hover:bg-gray-50 transition-colors"
                    >
                      <p className="font-medium truncate">{dir}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t">
              <button
                onClick={() => setShowHistoryDirs(false)}
                className="w-full py-2 border rounded hover:bg-gray-50"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmRestore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">确认还原</h3>
            <p className="text-gray-600 mb-6">
              确定要还原此备份吗？<br />
              当前文件将被备份后覆盖。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmRestore(null)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  await restoreBackup(confirmRestore);
                  setConfirmRestore(null);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                确认还原
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">确认删除</h3>
            <p className="text-gray-600 mb-6">
              确定要删除此备份吗？<br />
              此操作不可撤销。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  await deleteBackup(confirmDelete);
                  setConfirmDelete(null);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

