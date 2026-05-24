const ACTION_MAP = {
  backup: '备份',
  restore: '还原',
  delete: '删除',
  restore_deleted: '恢复删除的备份',
  rollback: '回溯操作'
};

let globalConfig = {
  source_path: '',
  is_directory: false,
  backup_dir: '',
  backup_dirs: [],
  interval: 5
};

let backupConfig = {
  backups: [],
  logs: []
};

let isAutoRunning = false;
let announcements = [];
let contextTarget = null;
let logContextTarget = null;
let dirContextTarget = null;
let dirContextIndex = -1;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function setStatus(text) {
  $('#statusBar').textContent = text;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function basename(path) {
  if (!path) return '';
  return path.replace(/\\/g, '/').split('/').pop() || '';
}

function showModal(title, bodyHtml, footerHtml, sizeClass) {
  const overlay = $('#modalOverlay');
  const container = $('#modalContainer');
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHtml;
  $('#modalFooter').innerHTML = footerHtml || '';
  container.className = 'modal' + (sizeClass ? ' ' + sizeClass : '');
  overlay.classList.add('active');
}

function hideModal() {
  $('#modalOverlay').classList.remove('active');
  $('#modalBody').innerHTML = '';
  $('#modalFooter').innerHTML = '';
}

function hideAllContextMenus() {
  $$('.context-menu').forEach(m => m.style.display = 'none');
}

function showContextMenu(menuEl, x, y) {
  hideAllContextMenus();
  menuEl.style.display = 'block';
  const rect = menuEl.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width - 4;
  const maxY = window.innerHeight - rect.height - 4;
  menuEl.style.left = Math.min(x, maxX) + 'px';
  menuEl.style.top = Math.min(y, maxY) + 'px';
}

function updateUI() {
  $('#sourcePath').value = globalConfig.source_path || '';
  $('#backupDir').value = globalConfig.backup_dir || '';
  $('#intervalInput').value = globalConfig.interval || 5;
  const autoBtn = $('#btnToggleAuto');
  if (isAutoRunning) {
    autoBtn.textContent = '停止自动备份';
    autoBtn.classList.remove('btn-accent');
    autoBtn.classList.add('btn-danger');
  } else {
    autoBtn.textContent = '开始自动备份';
    autoBtn.classList.remove('btn-danger');
    autoBtn.classList.add('btn-accent');
  }
}

function updateBackupList() {
  const tbody = $('#backupListBody');
  tbody.innerHTML = '';
  let count = 0;
  const backups = [...backupConfig.backups].reverse();
  for (const backup of backups) {
    const isDir = backup.is_directory || false;
    const typeIndicator = isDir ? '[文件夹]' : '[文件]';
    const filename = basename(backup.backup_path);
    const displayName = typeIndicator + ' ' + filename;
    const tr = document.createElement('tr');
    tr.dataset.timestamp = backup.timestamp;
    tr.innerHTML = '<td>' + escapeHtml(backup.date || '') + '</td><td>' + escapeHtml(displayName) + '</td>';
    tbody.appendChild(tr);
    count++;
  }
  setStatus('已更新备份列表，数量：' + count);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadGlobalConfig() {
  const result = await window.api.loadGlobalConfig();
  if (result.success && result.config) {
    Object.keys(globalConfig).forEach(key => {
      if (result.config[key] !== undefined) {
        globalConfig[key] = result.config[key];
      }
    });
    if (!globalConfig.backup_dirs && globalConfig.backup_dir) {
      globalConfig.backup_dirs = [globalConfig.backup_dir];
    }
    if (!globalConfig.backup_dirs) {
      globalConfig.backup_dirs = [];
    }
  }
}

async function saveGlobalConfig() {
  await window.api.saveGlobalConfig(globalConfig);
}

async function loadBackupConfig() {
  if (!globalConfig.backup_dir) return;
  const result = await window.api.loadBackupConfig(globalConfig.backup_dir);
  if (result.success && result.config) {
    backupConfig = {
      backups: result.config.backups || [],
      logs: result.config.logs || []
    };
  } else {
    backupConfig = { backups: [], logs: [] };
  }
}

async function saveBackupConfig() {
  if (!globalConfig.backup_dir) return;
  await window.api.saveBackupConfig(globalConfig.backup_dir, backupConfig);
}

async function saveAllConfig() {
  await saveGlobalConfig();
  await saveBackupConfig();
}

async function selectSourceFile() {
  const result = await window.api.selectSource();
  if (result && result.path) {
    globalConfig.source_path = result.path;
    globalConfig.is_directory = false;
    await saveGlobalConfig();
    updateUI();
    setStatus('已选择文件: ' + result.path);
  }
}

async function selectSourceDir() {
  const result = await window.api.selectSourceDir();
  if (result && result.path) {
    globalConfig.source_path = result.path;
    globalConfig.is_directory = true;
    await saveGlobalConfig();
    updateUI();
    setStatus('已选择文件夹: ' + result.path);
  }
}

async function selectBackupDir() {
  const path = await window.api.selectBackupDir();
  if (path) {
    await switchBackupDir(path);
    if (!globalConfig.backup_dirs.includes(path)) {
      globalConfig.backup_dirs.push(path);
      await saveGlobalConfig();
    }
  }
}

async function switchBackupDir(directory) {
  if (globalConfig.backup_dir) {
    await saveBackupConfig();
  }
  globalConfig.backup_dir = directory;
  await loadBackupConfig();
  await saveGlobalConfig();
  updateUI();
  updateBackupList();
}

function validateSettings() {
  if (!globalConfig.source_path) {
    showModal('错误', '<div class="confirm-text">请选择源文件或文件夹</div>', '<button class="btn btn-primary" onclick="hideModal()">确定</button>', 'modal-sm');
    return false;
  }
  if (!globalConfig.backup_dir) {
    showModal('错误', '<div class="confirm-text">请选择备份目录</div>', '<button class="btn btn-primary" onclick="hideModal()">确定</button>', 'modal-sm');
    return false;
  }
  const interval = parseInt($('#intervalInput').value, 10);
  if (isNaN(interval) || interval <= 0) {
    showModal('错误', '<div class="confirm-text">请输入有效的备份间隔</div>', '<button class="btn btn-primary" onclick="hideModal()">确定</button>', 'modal-sm');
    return false;
  }
  globalConfig.interval = interval;
  return true;
}

async function manualBackup() {
  if (!validateSettings()) return;
  try {
    await performBackup();
  } catch (e) {
    showModal('错误', '<div class="confirm-text">备份失败: ' + escapeHtml(e.message || String(e)) + '</div>', '<button class="btn btn-primary" onclick="hideModal()">确定</button>', 'modal-sm');
  }
}

async function performBackup() {
  const sourcePath = globalConfig.source_path;
  const backupDir = globalConfig.backup_dir;
  const isDirectory = globalConfig.is_directory;

  const result = await window.api.performBackup(sourcePath, backupDir, isDirectory);
  if (result.success && result.backupInfo) {
    backupConfig.backups.push(result.backupInfo);
    addLog('backup', result.backupInfo);
    await saveAllConfig();
    updateBackupList();
    const name = basename(result.backupInfo.backup_path);
    setStatus('备份完成: ' + name + ' 于 ' + result.backupInfo.date);
    return result.backupInfo;
  } else {
    throw new Error('备份操作失败');
  }
}

function addLog(actionType, backupInfo) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  const timestamp = now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '_' +
    pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds()) + '_' + ms;
  const date = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' +
    pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());

  const logEntry = {
    timestamp: timestamp,
    date: date,
    action: actionType,
    backup_info: JSON.parse(JSON.stringify(backupInfo))
  };
  backupConfig.logs.push(logEntry);
}

