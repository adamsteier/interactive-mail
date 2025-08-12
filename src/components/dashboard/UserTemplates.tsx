// src/components/dashboard/UserTemplates.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DesignTemplate, getUserTemplates, deleteTemplate } from '@/v2/services/templateService';
import { Timestamp } from 'firebase/firestore';

const UserTemplates: React.FC = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    fetchTemplates();
  }, [user, selectedCategory]);

  const fetchTemplates = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const fetchedTemplates = await getUserTemplates(user.uid, {
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        orderBy: 'createdAt',
        orderDirection: 'desc'
      });

      setTemplates(fetchedTemplates);

      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(fetchedTemplates.map(t => t.category).filter(Boolean))
      ).sort();
      setCategories(uniqueCategories);

    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!user || !templateId) return;

    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await deleteTemplate(user.uid, templateId);
      if (result.success) {
        // Remove from local state
        setTemplates(prev => prev.filter(t => t.id !== templateId));
      } else {
        setError(result.error || 'Failed to delete template');
      }
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Failed to delete template');
    }
  };

  const formatDate = (timestamp: Timestamp | Date | undefined) => {
    if (!timestamp) return 'N/A';
    
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleDateString();
    }
    
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString();
    }
    
    return 'N/A';
  };

  // Skeleton loader component
  const SkeletonCard: React.FC = () => (
    <div className="border border-gray-700/50 rounded-lg p-4 bg-charcoal/40 animate-pulse flex flex-col">
      <div className="h-4 bg-gray-600/50 rounded w-3/4 mb-3"></div>
      <div className="flex-grow mb-2 flex items-center justify-center bg-gray-700/40 rounded aspect-video"></div>
      <div className="h-3 bg-gray-600/50 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-gray-600/50 rounded w-1/3 mb-3"></div>
      <div className="h-8 bg-gray-700/40 rounded"></div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-electric-teal">Your Templates</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, index) => <SkeletonCard key={index} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-6 text-red-400 bg-red-900/20 border border-red-700 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-semibold text-electric-teal">Your Templates</h2>
        
        {/* Category filter */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Category:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1 bg-charcoal border border-electric-teal/30 text-white rounded-md text-sm
                focus:border-electric-teal focus:outline-none focus:ring-1 focus:ring-electric-teal"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Templates grid */}
      {templates.length === 0 ? (
        <div className="text-center p-8 bg-charcoal/50 rounded-md border border-electric-teal/20">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-electric-teal mb-2">No Templates Yet!</h3>
          <p className="text-gray-300 mb-4">
            You haven&apos;t saved any design templates yet. Templates are reusable designs with your logo positioned perfectly.
          </p>
          <p className="text-sm text-gray-400">
            Create a campaign and save your favorite designs as templates for future use!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {templates.map((template) => (
            <div 
              key={template.id} 
              className="border border-gray-700 rounded-lg p-4 bg-charcoal/60 hover:border-electric-teal/50 
                hover:shadow-glow-sm transition-all duration-200 flex flex-col"
            >
              {/* Template name and category */}
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-white truncate flex-1 mr-2">{template.name}</h3>
                {template.category && (
                  <span className="text-xs px-2 py-1 bg-electric-teal/10 text-electric-teal rounded shrink-0">
                    {template.category}
                  </span>
                )}
              </div>

              {/* Template image */}
              <div className="relative flex-grow mb-3 flex items-center justify-center bg-gray-700/50 rounded aspect-video overflow-hidden">
                {template.compositedImageUrl ? (
                  <img
                    src={template.compositedImageUrl}
                    alt={`Template: ${template.name}`}
                    className="w-full h-full object-contain cursor-pointer transition-transform hover:scale-105"
                    onClick={() => setExpandedImageUrl(template.compositedImageUrl)}
                  />
                ) : (
                  <span className="text-xs text-gray-500 italic">No preview</span>
                )}
              </div>

              {/* Template info */}
              <div className="space-y-1 mb-3">
                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span>Brand: <span className="text-white">{template.brandName}</span></span>
                  {template.isPublic && (
                    <span className="text-electric-teal">Public</span>
                  )}
                </div>
                
                <div className="text-xs text-gray-400">
                  Used: <span className="text-white">{template.usage.timesUsed}</span> times
                </div>
                
                <div className="text-xs text-gray-400">
                  Created: {formatDate(template.createdAt)}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => {
                    // TODO: Implement "Use Template" functionality
                    console.log('Use template:', template.id);
                  }}
                  className="flex-1 px-3 py-1.5 rounded bg-electric-teal text-charcoal text-xs font-semibold
                    hover:bg-electric-teal/90 transition-colors"
                >
                  Use Template
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template.id!)}
                  className="px-3 py-1.5 rounded border border-red-500/50 text-red-400 text-xs
                    hover:bg-red-500/10 hover:border-red-500 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image expansion modal */}
      {expandedImageUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 cursor-pointer"
          onClick={() => setExpandedImageUrl(null)}
        >
          <img
            src={expandedImageUrl}
            alt="Expanded template"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-electric-teal"
            onClick={() => setExpandedImageUrl(null)}
            aria-label="Close expanded image"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
};

export default UserTemplates;
