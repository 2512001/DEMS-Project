import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Clock, Mail, Building2, User, UploadCloud, FileText, Check, X } from 'lucide-react';
import { getInvitationByToken, acceptEmployeeInvitation, submitEmployeeApplication } from '../../api/invitations.js';
import { requestEmailOTP, verifyEmailOTP, getOTPStatus } from '../../api/otp.js';
import { useAuth } from '../../auth/AuthContext.jsx';

export default function EmployeeInvitation() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, refreshUser, loginWithWallet } = useAuth();
    const token = searchParams.get('token');
    const [step, setStep] = useState('view'); // view, profile, documents, otp_verification
    const [error, setError] = useState('');
    const [otp, setOtp] = useState('');
    const [otpVerified, setOtpVerified] = useState(false);
    const [resendOtpEnabled, setResendOtpEnabled] = useState(false);
    const [resendCount, setResendCount] = useState(0);

    const invitationQuery = useQuery({
        queryKey: ['invitation', token],
        queryFn: () => getInvitationByToken(token),
        enabled: !!token
    });

    const acceptInvitation = useMutation({
        mutationFn: () => acceptEmployeeInvitation(token),
        onSuccess: (response) => {
            setStep('profile');
        },
        onError: (err) => {
            setError(err.response?.data?.message || 'Failed to accept invitation');
        }
    });

    const submitApplication = useMutation({
        mutationFn: (formData) => submitEmployeeApplication(token, formData),
        onSuccess: async (response) => {
            await refreshUser();
            setStep('submitted');
        },
        onError: (err) => {
            setError(err.response?.data?.message || 'Failed to submit application');
        }
    });

    const requestOtp = useMutation({
        mutationFn: () => requestEmailOTP(invitation.invitedEmail),
        onSuccess: (response) => {
            setOtpVerified(false);
            setResendCount(response?.data?.attemptsRemaining !== undefined ? 3 - (response.data.attemptsRemaining || 0) : 3);
        },
        onError: (err) => {
            setError(err?.response?.data?.message || err.message || 'Failed to request OTP');
        }
    });

    const verifyOtp = useMutation({
        mutationFn: () => verifyEmailOTP(invitation.invitedEmail, otp),
        onSuccess: (response) => {
            setOtpVerified(true);
            setStep('profile');
        },
        onError: (err) => {
            setError(err?.response?.data?.message || err.message || 'Invalid OTP');
            setResendOtpEnabled(true);
        }
    });

    useEffect(() => {
        // Check OTP status after invitation accepted
        if (otpVerified && invitation?.invitedEmail) {
            getOTPStatus().then(statusResponse => {
                // OTP status checked, continue
            }).catch(() => {});
        }
    }, [otpVerified, invitation?.invitedEmail]);

    const handleAcceptInvitation = () => {
        setError('');
        acceptInvitation.mutate();
    };

    const handleProfileSubmit = (e) => {
        e.preventDefault();
        setError('');
        // Check if OTP verification is required
        if (!otpVerified && invitation?.invitedEmail) {
            setStep('otp_verification');
            requestOtp.mutate();
        } else {
            setStep('documents');
        }
    };

    const handleOtpSubmit = (e) => {
        e.preventDefault();
        setError('');
        verifyOtp.mutate();
    };

    const handleDocumentsSubmit = (e) => {
        e.preventDefault();
        setError('');
        const formData = new FormData(e.currentTarget);
        submitApplication.mutate(formData);
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
            <div className="section-card max-w-2xl w-full">
                {step === 'view' && (
                    <>
                        <div className="text-center mb-6">
                            <Building2 className="mx-auto text-sky-400 mb-4" size={48} />
                            <h1 className="text-2xl font-bold mb-2">Employee Invitation</h1>
                            <p className="text-slate-400">You've been invited to join as an Employee</p>
                        </div>

                        <div className="mb-6 p-4 rounded-lg border border-sky-500/30 bg-sky-950/20">
                            <h2 className="font-bold text-lg mb-3 text-sky-300">{invitation.organizationId?.name}</h2>
                            <div className="grid gap-2 text-sm md:grid-cols-2">
                                <p><span className="text-slate-400">Organization Code:</span> <code className="text-sky-300">{invitation.organizationId?.organizationCode}</code></p>
                                <p><span className="text-slate-400">Position:</span> {invitation.designation || 'Not specified'}</p>
                                <p><span className="text-slate-400">Department:</span> {invitation.department || 'Not specified'}</p>
                                <p><span className="text-slate-400">Employee ID:</span> {invitation.employeeId || 'Not specified'}</p>
                                <p><span className="text-slate-400">Expires:</span> {new Date(invitation.expiresAt).toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div className="mb-4">
                            <h3 className="font-bold mb-3">What happens next:</h3>
                            <ol className="space-y-2 text-sm text-slate-300 list-decimal list-inside">
                                <li>Accept this invitation</li>
                                <li>Complete your profile information</li>
                                <li>Upload required verification documents</li>
                            <li>Submit your employee application</li>
                                <li>Wait for Organization Admin approval</li>
                                <li>Access Employee Dashboard once approved</li>
                            </ol>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-sm text-red-200 mb-4">
                                {error}
                            </div>
                        )}

                        <button 
                            onClick={handleAcceptInvitation}
                            className="btn-primary w-full"
                            disabled={acceptInvitation.isPending}
                        >
                            {acceptInvitation.isPending ? 'Processing...' : 'Accept Invitation'}
                        </button>

                        <div className="text-center text-xs text-slate-500 mt-4">
                            <Clock size={12} className="inline mr-1" />
                            Invitation expires on {new Date(invitation.expiresAt).toLocaleString()}
                        </div>
                    </>
                )}

                {step === 'profile' && (
                    <>
                        <div className="text-center mb-6">
                            <User className="mx-auto text-sky-400 mb-4" size={48} />
                            <h1 className="text-2xl font-bold mb-2">Complete Your Profile</h1>
                            <p className="text-slate-400">Please provide your personal information</p>
                        </div>

                        <form onSubmit={handleProfileSubmit} className="space-y-4">
                            <div>
                                <label className="label">Full Name</label>
                                <input 
                                    className="input" 
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder={invitation.invitedName}
                                    required
                                />
                            </div>
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
                                <label className="label">Phone (Optional)</label>
                                <input 
                                    className="input" 
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+1 (555) 000-0000"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setStep('view')}
                                    className="btn-secondary flex-1"
                                >
                                    Back
                                </button>
                                <button type="submit" className="btn-primary flex-1">
                                    Continue to Documents
                                </button>
                            </div>
                        </form>
                    </>
                )}

                {step === 'documents' && (
                    <>
                        <div className="text-center mb-6">
                            <FileText className="mx-auto text-sky-400 mb-4" size={48} />
                            <h1 className="text-2xl font-bold mb-2">Upload Verification Documents</h1>
                            <p className="text-slate-400">Upload required employment/identity verification documents</p>
                        </div>

                        <form onSubmit={handleDocumentsSubmit} className="space-y-4">
                            <div>
                                <label className="label">Verification Documents</label>
                                <p className="text-xs text-slate-500 mb-2">Upload employment ID, government ID, or other verification documents</p>
                                <input 
                                    className="input py-2" 
                                    type="file" 
                                    name="documents" 
                                    multiple
                                    required
                                />
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-sm text-red-200 mb-4">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setStep('profile')}
                                    className="btn-secondary flex-1"
                                >
                                    Back
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn-primary flex-1"
                                    disabled={submitApplication.isPending}
                                >
                                    {submitApplication.isPending ? (
                                        <span className="flex items-center justify-center">
                                            <UploadCloud size={16} className="animate-spin mr-2" />
                                            Submitting...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center">
                                            <UploadCloud size={16} className="mr-2" />
                                            Submit Application
                                        </span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </>
                )}

                {step === 'submitted' && (
                    <>
                        <div className="text-center py-8">
                            <Check className="mx-auto text-emerald-400 mb-4" size={64} />
                            <h1 className="text-2xl font-bold mb-2">Application Submitted</h1>
                            <p className="text-slate-400 mb-6">Your employee application has been submitted to <strong>{invitation.organizationId?.name}</strong></p>
                            
                            <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-950/20 mb-6">
                                <p className="text-amber-300 text-sm">
                                    <Clock size={14} className="inline mr-2" />
                                    Your application is pending Organization Admin review. You will be notified once a decision is made.
                                </p>
                            </div>

                            <p className="text-sm text-slate-400 mb-4">
                                Current Status: <span className="text-amber-300 font-medium">Pending Approval</span>
                            </p>

                            <button 
                                onClick={() => navigate('/citizen/dashboard')}
                                className="btn-primary"
                            >
                                Return to Dashboard
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}