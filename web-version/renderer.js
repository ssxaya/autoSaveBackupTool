const VERSION = "v1.0.0";
const ANNOUNCEMENTS = [
    {
        "content": "Web版本发布！保留了所有原版功能，包括文件/文件夹备份、自动备份、日志记录等。",
        "date": "2025-05-24"
    },
    {
        "content": "v0.2版本更新：支持文件夹备份，可以备份整个游戏存档目录",
        "date": "2025-04-28"
    },
    {
        "content": "v0.4版本更新：新增日志与日志详情，右键日志即可进行回溯操作。优化窗口位置",
        "date": "2025-04-29"
    },
    {
        "content": "dev-v0.5版本更新：配置系统更新，数据配置文件(如历史、日志)保存在存档目录路径，基础设置保存用户目录",
        "date": "2025-04-29"
    },
    {
        "content": "dev-v0.5.1版本更新：公告更新，鼠标移动到公告栏会开始滚动，避免字数过长导致按钮位置问题",
        "date": "2025-05-06"
    },
    {
        "content": "dev-v0.5.2版本更新：兼容旧版本配置文件，启动时检测C:\\Users\\~\\.game_backup_tool目录下的config.json文件",
        "date": "2025-05-06"
    },
    {
        "content": "v0.5.3版本更新：新增旧版本配置迁移的历史记录与日志",
        "date": "2025-05-06"
    },
    {
        "content": "v0.6版本更新：新增历史备份目录列表进行管理（右键有更多选项）",
        "date": "2025-05-07"
    },
    {
        "content": "v0.6.1版本更新：右键备份列表可以还原与删除",
        "date": "2025-05-07"
    },
    {
        "content": "v0.6.2版本更新：状态栏状态数量更新、备份文件名时间戳精度提升至毫秒，修复了历史备份目录列表中删除某个目录后还会显示的问题",
        "date": "2025-05-08"
    }
];

let globalConfig = {
    source_path: "",
    is_directory: false,
    backup_dir: "",
    backup_dirs: [],
    interval: 5
};

let backupConfig = {
    backups: [],
    logs: []
};

let globalConfigFile = "";
let backupConfigFile = "";
let isRunning = false;
let autoBackupTimer = null;
let selectedBackupIndex = null;
let selectedLogIndex = null;
let selectedDirIndex = null;

async function init() {
    try {
        const homePath = await window.electronAPI.getHomePath();
        globalConfigFile = homePath + "\\autoSaveBackupTool_config.json";
        
        await loadGlobalConfig();
        
        if (globalConfig.backup_dir) {
            backupConfigFile = globalConfig.backup_dir + "\\config.json";
            await loadBackupConfig();
        }
        
        updateUI();
        updateBackupList();
        updateAnnouncementDisplay();
        updateStatus(`准备就绪，当前版本 ${VERSION}`);
        
        setTimeout(() => {
            checkOldConfig();
        }, 500);
    } catch (error) {
        console.error('初始化失败:', error);
        updateStatus('初始化失败');
    }
}

async function checkOldConfig() {
    try {
        const homePath = await window.electronAPI.getHomePath();
        const oldConfigFile = homePath + "\\.game_backup_tool\\config.json";
        const exists = await window.electronAPI.pathExists(oldConfigFile);
        
        if (exists) {
            const oldConfig = await window.electronAPI.readConfig(oldConfigFile);
            if (oldConfig) {
                showOldConfigDialog(oldConfig);
            }
        }
    } catch (error) {
        console.error('检查旧配置失败:', error);
    }
}