async function toggleAutoBackup() {
  if (isAutoRunning) {
    const result = await window.api.stopAutoBackup();
    if (result.success) {
      isAutoRunning = false;
      updateUI();
      setStatus('自动备份已停止');
    }
  } else {
    if (!validateSettings()) return;
    const interval = parseInt($('#intervalInput').value, 10);
    globalConfig.interval = interval;
    await saveGlobalConfig();
    const result = await window.api.startAutoBackup(
      interval,
      globalConfig.source_path,
      globalConfig.backup_dir,
      globalConfig.is_directory
    );
    if (result.success) {
      isAutoRunning = true;
      updateUI();
      setStatus('自动备份已启动，间隔 ' + interval + ' 分钟');
    } else {
      showModal('错误', '<div class="confirm-text">启动自动备份失败</div>', '<button class="btn btn-primary" onclick="hideModal()">确定</button>', 'modal-sm');
    }
  }
}

function showContextMenu_backup(e) {
  const tr = e.target.closest('tr');
  if (!tr) return;
  e.preventDefault();
  contextTarget = tr.dataset.timestamp;
  showContextMenu($('#backupContextMenu'), e.clientX, e.clientY);
}

async function restoreBackup(timestamp) {
  const backupInfo = backupConfig.backups.find(b => b.timestamp === timestamp);
  if (!backupInfo) {
    showModal('错误', '<div class="confirm-text">找不到备份信息</div>', '<button class="btn btn-primary" onclick="hideModal()">确定</button>', 'modal-sm');
    return;
  }

  const name = basename(backupInfo.backup_path);
  showModal('确认', '<div class="confirm-text">还原将覆盖当前存档，确定要继续吗？</div>',
    '<button class="btn" onclick="hideModal()">取消</button>' +
    '<button class="btn btn-primary" onclick="doRestore(\'' + timestamp + '\')">确定</button>', 'modal-sm');
}

