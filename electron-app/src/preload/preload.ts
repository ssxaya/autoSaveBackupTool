import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  selectFile: () => Promise<string | null>
  selectDirectory: () => Promise<string | null>
  selectBackupDirectory: () => Promise<string | null>
  backendRequest: (action: string, data?: any) => Promise<any>
}

const electronAPI: ElectronAPI = {
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  selectBackupDirectory: () => ipcRenderer.invoke('select-backup-directory'),
  backendRequest: (action: string, data?: any) => ipcRenderer.invoke('backend-request', action, data)
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