function showOldConfigDialog(oldConfig) {
    const body = `
        <p style="margin-bottom: 15px;">检测到旧版本配置文件，请选择操作：</p>
        <div class="checkbox-group">
            <div class="checkbox-item">
                <input type="radio" name="configChoice" value="old" checked>
                <label>使用旧版本配置</label>
            </div>
            <div class="checkbox-item">
                <input type="radio" name="configChoice" value="current">
                <label>使用当前配置</label>
            </div>
        </div>
        <div class="checkbox-group">
            <div class="checkbox-item">
                <input type="checkbox" id="migrateHistory" checked>
                <label>迁移历史记录和日志到备份目录</label>
            </div>
            <div class="checkbox-item">
                <input type="checkbox" id="deleteOld" checked>
                <label>删除旧版本配置文件</label>
            </div>
        </div>
    `;
    
    showModal('旧版本config兼容', body, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '确认', class: 'btn-primary', action: async () => {
            const choice = document.querySelector('input[name="configChoice"]:checked').value;
            const migrateHistory = document.getElementById('migrateHistory').checked;
            const deleteOld = document.getElementById('deleteOld').checked;
            
            if (choice === 'old') {
                Object.assign(globalConfig, oldConfig);
                
                if (!globalConfig.backup_dirs) {
                    globalConfig.backup_dirs = [];
                }
                if (globalConfig.backup_dir && !globalConfig.backup_dirs.includes(globalConfig.backup_dir)) {
                    globalConfig.backup_dirs.push(globalConfig.backup_dir);
                }
                
                await window.electronAPI.writeConfig(globalConfigFile, globalConfig);
                
                if (migrateHistory && globalConfig.backup_dir) {
                    backupConfigFile = globalConfig.backup_dir + "\\config.json";
                    
                    if (oldConfig.backups) {
                        backupConfig.backups = oldConfig.backups;
                    }
                    if (oldConfig.logs) {
                        backupConfig.logs = oldConfig.logs;
                    }
                    
                    await window.electronAPI.writeConfig(backupConfigFile, backupConfig);
                    showAlert('成功', '已成功导入旧版本配置并迁移历史记录和日志到备份目录');
                } else {
                    showAlert('成功', '已成功导入旧版本配置');
                }
                
                updateUI();
                updateBackupList();
            }
            
            if (deleteOld) {
                const homePath = await window.electronAPI.getHomePath();
                const oldConfigDir = homePath + "\\.game_backup_tool";
                await window.electronAPI.removeFile(homePath + "\\.game_backup_tool\\config.json");
                await window.electronAPI.removeDirectory(oldConfigDir);
                showAlert('成功', '已删除旧版本配置文件');
            }
            
            closeModal();
        }}
    ]);
}

async function loadGlobalConfig() {
    try {
        const config = await window.electronAPI.readConfig(globalConfigFile);
        if (config) {
            Object.assign(globalConfig, config);
        }
    } catch (error) {
        console.error('加载全局配置失败:', error);
    }
}

async function saveGlobalConfig() {
    try {
        await window.electronAPI.writeConfig(globalConfigFile, globalConfig);
    } catch (error) {
        console.error('保存全局配置失败:', error);
    }
}

async function loadBackupConfig() {
    try {
        if (!globalConfig.backup_dir) return;
        
        backupConfigFile = globalConfig.backup_dir + "\\config.json";
        const config = await window.electronAPI.readConfig(backupConfigFile);
        if (config) {
            Object.assign(backupConfig, config);
        }
    } catch (error) {
        console.error('加载备份配置失败:', error);
    }
}

async function saveBackupConfig() {
    try {
        if (!globalConfig.backup_dir) {
            updateStatus('未设置备份目录或目录不存在，无法保存配置');
            return;
        }
        
        await window.electronAPI.ensureDirectory(globalConfig.backup_dir);
        await window.electronAPI.writeConfig(backupConfigFile, backupConfig);
        updateStatus(`已保存备份配置到: ${backupConfigFile}`);
    } catch (error) {
        console.error('保存备份配置失败:', error);
    }
}

function updateUI() {
    document.getElementById('sourcePath').value = globalConfig.source_path || '';
    document.getElementById('backupDir').value = globalConfig.backup_dir || '';
    document.getElementById('interval').value = globalConfig.interval || 5;
}

function updateAnnouncementDisplay() {
    if (ANNOUNCEMENTS.length > 0) {
        const latest = ANNOUNCEMENTS[ANNOUNCEMENTS.length - 1];
        document.getElementById('announcementText').textContent = `【${latest.date}】 ${latest.content}`;
    } else {
        document.getElementById('announcementText').textContent = '暂无公告';
    }
}

function updateBackupList() {
    const tbody = document.getElementById('backupTableBody');
    tbody.innerHTML = '';
    
    let count = 0;
    const validBackups = [];
    
    backupConfig.backups.slice().reverse().forEach((backup, index) => {
        window.electronAPI.pathExists(backup.backup_path).then(exists => {
            if (exists) {
                const typeIndicator = backup.is_directory ? '[文件夹]' : '[文件]';
                const filename = backup.backup_path.split('\\').pop() || backup.backup_path.split('/').pop();
                const displayName = `${typeIndicator} ${filename}`;
                
                const row = tbody.insertRow();
                row.insertCell(0).textContent = backup.date;
                row.insertCell(1).textContent = displayName;
                row.dataset.timestamp = backup.timestamp;
                row.oncontextmenu = (e) => showBackupContextMenu(e, index);
                row.onclick = () => selectBackupRow(row, index);
                
                count++;
            }
        });
    });
    
    setTimeout(() => {
        updateStatus(`已更新备份列表，数量：${count}`);
    }, 100);
}

