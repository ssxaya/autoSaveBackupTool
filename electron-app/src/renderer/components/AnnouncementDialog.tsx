import React from 'react'
import './AnnouncementDialog.css'

interface AnnouncementDialogProps {
  announcements: { content: string; date: string }[]
  onClose: () => void
}

export const AnnouncementDialog: React.FC<AnnouncementDialogProps> = ({
  announcements,
  onClose
}) => {
  return (
    <div className="announcement-dialog-overlay" onClick={onClose}>
      <div className="announcement-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>公告信息</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="dialog-content">
          {announcements.length === 0 ? (
            <div className="empty-message">暂无公告</div>
          ) : (
            announcements.slice().reverse().map((item, index) => (
              <div key={index} className="announcement-item">
                <div className="announcement-date">【{item.date}】</div>
                <div className="announcement-text">{item.content}</div>
                {index < announcements.length - 1 && <hr />}
              </div>
            ))
          )}
        </div>

        <div className="dialog-footer">
          <button className="close-button" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