async function doRestore(timestamp) {
  hideModal();
  const backupInfo = backupConfig.backups.find(b => b.timestamp === timestamp);
  if (!backupInfo) return;

  try {
    await performBackup();
    const result = await window.api.restoreBackup(backupInfo.backup_path, backupInfo.original, backupInfo.is_directory);
    if (result.success) {
      addLog('restore', backupInfo);
      await saveAllConfig();
      updateBackupList();
      setStatus('已还原: ' + basename(backupInfo.backup_path));
      showModal('成功', '<div class="confirm-text">存档已还原</div>', '<button class="btn btn-primary" onclick="hideModal()">确定</button>', 'modal-sm');
    } else {
      showModal('错误', '<div class="confirm-text">还原失败</div>', '<button class="btn btn-primary" onclick="hideModal()">确定</button>', 'modal-sm');
    }
  } catch (e) {
    showModal('错误', '<div class="confirm-text">还原失败: ' + escapeHtml(e.message || String(e)) + '</div>', '<button class="btn btn-primary" onclick="hideModal()">确定</button>', 'modal-sm');
  }
}

async function deleteBackup(timestamp) {
  const backupInfo = backupConfig.backups.find(b => b.timestamp === timestamp);
  if (!backupInfo) {
    showModal('错误', '<div class="confirm-text">找不到备份信息</div>', '<button class="btn btn-primary" onclick="hideModal()">确定</button>', 'modal-sm');
    return;
  }

  const name = basename(backupInfo.backup_path);
  showModal('确认', '<div class="confirm-text">确定要删除这个备份吗？<br>' + escapeHtml(name) + '</div>',
    '<button class="btn" onclick="hideModal()">取消</button>' +
    '<button class="btn btn-danger" onclick="doDelete(\'' + timestamp + '\')">删除</button>', 'modal-sm');
}

async function doDelete(timestamp) {
  hideModal();
  const idx = backupConfig.backups.findIndex(b => b.timestamp === timestamp);
  if (idx === -1) return;

  const backupInfo = backupConfig.backups[idx];
  try {
    const result = await window.api.deleteBackup(backupInfo.backup_path, backupInfo.is_directory);
    if (result.success) {
      backupConfig.backups.splice(idx, 1);
      addLog('delete', backupInfo);
      await saveAllConfig();
      updateBackupList();
      setStatus('已删除备份: ' + basename(backupInfo.backup_path));
    } else {
      showModal('错误', '<div class="confirm-text">删除失败</div>', '<button class="btn btn-primary" onclick="hideModal()">确定</button>', 'modal-sm');
    }
  } catch (e) {
    showModal('错误', '<div class="confirm-text">删除失败: ' + escapeHtml(e.message || String(e)) + '</div>', '<button class="btn btn-primary" onclick="hideModal()">确定</button>', 'modal-sm');
  }
}

function deleteBackupFolder() {
  const backupDir = globalConfig.backup_dir;
  if (!backupDir) {
    showModal('提示', '<div class="confirm-text">当前没有选择备份文件夹</div>', '<button class="btn btn-primary" onclick="hideModal()">确定</button>', 'modal-sm');
    return;
  }
  showDeleteFolderDialog(backupDir);
}