function selectBackupRow(row, index) {
    const rows = document.querySelectorAll('#backupTableBody tr');
    rows.forEach(r => r.classList.remove('selected'));
    row.classList.add('selected');
    selectedBackupIndex = index;
}

function showBackupContextMenu(event, index) {
    event.preventDefault();
    selectedBackupIndex = index;
    
    const body = `
        <p style="margin-bottom: 15px;">选择一个操作：</p>
        <div class="btn-group" style="display: flex; flex-direction: column; gap: 10px;">
            <button class="btn btn-primary" onclick="restoreBackup()">还原</button>
            <button class="btn btn-danger" onclick="deleteBackup()">删除</button>
            <button class="btn btn-secondary" onclick="showDeleteFolderDialog()">删除备份文件夹</button>
        </div>
    `;
    
    showModal('备份操作', body, [
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
}

async function selectSource(type) {
    try {
        let result;
        if (type === 'file') {
            result = await window.electronAPI.selectFile();
        } else {
            result = await window.electronAPI.selectDirectory();
        }
        
        if (result) {
            globalConfig.source_path = result.path;
            globalConfig.is_directory = (result.type === 'directory');
            
            document.getElementById('sourcePath').value = result.path;
            
            await saveGlobalConfig();
            
            const fileType = globalConfig.is_directory ? '文件夹' : '文件';
            updateStatus(`已选择${fileType}: ${result.path}`);
        }
    } catch (error) {
        console.error('选择源失败:', error);
        showAlert('错误', '选择文件或文件夹失败');
    }
}

async function selectBackupDir() {
    try {
        const result = await window.electronAPI.selectBackupDir();
        
        if (result) {
            await switchBackupDir(result);
        }
    } catch (error) {
        console.error('选择备份目录失败:', error);
        showAlert('错误', '选择备份目录失败');
    }
}

async function switchBackupDir(directory) {
    if (globalConfig.backup_dir && globalConfig.backup_dir !== directory) {
        await saveBackupConfig();
    }
    
    globalConfig.backup_dir = directory;
    document.getElementById('backupDir').value = directory;
    
    if (!globalConfig.backup_dirs.includes(directory)) {
        globalConfig.backup_dirs.push(directory);
        await saveGlobalConfig();
    }
    
    backupConfigFile = directory + "\\config.json";
    const exists = await window.electronAPI.pathExists(backupConfigFile);
    
    if (exists) {
        await loadBackupConfig();
        updateStatus('已加载备份目录中的配置文件');
    } else {
        backupConfig = { backups: [], logs: [] };
        await saveBackupConfig();
        updateStatus('已为新备份目录创建空白配置文件');
    }
    
    await saveGlobalConfig();
    updateBackupList();
    
    if (document.getElementById('modalBody').innerHTML.includes('日志')) {
        refreshLogDisplay();
    }
}

async function showBackupDirsList() {
    const validDirs = globalConfig.backup_dirs.filter(async dir => {
        return await window.electronAPI.pathExists(dir);
    });
    
    let dirsHTML = '';
    if (validDirs.length === 0) {
        dirsHTML = '<p style="text-align: center; color: #999;">无历史备份目录</p>';
    } else {
        dirsHTML = '<div class="list-container">';
        for (let i = 0; i < validDirs.length; i++) {
            dirsHTML += `<div class="list-item" onclick="selectDirItem(this, ${i}, '${validDirs[i]}')" data-dir="${validDirs[i]}">${validDirs[i]}</div>`;
        }
        dirsHTML += '</div>';
    }
    
    const body = `
        <p style="margin-bottom: 15px;">选择一个备份目录打开或右键进行操作：</p>
        ${dirsHTML}
    `;
    
    showModal('历史备份目录', body, [
        { text: '关闭', class: 'btn-secondary', action: closeModal },
        { text: '选择', class: 'btn-primary', action: async () => {
            if (selectedDirIndex !== null && validDirs[selectedDirIndex]) {
                await switchBackupDir(validDirs[selectedDirIndex]);
                closeModal();
            } else {
                showAlert('提示', '请先选择一个备份目录');
            }
        }}
    ]);
}

function selectDirItem(element, index, dir) {
    const items = document.querySelectorAll('.list-item');
    items.forEach(item => item.classList.remove('selected'));
    element.classList.add('selected');
    selectedDirIndex = index;
    
    element.oncontextmenu = (e) => {
        e.preventDefault();
        showDirContextMenu(e, index, dir);
    };
}

function showDirContextMenu(event, index, dir) {
    event.preventDefault();
    
    const body = `
        <p style="margin-bottom: 15px;">目录: ${dir}</p>
        <div class="btn-group" style="display: flex; flex-direction: column; gap: 10px;">
            <button class="btn btn-secondary" onclick="showDirInfo('${dir}')">状态</button>
            <button class="btn btn-danger" onclick="deleteFromHistory('${dir}')">从历史中删除</button>
            <button class="btn btn-danger" onclick="deleteBackupFolderFromList('${dir}')">删除备份文件夹</button>
        </div>
    `;
    
    showModal('目录操作', body, [
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
}

async function showDirInfo(dir) {
    const stats = await window.electronAPI.getDirectoryStats(dir);
    
    let body = '';
    if (stats) {
        body = `
            <div class="info-grid">
                <div class="info-item"><label>目录路径:</label></div>
                <div class="info-item"><span>${dir}</span></div>
                
                <div class="info-item"><label>创建时间:</label></div>
                <div class="info-item"><span>${new Date(stats.created).toLocaleString()}</span></div>
                
                <div class="info-item"><label>修改时间:</label></div>
                <div class="info-item"><span>${new Date(stats.modified).toLocaleString()}</span></div>
                
                <div class="info-item"><label>目录大小:</label></div>
                <div class="info-item"><span>${formatSize(stats.size)}</span></div>
                
                <div class="info-item"><label>文件数量:</label></div>
                <div class="info-item"><span>${stats.fileCount}</span></div>
                
                <div class="info-item"><label>文件夹数量:</label></div>
                <div class="info-item"><span>${stats.dirCount}</span></div>
            </div>
        `;
    } else {
        body = '<p>无法获取目录信息</p>';
    }
    
    showModal('状态', body, [
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
}

async function deleteFromHistory(dir) {
    if (confirm('确定要从历史记录中删除此目录吗？')) {
        const index = globalConfig.backup_dirs.indexOf(dir);
        if (index > -1) {
            globalConfig.backup_dirs.splice(index, 1);
            await saveGlobalConfig();
            closeModal();
            showBackupDirsList();
            updateStatus(`已从历史中删除: ${dir}`);
        }
    }
}

async function deleteBackupFolderFromList(dir) {
    const exists = await window.electronAPI.pathExists(dir);
    
    if (!exists) {
        if (confirm(`备份文件夹不存在:\n${dir}\n\n是否从历史记录中移除此目录?`)) {
            await deleteFromHistory(dir);
            showAlert('成功', '已从历史记录中移除此目录');
        }
        return;
    }
    
    showDeleteFolderDialog(dir, true);
}

function showDeleteFolderDialog(backupDir, isFromList = false) {
    const body = `
        <p style="margin-bottom: 15px;">确定要删除以下备份文件夹吗？</p>
        <p style="margin-bottom: 15px; word-break: break-all;">${backupDir}</p>
        <div class="checkbox-group">
            <div class="checkbox-item">
                <input type="checkbox" id="deleteConfig" checked>
                <label>删除配置文件</label>
            </div>
            <div class="checkbox-item">
                <input type="checkbox" id="deleteBackups" checked>
                <label>删除所有备份文件</label>
            </div>
        </div>
    `;
    
    showModal('删除备份文件夹', body, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '确定', class: 'btn-danger', action: async () => {
            const deleteConfig = document.getElementById('deleteConfig').checked;
            const deleteBackups = document.getElementById('deleteBackups').checked;
            
            if (!deleteConfig && !deleteBackups) {
                showAlert('提示', '未选择任何删除选项');
                return;
            }
            
            try {
                if (deleteBackups) {
                    for (let backup of backupConfig.backups) {
                        if (backup.is_directory) {
                            await window.electronAPI.removeDirectory(backup.backup_path);
                        } else {
                            await window.electronAPI.removeFile(backup.backup_path);
                        }
                    }
                }
                
                if (deleteConfig) {
                    const configPath = backupDir + "\\config.json";
                    await window.electronAPI.removeFile(configPath);
                }
                
                const index = globalConfig.backup_dirs.indexOf(backupDir);
                if (index > -1) {
                    globalConfig.backup_dirs.splice(index, 1);
                }
                
                if (backupDir === globalConfig.backup_dir) {
                    globalConfig.backup_dir = "";
                    backupConfig = { backups: [], logs: [] };
                    document.getElementById('backupDir').value = "";
                }
                
                await saveGlobalConfig();
                updateBackupList();
                closeModal();
                
                if (isFromList) {
                    showBackupDirsList();
                }
                
                showAlert('成功', '备份文件夹已删除');
                updateStatus(`已删除备份文件夹: ${backupDir}`);
            } catch (error) {
                console.error('删除失败:', error);
                showAlert('错误', `删除失败: ${error.message}`);
            }
        }}
    ]);
}

async function manualBackup() {
    if (!validateSettings()) return;
    
    try {
        await performBackup();
    } catch (error) {
        console.error('备份失败:', error);
        showAlert('错误', `备份失败: ${error.message}`);
    }
}

function toggleAutoBackup() {
    if (isRunning) {
        stopAutoBackup();
    } else {
        if (!validateSettings()) return;
        startAutoBackup();
    }
}

function startAutoBackup() {
    isRunning = true;
    document.getElementById('autoBackupBtn').textContent = '停止自动备份';
    document.getElementById('autoBackupBtn').classList.remove('btn-success');
    document.getElementById('autoBackupBtn').classList.add('btn-danger');
    updateStatus('自动备份已启动');
    
    const interval = globalConfig.interval * 60 * 1000;
    
    autoBackupTimer = setInterval(async () => {
        if (isRunning) {
            await performBackup();
        }
    }, interval);
}

function stopAutoBackup() {
    isRunning = false;
    if (autoBackupTimer) {
        clearInterval(autoBackupTimer);
        autoBackupTimer = null;
    }
    document.getElementById('autoBackupBtn').textContent = '开始自动备份';
    document.getElementById('autoBackupBtn').classList.remove('btn-danger');
    document.getElementById('autoBackupBtn').classList.add('btn-success');
    updateStatus('自动备份已停止');
}

async function performBackup() {
    const sourcePath = globalConfig.source_path;
    const backupDir = globalConfig.backup_dir;
    const isDirectory = globalConfig.is_directory;
    
    await window.electronAPI.ensureDirectory(backupDir);
    
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:T]/g, '').replace(/\..+/, '').slice(0, 18);
    const sourceName = sourcePath.split('\\').pop() || sourcePath.split('/').pop();
    const backupPath = backupDir + "\\" + sourceName + "_" + timestamp;
    
    if (isDirectory) {
        await window.electronAPI.copyDirectory(sourcePath, backupPath);
    } else {
        await window.electronAPI.copyFile(sourcePath, backupPath);
    }
    
    const backupInfo = {
        timestamp: timestamp,
        original: sourcePath,
        backup_path: backupPath,
        is_directory: isDirectory,
        date: now.toLocaleString()
    };
    
    backupConfig.backups.push(backupInfo);
    await addLog('backup', backupInfo);
    await saveBackupConfig();
    updateBackupList();
    updateStatus(`备份完成: ${sourceName} 于 ${backupInfo.date}`);
}

async function restoreBackup() {
    if (selectedBackupIndex === null) {
        showAlert('提示', '请先选择一个备份');
        return;
    }
    
    const backupIndex = backupConfig.backups.length - 1 - selectedBackupIndex;
    const backup = backupConfig.backups[backupIndex];
    
    if (!backup) {
        showAlert('错误', '找不到备份信息');
        return;
    }
    
    if (!confirm('还原将覆盖当前存档，确定要继续吗？')) {
        return;
    }
    
    try {
        await performBackup();
        
        const exists = await window.electronAPI.pathExists(backup.original);
        if (exists) {
            if (backup.is_directory) {
                await window.electronAPI.removeDirectory(backup.original);
            } else {
                await window.electronAPI.removeFile(backup.original);
            }
        }
        
        if (backup.is_directory) {
            await window.electronAPI.copyDirectory(backup.backup_path, backup.original);
        } else {
            await window.electronAPI.copyFile(backup.backup_path, backup.original);
        }
        
        await addLog('restore', backup);
        await saveBackupConfig();
        
        closeModal();
        showAlert('成功', '存档已还原');
        updateStatus(`已还原: ${backup.backup_path.split('\\').pop()}`);
    } catch (error) {
        console.error('还原失败:', error);
        showAlert('错误', `还原失败: ${error.message}`);
    }
}

async function deleteBackup() {
    if (selectedBackupIndex === null) {
        showAlert('提示', '请先选择一个备份');
        return;
    }
    
    if (!confirm('确定要删除这个备份吗？')) {
        return;
    }
    
    try {
        const backupIndex = backupConfig.backups.length - 1 - selectedBackupIndex;
        const backup = backupConfig.backups[backupIndex];
        
        if (backup) {
            if (backup.is_directory) {
                await window.electronAPI.removeDirectory(backup.backup_path);
            } else {
                await window.electronAPI.removeFile(backup.backup_path);
            }
            
            backupConfig.backups.splice(backupIndex, 1);
            await addLog('delete', backup);
            await saveBackupConfig();
            updateBackupList();
            
            closeModal();
            showAlert('成功', '备份已删除');
        }
    } catch (error) {
        console.error('删除失败:', error);
        showAlert('错误', `删除失败: ${error.message}`);
    }
}

function showDeleteFolderDialog(backupDir, isFromList = false) {
    const body = `
        <p style="margin-bottom: 15px;">确定要删除以下备份文件夹吗？</p>
        <p style="margin-bottom: 15px; word-break: break-all;">${backupDir}</p>
        <div class="checkbox-group">
            <div class="checkbox-item">
                <input type="checkbox" id="deleteConfig" checked>
                <label>删除配置文件</label>
            </div>
            <div class="checkbox-item">
                <input type="checkbox" id="deleteBackups" checked>
                <label>删除所有备份文件</label>
            </div>
        </div>
    `;
    
    showModal('删除备份文件夹', body, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '确定', class: 'btn-danger', action: async () => {
            const deleteConfig = document.getElementById('deleteConfig').checked;
            const deleteBackups = document.getElementById('deleteBackups').checked;
            
            if (!deleteConfig && !deleteBackups) {
                showAlert('提示', '未选择任何删除选项');
                return;
            }
            
            try {
                if (deleteBackups) {
                    for (let backup of backupConfig.backups) {
                        if (backup.is_directory) {
                            await window.electronAPI.removeDirectory(backup.backup_path);
                        } else {
                            await window.electronAPI.removeFile(backup.backup_path);
                        }
                    }
                }
                
                if (deleteConfig) {
                    const configPath = backupDir + "\\config.json";
                    await window.electronAPI.removeFile(configPath);
                }
                
                const index = globalConfig.backup_dirs.indexOf(backupDir);
                if (index > -1) {
                    globalConfig.backup_dirs.splice(index, 1);
                }
                
                if (backupDir === globalConfig.backup_dir) {
                    globalConfig.backup_dir = "";
                    backupConfig = { backups: [], logs: [] };
                    document.getElementById('backupDir').value = "";
                }
                
                await saveGlobalConfig();
                updateBackupList();
                closeModal();
                
                if (isFromList) {
                    showBackupDirsList();
                }
                
                showAlert('成功', '备份文件夹已删除');
                updateStatus(`已删除备份文件夹: ${backupDir}`);
            } catch (error) {
                console.error('删除失败:', error);
                showAlert('错误', `删除失败: ${error.message}`);
            }
        }}
    ]);
}

