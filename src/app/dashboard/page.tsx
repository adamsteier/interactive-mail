// app/dashboard/page.tsx
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // Assuming you have an AuthContext
// V2 Dashboard Components
import V2Overview from '@/components/dashboard/V2Overview';
import V2Brands from '@/components/dashboard/V2Brands';
import V2Leads from '@/components/dashboard/V2Leads';
import V2Campaigns from '@/components/dashboard/V2Campaigns';
import UserTemplates from '@/components/dashboard/UserTemplates';
import UserSettings from '@/components/dashboard/UserSettings';
// import CampaignHistory from '@/components/dashboard/CampaignHistory';
// import UserSettings from '@/components/dashboard/UserSettings';

type DashboardTab = 'overview' | 'brands' | 'leads' | 'campaigns' | 'templates' | 'settings';

const DashboardPage: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  if (loading) {
    return <div className="text-center p-10 text-gray-400">Loading dashboard...</div>;
  }

  if (!user) {
    // Optionally redirect to login or show a message
    // You might handle this in a higher-level layout or middleware
    return <div className="text-center p-10 text-red-400">Please log in to view the dashboard.</div>;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <V2Overview />;
      case 'brands':
        return <V2Brands />;
      case 'leads':
        return <V2Leads />;
      case 'campaigns':
        return <V2Campaigns />;
      case 'templates':
        return <UserTemplates />;
      case 'settings':
        return <UserSettings />;
      default:
        return null;
    }
  };

  // Basic Tab Navigation - Style according to brandguidelines.txt
  const TabButton: React.FC<{ tabId: DashboardTab; label: string }> = ({ tabId, label }) => (
    <button
      onClick={() => setActiveTab(tabId)}
      className={`relative px-4 py-3 rounded-t-md text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-teal focus-visible:ring-opacity-50 ${ // Added focus states
        activeTab === tabId
          ? 'bg-charcoal text-electric-teal tab-glow z-10' // Active tab style with glow
          : 'text-gray-400 hover:text-electric-teal hover:bg-electric-teal/5' // Inactive tab style
      }`}
    >
      {label}
      {/* Add pseudo-element for bottom border if needed, or rely on container's border */} 
      {activeTab === tabId && (
         <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-electric-teal shadow-glow-sm"></span> // Explicit active indicator
      )}
    </button>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-charcoal min-h-screen text-off-white"> {/* Adjust background/text per guidelines */}
      <h1 className="text-2xl sm:text-3xl font-bold text-electric-teal mb-6">Dashboard</h1>

      {/* Tab Navigation Container - Adjusted border and added scrollbar styling */} 
      <div className="mb-6 border-b border-electric-teal/20 flex space-x-1 overflow-x-auto pb-0 scrollbar-thin scrollbar-thumb-electric-teal/30 scrollbar-track-transparent">
         <TabButton tabId="overview" label="Overview" />
         <TabButton tabId="campaigns" label="Campaigns" />
         <TabButton tabId="brands" label="Brands" />
         <TabButton tabId="leads" label="Leads" />
         <TabButton tabId="templates" label="Templates" />
         <TabButton tabId="settings" label="Settings" />
         {/* Add more tabs as needed */}
      </div>

      {/* Tab Content Area */}
      <div className="mt-4">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default DashboardPage;