import React, { useEffect, useState } from 'react';
import { VikiAvatarCanvas } from './viki/AvatarCanvas';

interface UserProfile {
  username: string;
  groups: string[];
}

export const DashboardLayout: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Ingest auth payload from Authelia forwarded headers or identity endpoint
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(() => setUser(null));
  }, []);

  // Strict enforcement: Only the owner/root administrator triggers Viki elements
  const hasVikiAccess = user?.username === 'admin' || user?.groups.includes('cortex-core-ops');

  return (
    <div className="dashboard-container glassmorphic">
      <sidebar className="nav-panel">
        {/* Standard RMM & EDR Navigation Components */}
      </sidebar>

      <main className="viewport-hallway">
        {/* Core System Analytics Tiles */}
      </main>

      {/* Conditional Injection Layer */}
      {hasVikiAccess && (
        <div className="viki-avatar-overlay">
          <React.Suspense fallback={<div className="loading-core" />}>
            <VikiAvatarCanvas endpoint="ws://192.168.50.242:11434" />
          </React.Suspense>
        </div>
      )}
    </div>
  );
};