function showLogs() {
    let logsHTML = '';
    if (backupConfig.logs.length === 0) {
        logsHTML = '<p style="text-align: center; color: #999;">暂无日志</p>';
    } else {
        logsHTML = '<div class="list-container">';
        for (let i = backupConfig.logs.length - 1; i >= 0; i--) {
            const log = backupConfig.logs[i];
            const actionMap = {
                "backup": "备份",
                "restore": "还原",
                "delete": "删除",
                "restore_deleted": "恢复删除的备份",
                "rollback": "回溯操作"
            };
            const actionText = actionMap[log.action] || log.action;
            const backupInfo = log.backup_info;
            const typeIndicator = backupInfo.is_directory ? '[文件夹]' : '[文件]';
            const filename = (backupInfo.backup_path.split('\\').pop() || backupInfo.backup_path.split('/').pop());
            const displayName = `${typeIndicator} ${filename}`;
            
            logsHTML += `
                <div class="log-entry" onclick="selectLogItem(this, ${i})" data-timestamp="${log.timestamp}">
                    <div><strong>${log.date}</strong> - ${actionText}</div>
                    <div style="color: #666; margin-top: 5px;">${displayName}</div>
                </div>
            `;
        }
        logsHTML += '</div>';
    }
    
    const body = logsHTML;
    
    showModal('日志', body, [
        { text: '关闭', class: 'btn-secondary', action: closeModal },
        { text: '状态', class: 'btn-secondary', action: () => {
            if (selectedLogIndex !== null) {
                viewFileStatusFromLog();
            } else {
                showAlert('提示', '请先选择一个日志记录');
            }
        }},
        { text: '回溯', class: 'btn-primary', action: () => {
            if (selectedLogIndex !== null) {
                rollbackLogAction();
            } else {
                showAlert('提示', '请先选择一个日志记录');
            }
        }}
    ]);
}

