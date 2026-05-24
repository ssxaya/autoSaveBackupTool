import { AppState, ApiResponse } from '../types'

class BackupService {
  async request<T = any>(action: string, data?: any): Promise<T> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }

    const result = await window.electronAPI.backendRequest(action, data)
    return result as T
  }

  async getState(): Promise<AppState> {
    return this.request<AppState>('get_state')
  }

  async validateSettings(
    sourcePath: string,
    backupDir: string,
    interval: number
  ): Promise<ApiResponse> {
    return this.request<ApiResponse>('validate_settings', {
      source_path: sourcePath,
      backup_dir: backupDir,
      interval
    })
  }

  async performBackup(): Promise<ApiResponse> {
    return this.request<ApiResponse>('perform_backup')
  }

  async restoreBackup(timestamp: string): Promise<ApiResponse> {
    return this.request<ApiResponse>('restore_backup', { timestamp })
  }

  async deleteBackup(timestamp: string): Promise<ApiResponse> {
    return this.request<ApiResponse>('delete_backup', { timestamp })
  }

  async switchBackupDir(directory: string): Promise<ApiResponse> {
    return this.request<ApiResponse>('switch_backup_dir', { directory })
  }

  async getBackupList(): Promise<{ backups: any[] }> {
    return this.request<{ backups: any[] }>('get_backup_list')
  }

  async getLogs(): Promise<{ logs: any[] }> {
    return this.request<{ logs: any[] }>('get_logs')
  }

  async updateConfig(config: any): Promise<ApiResponse> {
    return this.request<ApiResponse>('update_config', config)
  }

  async getDirectoryStats(directory: string): Promise<any> {
    return this.request<any>('get_directory_stats', { directory })
  }

  async selectFile(): Promise<string | null> {
    if (!window.electronAPI) return null
    return window.electronAPI.selectFile()
  }

  async selectDirectory(): Promise<string | null> {
    if (!window.electronAPI) return null
    return window.electronAPI.selectDirectory()
  }

  async selectBackupDirectory(): Promise<string | null> {
    if (!window.electronAPI) return null
    return window.electronAPI.selectBackupDirectory()
  }
}

export const backupService = new BackupService()
