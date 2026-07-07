import React, { useState, useEffect, useCallback } from 'react';
import { ProfileHeader, PersonalInfo, SubscriptionPanel, ActivityTimeline, NotificationSettings, PasswordSection } from './profile';
import { theme } from './profile/styles';

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
  gap: '24px',
  marginBottom: '24px',
};

const container = {
  backgroundColor: theme.bg,
  color: theme.text,
  padding: '32px',
  fontFamily: theme.fontFamily,
  minHeight: '100%',
  boxSizing: 'border-box',
};

const loaderContainer = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '200px',
};

const loaderText = {
  color: theme.muted,
  fontSize: '15px',
};

const UserProfileManager = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const app = window.ContentFlowApp;
        if (!app) {
          setLoading(false);
          return;
        }

        const profile = await app.services.auth.getUserProfile();
        const user = profile || await app.services.auth.getCurrentUser();
        const docs = await app.services.documents.getAll();
        const docList = Array.isArray(docs) ? docs : [];

        const name = user?.name || 'Usuario';
        const initials = getInitials(name) || 'U';
        const stats = user?.stats || {};

        setUserData({
          name: user?.name || '',
          email: user?.email || '',
          initials,
          plan: user?.plan || 'Pro',
          credits: stats.credits ?? 0,
          creditsLimit: stats.creditsLimit ?? 0,
          renewalDate: stats.renewalDate
            ? new Date(stats.renewalDate).toLocaleDateString('es-ES')
            : '—',
          avatar: user?.avatar_url || null,
          completionPercentage: 0,
          memberSince: '—',
          recentActivity: [],
          notifications: user?.preferences || {
            emailDigest: true,
            marketingEmails: false,
            documentShared: true,
            billingAlerts: true,
            productUpdates: false,
          },
          usageStats: {
            documentsThisMonth: stats.documentsThisMonth ?? docList.length,
            aiTokensUsed: stats.aiTokensUsed ?? 0,
            aiTokensLimit: stats.aiTokensLimit ?? 0,
            storageUsed: stats.storageUsed ?? 0,
            storageLimit: stats.storageLimit ?? 0,
          },
        });
      } catch (err) {
        console.error('Error al cargar datos del perfil:', err);
      } finally {
        setLoading(false);
      }
    };
    loadUserData();
  }, []);

  const handleProfileUpdate = useCallback(async (data) => {
    try {
      const app = window.ContentFlowApp;
      if (app?.services?.auth?.updateProfile) {
        const updated = await app.services.auth.updateProfile(data);
        setUserData(prev => ({ ...prev, name: updated.name || '', email: updated.email || '' }));
      } else {
        setUserData(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error('Error al guardar perfil:', err);
    }
  }, []);

  const handleAvatarChange = useCallback(async (dataUrl) => {
    try {
      const app = window.ContentFlowApp;
      if (app?.services?.auth?.updateProfile) {
        await app.services.auth.updateProfile({ avatar_url: dataUrl });
      }
      setUserData(prev => ({ ...prev, avatar: dataUrl, completionPercentage: Math.min(prev.completionPercentage + 10, 100) }));
    } catch (err) {
      console.error('Error al guardar avatar:', err);
    }
  }, []);

  const handleNotificationChange = useCallback(async (key, value) => {
    setUserData(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }));
    try {
      const app = window.ContentFlowApp;
      if (app?.services?.auth?.updateProfile) {
        await app.services.auth.updateProfile({ preferences: { [key]: value } });
      }
    } catch (err) {
      setUserData(prev => ({
        ...prev,
        notifications: { ...prev.notifications, [key]: !value },
      }));
    }
  }, []);

  if (loading) {
    return (
      <div style={container}>
        <div style={loaderContainer}>
          <span style={loaderText}>Cargando perfil...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={container}>
      <ProfileHeader userData={userData} onAvatarChange={handleAvatarChange} />

      <div style={grid}>
        <PersonalInfo userData={userData} onUpdate={handleProfileUpdate} />
        <SubscriptionPanel userData={userData} />
      </div>

      <div style={grid}>
        <ActivityTimeline activities={userData.recentActivity} />
        <NotificationSettings notifications={userData.notifications} onChange={handleNotificationChange} />
      </div>

      <div style={grid}>
        <div style={{ maxWidth: '540px' }}>
          <PasswordSection />
        </div>
      </div>
    </div>
  );
};

export default UserProfileManager;
