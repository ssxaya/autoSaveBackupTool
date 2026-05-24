import React from 'react'
import './BackupSettings.css'

interface BackupSettingsProps {
  interval: number
  isRunning: boolean
  onIntervalChange: (value: number) => void
  onManualBackup: () => void
  onToggleAutoBackup: () => void
}

export const BackupSettings: React.FC<BackupSettingsProps> = ({
  interval,
  isRunning,
  onIntervalChange,
  onManualBackup,
  onToggleAutoBackup
}) => {
  return (
    <div className="backup-settings">
      <div className="setting-row">
        <label>备份间隔(分钟):</label>
        <input
          type="number"
          min="1"
          max="1440"
          value={interval}
          onChange={(e) => onIntervalChange(parseInt(e.target.value) || 5)}
        />
      </div>

      <div className="action-buttons">
        <button className="backup-now" onClick={onManualBackup}>
          立即备份
        </button>
        <button
          className={isRunning ? 'stop-auto' : 'start-auto'}
          onClick={onToggleAutoBackup}
        >
          {isRunning ? '停止自动备份' : '开始自动备份'}
        </button>
      </div>
    </div>
  )
}