function selectLogItem(element, index) {
    const items = document.querySelectorAll('.log-entry');
    items.forEach(item => item.classList.remove('selected'));
    element.classList.add('selected');
    selectedLogIndex = backupConfig.logs.length - 1 - index;
}

function refreshLogDisplay() {
    if (document.getElementById('modalTitle').textContent === '日志') {
        showLogs();
    }
}

async function viewFileStatusFromLog() {
    if (selectedLogIndex === null || selectedLogIndex < 0 || selectedLogIndex >= backupConfig.logs.length) {
        showAlert('错误', '找不到日志信息');
        return;
    }
    
    const log = backupConfig.logs[selectedLogIndex];
    const backupInfo = log.backup_info;
    const backupPath = backupInfo.backup_path;
    
    const exists = await window.electronAPI.pathExists(backupPath);
    if (!exists) {
        showAlert('错误', '备份文件已不存在');
        return;
    }
    
    showFileInfo(backupInfo, log.action);
}

async function rollbackLogAction() {
    if (selectedLogIndex === null || selectedLogIndex < 0 || selectedLogIndex >= backupConfig.logs.length) {
        showAlert('错误', '找不到日志信息');
        return;
    }
    
    const log = backupConfig.logs[selectedLogIndex];
    const actionType = log.action;
    const backupInfo = log.backup_info;
    
    if (actionType === 'delete') {
        await rollbackDeleteAction(backupInfo);
    } else if (actionType === 'backup' || actionType === 'restore') {
        await rollbackToFileState(backupInfo);
    }
}

