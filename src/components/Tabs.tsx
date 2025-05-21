'use client';

import React from 'react';

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}

export const TabButton: React.FC<TabButtonProps> = ({ label, isActive, onClick, className }) => {
  return (
    <button
      onClick={onClick}
      className={[
        "px-4 py-2 font-medium text-sm rounded-t-lg transition-colors duration-150 ease-in-out",
        isActive
          ? "bg-electric-teal text-charcoal shadow-md"
          : "text-electric-teal/70 hover:bg-electric-teal/10 hover:text-electric-teal",
        className
      ].join(' ')}
      aria-current={isActive ? 'page' : undefined}
    >
      {label}
    </button>
  );
};

interface TabsProps {
  tabs: Array<{ id: string; label: string }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: React.ReactNode;
  contentClassName?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange, children, contentClassName }) => {
  return (
    <div>
      <div className="border-b border-electric-teal/20 mb-6" role="tablist">
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            label={tab.label}
            isActive={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
          />
        ))}
      </div>
      <div role="tabpanel" className={contentClassName}>
        {React.Children.map(children, (child, index) => {
          if (!React.isValidElement(child)) return null;
          return tabs[index]?.id === activeTab ? child : null;
        })}
      </div>
    </div>
  );
}; 