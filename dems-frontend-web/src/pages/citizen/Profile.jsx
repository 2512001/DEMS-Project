import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, UploadCloud } from 'lucide-react';
import { updateProfile } from '../../api/auth.js';
import { submitVerificationRequest } from '../../api/admin.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

const profileSchema = z.object({
  displayName: z.string().max(120).optional(),
  email: z.string().email().or(z.literal('')).optional()
});

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [notice, setNotice] = useState('');
  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.profile?.displayName || '',
      email: user?.profile?.email || ''
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
      setNotice('Verification request submitted.');
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

      <form className="section-card" onSubmit={submitVerification}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Officer Verification</h2>
          <StatusBadge status={user?.officerVerification?.status || 'none'} />
        </div>
        <div className="grid gap-3">
          <label><span className="label">Badge Number</span><input className="input" name="badgeNumber" required /></label>
          <label><span className="label">Government ID Number</span><input className="input" name="governmentIdNumber" required /></label>
          <label><span className="label">Aadhaar Number</span><input className="input" name="aadhaarNumber" required /></label>
          <label><span className="label">Badge</span><input className="input py-2" type="file" name="badge" required /></label>
          <label><span className="label">Government ID</span><input className="input py-2" type="file" name="governmentId" required /></label>
          <label><span className="label">Aadhaar</span><input className="input py-2" type="file" name="aadhaar" required /></label>
          <label><span className="label">Supporting Documents</span><input className="input py-2" type="file" name="supportingDocuments" multiple /></label>
        </div>
        <button className="btn-primary mt-4" disabled={verification.isPending}>
          {verification.isPending ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
          Submit Verification
        </button>
      </form>
    </div>
  );
}