async function rollbackDeleteAction(backupInfo) {
    const backupPath = backupInfo.backup_path;
    const exists = await window.electronAPI.pathExists(backupPath);
    
    if (exists) {
        showAlert('提示', '该备份文件已存在，无需恢复');
        return;
    }
    
    if (!confirm('确定要恢复这个被删除的备份吗？')) {
        return;
    }
    
    try {
        const isDirectory = backupInfo.is_directory;
        const originalPath = backupInfo.original;
        
        const backupDir = backupPath.substring(0, backupPath.lastIndexOf('\\'));
        await window.electronAPI.ensureDirectory(backupDir);
        
        const originalExists = await window.electronAPI.pathExists(originalPath);
        if (originalExists) {
            if (isDirectory) {
                await window.electronAPI.copyDirectory(originalPath, backupPath);
            } else {
                await window.electronAPI.copyFile(originalPath, backupPath);
            }
            
            backupConfig.backups.push(backupInfo);
            await addLog('restore_deleted', backupInfo);
            await saveBackupConfig();
            updateBackupList();
            
            closeModal();
            showAlert('成功', '已恢复被删除的备份');
            updateStatus(`已恢复被删除的备份: ${backupInfo.backup_path.split('\\').pop()}`);
        } else {
            showAlert('错误', '原始文件不存在，无法恢复备份');
        }
    } catch (error) {
        console.error('恢复备份失败:', error);
        showAlert('错误', `恢复备份失败: ${error.message}`);
    }
}

