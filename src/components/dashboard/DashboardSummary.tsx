// src/components/dashboard/DashboardSummary.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import CreativeBriefsSummary from './CreativeBriefsSummary';

const DashboardSummary: React.FC = () => {
    const { user } = useAuth();
    // State for fetched data
    const [v1CampaignCount, setV1CampaignCount] = useState<number>(0);
    const [v2CampaignCount, setV2CampaignCount] = useState<number>(0);
    const [processingDesignsCount, setProcessingDesignsCount] = useState<number>(0);
    const [completedDesignsCount, setCompletedDesignsCount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            // setError("User not logged in."); // Handled by parent likely
            return;
        }

        const fetchSummaryData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Fetch V1 campaigns (campaigns collection)
                const v1CampaignsRef = collection(db, 'campaigns');
                const v1CampaignsQuery = query(v1CampaignsRef, where('ownerUid', '==', user.uid));
                const v1Snapshot = await getDocs(v1CampaignsQuery);
                setV1CampaignCount(v1Snapshot.size);

                // Fetch V2 campaigns (have brandId field)
                const v2CampaignsQuery = query(
                    v1CampaignsRef, 
                    where('ownerUid', '==', user.uid),
                    where('brandId', '!=', null)
                );
                const v2Snapshot = await getDocs(v2CampaignsQuery);
                setV2CampaignCount(v2Snapshot.size);

                // TODO: Fetch designs counts when design service is ready
                setProcessingDesignsCount(0);
                setCompletedDesignsCount(0);

            } catch (err) {
                console.error("Error fetching dashboard summary data:", err);
                setError("Failed to load dashboard summary.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchSummaryData();
    }, [user]);

    // --- Render Logic ---

    const StatCard: React.FC<{ title: string; value: number | string; isLoading: boolean }> = ({ title, value, isLoading }) => (
        <div className="bg-charcoal/60 p-4 rounded-lg border border-gray-700 text-center hover:border-electric-teal/50 transition-colors">
            <h3 className="text-sm font-medium text-gray-400 mb-1">{title}</h3>
            {isLoading ? (
                <div className="h-6 w-16 mx-auto bg-gray-600/50 rounded animate-pulse"></div>
            ) : (
                <p className="text-2xl font-semibold text-electric-teal">{value}</p>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Welcome Message */}
            <div className="p-5 bg-gradient-to-r from-charcoal/70 to-charcoal/50 backdrop-blur-sm rounded-lg border border-electric-teal/20 shadow-glow-sm">
                <h2 className="text-xl font-semibold text-white mb-1">
                    Welcome back{user?.displayName ? `, ${user.displayName}` : ''}!
                </h2>
                <p className="text-gray-300 text-sm">Here&apos;s a quick overview of your account.</p>
            </div>

            {/* Quick Stats */}
            <div>
                <h3 className="text-lg font-semibold text-electric-teal mb-3">Quick Stats</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="V1 Campaigns" value={v1CampaignCount} isLoading={isLoading} />
                    <StatCard title="V2 Campaigns" value={v2CampaignCount} isLoading={isLoading} />
                    <StatCard title="Designs Processing" value={processingDesignsCount} isLoading={isLoading} />
                    <StatCard title="Designs Completed" value={completedDesignsCount} isLoading={isLoading} />
                </div>
                 {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            </div>

            {/* Quick Actions */}
            <div>
                 <h3 className="text-lg font-semibold text-electric-teal mb-3">Quick Actions</h3>
                 <div className="flex flex-wrap gap-3">
                     {/* TODO: Link these buttons correctly (e.g., navigate or trigger modals) */}
                     <button className="px-4 py-2 rounded bg-electric-teal hover:bg-electric-teal/80 text-charcoal text-sm font-semibold shadow-glow transition-all">
                         Start New Campaign
                     </button>
                     <button className="px-4 py-2 rounded border border-electric-teal/70 hover:bg-electric-teal/10 text-electric-teal text-sm font-semibold transition-all">
                         View All Designs
                     </button>
                      <button className="px-4 py-2 rounded border border-gray-600 hover:bg-charcoal text-gray-300 text-sm font-semibold transition-all">
                         View Campaign History
                     </button>
                 </div>
            </div>

            {/* Creative Briefs Section */}
            <div>
                <h3 className="text-lg font-semibold text-electric-teal mb-3">Creative Briefs</h3>
                <CreativeBriefsSummary />
            </div>

            {/* Recent Activity (Placeholder) */}
             <div>
                 <h3 className="text-lg font-semibold text-electric-teal mb-3">Recent Activity</h3>
                 <div className="p-4 bg-charcoal/60 rounded-lg border border-gray-700">
                    {/* TODO: Fetch and display recent activity items (e.g., design completed, campaign sent) */}
                    <p className="text-gray-400 italic text-sm">Recent activity feed coming soon...</p>
                    {/* Example Item Structure:
                    <div className="border-b border-gray-700 py-2 text-sm">
                        <p className="text-gray-300">Design <span className="font-medium text-white">"Summer Sale Postcard"</span> completed.</p>
                        <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                    */}
                 </div>
            </div>

        </div>
    );
};

export default DashboardSummary;