function showDeleteFolderDialog(backupDir) {
  if (!backupDir) return;

  const body = '<div class="confirm-text">确定要删除以下备份文件夹吗？<br>' + escapeHtml(backupDir) + '</div>' +
    '<div class="checkbox-group">' +
    '<label><input type="checkbox" id="deleteConfigCheck" checked> 删除配置文件</label>' +
    '<label><input type="checkbox" id="deleteBackupsCheck" checked> 删除所有备份文件</label>' +
    '</div>';

  const footer = '<button class="btn" onclick="hideModal()">取消</button>' +
    '<button class="btn btn-danger" onclick="doDeleteFolder(\'' + escapeHtml(backupDir) + '\')">确定</button>';

  showModal('删除备份文件夹', body, footer, 'modal-sm');
}

async function doDeleteFolder(backupDir) {
  hideModal();
  const deleteConfig = document.getElementById('deleteConfigCheck') ? document.getElementById('deleteConfigCheck').checked : true;
  const deleteBackups = document.getElementById('deleteBackupsCheck') ? document.getElementById('deleteBackupsCheck').checked : true;

  if (!deleteConfig && !deleteBackups) {
    showModal('提示', '<div class="confirm-text">未选择任何删除选项</div>', '<button class="btn btn-primary" onclick="hideModal()">确定</button>', 'modal-sm');
    return;
  }

  try {
    if (deleteBackups) {
      for (const backup of backupConfig.backups) {
        await window.api.deleteBackup(backup.backup_path, backup.is_directory);
      }
    }

    if (deleteConfig) {
      backupConfig = { backups: [], logs: [] };
    }

    const dirIdx = globalConfig.backup_dirs.indexOf(backupDir);
    if (dirIdx !== -1) {
      globalConfig.backup_dirs.splice(dirIdx, 1);
    }

    if (backupDir === globalConfig.backup_dir) {
      globalConfig.backup_dir = '';
      backupConfig = { backups: [], logs: [] };
    }

    await saveAllConfig();
    updateUI();
    updateBackupList();
    setStatus('已删除备份文件夹: ' + backupDir);
    showModal('成功', '<div class="confirm-text">备份文件夹已删除</div>', '<button class="btn btn-primary" onclick="hideModal()">确定</button>', 'modal-sm');
  } catch (e) {
    showModal('错误', '<div class="confirm-text">删除失败: ' + escapeHtml(e.message || String(e)) + '</div>', '<button class="btn btn-primary" onclick="hideModal()">确定</button>', 'modal-sm');
  }
}

async function showBackupDirsList() {
  const dirs = globalConfig.backup_dirs || [];
  let listHtml = '';
  if (dirs.length === 0) {
    listHtml = '<li class="empty-item">无历史备份目录</li>';
  } else {
    dirs.forEach((dir, i) => {
      listHtml += '<li data-index="' + i + '" data-dir="' + escapeHtml(dir) + '">' + escapeHtml(dir) + '</li>';
    });
  }

  const body = '<p style="font-size:12px;color:#777;margin-bottom:8px;">选择一个备份目录打开或右键进行操作：</p>' +
    '<ul class="dir-list" id="dirListUl">' + listHtml + '</ul>';

  const footer = '<button class="btn" onclick="hideModal()">关闭</button>' +
    '<button class="btn btn-primary" id="btnSelectDirFromList">选择</button>';

  showModal('历史备份目录', body, footer);

  setTimeout(() => {
    const ul = document.getElementById('dirListUl');
    if (ul) {
      ul.addEventListener('contextmenu', (e) => {
        const li = e.target.closest('li');
        if (!li || li.classList.contains('empty-item')) return;
        e.preventDefault();
        dirContextTarget = li.dataset.dir;
        dirContextIndex = parseInt(li.dataset.index, 10);
        showContextMenu($('#dirContextMenu'), e.clientX, e.clientY);
      });
      ul.addEventListener('dblclick', (e) => {
        const li = e.target.closest('li');
        if (!li || li.classList.contains('empty-item')) return;
        const dir = li.dataset.dir;
        hideModal();
        switchBackupDir(dir);
      });
    }
    const selectBtn = document.getElementById('btnSelectDirFromList');
    if (selectBtn) {
      selectBtn.addEventListener('click', () => {
        const selected = document.querySelector('#dirListUl li.selected');
        if (selected && !selected.classList.contains('empty-item')) {
          const dir = selected.dataset.dir;
          hideModal();
          switchBackupDir(dir);
        } else {
          setStatus('请先选择一个目录');
        }
      });
    }
    const items = document.querySelectorAll('#dirListUl li:not(.empty-item)');
    items.forEach(li => {
      li.addEventListener('click', () => {
        items.forEach(l => l.classList.remove('selected'));
        li.classList.add('selected');
        li.style.background = '#d0e3f7';
      });
    });
  }, 50);
}

