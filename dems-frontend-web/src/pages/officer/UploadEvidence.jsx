import React, { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, UploadCloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import exifr from 'exifr';

import {
  finalizeEvidence,
  getUploadPolicy,
  markBlockchainFailed,
  uploadEvidence
} from '../../api/evidence.js';
import { addEvidenceOnChain, EVIDENCE_CONTRACT_ADDRESS } from '../../blockchain/evidenceContract.js';
import HashValue from '../../components/HashValue.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';

const schema = z.object({
  caseId: z.string().max(120).optional(),
  deviceInfo: z.string().min(2).max(300),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  capturedAt: z.string().min(1),
  evidence: z.any()
});

export default function UploadEvidence() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const isEmployee = role === 'officer';

  const [stage, setStage] = useState('collect');
  const [uploadResult, setUploadResult] = useState(null);
  const [aiPreview, setAiPreview] = useState(null);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [requestAI, setRequestAI] = useState(!isEmployee);
  const [requestBlockchain, setRequestBlockchain] = useState(false);
  const pendingFormData = useRef(null);

  const policyQuery = useQuery({ queryKey: ['upload-policy'], queryFn: getUploadPolicy });
  const policy = policyQuery.data;
  const aiRequired = Boolean(policy?.requireAIForEmployees);
  const chainRequired = Boolean(policy?.requireBlockchainForEmployees);
  const aiEnabled = isEmployee ? (aiRequired || requestAI) : requestAI;
  const chainEnabled = isEmployee ? (chainRequired || requestBlockchain) : requestBlockchain;

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      caseId: '',
      deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      latitude: 0,
      longitude: 0,
      capturedAt: new Date().toISOString().slice(0, 16),
      evidence: undefined
    }
  });

  const evidenceRegister = form.register('evidence');

  const resetAfterSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['my-files'] });
    setTimeout(() => {
      if (fileInputRef.current) fileInputRef.current.value = '';
      form.reset();
      setUploadResult(null);
      setAiPreview(null);
      setTxHash('');
      setError('');
      setStage('collect');
      navigate(isEmployee ? '/officer/dashboard' : '/citizen/evidence-vault');
    }, 1800);
  };

  const chainMutation = useMutation({
    mutationFn: async (stored) => {
      const record = stored || uploadResult;
      const payload = record?.blockchainPayload;
      const evidenceId = record?.evidenceId;
      if (!payload || !evidenceId) {
        throw new Error('Blockchain payload is missing from the backend response.');
      }
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed.');
      }
      if (!EVIDENCE_CONTRACT_ADDRESS) {
        throw new Error('Evidence contract address is not configured.');
      }
      setStage('chain');
      const chain = await addEvidenceOnChain(payload);
      setTxHash(chain.txHash);
      setStage('finalize');
      return finalizeEvidence(evidenceId, chain.txHash);
    },
    onSuccess: (response) => {
      if (response?.data) setUploadResult(response.data);
      setStage('complete');
      resetAfterSuccess();
    },
    onError: async (err, stored) => {
      const message = err?.response?.data?.message || err.message || 'Blockchain proof could not be created. Your evidence remains stored in IPFS.';
      setError(message);
      const evidenceId = stored?.evidenceId || uploadResult?.evidenceId;
      if (evidenceId) {
        await markBlockchainFailed(evidenceId, message).catch(() => {});
      }
      setStage('ai');
    }
  });

  const uploadMutation = useMutation({
    mutationFn: uploadEvidence,
    onSuccess: (response) => {
      setError('');
      if (response.requiresConfirmation) {
        setAiPreview(response.data?.aiAnalysis);
        setStage('ai');
        return;
      }
      if (response.quarantined) {
        setAiPreview(response.data?.aiAnalysis || null);
        setUploadResult(response.data);
        setStage('complete');
        queryClient.invalidateQueries({ queryKey: ['my-files'] });
        queryClient.invalidateQueries({ queryKey: ['quarantine'] });
        return;
      }
      setUploadResult(response.data);
      setAiPreview(response.data?.aiAnalysis || null);
      queryClient.invalidateQueries({ queryKey: ['my-files'] });
      if (response.data?.blockchainPayload) {
        setStage('chain');
        chainMutation.mutate(response.data);
      } else {
        setStage('complete');
        resetAfterSuccess();
      }
    },
    onError: (err) => {
      setError(err?.response?.data?.message || err.message || 'Upload failed.');
      setStage('collect');
    }
  });

  const buildFormData = (values, extra = {}) => {
    const file = values.evidence?.[0];
    const formData = new FormData();
    formData.append('evidence', file);
    if (values.caseId) formData.append('caseId', values.caseId);
    formData.append('requestAI', String(aiEnabled));
    formData.append('requestBlockchain', String(chainEnabled));
    Object.entries(extra).forEach(([key, value]) => formData.append(key, String(value)));
    formData.append('captureMetadata', JSON.stringify({
      deviceInfo: navigator.userAgent,
      gpsLocation: { latitude: Number(values.latitude), longitude: Number(values.longitude) },
      capturedAt: new Date(values.capturedAt).toISOString()
    }));
    return formData;
  };

  const submit = async (values) => {
    setError('');
    setUploadResult(null);
    setAiPreview(null);
    setTxHash('');
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });
      values.latitude = Number(position.coords.latitude.toFixed(6));
      values.longitude = Number(position.coords.longitude.toFixed(6));
    } catch (err) {
      setError(err?.message || 'Unable to get GPS location. Allow location access and try again.');
      return;
    }

    if (!values.evidence?.[0]) {
      setError('Evidence file is required.');
      return;
    }

    const formData = buildFormData(values);
    pendingFormData.current = values;
    setStage('upload');
    uploadMutation.mutate(formData);
  };

  const storeAnyway = () => {
    const values = pendingFormData.current || form.getValues();
    const formData = buildFormData(values, { confirmStoreDespiteAi: true });
    setStage('upload');
    uploadMutation.mutate(formData);
  };

  const suspicious = useMemo(
    () => Boolean(aiPreview?.deepfakeDetected || aiPreview?.tamperingDetected),
    [aiPreview]
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <form className="section-card" onSubmit={form.handleSubmit(submit)}>
        <h1 className="mb-2 text-lg font-extrabold">Upload Evidence</h1>
        <p className="mb-4 text-sm text-slate-400">
          {isEmployee
            ? 'Organization policy is applied to employee uploads. Suspicious files go to quarantine instead of trusted storage.'
            : 'AI analysis and blockchain proof are optional. AI does not block storage for personal evidence.'}
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <input
            ref={fileInputRef}
            className="input py-2"
            type="file"
            accept="image/*,video/*,audio/*,.pdf"
            {...evidenceRegister}
            onChange={async (e) => {
              evidenceRegister.onChange(e);
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const exif = await exifr.parse(file);
                const source = exif?.DateTimeOriginal || file.lastModified;
                if (!source) return;
                const d = new Date(source);
                form.setValue('capturedAt', new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
              } catch {
                /* ignore EXIF failures */
              }
            }}
          />
          <label>
            <span className="label">Case ID</span>
            <input className="input" {...form.register('caseId')} />
          </label>
          <label className="md:col-span-2">
            <span className="label">Device Fingerprint</span>
            <input className="input" readOnly {...form.register('deviceInfo')} />
          </label>
          <label>
            <span className="label">Timestamp</span>
            <input className="input" type="datetime-local" {...form.register('capturedAt')} />
          </label>
        </div>

        <div className="mt-5 rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p className="mb-3 text-sm font-semibold text-white">Security options</p>
          <label className="mb-3 flex items-center justify-between gap-3 text-sm text-slate-300">
            <span>AI authenticity verification {aiRequired ? '(required by organization policy)' : ''}</span>
            <input
              type="checkbox"
              checked={aiEnabled}
              disabled={aiRequired}
              onChange={(event) => setRequestAI(event.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm text-slate-300">
            <span>Blockchain integrity proof {chainRequired ? '(required by organization policy)' : ''}</span>
            <input
              type="checkbox"
              checked={chainEnabled}
              disabled={chainRequired}
              onChange={(event) => setRequestBlockchain(event.target.checked)}
            />
          </label>
        </div>

        {error ? (
          <div className="mt-4 border border-red-400/50 bg-red-950/30 p-3 text-sm text-red-200">
            <div className="flex gap-2"><AlertTriangle size={18} /><span>{error}</span></div>
          </div>
        ) : null}

        <div className="mt-5">
          <button type="submit" className="btn-primary" disabled={uploadMutation.isPending || chainMutation.isPending}>
            {uploadMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
            Secure Evidence
          </button>
        </div>
      </form>

      <div className="section-card">
        <h2 className="mb-4 text-base font-bold">Pipeline</h2>
        {['collect', 'upload', 'ai', 'chain', 'finalize', 'complete'].map((step) => (
          <div key={step} className={`mb-2 flex items-center gap-3 border p-3 ${stage === step ? 'border-sky-400 bg-sky-400/10' : 'border-slate-800'}`}>
            <span className="text-sm capitalize text-slate-200">{step}</span>
          </div>
        ))}

        {aiPreview?.requested ? (
          <div className={`mt-4 rounded-xl border p-4 ${suspicious ? 'border-amber-500/40 bg-amber-950/20' : 'border-emerald-500/30 bg-emerald-950/20'}`}>
            <p className="font-semibold text-white">{suspicious ? 'Potential Manipulation Detected' : 'AI Assessment'}</p>
            <p className="mt-2 text-sm text-slate-300">{aiPreview.explanation}</p>
            <p className="mt-3 text-sm text-slate-400">Authenticity: {aiPreview.authenticityScore ?? aiPreview.score}%</p>
            <p className="text-sm text-slate-400">Tampering: {aiPreview.tamperingScore ?? 0}%</p>
            <p className="text-sm text-slate-400">Deepfake: {aiPreview.deepfakeScore ?? 0}%</p>
            <p className="mt-3 text-xs text-slate-500">This result is an automated analysis and should not be treated as absolute proof.</p>
            {suspicious && !uploadResult && !isEmployee ? (
              <button type="button" className="btn-primary mt-4" onClick={storeAnyway} disabled={uploadMutation.isPending}>
                Store Anyway
              </button>
            ) : null}
            {!suspicious && !uploadResult && !isEmployee && aiPreview?.requested ? (
              <button type="button" className="btn-primary mt-4" onClick={storeAnyway} disabled={uploadMutation.isPending}>
                Continue and Store
              </button>
            ) : null}
            {uploadResult?.status === 'quarantine' ? (
              <p className="mt-3 text-sm text-amber-200">Submitted for admin review.</p>
            ) : null}
          </div>
        ) : null}

        {uploadResult ? (
          <div className="mt-5 grid gap-3">
            <StatusBadge status={uploadResult.status} />
            <p className="text-xs text-slate-400">{uploadResult.statusMessage}</p>
            <div><p className="label">Evidence ID</p><HashValue value={uploadResult.evidenceId || uploadResult.quarantineId} compact={false} /></div>
            <div><p className="label">File Hash</p><HashValue value={uploadResult.fileHash} compact={false} /></div>
            {uploadResult.ipfsCID ? <div><p className="label">IPFS CID</p><HashValue value={uploadResult.ipfsCID} compact={false} /></div> : null}
            {txHash ? <div><p className="label">Tx Hash</p><HashValue value={txHash} compact={false} /></div> : null}
            {uploadResult.blockchainPayload && !txHash ? (
              <button type="button" className="btn-primary w-full" onClick={() => chainMutation.mutate(uploadResult)} disabled={chainMutation.isPending || !EVIDENCE_CONTRACT_ADDRESS}>
                {chainMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                Confirm With MetaMask
              </button>
            ) : null}
            {uploadResult.status === 'complete' || uploadResult.storageStatus === 'ipfs' ? (
              <p className="flex gap-2 text-sm text-emerald-300"><CheckCircle2 size={16} /> Storage complete.</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
