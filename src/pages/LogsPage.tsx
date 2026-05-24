import React, { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, File, Folder, RotateCcw, Trash2 } from 'lucide-react';

const actionLabels: Record<string, string> = {
  backup: '备份',
  restore: '还原',
  delete: '删除',
  restore_deleted: '恢复删除',
  rollback: '回溯'
};

const actionIcons: Record<string, React.ReactNode> = {
  backup: <File size={20} className="text-blue-500" />,
  restore: <RotateCcw size={20} className="text-green-500" />,
  delete: <Trash2 size={20} className="text-red-500" />,
  restore_deleted: <RotateCcw size={20} className="text-yellow-500" />,
  rollback: <RotateCcw size={20} className="text-purple-500" />
};

export const LogsPage: React.FC = () => {
  const { logs, loadLogs, config } = useAppStore();

  useEffect(() => {
    loadLogs();
  }, [config.backupDir]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Clock className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">操作日志</h1>
                <p className="text-sm text-gray-500">查看所有备份、还原和删除记录</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          {!config.backupDir ? (
            <div className="text-center py-12 text-gray-500">
              <Clock size={48} className="mx-auto mb-4 opacity-50" />
              <p>请先在主页面选择备份目录</p>
              <Link to="/" className="text-blue-500 hover:underline mt-2 inline-block">
                返回主页 →
              </Link>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock size={48} className="mx-auto mb-4 opacity-50" />
              <p>暂无操作记录</p>
              <p className="text-sm mt-2">进行备份、还原或删除操作后会在此显示</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.timestamp}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="mt-1 p-2 bg-gray-100 rounded-lg">
                    {actionIcons[log.action] || <File size={20} className="text-gray-500" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium text-gray-800">
                        {actionLabels[log.action] || log.action}
                      </span>
                      <span className="text-sm text-gray-500">{log.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {log.backupInfo.isDirectory ? (
                        <Folder size={14} />
                      ) : (
                        <File size={14} />
                      )}
                      <span className="truncate">
                        {log.backupInfo.backupPath.split('/').pop()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      原路径: {log.backupInfo.original}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