async function viewDirInfo() {
  hideAllContextMenus();
  if (!dirContextTarget) return;
  showDirectoryInfo(dirContextTarget);
}

async function removeFromHistory() {
  hideAllContextMenus();
  if (!dirContextTarget) return;
  const dir = dirContextTarget;
  showModal('确认', '<div class="confirm-text">确定要从历史记录中删除此目录吗？<br>' + escapeHtml(dir) + '</div>',
    '<button class="btn" onclick="hideModal()">取消</button>' +
    '<button class="btn btn-danger" onclick="doRemoveFromHistory(\'' + escapeHtml(dir) + '\')">确定</button>', 'modal-sm');
}

async function doRemoveFromHistory(dir) {
  hideModal();
  const idx = globalConfig.backup_dirs.indexOf(dir);
  if (idx !== -1) {
    globalConfig.backup_dirs.splice(idx, 1);
    await saveGlobalConfig();
  }
  setStatus('已从历史记录中移除: ' + dir);
}

async function deleteBackupFolderFromHistory() {
  hideAllContextMenus();
  if (!dirContextTarget) return;
  showDeleteFolderDialog(dirContextTarget);
}

async function showDirectoryInfo(directory) {
  const result = await window.api.getDirectoryStats(directory);
  if (!result.success) {
    showModal('错误', '<div class="confirm-text">获取目录信息失败</div>', '<button class="btn btn-primary" onclick="hideModal()">确定</button>', 'modal-sm');
    return;
  }
  const stats = result.stats;
  const body = '<div class="info-grid">' +
    '<span class="info-label">目录路径:</span><span class="info-value">' + escapeHtml(directory) + '</span>' +
    '<span class="info-label">创建时间:</span><span class="info-value">' + escapeHtml(stats.created_time || '') + '</span>' +
    '<span class="info-label">修改时间:</span><span class="info-value">' + escapeHtml(stats.modified_time || '') + '</span>' +
    '<span class="info-label">目录大小:</span><span class="info-value">' + formatSize(stats.size || 0) + '</span>' +
    '<span class="info-label">备份数量:</span><span class="info-value">' + (stats.backup_count || 0) + '</span>' +
    '<span class="info-label">日志数量:</span><span class="info-value">' + (stats.log_count || 0) + '</span>' +
    '<span class="info-label">文件数量:</span><span class="info-value">' + (stats.file_count || 0) + '</span>' +
    '<span class="info-label">文件夹数量:</span><span class="info-value">' + (stats.dir_count || 0) + '</span>' +
    '</div>';

  showModal('状态', body, '<button class="btn btn-primary" onclick="hideModal()">关闭</button>');
}

async function showFileInfo(backupInfo, actionType) {
  const actionText = ACTION_MAP[actionType] || actionType;
  const isDir = backupInfo.is_directory || false;
  const typeText = isDir ? '文件夹' : '文件';

  let body = '<div class="info-grid">' +
    '<span class="info-label">操作类型:</span><span class="info-value">' + escapeHtml(actionText) + '</span>' +
    '<span class="info-label">操作时间:</span><span class="info-value">' + escapeHtml(backupInfo.date || '') + '</span>' +
    '<span class="info-label">类型:</span><span class="info-value">' + escapeHtml(typeText) + '</span>' +
    '<span class="info-label">原始路径:</span><span class="info-value">' + escapeHtml(backupInfo.original || '') + '</span>' +
    '<span class="info-label">备份路径:</span><span class="info-value">' + escapeHtml(backupInfo.backup_path || '') + '</span>' +
    '</div>';

  if (!isDir) {
    const preview = await window.api.readFilePreview(backupInfo.backup_path);
    if (preview !== null) {
      body += '<div class="preview-area">' + escapeHtml(preview) + '</div>';
    }
  } else {
    const listResult = await window.api.listDirectoryContents(backupInfo.backup_path);
    if (listResult.success && listResult.contents) {
      let contentHtml = '';
      for (const item of listResult.contents) {
        contentHtml += (item.isDirectory ? '[目录] ' : '[文件] ') + escapeHtml(item.name) + '<br>';
      }
      body += '<div class="dir-content-list">' + contentHtml + '</div>';
    }
  }

  showModal('文件状态信息', body, '<button class="btn btn-primary" onclick="hideModal()">关闭</button>', 'modal-lg');
}

