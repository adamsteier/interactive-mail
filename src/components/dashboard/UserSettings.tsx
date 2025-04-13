// src/components/dashboard/UserSettings.tsx
'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// TODO: Import functions for updating profile and password if they exist
// import { updateUserProfile, changeUserPassword } from '@/lib/authService'; // Example

const UserSettings: React.FC = () => {
    const { user, loading: authLoading } = useAuth();
    // State for profile form
    const [displayName, setDisplayName] = useState<string>('');
    // Note: Email change often requires re-authentication or verification, handle separately
    const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

    // TODO: State for password change form
    // const [currentPassword, setCurrentPassword] = useState('');
    // const [newPassword, setNewPassword] = useState('');
    // const [confirmPassword, setConfirmPassword] = useState('');
    // const [isChangingPassword, setIsChangingPassword] = useState(false);
    // const [passwordError, setPasswordError] = useState<string | null>(null);
    // const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

    // Initialize form with user data
    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName || '');
            // Email typically shown but might not be directly editable here
        }
    }, [user]);

    // --- Handlers ---

    const handleProfileUpdate = async (e: FormEvent) => {
        e.preventDefault();
        if (!user) return;

        // Basic validation
        if (!displayName.trim()) {
            setProfileError("Display name cannot be empty.");
            return;
        }

        setIsSavingProfile(true);
        setProfileError(null);
        setProfileSuccess(null);

        try {
            // TODO: Call actual update function
            console.log("TODO: Call updateUserProfile with:", { displayName });
            // await updateUserProfile({ displayName }); // Example call
            await new Promise(res => setTimeout(res, 1000)); // Simulate API call
            setProfileSuccess("Profile updated successfully!");
            // Optionally update context or refetch user if needed, depending on authService implementation
        } catch (err) {
            console.error("Error updating profile:", err);
            const message = err instanceof Error ? err.message : "Unknown error";
            setProfileError(`Failed to update profile: ${message}`);
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handlePasswordChange = async (e: FormEvent) => {
        e.preventDefault();
        if (!user) return;
        // TODO: Implement password change logic
        // Validation (non-empty, match, complexity?)
        // setIsChangingPassword(true); setPasswordError(null); setPasswordSuccess(null);
        // try { await changeUserPassword(currentPassword, newPassword); ... } catch ... finally ...
        console.log("TODO: Implement Password Change");
        alert("Password change functionality not yet implemented.");
    };

    // --- Render Logic ---

    if (authLoading) {
        return <div className="p-4 text-gray-400">Loading settings...</div>;
    }

    if (!user) {
         return <div className="p-4 text-red-400">Please log in to manage settings.</div>;
    }

    const placeholderStyle = "placeholder-muted-pink"; // Assuming style exists

    return (
        <div className="space-y-8 max-w-2xl"> {/* Limit width for settings */}

            {/* Profile Information Section */}
            <section className="p-5 bg-charcoal/60 rounded-lg border border-gray-700">
                <h2 className="text-xl font-semibold text-electric-teal mb-4">Profile Information</h2>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                    {profileError && <p className="text-red-400 text-sm">{profileError}</p>}
                    {profileSuccess && <p className="text-green-400 text-sm">{profileSuccess}</p>}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            value={user.email || 'N/A'}
                            disabled
                            readOnly
                            className={`w-full p-2 rounded-md bg-charcoal/90 border border-gray-600 text-gray-400 cursor-not-allowed ${placeholderStyle}`}
                        />
                         <p className="text-xs text-gray-500 mt-1">Email address cannot be changed here.</p>
                    </div>
                     <div>
                        <label htmlFor="displayName" className="block text-sm font-medium text-electric-teal mb-1">Display Name</label>
                        <input
                            type="text"
                            id="displayName"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            required
                            className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}
                        />
                    </div>
                    <div className="text-right">
                        <button
                            type="submit"
                            disabled={isSavingProfile || displayName === (user.displayName || '')}
                            className="px-4 py-1.5 rounded bg-electric-teal hover:bg-electric-teal/80 text-charcoal text-sm font-semibold shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSavingProfile ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>
                </form>
            </section>

             {/* Change Password Section (Placeholder) */}
             <section className="p-5 bg-charcoal/60 rounded-lg border border-gray-700">
                 <h2 className="text-xl font-semibold text-electric-teal mb-4">Change Password</h2>
                 {/* TODO: Add password change form fields here */}
                 <form onSubmit={handlePasswordChange} className="space-y-4">
                      {/* passwordError && <p className="text-red-400 text-sm">{passwordError}</p> */}
                      {/* passwordSuccess && <p className="text-green-400 text-sm">{passwordSuccess}</p> */}
                       <p className="text-gray-400 italic text-sm">Password change form coming soon...</p>
                       {/* Example Fields:
                       <div><label ...>Current Password</label><input type="password" ... /></div>
                       <div><label ...>New Password</label><input type="password" ... /></div>
                       <div><label ...>Confirm New Password</label><input type="password" ... /></div>
                       */}
                       <div className="text-right">
                           <button
                               type="submit"
                               disabled // Disable until implemented
                               className="px-4 py-1.5 rounded bg-gray-600 text-gray-400 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                               Change Password
                           </button>
                       </div>
                   </form>
            </section>

             {/* TODO: Add Billing/Subscription Section */}
             {/* TODO: Add Notification Preferences Section */}

        </div>
    );
};

export default UserSettings;