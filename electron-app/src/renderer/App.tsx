import React, { useState, useCallback } from 'react'
import {
  Announcement,
  FileSettings,
  BackupSettings,
  BackupList,
  StatusBar,
  LogViewer,
  AnnouncementDialog
} from './components'
import { useBackup } from './hooks/useBackup'
import './App.css'

function App() {
  const {
    state,
    loading,
    error,
    statusMessage,
    setError,
    setStatusMessage,
    selectSourceFile,
    selectSourceDirectory,
    selectBackupDirectory,
    performBackup,
    restoreBackup,
    deleteBackup,
    updateSourcePath,
    updateBackupDir,
    updateInterval
  } = useBackup()

  const [showLogs, setShowLogs] = useState(false)
  const [showAnnouncements, setShowAnnouncements] = useState(false)

  const handleManualBackup = useCallback(async () => {
    const success = await performBackup()
    if (!success && error) {
      setError(error)
    }
  }, [performBackup, error, setError])

  const handleToggleAutoBackup = useCallback(() => {
    setStatusMessage(state?.is_running ? '自动备份已停止' : '自动备份已启动')
  }, [state?.is_running, setStatusMessage])

  const handleRestore = useCallback(async (timestamp: string) => {
    const confirmed = window.confirm('还原将覆盖当前存档，确定要继续吗？')
    if (confirmed) {
      await restoreBackup(timestamp)
    }
  }, [restoreBackup])

  const handleDelete = useCallback(async (timestamp: string) => {
    const confirmed = window.confirm('确定要删除这个备份吗？')
    if (confirmed) {
      await deleteBackup(timestamp)
    }
  }, [deleteBackup])

  if (loading) {
    return (
      <div className="app loading">
        <div className="spinner"></div>
        <p>加载中...</p>
      </div>
    )
  }

  if (!state) {
    return (
      <div className="app error">
        <p>加载失败: {error || '未知错误'}</p>
      </div>
    )
  }

  const latestAnnouncement = state.announcements[state.announcements.length - 1]
  const announcementText = latestAnnouncement
    ? `【${latestAnnouncement.date}】 ${latestAnnouncement.content}`
    : '暂无公告'

  return (
    <div className="app">
      <Announcement
        content={announcementText}
        announcements={state.announcements}
        onShowAll={() => setShowAnnouncements(true)}
      />

      <div className="main-content">
        <FileSettings
          sourcePath={state.global_config.source_path}
          backupDir={state.global_config.backup_dir}
          isDirectory={state.global_config.is_directory}
          backupDirs={state.global_config.backup_dirs}
          onSelectFile={selectSourceFile}
          onSelectDirectory={selectSourceDirectory}
          onSelectBackupDir={selectBackupDirectory}
          onShowHistory={() => setStatusMessage('历史目录功能开发中')}
          onSourceChange={updateSourcePath}
          onBackupChange={updateBackupDir}
        />

        <BackupSettings
          interval={state.global_config.interval}
          isRunning={state.is_running}
          onIntervalChange={updateInterval}
          onManualBackup={handleManualBackup}
          onToggleAutoBackup={handleToggleAutoBackup}
        />

        <BackupList
          backups={state.backup_config.backups}
          onRestore={handleRestore}
          onDelete={handleDelete}
        />
      </div>

      <StatusBar
        message={statusMessage}
        version={state.version}
        onShowLogs={() => setShowLogs(true)}
      />

      {showLogs && (
        <LogViewer
          logs={state.backup_config.logs}
          onClose={() => setShowLogs(false)}
        />
      )}

      {showAnnouncements && (
        <AnnouncementDialog
          announcements={state.announcements}
          onClose={() => setShowAnnouncements(false)}
        />
      )}

      {error && (
        <div className="error-toast" onClick={() => setError(null)}>
          {error}
        </div>
      )}
    </div>
  )
}

export default App