function showLogs() {
  const logs = [...backupConfig.logs].reverse();
  let rows = '';
  if (logs.length === 0) {
    rows = '<tr><td colspan="3" style="text-align:center;color:#999;">暂无日志记录</td></tr>';
  } else {
    for (const log of logs) {
      const actionText = ACTION_MAP[log.action] || log.action;
      const isDir = log.backup_info ? log.backup_info.is_directory : false;
      const typeIndicator = isDir ? '[文件夹]' : '[文件]';
      const filename = basename(log.backup_info ? log.backup_info.backup_path : '');
      const displayName = typeIndicator + ' ' + filename;
      rows += '<tr data-timestamp="' + log.timestamp + '">' +
        '<td>' + escapeHtml(log.date || '') + '</td>' +
        '<td>' + escapeHtml(actionText) + '</td>' +
        '<td>' + escapeHtml(displayName) + '</td>' +
        '</tr>';
    }
  }

  const body = '<div class="log-table-wrapper">' +
    '<table class="log-table">' +
    '<thead><tr><th style="width:140px">时间</th><th style="width:100px">操作类型</th><th>文件名</th></tr></thead>' +
    '<tbody id="logTableBody">' + rows + '</tbody>' +
    '</table></div>';

  showModal('日志', body, '<button class="btn" onclick="hideModal()">关闭</button>', 'modal-lg');

  setTimeout(() => {
    const logBody = document.getElementById('logTableBody');
    if (logBody) {
      logBody.addEventListener('contextmenu', (e) => {
        const tr = e.target.closest('tr');
        if (!tr || !tr.dataset.timestamp) return;
        e.preventDefault();
        logContextTarget = tr.dataset.timestamp;
        showContextMenu($('#logContextMenu'), e.clientX, e.clientY);
      });
    }
  }, 50);
}

async function viewFileStatusFromLog() {
  hideAllContextMenus();
  if (!logContextTarget) return;
  const logEntry = backupConfig.logs.find(l => l.timestamp === logContextTarget);
  if (!logEntry) {
    showModal('错误', '<div class="confirm-text">找不到日志信息</div>', '<button class="btn btn-primary" onclick="hideModal()">确定</button>', 'modal-sm');
    return;
  }
  await showFileInfo(logEntry.backup_info, logEntry.action);
}

async function rollbackLogAction() {
  hideAllContextMenus();
  if (!logContextTarget) return;
  const logEntry = backupConfig.logs.find(l => l.timestamp === logContextTarget);
  if (!logEntry) {
    showModal('错误', '<div class="confirm-text">找不到日志信息</div>', '<button class="btn btn-primary" onclick="hideModal()">确定</button>', 'modal-sm');
    return;
  }

  const actionType = logEntry.action;
  const backupInfo = logEntry.backup_info;

  if (actionType === 'delete') {
    rollbackDeleteAction(backupInfo);
  } else if (actionType === 'backup' || actionType === 'restore') {
    rollbackToState(backupInfo);
  } else {
    showModal('提示', '<div class="confirm-text">此操作类型不支持回溯</div>', '<button class="btn btn-primary" onclick="hideModal()">确定</button>', 'modal-sm');
  }
}

async function rollbackDeleteAction(backupInfo) {
  const name = basename(backupInfo.backup_path);
  showModal('确认', '<div class="confirm-text">确定要恢复这个被删除的备份吗？<br>' + escapeHtml(name) + '</div>',
    '<button class="btn" onclick="hideModal()">取消</button>' +
    '<button class="btn btn-primary" onclick="doRollbackDelete()">确定</button>', 'modal-sm');
}

