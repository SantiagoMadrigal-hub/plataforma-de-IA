import React, { useState, useEffect, useCallback } from 'react';
import { ProfileHeader, PersonalInfo, SubscriptionPanel, ActivityTimeline, NotificationSettings, PasswordSection } from './profile';
import { theme } from './profile/styles';

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
    const fetchUserData = async () => {
      await new Promise(resolve => setTimeout(resolve, 800));
      setUserData({
        name: 'Santiago',
        email: 'santiago@lexora.com',
        initials: 'SA',
        plan: 'Pro Plan',
        credits: 1250,
        creditsLimit: 5000,
        renewalDate: '15 Jul 2026',
        avatar: null,
        completionPercentage: 65,
        memberSince: 'Mar 2024',
        recentActivity: [
          { id: 1, type: 'document_created', description: 'Creaste "Informe Q2 2026"', date: 'Hoy, 14:30' },
          { id: 2, type: 'ai_generation', description: 'Generaste 3 variantes de copy', date: 'Ayer, 11:20' },
          { id: 3, type: 'settings_change', description: 'Actualizaste tu perfil', date: '27 Jun 2026' },
          { id: 4, type: 'login', description: 'Inicio de sesión desde nuevo dispositivo', date: '25 Jun 2026' },
        ],
        notifications: {
          emailDigest: true,
          marketingEmails: false,
          documentShared: true,
          billingAlerts: true,
          productUpdates: false,
        },
        usageStats: {
          documentsThisMonth: 42,
          aiTokensUsed: 28400,
          aiTokensLimit: 100000,
          storageUsed: 256,
          storageLimit: 1024,
        },
      });
      setLoading(false);
    };
    fetchUserData();
  }, []);

  const handleProfileUpdate = useCallback((data) => {
    setUserData(prev => ({ ...prev, ...data }));
  }, []);

  const handleAvatarChange = useCallback((dataUrl) => {
    setUserData(prev => ({ ...prev, avatar: dataUrl, completionPercentage: Math.min(prev.completionPercentage + 10, 100) }));
  }, []);

  const handleNotificationChange = useCallback((key, value) => {
    setUserData(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }));
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
