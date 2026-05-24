import React, { useState } from 'react'
import { BackupInfo } from '../types'
import './BackupList.css'

interface BackupListProps {
  backups: BackupInfo[]
  onRestore: (timestamp: string) => void
  onDelete: (timestamp: string) => void
}

export const BackupList: React.FC<BackupListProps> = ({
  backups,
  onRestore,
  onDelete
}) => {
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    timestamp: string
  } | null>(null)

  const handleContextMenu = (e: React.MouseEvent, timestamp: string) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      timestamp
    })
  }

  const handleCloseContextMenu = () => {
    setContextMenu(null)
  }

  const handleRestore = () => {
    if (contextMenu) {
      onRestore(contextMenu.timestamp)
      setContextMenu(null)
    }
  }

  const handleDelete = () => {
    if (contextMenu) {
      onDelete(contextMenu.timestamp)
      setContextMenu(null)
    }
  }

  React.useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  return (
    <div className="backup-list">
      <div className="list-header">
        <h3>备份历史</h3>
      </div>

      <div className="list-content">
        {backups.length === 0 ? (
          <div className="empty-message">暂无备份记录</div>
        ) : (
          <table className="backup-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>文件名</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr
                  key={backup.timestamp}
                  onContextMenu={(e) => handleContextMenu(e, backup.timestamp)}
                >
                  <td className="time-col">{backup.date}</td>
                  <td className="name-col">
                    <span className="type-badge">
                      {backup.is_directory ? '[文件夹]' : '[文件]'}
                    </span>
                    {backup.backup_path.split(/[/\\]/).pop()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="menu-item" onClick={handleRestore}>
            还原
          </div>
          <div className="menu-item delete" onClick={handleDelete}>
            删除
          </div>
        </div>
      )}
    </div>
  )
}
