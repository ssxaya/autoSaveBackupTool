import React from 'react'
import { LogEntry } from '../types'
import './LogViewer.css'

interface LogViewerProps {
  logs: LogEntry[]
  onClose: () => void
}

const ACTION_MAP: Record<string, string> = {
  backup: '备份',
  restore: '还原',
  delete: '删除',
  restore_deleted: '恢复删除',
  rollback: '回溯操作'
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs, onClose }) => {
  return (
    <div className="log-viewer-overlay" onClick={onClose}>
      <div className="log-viewer" onClick={(e) => e.stopPropagation()}>
        <div className="log-viewer-header">
          <h2>日志</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="log-viewer-content">
          {logs.length === 0 ? (
            <div className="empty-message">暂无日志记录</div>
          ) : (
            <table className="log-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>操作类型</th>
                  <th>文件名</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.timestamp}>
                    <td className="time-col">{log.date}</td>
                    <td className="action-col">
                      <span className={`action-badge ${log.action}`}>
                        {ACTION_MAP[log.action] || log.action}
                      </span>
                    </td>
                    <td className="name-col">
                      <span className="type-badge">
                        {log.backup_info.is_directory ? '[文件夹]' : '[文件]'}
                      </span>
                      {log.backup_info.backup_path.split(/[/\\]/).pop()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="log-viewer-footer">
          <button className="close-button" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