async function doRollbackDelete() {
  hideModal();
  const logEntry = backupConfig.logs.find(l => l.timestamp === logContextTarget);
  if (!logEntry) return;
  const backupInfo = logEntry.backup_info;

  try {
    const result = await window.api.restoreBackup(backupInfo.backup_path, backupInfo.original, backupInfo.is_directory);
    if (result.success) {
      backupConfig.backups.push(backupInfo);
      addLog('restore_deleted', backupInfo);
      await saveAllConfig();
      updateBackupList();
      setStatus('已恢复被删除的备份: ' + basename(backupInfo.backup_path));
    } else {
      showModal('错误', '<div class="confirm-text">恢复备份失败</div>', '<button class="btn btn-primary" onclick="hideModal()">确定</button>', 'modal-sm');
    }
  } catch (e) {
    showModal('错误', '<div class="confirm-text">恢复备份失败: ' + escapeHtml(e.message || String(e)) + '</div>', '<button class="btn btn-primary" onclick="hideModal()">确定</button>', 'modal-sm');
  }
}

async function rollbackToState(backupInfo) {
  const name = basename(backupInfo.backup_path);
  showModal('确认', '<div class="confirm-text">回溯将使用此备份覆盖当前存档，确定要继续吗？<br>' + escapeHtml(name) + '</div>',
    '<button class="btn" onclick="hideModal()">取消</button>' +
    '<button class="btn btn-primary" onclick="doRollbackToState()">确定</button>', 'modal-sm');
}

async function doRollbackToState() {
  hideModal();
  const logEntry = backupConfig.logs.find(l => l.timestamp === logContextTarget);
  if (!logEntry) return;
  const backupInfo = logEntry.backup_info;

  try {
    await performBackup();
    const result = await window.api.restoreBackup(backupInfo.backup_path, backupInfo.original, backupInfo.is_directory);
    if (result.success) {
      addLog('rollback', backupInfo);
      await saveAllConfig();
      updateBackupList();
      setStatus('已回溯: ' + basename(backupInfo.backup_path));
    } else {
      showModal('错误', '<div class="confirm-text">回溯失败</div>', '<button class="btn btn-primary" onclick="hideModal()">确定</button>', 'modal-sm');
    }
  } catch (e) {
    showModal('错误', '<div class="confirm-text">回溯失败: ' + escapeHtml(e.message || String(e)) + '</div>', '<button class="btn btn-primary" onclick="hideModal()">确定</button>', 'modal-sm');
  }
}

async function showAnnouncements() {
  let body = '';
  if (announcements.length === 0) {
    body = '<div style="text-align:center;color:#999;padding:20px;">暂无公告</div>';
  } else {
    const reversed = [...announcements].reverse();
    for (const a of reversed) {
      body += '<div class="announcement-item">' +
        '<div class="announcement-date">【' + escapeHtml(a.date || '') + '】</div>' +
        '<div class="announcement-content">' + escapeHtml(a.content || '') + '</div>' +
        '</div>';
    }
  }
  showModal('公告信息', body, '<button class="btn" onclick="hideModal()">关闭</button>');
}

async function showOldConfigMigration(oldConfig) {
  const body = '<div class="confirm-text">检测到旧版本配置文件，请选择操作：</div>' +
    '<div class="radio-group">' +
    '<label><input type="radio" name="configChoice" value="old" checked> 使用旧版本配置</label>' +
    '<label><input type="radio" name="configChoice" value="current"> 使用当前配置</label>' +
    '</div>' +
    '<div class="checkbox-group">' +
    '<label><input type="checkbox" id="migrateHistoryCheck" checked> 迁移历史记录和日志到备份目录</label>' +
    '<label><input type="checkbox" id="deleteOldConfigCheck" checked> 删除旧版本配置文件</label>' +
    '</div>';

  const footer = '<button class="btn" onclick="hideModal()">取消</button>' +
    '<button class="btn btn-primary" id="btnConfirmMigration">确认</button>';

  showModal('旧版本config兼容', body, footer, 'modal-sm');

  setTimeout(() => {
    const confirmBtn = document.getElementById('btnConfirmMigration');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        const choice = document.querySelector('input[name="configChoice"]:checked');
        const configValue = choice ? choice.value : 'current';
        const migrateHistory = document.getElementById('migrateHistoryCheck') ? document.getElementById('migrateHistoryCheck').checked : false;
        const deleteOld = document.getElementById('deleteOldConfigCheck') ? document.getElementById('deleteOldConfigCheck').checked : false;

        if (configValue === 'old') {
          Object.keys(globalConfig).forEach(key => {
            if (oldConfig[key] !== undefined) {
              globalConfig[key] = oldConfig[key];
            }
          });
          await saveGlobalConfig();

          if (migrateHistory && globalConfig.backup_dir) {
            if (oldConfig.backups && oldConfig.backups.length) {
              backupConfig.backups = oldConfig.backups;
            }
            if (oldConfig.logs && oldConfig.logs.length) {
              backupConfig.logs = oldConfig.logs;
            }
            await saveBackupConfig();
          }
        }

        hideModal();
        updateUI();
        if (globalConfig.backup_dir) {
          await loadBackupConfig();
          updateBackupList();
        }
        setStatus('配置迁移完成');
      });
    }
  }, 50);
}

