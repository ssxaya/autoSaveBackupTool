import React, { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Calendar } from 'lucide-react';

export const AnnouncementsPage: React.FC = () => {
  const { announcements, loadAnnouncements } = useAppStore();

  useEffect(() => {
    loadAnnouncements();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <AlertCircle className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">公告信息</h1>
                <p className="text-sm text-gray-500">查看版本更新和重要通知</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          {announcements.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
              <p>暂无公告</p>
            </div>
          ) : (
            <div className="space-y-6">
              {[...announcements].reverse().map((announcement, index) => (
                <div
                  key={index}
                  className="border-l-4 border-blue-500 pl-6 py-2"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-600">
                      {announcement.date}
                    </span>
                  </div>
                  <p className="text-gray-800 leading-relaxed">
                    {announcement.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

