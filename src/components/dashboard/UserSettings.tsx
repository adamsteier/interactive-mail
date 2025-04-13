// src/components/dashboard/UserSettings.tsx
'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// TODO: Import function for updating profile data
// import { updateUserProfileData } from '@/lib/userService'; 
// Import Firebase auth functions
import { updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Assuming auth instance is exported
import { FirebaseError } from 'firebase/app'; // For type checking errors

const UserSettings: React.FC = () => {
    const { user, loading: authLoading /*, refreshUserData */ } = useAuth();
    // Profile state
    const [displayName, setDisplayName] = useState<string>('');
    const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

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

        if (!displayName.trim()) {
            setProfileError("Display name cannot be empty.");
            return;
        }
        if (displayName === (user.displayName || '')) {
            setProfileError("Display name hasn't changed.");
            return;
        }

        setIsSavingProfile(true);
        setProfileError(null);
        setProfileSuccess(null);

        try {
            // TODO: Call actual update function (e.g., updateUserProfileData)
            console.log("TODO: Call updateUserProfileData with:", { displayName });
            await new Promise(res => setTimeout(res, 1000)); // Simulate API call
            // TODO: Call refreshUserData() after successful update
            setProfileSuccess("Profile updated successfully! (Simulated)");
        } catch (err) {
            console.error("Error updating profile:", err);
            const message = err instanceof Error ? err.message : "Unknown error";
            setProfileError(`Failed to update profile: ${message}`);
        } finally {
            setIsSavingProfile(false);
        }
    };

    // Handle Password Change
    const handlePasswordChange = async (e: FormEvent) => {
        e.preventDefault();
        // Ensure user is available (should be checked by parent, but good practice)
        // Use auth.currentUser directly for updatePassword as useAuth().user might have slight delay
        const currentUser = auth.currentUser;
        if (!currentUser) { 
            setPasswordError("Not logged in or user session expired.");
            return; 
        }

        // Reset errors/success messages
        setPasswordError(null);
        setPasswordSuccess(null);

        // Basic Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordError("All password fields are required.");
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError("New password must be at least 6 characters long.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError("New passwords do not match.");
            return;
        }
        if (newPassword === currentPassword) {
             setPasswordError("New password must be different from the current password.");
             return;
        }

        setIsChangingPassword(true);

        try {
            // Attempt to update the password
            await updatePassword(currentUser, newPassword);
            setPasswordSuccess("Password changed successfully!");
            // Clear fields on success
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            console.error("Error changing password:", err);
            if (err instanceof FirebaseError) {
                if (err.code === 'auth/requires-recent-login') {
                    setPasswordError("This operation is sensitive and requires recent authentication. Please sign out and sign back in to change your password.");
                    // TODO: Implement re-authentication flow here instead of just showing error
                } else if (err.code === 'auth/weak-password') {
                     setPasswordError("Password is too weak. Please choose a stronger password (at least 6 characters).");
                } else if (err.code === 'auth/wrong-password') {
                     setPasswordError("Incorrect current password."); // Firebase might not always throw this for updatePassword, depends on rules/implementation
                } else {
                     setPasswordError(`Failed to change password: ${err.message}`);
                }
            } else {
                setPasswordError("An unknown error occurred while changing password.");
            }
        } finally {
            setIsChangingPassword(false);
        }
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

             {/* Change Password Section */}
             <section className="p-5 bg-charcoal/60 rounded-lg border border-gray-700">
                 <h2 className="text-xl font-semibold text-electric-teal mb-4">Change Password</h2>
                 <form onSubmit={handlePasswordChange} className="space-y-4">
                      {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
                      {passwordSuccess && <p className="text-green-400 text-sm">{passwordSuccess}</p>}
                      
                       <div>
                          <label htmlFor="currentPassword" className="block text-sm font-medium text-electric-teal mb-1">Current Password</label>
                          <input 
                             type="password" 
                             id="currentPassword"
                             value={currentPassword}
                             onChange={(e) => setCurrentPassword(e.target.value)}
                             required
                             className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}
                           />
                       </div>
                       <div>
                          <label htmlFor="newPassword" className="block text-sm font-medium text-electric-teal mb-1">New Password</label>
                          <input 
                             type="password" 
                             id="newPassword"
                             value={newPassword}
                             onChange={(e) => setNewPassword(e.target.value)}
                             required
                             className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}
                           />
                            <p className="mt-1 text-xs text-gray-500">Minimum 6 characters.</p>
                       </div>
                       <div>
                          <label htmlFor="confirmPassword" className="block text-sm font-medium text-electric-teal mb-1">Confirm New Password</label>
                          <input 
                             type="password" 
                             id="confirmPassword"
                             value={confirmPassword}
                             onChange={(e) => setConfirmPassword(e.target.value)}
                             required
                             className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}
                           />
                       </div>
                      
                       <div className="text-right">
                           <button
                               type="submit"
                               disabled={isChangingPassword}
                               className="px-4 py-1.5 rounded bg-electric-teal hover:bg-electric-teal/80 text-charcoal text-sm font-semibold shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                               {isChangingPassword ? 'Changing...' : 'Change Password'}
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