async function initAnnouncements() {
  try {
    announcements = await window.api.getAnnouncements() || [];
    if (announcements.length > 0) {
      const latest = announcements[announcements.length - 1];
      const text = '【' + latest.date + '】 ' + latest.content;
      const el = $('#announcementText');
      el.textContent = text;
    }
  } catch (e) {
    announcements = [];
  }
}

function setupEventListeners() {
  $('#btnSelectFile').addEventListener('click', selectSourceFile);
  $('#btnSelectDir').addEventListener('click', selectSourceDir);
  $('#btnBrowse').addEventListener('click', selectBackupDir);
  $('#btnHistoryDirs').addEventListener('click', showBackupDirsList);
  $('#btnManualBackup').addEventListener('click', manualBackup);
  $('#btnToggleAuto').addEventListener('click', toggleAutoBackup);
  $('#btnShowLogs').addEventListener('click', showLogs);
  $('#btnShowAnnouncements').addEventListener('click', showAnnouncements);
  $('#modalClose').addEventListener('click', hideModal);
  $('#modalOverlay').addEventListener('click', (e) => {
    if (e.target === $('#modalOverlay')) hideModal();
  });

  $('#backupListBody').addEventListener('contextmenu', showContextMenu_backup);

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.context-menu')) {
      hideAllContextMenus();
    }
  });

  $('#backupContextMenu').addEventListener('click', (e) => {
    const item = e.target.closest('.context-menu-item');
    if (!item) return;
    const action = item.dataset.action;
    hideAllContextMenus();
    if (action === 'restore' && contextTarget) restoreBackup(contextTarget);
    else if (action === 'delete' && contextTarget) deleteBackup(contextTarget);
    else if (action === 'deleteFolder') deleteBackupFolder();
  });

  $('#logContextMenu').addEventListener('click', (e) => {
    const item = e.target.closest('.context-menu-item');
    if (!item) return;
    const action = item.dataset.action;
    hideAllContextMenus();
    if (action === 'viewStatus') viewFileStatusFromLog();
    else if (action === 'rollback') rollbackLogAction();
  });

  $('#dirContextMenu').addEventListener('click', (e) => {
    const item = e.target.closest('.context-menu-item');
    if (!item) return;
    const action = item.dataset.action;
    hideAllContextMenus();
    if (action === 'viewDirInfo') viewDirInfo();
    else if (action === 'removeFromHistory') removeFromHistory();
    else if (action === 'deleteBackupFolder') deleteBackupFolderFromHistory();
  });

  window.api.onAutoBackupDone(async (data) => {
    if (data && data.backupInfo) {
      backupConfig.backups.push(data.backupInfo);
      addLog('backup', data.backupInfo);
      await saveAllConfig();
      updateBackupList();
      setStatus('自动备份完成: ' + basename(data.backupInfo.backup_path));
    }
  });
}

async function init() {
  await loadGlobalConfig();
  updateUI();

  const oldConfigResult = await window.api.checkOldConfig();
  if (oldConfigResult.success && oldConfigResult.config) {
    await showOldConfigMigration(oldConfigResult.config);
  }

  if (globalConfig.backup_dir) {
    await loadBackupConfig();
    updateBackupList();
  }

  await initAnnouncements();
  setupEventListeners();

  try {
    const version = await window.api.getVersion();
    setStatus('准备就绪，当前版本 ' + version);
  } catch (e) {
    setStatus('准备就绪');
  }
}

document.addEventListener('DOMContentLoaded', init);
