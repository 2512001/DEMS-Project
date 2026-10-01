import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, UserPlus, Check, X, Settings, Users, BarChart3, Mail, Phone, Globe, MapPin, FileText, Eye, Shield, Activity, TrendingUp, AlertTriangle, Lock, Clock } from 'lucide-react';
import { listOrganizations, createOrganization, assignOrganizationAdmin, getOrganizationDetails, getOrganizationAdmins } from '../../api/admin.js';
import { getPlatformAnalytics } from '../../api/analytics.js';
import { useAuth } from '../../auth/AuthContext.jsx';

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [showOrgDetails, setShowOrgDetails] = useState(false);
  const [notice, setNotice] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Create organization form state
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgType, setNewOrgType] = useState('other');
  const [newOrgDescription, setNewOrgDescription] = useState('');
  const [newOrgEmail, setNewOrgEmail] = useState('');
  const [newOrgPhone, setNewOrgPhone] = useState('');
  const [newOrgWebsite, setNewOrgWebsite] = useState('');
  const [newOrgAddress, setNewOrgAddress] = useState('');
  const [newOrgCity, setNewOrgCity] = useState('');
  const [newOrgState, setNewOrgState] = useState('');
  const [newOrgCountry, setNewOrgCountry] = useState('');
  const [newOrgPostalCode, setNewOrgPostalCode] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactDesignation, setNewContactDesignation] = useState('');
  
  // Invite admin form state
  const [inviteOrgId, setInviteOrgId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');

  const organizations = useQuery({ 
    queryKey: ['organizations'], 
    queryFn: listOrganizations,
    enabled: user?.role === 'super_admin'
  });

  const platformAnalytics = useQuery({
    queryKey: ['platform-analytics'],
    queryFn: getPlatformAnalytics,
    enabled: user?.role === 'super_admin',
    refetchInterval: 60000 // Refresh every minute
  });

  const orgDetails = useQuery({
    queryKey: ['organization', selectedOrg],
    queryFn: () => getOrganizationDetails(selectedOrg),
    enabled: !!selectedOrg
  });

  const orgAdmins = useQuery({
    queryKey: ['organization-admins', selectedOrg],
    queryFn: () => getOrganizationAdmins(selectedOrg),
    enabled: !!selectedOrg
  });

  const createOrg = useMutation({
    mutationFn: (data) => createOrganization(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setShowCreateForm(false);
      resetCreateForm();
    }
  });

  const inviteAdmin = useMutation({
    mutationFn: (data) => assignOrganizationAdmin(data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-admins', inviteOrgId] });
      setShowInviteForm(false);
      resetInviteForm();
      const email = variables?.invitedEmail || response?.data?.invitedEmail || 'the recipient';
      setNotice(`Invitation sent successfully to ${email}`);
    },
    onError: (err) => {
      const details = err.response?.data?.error ? ` ${err.response.data.error}` : '';
      setNotice(`Failed to send invitation: ${err.response?.data?.message || err.message}${details}`);
    }
  });

  const resetCreateForm = () => {
    setNewOrgName('');
    setNewOrgType('other');
    setNewOrgDescription('');
    setNewOrgEmail('');
    setNewOrgPhone('');
    setNewOrgWebsite('');
    setNewOrgAddress('');
    setNewOrgCity('');
    setNewOrgState('');
    setNewOrgCountry('');
    setNewOrgPostalCode('');
    setNewContactName('');
    setNewContactEmail('');
    setNewContactPhone('');
    setNewContactDesignation('');
  };

  const resetInviteForm = () => {
    setInviteOrgId('');
    setInviteEmail('');
    setInviteName('');
  };

  const handleCreateOrg = (e) => {
    e.preventDefault();
    createOrg.mutate({
      name: newOrgName,
      organizationType: newOrgType,
      description: newOrgDescription,
      officialEmail: newOrgEmail,
      officialPhone: newOrgPhone,
      website: newOrgWebsite,
      address: {
        street: newOrgAddress,
        city: newOrgCity,
        state: newOrgState,
        country: newOrgCountry,
        postalCode: newOrgPostalCode
      },
      primaryContact: {
        name: newContactName,
        email: newContactEmail,
        phone: newContactPhone,
        designation: newContactDesignation
      }
    });
  };

  const handleInviteAdmin = (e) => {
    e.preventDefault();
    inviteAdmin.mutate({
      organizationId: inviteOrgId,
      invitedEmail: inviteEmail,
      invitedName: inviteName
    });
  };

  const handleViewOrganization = (orgId) => {
    setSelectedOrg(orgId);
    setShowOrgDetails(true);
  };

  if (user?.role !== 'super_admin') {
    return (
      <div className="section-card text-center py-12">
        <p className="text-slate-400">Super Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="section-card">
        <h1 className="mb-2 text-2xl font-extrabold">Super Admin Dashboard</h1>
        <p className="text-sm text-slate-400">Platform-level organization administration</p>
      </div>

      {/* Notice Display */}
      {notice && (
        <div className={`section-card p-4 ${notice.includes('Failed') || notice.includes('error') ? 'border-red-500/30 bg-red-950/20' : 'border-emerald-500/30 bg-emerald-950/20'}`}>
          <p className={`text-sm ${notice.includes('Failed') || notice.includes('error') ? 'text-red-300' : 'text-emerald-300'}`}>
            {notice}
          </p>
          <button 
            className="text-xs text-slate-400 hover:text-white mt-2"
            onClick={() => setNotice('')}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Platform Overview Stats */}
      {platformAnalytics.data && (
        <div className="section-card">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="text-sky-400" size={24} />
            <h2 className="text-xl font-bold">Platform Overview</h2>
          </div>
          
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <div className="p-4 rounded-lg border border-slate-700 bg-slate-900/50">
              <p className="text-2xl font-bold text-sky-400">{platformAnalytics.data.overview.totalOrganizations}</p>
              <p className="text-sm text-slate-400">Total Organizations</p>
            </div>
            <div className="p-4 rounded-lg border border-slate-700 bg-slate-900/50">
              <p className="text-2xl font-bold text-emerald-400">{platformAnalytics.data.overview.activeOrganizations}</p>
              <p className="text-sm text-slate-400">Active Organizations</p>
            </div>
            <div className="p-4 rounded-lg border border-slate-700 bg-slate-900/50">
              <p className="text-2xl font-bold text-purple-400">{platformAnalytics.data.overview.totalUsers}</p>
              <p className="text-sm text-slate-400">Total Users</p>
            </div>
            <div className="p-4 rounded-lg border border-slate-700 bg-slate-900/50">
              <p className="text-2xl font-bold text-amber-400">{platformAnalytics.data.overview.totalEvidence}</p>
              <p className="text-sm text-slate-400">Total Evidence</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-6">
            <div className="p-3 rounded-lg border border-slate-700 bg-slate-900/50">
              <p className="text-lg font-bold">{platformAnalytics.data.overview.citizens}</p>
              <p className="text-xs text-slate-400">Citizens</p>
            </div>
            <div className="p-3 rounded-lg border border-slate-700 bg-slate-900/50">
              <p className="text-lg font-bold">{platformAnalytics.data.overview.officers}</p>
              <p className="text-xs text-slate-400">Officers</p>
            </div>
            <div className="p-3 rounded-lg border border-slate-700 bg-slate-900/50">
              <p className="text-lg font-bold">{platformAnalytics.data.overview.admins}</p>
              <p className="text-xs text-slate-400">Admins</p>
            </div>
            <div className="p-3 rounded-lg border border-slate-700 bg-slate-900/50">
              <p className="text-lg font-bold">{platformAnalytics.data.overview.superAdmins}</p>
              <p className="text-xs text-slate-400">Super Admins</p>
            </div>
            <div className="p-3 rounded-lg border border-slate-700 bg-slate-900/50">
              <p className="text-lg font-bold text-amber-400">{platformAnalytics.data.overview.pendingInvitations}</p>
              <p className="text-xs text-slate-400">Pending Invitations</p>
            </div>
            <div className="p-3 rounded-lg border border-slate-700 bg-slate-900/50">
              <p className="text-lg font-bold text-red-400">{platformAnalytics.data.overview.quarantinedEvidence}</p>
              <p className="text-xs text-slate-400">Quarantined</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="section-card">
        <div className="flex gap-2 flex-wrap">
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'dashboard' 
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
            onClick={() => setActiveTab('dashboard')}
          >
            <BarChart3 size={16} className="inline mr-2" />
            Dashboard
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'organizations' 
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
            onClick={() => setActiveTab('organizations')}
          >
            <Building2 size={16} className="inline mr-2" />
            Organizations
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'administrators' 
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
            onClick={() => setActiveTab('administrators')}
          >
            <Users size={16} className="inline mr-2" />
            Administrators
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'invitations' 
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
            onClick={() => setActiveTab('invitations')}
          >
            <Mail size={16} className="inline mr-2" />
            Invitations
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'security' 
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
            onClick={() => setActiveTab('security')}
          >
            <Shield size={16} className="inline mr-2" />
            Security
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <div className="section-card">
          <h2 className="text-xl font-bold mb-4">Platform Activity</h2>
          {platformAnalytics.data?.recentSecurityEvents?.length > 0 ? (
            <div className="space-y-2">
              {platformAnalytics.data.recentSecurityEvents.map((event, index) => (
                <div key={index} className="p-3 rounded-lg border border-slate-700 bg-slate-900/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{event.action}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(event.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No recent security events recorded.</p>
          )}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="section-card">
          <div className="flex items-center gap-3">
            <Building2 className="text-sky-400" size={24} />
            <div>
              <p className="text-2xl font-bold">{organizations.data?.count || 0}</p>
              <p className="text-sm text-slate-400">Total Organizations</p>
            </div>
          </div>
        </div>
        <div className="section-card">
          <div className="flex items-center gap-3">
            <Users className="text-emerald-400" size={24} />
            <div>
              <p className="text-2xl font-bold">
                {organizations.data?.data?.reduce((sum, org) => sum + (org.stats?.adminCount || 0), 0) || 0}
              </p>
              <p className="text-sm text-slate-400">Active Admins</p>
            </div>
          </div>
        </div>
        <div className="section-card">
          <div className="flex items-center gap-3">
            <UserPlus className="text-purple-400" size={24} />
            <div>
              <p className="text-2xl font-bold">
                {organizations.data?.data?.reduce((sum, org) => sum + (org.stats?.employeeCount || 0), 0) || 0}
              </p>
              <p className="text-sm text-slate-400">Employees</p>
            </div>
          </div>
        </div>
        <div className="section-card">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-amber-400" size={24} />
            <div>
              <p className="text-2xl font-bold">
                {organizations.data?.data?.filter(org => org.status === 'active').length || 0}
              </p>
              <p className="text-sm text-slate-400">Active Organizations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button 
          className="btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          <Plus size={16} /> Create Organization
        </button>
        <button 
          className="btn-secondary"
          onClick={() => setShowInviteForm(!showInviteForm)}
        >
          <Mail size={16} /> Invite Admin
        </button>
      </div>

      {/* Create Organization Form */}
      {showCreateForm && (
        <div className="section-card">
          <h2 className="mb-4 text-xl font-bold">Create New Organization</h2>
          <form onSubmit={handleCreateOrg} className="grid gap-4 max-w-4xl">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">Organization Name *</label>
                <input 
                  className="input" 
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Enter organization name"
                  required
                />
              </div>
              <div>
                <label className="label">Organization Type</label>
                <select 
                  className="input" 
                  value={newOrgType}
                  onChange={(e) => setNewOrgType(e.target.value)}
                >
                  <option value="other">Other</option>
                  <option value="law_enforcement">Law Enforcement</option>
                  <option value="corporate">Corporate</option>
                  <option value="government">Government</option>
                  <option value="legal">Legal</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="education">Education</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea 
                className="input" 
                value={newOrgDescription}
                onChange={(e) => setNewOrgDescription(e.target.value)}
                placeholder="Brief description of the organization"
                rows={2}
              />
            </div>
            
            <h3 className="font-bold text-lg pt-2 border-t border-slate-700">Contact Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">Official Email</label>
                <input 
                  className="input" 
                  type="email"
                  value={newOrgEmail}
                  onChange={(e) => setNewOrgEmail(e.target.value)}
                  placeholder="org@example.com"
                />
              </div>
              <div>
                <label className="label">Official Phone</label>
                <input 
                  className="input" 
                  value={newOrgPhone}
                  onChange={(e) => setNewOrgPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div>
                <label className="label">Website</label>
                <input 
                  className="input" 
                  value={newOrgWebsite}
                  onChange={(e) => setNewOrgWebsite(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <h3 className="font-bold text-lg pt-2 border-t border-slate-700">Address</h3>
            <div>
              <label className="label">Street Address</label>
              <input 
                className="input" 
                value={newOrgAddress}
                onChange={(e) => setNewOrgAddress(e.target.value)}
                placeholder="123 Main Street"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="label">City</label>
                <input 
                  className="input" 
                  value={newOrgCity}
                  onChange={(e) => setNewOrgCity(e.target.value)}
                  placeholder="City"
                />
              </div>
              <div>
                <label className="label">State/Province</label>
                <input 
                  className="input" 
                  value={newOrgState}
                  onChange={(e) => setNewOrgState(e.target.value)}
                  placeholder="State"
                />
              </div>
              <div>
                <label className="label">Postal Code</label>
                <input 
                  className="input" 
                  value={newOrgPostalCode}
                  onChange={(e) => setNewOrgPostalCode(e.target.value)}
                  placeholder="12345"
                />
              </div>
            </div>
            <div>
              <label className="label">Country</label>
              <input 
                className="input" 
                value={newOrgCountry}
                onChange={(e) => setNewOrgCountry(e.target.value)}
                placeholder="Country"
              />
            </div>

            <h3 className="font-bold text-lg pt-2 border-t border-slate-700">Primary Contact</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">Contact Name</label>
                <input 
                  className="input" 
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="label">Contact Email</label>
                <input 
                  className="input" 
                  type="email"
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  placeholder="contact@example.com"
                />
              </div>
              <div>
                <label className="label">Contact Phone</label>
                <input 
                  className="input" 
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div>
                <label className="label">Designation</label>
                <input 
                  className="input" 
                  value={newContactDesignation}
                  onChange={(e) => setNewContactDesignation(e.target.value)}
                  placeholder="Director"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={createOrg.isPending}>
                {createOrg.isPending ? 'Creating...' : 'Create Organization'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => { setShowCreateForm(false); resetCreateForm(); }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invite Admin Form */}
      {showInviteForm && (
        <div className="section-card">
          <h2 className="mb-4 text-xl font-bold">Invite Organization Administrator</h2>
          
          {/* SMTP Configuration Notice */}
          <div className="mb-4 p-3 rounded-lg border border-amber-500/30 bg-amber-950/20">
            <p className="text-sm text-amber-300">
              <Mail size={14} className="inline mr-2" />
              SMTP must be configured in backend .env for real email delivery
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Required: SMTP_USER, SMTP_PASSWORD, SMTP_HOST
            </p>
          </div>

          <form onSubmit={handleInviteAdmin} className="grid gap-4 max-w-2xl">
            <div>
              <label className="label">Select Organization</label>
              <select 
                className="input" 
                value={inviteOrgId}
                onChange={(e) => setInviteOrgId(e.target.value)}
                required
              >
                <option value="">Select organization</option>
                {organizations.data?.data?.map((org) => (
                  <option key={org._id} value={org._id}>
                    {org.name} ({org.organizationCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Administrator Email</label>
              <input 
                className="input" 
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
            </div>
            <div>
              <label className="label">Administrator Name</label>
              <input 
                className="input" 
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={inviteAdmin.isPending}>
                {inviteAdmin.isPending ? 'Sending...' : 'Send Invitation'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => { setShowInviteForm(false); resetInviteForm(); }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Organization Details Modal */}
      {showOrgDetails && selectedOrg && (
        <div className="section-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Organization Details</h2>
            <button onClick={() => { setShowOrgDetails(false); setSelectedOrg(null); }} className="text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
          
          {orgDetails.isLoading ? (
            <p className="text-slate-400">Loading...</p>
          ) : orgDetails.data ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-400">Name</p>
                  <p className="font-bold">{orgDetails.data.name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Organization Code</p>
                  <p className="font-bold text-sky-300">{orgDetails.data.organizationCode}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Status</p>
                  <span className={`text-xs px-2 py-1 rounded ${
                    orgDetails.data.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                  }`}>
                    {orgDetails.data.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Type</p>
                  <p className="font-bold">{orgDetails.data.organizationType}</p>
                </div>
              </div>

              {orgDetails.data.description && (
                <div>
                  <p className="text-sm text-slate-400">Description</p>
                  <p className="text-sm">{orgDetails.data.description}</p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {orgDetails.data.officialEmail && (
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-slate-400" />
                    <span className="text-sm">{orgDetails.data.officialEmail}</span>
                  </div>
                )}
                {orgDetails.data.officialPhone && (
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-slate-400" />
                    <span className="text-sm">{orgDetails.data.officialPhone}</span>
                  </div>
                )}
                {orgDetails.data.website && (
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-slate-400" />
                    <a href={orgDetails.data.website} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-400 hover:underline">
                      {orgDetails.data.website}
                    </a>
                  </div>
                )}
                {orgDetails.data.address?.city && (
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-slate-400" />
                    <span className="text-sm">{orgDetails.data.address.city}, {orgDetails.data.address.country}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-700">
                <h3 className="font-bold mb-3">Administrators</h3>
                {orgAdmins.isLoading ? (
                  <p className="text-slate-400">Loading admins...</p>
                ) : orgAdmins.data?.data?.length > 0 ? (
                  <div className="space-y-2">
                    {orgAdmins.data.data.map((admin) => (
                      <div key={admin._id} className="p-3 rounded-lg border border-slate-700 flex items-center gap-3">
                        <UserPlus size={20} className="text-emerald-400" />
                        <div>
                          <p className="font-bold">{admin.profile?.displayName || 'Unknown'}</p>
                          <p className="text-xs text-slate-400">{admin.profile?.email || admin.walletAddress}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400">No administrators assigned yet.</p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-700">
                <h3 className="font-bold mb-3">Statistics</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-2xl font-bold">{orgDetails.data.stats?.adminCount || 0}</p>
                    <p className="text-sm text-slate-400">Administrators</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{orgDetails.data.stats?.employeeCount || 0}</p>
                    <p className="text-sm text-slate-400">Employees</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{orgDetails.data.stats?.evidenceCount || 0}</p>
                    <p className="text-sm text-slate-400">Evidence Records</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-400">Failed to load organization details.</p>
          )}
        </div>
      )}

      {/* Organizations List */}
      <div className="section-card">
        <h2 className="mb-4 text-xl font-bold">Organizations</h2>
        {organizations.isLoading ? (
          <p className="text-slate-400">Loading organizations...</p>
        ) : organizations.data?.data?.length > 0 ? (
          <div className="space-y-3">
            {organizations.data.data.map((org) => (
              <div key={org._id} className="p-4 rounded-lg border border-slate-700">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{org.name}</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Code: <code className="text-sky-300">{org.organizationCode}</code>
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        org.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                      }`}>
                        {org.status}
                      </span>
                      <span className="text-xs text-slate-400">
                        {org.stats?.adminCount || 0} Admins
                      </span>
                      <span className="text-xs text-slate-400">
                        {org.stats?.employeeCount || 0} Employees
                      </span>
                    </div>
                  </div>
                  <button 
                    className="text-sm text-sky-400 hover:text-sky-300 flex items-center gap-1"
                    onClick={() => handleViewOrganization(org._id)}
                  >
                    <Eye size={16} /> View
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400">No organizations found.</p>
        )}
      </div>
    </div>
  );
}