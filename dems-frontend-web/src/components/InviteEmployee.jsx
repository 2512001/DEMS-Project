import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Building2, Check, Mail, UserPlus, X } from 'lucide-react';
import { createEmployeeInvitation } from '../api/invitations.js';

export default function InviteEmployee({ onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    invitedEmail: '',
    invitedName: '',
    department: '',
    designation: '',
    employeeId: '',
    contactPhone: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const createInvitation = useMutation({
    mutationFn: createEmployeeInvitation,
    onSuccess: (response) => {
      setSuccess('Invitation sent. The employee will receive an email with the next steps.');
      setError('');
      setForm({ invitedEmail: '', invitedName: '', department: '', designation: '', employeeId: '', contactPhone: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['org-overview'] });
      if (onSuccess) onSuccess(response);
    },
    onError: (err) => {
      setError(err.response?.data?.message || err.message || 'Failed to create invitation');
      setSuccess('');
    }
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.invitedEmail || !form.invitedEmail.includes('@')) {
      setError('A valid email address is required.');
      return;
    }
    if (!form.invitedName || form.invitedName.trim().length < 2) {
      setError('The employee name is required.');
      return;
    }

    createInvitation.mutate({
      invitedEmail: form.invitedEmail.trim(),
      invitedName: form.invitedName.trim(),
      department: form.department.trim(),
      designation: form.designation.trim(),
      employeeId: form.employeeId.trim(),
      contactPhone: form.contactPhone.trim()
    });
  };

  return (
    <section className="section-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-brand-soft text-brand">
            <UserPlus size={16} />
          </span>
          <div>
            <h2 className="section-title">Invite employee</h2>
            <p className="section-subtitle">They join your organization after an email invite and your approval.</p>
          </div>
        </div>
        {onCancel ? (
          <button type="button" onClick={onCancel} className="icon-btn" aria-label="Close invite form">
            <X size={15} />
          </button>
        ) : null}
      </div>

      {success ? (
        <div className="alert-success mt-4">
          <Check size={15} className="mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      ) : null}

      {error ? (
        <div className="alert-danger mt-4" role="alert">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="label">Employee email</span>
          <input
            className="input"
            type="email"
            value={form.invitedEmail}
            onChange={set('invitedEmail')}
            placeholder="employee@example.com"
            required
          />
          <span className="hint">The invitation link is sent to this address.</span>
        </label>

        <label className="block">
          <span className="label">Full name</span>
          <input className="input" value={form.invitedName} onChange={set('invitedName')} placeholder="Jane Doe" required />
        </label>

        <label className="block">
          <span className="label">Employee ID</span>
          <input className="input" value={form.employeeId} onChange={set('employeeId')} placeholder="EMP-001" />
        </label>

        <label className="block">
          <span className="label">Department</span>
          <input className="input" value={form.department} onChange={set('department')} placeholder="Investigations" />
        </label>

        <label className="block">
          <span className="label">Designation</span>
          <input className="input" value={form.designation} onChange={set('designation')} placeholder="Senior Officer" />
        </label>

        <label className="block sm:col-span-2">
          <span className="label">Contact phone</span>
          <input className="input" value={form.contactPhone} onChange={set('contactPhone')} placeholder="+1 555 000 0000" />
        </label>

        <div className="alert-info sm:col-span-2">
          <Building2 size={15} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">What the employee will do</p>
            <ol className="mt-1 list-inside list-decimal space-y-0.5 text-[12.5px]">
              <li>Connect their wallet</li>
              <li>Complete their profile and verify their email</li>
              <li>Upload verification documents</li>
              <li>Submit their application for your review</li>
            </ol>
          </div>
        </div>

        <div className="flex gap-2 sm:col-span-2">
          {onCancel ? (
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
          ) : null}
          <button type="submit" className="btn-primary" disabled={createInvitation.isPending}>
            {createInvitation.isPending ? (
              <>
                <Mail size={15} className="animate-pulse" />
                Sending…
              </>
            ) : (
              <>
                <Mail size={15} />
                Send invitation
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
