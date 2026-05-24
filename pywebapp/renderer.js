const VERSION = "v1.0.0";
const ANNOUNCEMENTS = [
    {
        "content": "Web版本发布！保留了所有原版功能，包括文件/文件夹备份、自动备份、日志记录等。",
        "date": "2025-05-24"
    },
    {
        "content": "v0.6.2版本更新：状态栏状态数量更新、备份文件名时间戳精度提升至毫秒",
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

let isRunning = false;
let autoBackupTimer = null;
let selectedBackupIndex = null;
let selectedLogIndex = null;
let selectedDirIndex = null;
let api = null;

async function init() {
    try {
        api = window.pywebview.api;
        
        const version = await api.get_version();
        globalConfig = await api.get_global_config();
        backupConfig = await api.get_backup_config();
        
        updateUI();
        updateBackupList();
        updateAnnouncementDisplay();
        updateStatus(`准备就绪，当前版本 ${version}`);
    } catch (error) {
        console.error('初始化失败:', error);
        updateStatus('初始化失败');
    }
}

async function loadBackupConfig() {
    backupConfig = await api.get_backup_config();
}

async function saveBackupConfig() {
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

async function updateBackupList() {
    const tbody = document.getElementById('backupTableBody');
    tbody.innerHTML = '';
    
    let count = 0;
    const validBackups = [];
    
    backupConfig.backups.slice().reverse().forEach((backup, index) => {
        const exists = await api.path_exists(backup.backup_path);
        if (exists) {
            const typeIndicator = backup.is_directory ? '[文件夹]' : '[文件]';
            const filename = backup.backup_path.split(/[/\\]/).pop();
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
        const isDirectory = type === 'directory';
        const result = await api.select_source(isDirectory);
        
        if (result) {
            globalConfig.source_path = result.path;
            globalConfig.is_directory = (result.type === 'directory');
            
            document.getElementById('sourcePath').value = result.path;
            
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
        const result = await api.select_backup_dir();
        
        if (result) {
            globalConfig.backup_dir = result;
            document.getElementById('backupDir').value = result;
            
            backupConfig = await api.get_backup_config();
            updateBackupList();
            
            updateStatus('已切换备份目录');
        }
    } catch (error) {
        console.error('选择备份目录失败:', error);
        showAlert('错误', '选择备份目录失败');
    }
}

async function showBackupDirsList() {
    let dirsHTML = '';
    if (globalConfig.backup_dirs.length === 0) {
        dirsHTML = '<p style="text-align: center; color: #999;">无历史备份目录</p>';
    } else {
        dirsHTML = '<div class="list-container">';
        for (let i = 0; i < globalConfig.backup_dirs.length; i++) {
            dirsHTML += `<div class="list-item" onclick="selectDirItem(this, ${i}, '${globalConfig.backup_dirs[i]}')" data-dir="${globalConfig.backup_dirs[i]}">${globalConfig.backup_dirs[i]}</div>`;
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
            if (selectedDirIndex !== null && globalConfig.backup_dirs[selectedDirIndex]) {
                globalConfig.backup_dir = globalConfig.backup_dirs[selectedDirIndex];
                document.getElementById('backupDir').value = globalConfig.backup_dir;
                backupConfig = await api.get_backup_config();
                updateBackupList();
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
    const stats = await api.get_directory_stats(dir);
    
    let body = '';
    if (stats) {
        body = `
            <div class="info-grid">
                <div class="info-item"><label>目录路径:</label></div>
                <div class="info-item"><span>${dir}</span></div>
                
                <div class="info-item"><label>创建时间:</label></div>
                <div class="info-item"><span>${stats.created_time}</span></div>
                
                <div class="info-item"><label>修改时间:</label></div>
                <div class="info-item"><span>${stats.modified_time}</span></div>
                
                <div class="info-item"><label>目录大小:</label></div>
                <div class="info-item"><span>${stats.size}</span></div>
                
                <div class="info-item"><label>文件数量:</label></div>
                <div class="info-item"><span>${stats.file_count}</span></div>
                
                <div class="info-item"><label>文件夹数量:</label></div>
                <div class="info-item"><span>${stats.dir_count}</span></div>
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
            await api.save_global_config(globalConfig);
            closeModal();
            showBackupDirsList();
            updateStatus(`已从历史中删除: ${dir}`);
        }
    }
}

async function deleteBackupFolderFromList(dir) {
    const exists = await api.path_exists(dir);
    
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
                    await api.remove_directory(backupDir);
                }
                
                if (isFromList) {
                    await deleteFromHistory(backupDir);
                }
                
                closeModal();
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
        await api.perform_backup();
        backupConfig = await api.get_backup_config();
        updateBackupList();
        updateStatus('备份完成');
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

async function startAutoBackup() {
    isRunning = true;
    document.getElementById('autoBackupBtn').textContent = '停止自动备份';
    document.getElementById('autoBackupBtn').classList.remove('btn-success');
    document.getElementById('autoBackupBtn').classList.add('btn-danger');
    updateStatus('自动备份已启动');
    
    const interval = globalConfig.interval * 60 * 1000;
    
    autoBackupTimer = setInterval(async () => {
        if (isRunning) {
            try {
                await api.perform_backup();
                backupConfig = await api.get_backup_config();
                updateBackupList();
                updateStatus('备份完成');
            } catch (error) {
                console.error('自动备份失败:', error);
            }
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
        await api.restore_backup(backup.timestamp);
        backupConfig = await api.get_backup_config();
        updateBackupList();
        
        closeModal();
        showAlert('成功', '存档已还原');
        updateStatus(`已还原: ${backup.backup_path.split(/[/\\]/).pop()}`);
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
            await api.delete_backup(backup.timestamp);
            backupConfig = await api.get_backup_config();
            updateBackupList();
            
            closeModal();
            showAlert('成功', '备份已删除');
        }
    } catch (error) {
        console.error('删除失败:', error);
        showAlert('错误', `删除失败: ${error.message}`);
    }
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
            const filename = backupInfo.backup_path.split(/[/\\]/).pop();
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
        { text: '回溯', class: 'btn-primary', action: () => {
            if (selectedLogIndex !== null) {
                showAlert('提示', '回溯功能需要在还原后手动操作');
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
    
    api.save_global_config(globalConfig);
    
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

window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
        closeModal();
    }
};

document.addEventListener('DOMContentLoaded', init);
