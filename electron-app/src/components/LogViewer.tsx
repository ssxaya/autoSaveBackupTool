import React from 'react';
import { X, History, Clock } from 'lucide-react';
import { useBackupStore } from '../hooks/useBackupStore';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export const LogViewer = () => {
  const { logs, setStatusMessage } = useBackupStore();
  
  const [isOpen, setIsOpen] = React.useState(false);

  const handleClose = () => {
    setIsOpen(false);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'backup':
        return 'bg-green-100 text-green-700';
      case 'restore':
        return 'bg-blue-100 text-blue-700';
      case 'delete':
        return 'bg-red-100 text-red-700';
      case 'restore_deleted':
        return 'bg-amber-100 text-amber-700';
      case 'rollback':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'backup':
        return '备份';
      case 'restore':
        return '还原';
      case 'delete':
        return '删除';
      case 'restore_deleted':
        return '恢复删除';
      case 'rollback':
        return '回溯';
      default:
        return action;
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <History className="w-4 h-4" />
        查看日志
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <History className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">日志记录</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <History className="w-12 h-12 mb-3 opacity-50" />
                  <p>暂无日志记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div
                      key={log.timestamp}
                      className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <div className={cn(
                          "p-2 rounded-lg",
                          log.action === 'backup' ? 'bg-green-50' :
                          log.action === 'restore' ? 'bg-blue-50' :
                          log.action === 'delete' ? 'bg-red-50' : 'bg-gray-50'
                        )}>
                          <Clock className="w-4 h-4 text-gray-500" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getActionColor(log.action))}>
                            {getActionText(log.action)}
                          </span>
                          <span className="text-xs text-gray-500">{log.date}</span>
                        </div>
                        <p className="text-sm text-gray-700">
                          {log.backup_info.is_directory ? '文件夹' : '文件'}: {log.backup_info.backup_path.split('/').pop()}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          原路径: {log.backup_info.original}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end">
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
