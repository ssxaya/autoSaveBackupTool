import React from 'react'
import './StatusBar.css'

interface StatusBarProps {
  message: string
  version: string
  onShowLogs: () => void
}

export const StatusBar: React.FC<StatusBarProps> = ({
  message,
  version,
  onShowLogs
}) => {
  return (
    <div className="status-bar">
      <div className="status-message">{message}</div>
      <div className="status-actions">
        <button className="log-btn" onClick={onShowLogs}>
          查看日志
        </button>
        <span className="version">v{version}</span>
      </div>
    </div>
  )
}
