import React, { useState, useEffect } from "react";
import { getNotifications, markNotificationAsRead } from "../services/notifications";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (id, isRead) => {
    if (isRead) return;
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-gray-100 font-semibold text-gray-700 flex justify-between">
            <span>Notifications</span>
            <span className="text-xs text-gray-500">{unreadCount} unread</span>
          </div>

          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No notifications yet.
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleMarkAsRead(item.id, item.is_read)}
                className={`p-3 border-b text-sm cursor-pointer transition-colors ${
                  item.is_read ? "bg-white text-gray-600" : "bg-blue-50 font-medium text-gray-900"
                }`}
              >
                <div className="font-semibold">{item.title}</div>
                <div className="text-xs text-gray-600 mt-1">{item.message}</div>
                <div className="text-[10px] text-gray-400 mt-1">
                  {new Date(item.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}