async function rollbackToFileState(backupInfo) {
    const backupPath = backupInfo.backup_path;
    const exists = await window.electronAPI.pathExists(backupPath);
    
    if (!exists) {
        showAlert('错误', '备份文件已不存在，无法回溯');
        return;
    }
    
    if (!confirm('回溯将使用此备份覆盖当前存档，确定要继续吗？')) {
        return;
    }
    
    try {
        await performBackup();
        
        const isDirectory = backupInfo.is_directory;
        const originalPath = backupInfo.original;
        
        const originalExists = await window.electronAPI.pathExists(originalPath);
        if (originalExists) {
            if (isDirectory) {
                await window.electronAPI.removeDirectory(originalPath);
            } else {
                await window.electronAPI.removeFile(originalPath);
            }
        }
        
        if (isDirectory) {
            await window.electronAPI.copyDirectory(backupPath, originalPath);
        } else {
            await window.electronAPI.copyFile(backupPath, originalPath);
        }
        
        await addLog('rollback', backupInfo);
        
        closeModal();
        showAlert('成功', '已回溯到所选操作时的文件状态');
        updateStatus(`已回溯: ${backupInfo.backup_path.split('\\').pop()}`);
    } catch (error) {
        console.error('回溯失败:', error);
        showAlert('错误', `回溯失败: ${error.message}`);
    }
}

