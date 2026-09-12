import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, Clock, Mail, Building2, User, BadgeCheck, X } from 'lucide-react';
import { getInvitationByToken, acceptAdminInvitation } from '../../api/invitations.js';
import { updateProfile } from '../../api/auth.js';
import { useAuth } from '../../auth/AuthContext.jsx';

export default function AdminInvitation() {
    const navigate = useNavigate();
    const [searchParams] = setSearchParams();
    const { user, refreshUser } = useAuth();
    const token = searchParams.get('token');
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');

    const invitationQuery = useQuery({
        queryKey: ['invitation', token],
        queryFn: () => getInvitationByToken(token),
        enabled: !!token
    });

    const acceptInvitation = useMutation({
        mutationFn: (data) => acceptAdminInvitation(token, data),
        onSuccess: async (response) => {
            await refreshUser();
            navigate('/admin/dashboard', { replace: true });
        },
        onError: (err) => {
            setError(err.response?.data?.message || 'Failed to accept invitation');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        acceptInvitation.mutate({ email, name, phone });
    };

    if (!token) {
        return (
            <div className="flex flex-1 items-center justify-center py-12">
                <div className="section-card max-w-xl text-center">
                    <AlertTriangle className="mx-auto text-amber-400 mb-4" size={48} />
                    <h1 className="text-2xl font-bold mb-2">Invalid Invitation Link</h1>
                    <p className="text-slate-400">This invitation link is missing or invalid.</p>
                </div>
            </div>
        );
    }

    if (invitationQuery.isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center py-12">
                <div className="section-card max-w-xl text-center">
                    <div className="animate-spin mx-auto mb-4" style={{ width: 40, height: 40, border: '3px solid #0ea5e9', borderTop: 'transparent' }}></div>
                    <p className="text-slate-400">Loading invitation...</p>
                </div>
            </div>
        );
    }

    if (invitationQuery.error) {
        return (
            <div className="flex flex-1 items-center justify-center py-12">
                <div className="section-card max-w-xl text-center">
                    <X className="mx-auto text-red-400 mb-4" size={48} />
                    <h1 className="text-2xl font-bold mb-2">Invitation Not Found</h1>
                    <p className="text-slate-400">{invitationQuery.error.message || 'This invitation could not be found.'}</p>
                </div>
            </div>
        );
    }

    const invitation = invitationQuery.data?.data;

    if (!invitation) {
        return (
            <div className="flex flex-1 items-center justify-center py-12">
                <div className="section-card max-w-xl text-center">
                    <X className="mx-auto text-red-400 mb-4" size={48} />
                    <h1 className="text-2xl font-bold mb-2">Invitation Not Available</h1>
                    <p className="text-slate-400">This invitation is no longer valid.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-1 items-center justify-center py-12">
            <div className="section-card max-w-xl w-full">
                <div className="text-center mb-6">
                    <Mail className="mx-auto text-sky-400 mb-4" size={48} />
                    <h1 className="text-2xl font-bold mb-2">Organization Administrator Invitation</h1>
                    <p className="text-slate-400">You've been invited to become an Organization Administrator</p>
                </div>

                <div className="mb-6 p-4 rounded-lg border border-sky-500/30 bg-sky-950/20">
                    <h2 className="font-bold text-lg mb-3 text-sky-300">{invitation.organizationId?.name}</h2>
                    <div className="space-y-2 text-sm">
                        <p><span className="text-slate-400">Organization Code:</span> <code className="text-sky-300">{invitation.organizationId?.organizationCode}</code></p>
                        <p><span className="text-slate-400">Invited Email:</span> {invitation.invitedEmail}</p>
                        <p><span className="text-slate-400">Expires:</span> {new Date(invitation.expiresAt).toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="mb-4">
                    <h3 className="font-bold mb-3">Complete Your Profile</h3>
                    <p className="text-sm text-slate-400 mb-4">Please confirm your information to accept this invitation.</p>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="label">Email</label>
                            <input 
                                className="input" 
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={invitation.invitedEmail}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Full Name</label>
                            <input 
                                className="input" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={invitation.invitedName}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Phone (Optional)</label>
                            <input 
                                className="input" 
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+1 (555) 000-0000"
                            />
                        </div>
                        {error && (
                            <div className="p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-sm text-red-200">
                                {error}
                            </div>
                        )}
                        <button 
                            type="submit" 
                            className="btn-primary w-full"
                            disabled={acceptInvitation.isPending}
                        >
                            {acceptInvitation.isPending ? 'Processing...' : 'Accept Invitation & Become Admin'}
                        </button>
                    </form>
                </div>

                <div className="text-center text-xs text-slate-500">
                    <Clock size={12} className="inline mr-1" />
                    Invitation expires on {new Date(invitation.expiresAt).toLocaleString()}
                </div>
            </div>
        </div>
    );
}