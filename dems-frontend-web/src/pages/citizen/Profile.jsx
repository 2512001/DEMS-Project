import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, UploadCloud, Search, Briefcase, ChevronDown, ChevronUp } from 'lucide-react';
import { updateProfile } from '../../api/auth.js';
import { resolveOrganizationByCode, submitVerificationRequest } from '../../api/admin.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

const profileSchema = z.object({
  displayName: z.string().max(120).optional(),
  email: z.string().email().or(z.literal('')).optional()
});

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [notice, setNotice] = useState('');
  const [showEmployeeSection, setShowEmployeeSection] = useState(false);
  const [orgCode, setOrgCode] = useState('');
  const [resolvedOrg, setResolvedOrg] = useState(null);
  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.profile?.displayName || '',
      email: user?.profile?.email || ''
    }
  });

  const resolveOrg = useMutation({
    mutationFn: (code) => resolveOrganizationByCode(code),
    onSuccess: (data) => {
      setResolvedOrg(data.data);
      setNotice(`Organization found: ${data.data.name}`);
    }
  });

  const saveProfile = useMutation({
    mutationFn: updateProfile,
    onSuccess: async () => {
      await refreshUser();
      setNotice('Profile updated.');
    }
  });

  const verification = useMutation({
    mutationFn: submitVerificationRequest,
    onSuccess: async () => {
      await refreshUser();
      setNotice('Employee membership request submitted. Your request is pending Organization Admin review.');
      setOrgCode('');
      setResolvedOrg(null);
    }
  });

  const submitVerification = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    verification.mutate(formData);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <form className="section-card" onSubmit={form.handleSubmit((values) => saveProfile.mutate(values))}>
        <h1 className="mb-4 text-2xl font-extrabold">Profile</h1>
        <label className="mb-4 block"><span className="label">Display Name</span><input className="input" {...form.register('displayName')} /></label>
        <label className="mb-4 block"><span className="label">Email</span><input className="input" {...form.register('email')} /></label>
        <button className="btn-primary" disabled={saveProfile.isPending}>{saveProfile.isPending ? <Loader2 className="animate-spin" size={16} /> : null}Save Profile</button>
        {notice ? <p className="mt-4 text-sm text-emerald-300">{notice}</p> : null}
      </form>

      {/* Optional Employee Membership Section */}
      <div className="section-card">
        <button
          type="button"
          className="w-full flex items-center justify-between mb-4"
          onClick={() => setShowEmployeeSection(!showEmployeeSection)}
        >
          <div className="flex items-center gap-2">
            <Briefcase size={20} className="text-slate-400" />
            <h2 className="text-xl font-bold">Employee Membership</h2>
            <StatusBadge status={user?.officerVerification?.status || 'none'} />
          </div>
          {showEmployeeSection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {showEmployeeSection && (
          <>
            <p className="text-sm text-slate-400 mb-4">
              <strong>Optional:</strong> Apply to become an employee of an organization. 
              This is only required if you want to upload work-related evidence under organizational policies.
            </p>

            {user?.officerVerification?.status === 'approved' ? (
              <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-950/20">
                <p className="text-sm text-emerald-300">✓ You are an approved employee of an organization.</p>
              </div>
            ) : user?.officerVerification?.status === 'pending' ? (
              <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-950/20">
                <p className="text-sm text-amber-300">⏳ Your employee application is pending review.</p>
              </div>
            ) : user?.officerVerification?.status === 'rejected' ? (
              <div className="p-4 rounded-lg border border-red-500/30 bg-red-950/20">
                <p className="text-sm text-red-300">✗ Your employee application was rejected.</p>
                <p className="text-xs text-slate-400 mt-1">Reason: {user?.officerVerification?.rejectionReason || 'No reason provided'}</p>
              </div>
            ) : (
              <form className="grid gap-3" onSubmit={submitVerification}>
                <p className="text-sm text-slate-400 mb-3">Enter the organization code provided by your organization administrator.</p>
                <div className="mb-3">
                  <label><span className="label">Organization Code</span></label>
                  <div className="flex gap-2">
                    <input 
                      className="input" 
                      value={orgCode} 
                      onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                      placeholder="DEMS-XXXXX" 
                      maxLength={8}
                    />
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={() => orgCode && resolveOrg.mutate(orgCode)}
                      disabled={!orgCode || resolveOrg.isPending}
                    >
                      {resolveOrg.isPending ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                    </button>
                  </div>
                </div>
                {resolvedOrg && (
                  <div className="mb-3 p-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20">
                    <p className="text-sm text-emerald-300">Organization found: <strong>{resolvedOrg.name}</strong></p>
                    <p className="text-xs text-slate-400">Code: {resolvedOrg.organizationCode}</p>
                  </div>
                )}
                <input type="hidden" name="organizationId" value={resolvedOrg?._id || ''} />
                <label><span className="label">Government ID Number</span><input className="input" name="governmentIdNumber" required /></label>
                <label><span className="label">Aadhaar Number</span><input className="input" name="aadhaarNumber" required /></label>
                <label><span className="label">Badge</span><input className="input py-2" type="file" name="badge" required /></label>
                <label><span className="label">Government ID</span><input className="input py-2" type="file" name="governmentId" required /></label>
                <label><span className="label">Aadhaar</span><input className="input py-2" type="file" name="aadhaar" required /></label>
                <label><span className="label">Supporting Documents</span><input className="input py-2" type="file" name="supportingDocuments" multiple /></label>
                <button className="btn-primary mt-2" disabled={verification.isPending || !resolvedOrg}>
                  {verification.isPending ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                  Submit Verification
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