async function showFileInfo(backupInfo, actionType) {
    const actionMap = {
        "backup": "备份",
        "restore": "还原",
        "delete": "删除"
    };
    const actionText = actionMap[actionType] || actionType;
    const isDirectory = backupInfo.is_directory;
    const typeText = isDirectory ? '文件夹' : '文件';
    
    let body = `
        <div class="info-grid">
            <div class="info-item"><label>操作类型:</label></div>
            <div class="info-item"><span>${actionText}</span></div>
            
            <div class="info-item"><label>操作时间:</label></div>
            <div class="info-item"><span>${backupInfo.date}</span></div>
            
            <div class="info-item"><label>类型:</label></div>
            <div class="info-item"><span>${typeText}</span></div>
            
            <div class="info-item"><label>原始路径:</label></div>
            <div class="info-item"><span style="word-break: break-all;">${backupInfo.original}</span></div>
            
            <div class="info-item"><label>备份路径:</label></div>
            <div class="info-item"><span style="word-break: break-all;">${backupInfo.backup_path}</span></div>
        </div>
    `;
    
    showModal('文件状态信息', body, [
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
}

async function addLog(actionType, backupInfo) {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:T]/g, '').replace(/\..+/, '').slice(0, 18);
    
    const logEntry = {
        timestamp: timestamp,
        date: now.toLocaleString(),
        action: actionType,
        backup_info: JSON.parse(JSON.stringify(backupInfo))
    };
    
    backupConfig.logs.push(logEntry);
    
    const actionMap = {
        "backup": "备份",
        "restore": "还原",
        "delete": "删除",
        "restore_deleted": "恢复删除的备份",
        "rollback": "回溯操作"
    };
    const actionText = actionMap[actionType] || actionType;
    updateStatus(`已记录${actionText}操作到日志`);
}

function showAnnouncements() {
    let announcementsHTML = '<div class="announcements-list">';
    
    for (let i = ANNOUNCEMENTS.length - 1; i >= 0; i--) {
        const announcement = ANNOUNCEMENTS[i];
        announcementsHTML += `
            <div class="announcement-item">
                <div class="announcement-date">${announcement.date}</div>
                <div class="announcement-content">${announcement.content}</div>
            </div>
        `;
    }
    
    announcementsHTML += '</div>';
    
    showModal('公告信息', announcementsHTML, [
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
}

function validateSettings() {
    const sourcePath = document.getElementById('sourcePath').value;
    const backupDir = document.getElementById('backupDir').value;
    const interval = document.getElementById('interval').value;
    
    if (!sourcePath) {
        showAlert('错误', '请选择源文件或文件夹');
        return false;
    }
    
    if (!backupDir) {
        showAlert('错误', '请选择备份目录');
        return false;
    }
    
    if (!interval || interval <= 0) {
        showAlert('错误', '备份间隔必须大于0');
        return false;
    }
    
    globalConfig.interval = parseInt(interval);
    globalConfig.source_path = sourcePath;
    globalConfig.backup_dir = backupDir;
    
    saveGlobalConfig();
    
    return true;
}

function showModal(title, body, buttons = []) {
    const modal = document.getElementById('modal');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = body;
    
    const footer = document.getElementById('modalFooter');
    footer.innerHTML = '';
    
    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.className = `btn ${btn.class}`;
        button.textContent = btn.text;
        button.onclick = btn.action;
        footer.appendChild(button);
    });
    
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
    selectedBackupIndex = null;
    selectedLogIndex = null;
    selectedDirIndex = null;
}

function showAlert(title, message) {
    showModal(title, `<p>${message}</p>`, [
        { text: '确定', class: 'btn-primary', action: closeModal }
    ]);
}

function updateStatus(message) {
    document.getElementById('statusBar').textContent = message;
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
        closeModal();
    }
};

document.addEventListener('DOMContentLoaded', init);
