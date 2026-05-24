import React, { useState, useEffect } from 'react';
import { Folder, File, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { apiGet } from '../utils/api';

interface FileSelectorProps {
  onSelect: (path: string, isDirectory: boolean) => void;
  onClose: () => void;
  initialPath?: string;
  selectDirectory?: boolean;
}

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
}

export const FileSelector: React.FC<FileSelectorProps> = ({ 
  onSelect, onClose, initialPath, selectDirectory = false }) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [homePath, setHomePath] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialPath) {
      loadFiles(initialPath);
    } else {
      loadFiles('');
    }
  }, []);

  const loadFiles = async (path: string) => {
    try {
      setLoading(true);
      const url = path ? `/api/files/list?path=${encodeURIComponent(path)}` : '/api/files/list';
      const data = await apiGet<{
        files: FileItem[],
        currentPath: string,
        homePath: string
      }>(url);
      setCurrentPath(data.currentPath);
      setFiles(data.files);
      setHomePath(data.homePath);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToParent = () => {
    const parent = currentPath.split('/').slice(0, -1).join('/');
    loadFiles(parent);
  };

  const goHome = () => {
    loadFiles(homePath);
  };

  const handleFileClick = (file: FileItem) => {
    if (file.isDirectory) {
      loadFiles(file.path);
    } else if (!selectDirectory) {
      onSelect(file.path, false);
    }
  };

  const handleSelectCurrent = () => {
    if (selectDirectory) {
      onSelect(currentPath, true);
    }
  };

  const directories = files.filter(f => f.isDirectory).sort((a, b) => a.name.localeCompare(b.name));
  const regularFiles = files.filter(f => !f.isDirectory).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {selectDirectory ? '选择文件夹' : '选择文件'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        
        <div className="p-4">
          {/* Path navigation
          <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded">
            <button onClick={goHome} className="p-1 hover:bg-gray-200 rounded">
              <Home size={16} />
            </button>
            {currentPath && (
              <button onClick={goToParent} className="p-1 hover:bg-gray-200 rounded">
                <ChevronLeft size={16} />
              </button>
            )}
            <span className="text-sm text-gray-600 truncate flex-1">
              {currentPath || homePath}
            </span>
            {selectDirectory && (
              <button
                onClick={handleSelectCurrent}
                className="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                选择此文件夹
              </button>
            )}
          </div>

          {/* File list */}
          <div className="border rounded h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">加载中...</div>
            ) : (
              <div className="divide-y">
                {directories.map((file) => (
                  <div
                    key={file.path}
                    onClick={() => handleFileClick(file)}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <Folder size={20} className="text-yellow-500" />
                    <span className="flex-1 truncate">{file.name}</span>
                  </div>
                ))}
                {regularFiles.map((file) => (
                  <div
                    key={file.path}
                    onClick={() => handleFileClick(file)}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <File size={20} className="text-gray-500" />
                    <span className="flex-1 truncate">{file.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

