import { useState, useEffect, useCallback } from 'react'
import { backupService } from '../services/api'
import { AppState, BackupInfo, LogEntry } from '../types'

export function useBackup() {
  const [state, setState] = useState<AppState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('准备就绪')

  const loadState = useCallback(async () => {
    try {
      setLoading(true)
      const newState = await backupService.getState()
      setState(newState as AppState)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载状态失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadState()
  }, [loadState])

  const refreshState = useCallback(async () => {
    await loadState()
  }, [loadState])

  const selectSourceFile = useCallback(async () => {
    const path = await backupService.selectFile()
    if (path && state) {
      setState({
        ...state,
        global_config: {
          ...state.global_config,
          source_path: path,
          is_directory: false
        }
      })
      setStatusMessage(`已选择文件: ${path}`)
    }
    return path
  }, [state])

  const selectSourceDirectory = useCallback(async () => {
    const path = await backupService.selectDirectory()
    if (path && state) {
      setState({
        ...state,
        global_config: {
          ...state.global_config,
          source_path: path,
          is_directory: true
        }
      })
      setStatusMessage(`已选择文件夹: ${path}`)
    }
    return path
  }, [state])

  const selectBackupDirectory = useCallback(async () => {
    const path = await backupService.selectBackupDirectory()
    if (path) {
      await backupService.switchBackupDir(path)
      await refreshState()
      setStatusMessage(`已切换备份目录: ${path}`)
    }
    return path
  }, [refreshState])

  const performBackup = useCallback(async () => {
    if (!state) return

    const result = await backupService.validateSettings(
      state.global_config.source_path,
      state.global_config.backup_dir,
      state.global_config.interval
    )

    if (!result.success && result.errors) {
      setError(result.errors[0])
      return false
    }

    const backupResult = await backupService.performBackup()
    if (backupResult.success) {
      await refreshState()
      setStatusMessage(`备份完成`)
      return true
    } else {
      setError(backupResult.error || '备份失败')
      return false
    }
  }, [state, refreshState])

  const restoreBackup = useCallback(async (timestamp: string) => {
    const result = await backupService.restoreBackup(timestamp)
    if (result.success) {
      await refreshState()
      setStatusMessage('还原完成')
    } else {
      setError(result.error || '还原失败')
    }
    return result.success
  }, [refreshState])

  const deleteBackup = useCallback(async (timestamp: string) => {
    const result = await backupService.deleteBackup(timestamp)
    if (result.success) {
      await refreshState()
      setStatusMessage('备份已删除')
    } else {
      setError(result.error || '删除失败')
    }
    return result.success
  }, [refreshState])

  const updateSourcePath = useCallback((path: string, isDirectory: boolean) => {
    if (state) {
      setState({
        ...state,
        global_config: {
          ...state.global_config,
          source_path: path,
          is_directory: isDirectory
        }
      })
    }
  }, [state])

  const updateBackupDir = useCallback((path: string) => {
    if (state) {
      setState({
        ...state,
        global_config: {
          ...state.global_config,
          backup_dir: path
        }
      })
    }
  }, [state])

  const updateInterval = useCallback((interval: number) => {
    if (state) {
      setState({
        ...state,
        global_config: {
          ...state.global_config,
          interval
        }
      })
    }
  }, [state])

  return {
    state,
    loading,
    error,
    statusMessage,
    setError,
    setStatusMessage,
    refreshState,
    selectSourceFile,
    selectSourceDirectory,
    selectBackupDirectory,
    performBackup,
    restoreBackup,
    deleteBackup,
    updateSourcePath,
    updateBackupDir,
    updateInterval
  }
}
