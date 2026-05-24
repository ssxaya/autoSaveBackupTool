import React from 'react'
import './FileSettings.css'

interface FileSettingsProps {
  sourcePath: string
  backupDir: string
  isDirectory: boolean
  backupDirs: string[]
  onSelectFile: () => void
  onSelectDirectory: () => void
  onSelectBackupDir: () => void
  onShowHistory: () => void
  onSourceChange: (value: string) => void
  onBackupChange: (value: string) => void
}

export const FileSettings: React.FC<FileSettingsProps> = ({
  sourcePath,
  backupDir,
  isDirectory,
  onSelectFile,
  onSelectDirectory,
  onSelectBackupDir,
  onShowHistory,
  onSourceChange,
  onBackupChange
}) => {
  return (
    <div className="file-settings">
      <div className="setting-row">
        <label>源文件/文件夹:</label>
        <input
          type="text"
          value={sourcePath}
          onChange={(e) => onSourceChange(e.target.value)}
          placeholder="选择要备份的文件或文件夹"
        />
        <div className="btn-group">
          <button onClick={onSelectFile}>选择文件</button>
          <button onClick={onSelectDirectory}>选择文件夹</button>
        </div>
      </div>

      <div className="setting-row">
        <label>备份目录:</label>
        <input
          type="text"
          value={backupDir}
          onChange={(e) => onBackupChange(e.target.value)}
          placeholder="选择备份目录"
        />
        <div className="btn-group">
          <button onClick={onSelectBackupDir}>浏览</button>
          <button onClick={onShowHistory}>历史目录</button>
        </div>
      </div>
    </div>
  )
}
