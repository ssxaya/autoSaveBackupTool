import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import { join } from 'path'
import { spawn, ChildProcess } from 'child_process'
import log from 'electron-log'

log.initialize()
log.info('Application starting...')

let mainWindow: BrowserWindow | null = null
let pythonProcess: ChildProcess | null = null

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 700,
    height: 620,
    minWidth: 600,
    minHeight: 500,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    title: 'ASBT · 自动存档备份工具',
    show: false
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    log.info('Main window shown')
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  createMenu()
}

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        { label: '退出', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '刷新', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: '关于 ASBT',
              message: 'ASBT · 自动存档备份工具\n版本: 1.0.0\n作者: Yanxiao(ssxaya)'
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function startPythonBackend() {
  const backendPath = isDev
    ? join(__dirname, '../../backend')
    : join(process.resourcesPath, 'backend')

  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'

  pythonProcess = spawn(pythonCmd, [join(backendPath, 'server.py')], {
    cwd: backendPath,
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe']
  })

  pythonProcess.stdout?.on('data', (data) => {
    log.info(`Python: ${data.toString()}`)
  })

  pythonProcess.stderr?.on('data', (data) => {
    log.error(`Python Error: ${data.toString()}`)
  })

  pythonProcess.on('error', (err) => {
    log.error('Failed to start Python backend:', err)
  })

  pythonProcess.on('exit', (code) => {
    log.info(`Python backend exited with code ${code}`)
  })
}

function setupIpcHandlers() {
  ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      title: '选择要备份的文件'
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择要备份的文件夹'
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('select-backup-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: '选择备份目录'
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('backend-request', async (_event, action: string, data?: any) => {
    return new Promise((resolve, reject) => {
      if (!pythonProcess || pythonProcess.killed) {
        startPythonBackend()
        setTimeout(() => {
          resolve(null)
        }, 1000)
        return
      }

      const requestId = Date.now().toString()
      const payload = JSON.stringify({ id: requestId, action, data })

      pythonProcess.stdout?.once('data', (response) => {
        try {
          const parsed = JSON.parse(response.toString())
          if (parsed.id === requestId) {
            resolve(parsed.result)
          } else {
            resolve(parsed)
          }
        } catch (e) {
          resolve(response.toString())
        }
      })

      pythonProcess.stdin?.write(payload + '\n')

      setTimeout(() => {
        reject(new Error('Backend request timeout'))
      }, 30000)
    })
  })
}

app.whenReady().then(() => {
  log.info('App ready, creating window...')
  setupIpcHandlers()
  startPythonBackend()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (pythonProcess) {
    pythonProcess.kill()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (pythonProcess) {
    pythonProcess.kill()
  }
})
