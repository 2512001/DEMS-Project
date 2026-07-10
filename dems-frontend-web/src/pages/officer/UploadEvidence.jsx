import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, UploadCloud } from 'lucide-react';
import { finalizeEvidence, uploadEvidence } from '../../api/evidence.js';
import { addEvidenceOnChain, EVIDENCE_CONTRACT_ADDRESS } from '../../blockchain/evidenceContract.js';
import HashValue from '../../components/HashValue.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { useNavigate } from 'react-router-dom';
//to get file time stamp
import exifr from 'exifr';

const schema = z.object({
  caseId: z.string().min(1).max(120),
  deviceInfo: z.string().min(2).max(300),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  capturedAt: z.string().min(1),
  evidence: z.any()
});

export default function UploadEvidence() {
  const queryClient = useQueryClient();
  const [stage, setStage] = useState('collect');
  const [chainCompleted, setChainCompleted] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();





  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      caseId: '',
      deviceInfo: navigator.userAgent,
      latitude: 0,
      longitude: 0,
      capturedAt: new Date().toISOString().slice(0, 16)
    }
  });


  const evidenceRegister = form.register('evidence');


  // useEffect(() => {
  //   navigator.geolocation?.getCurrentPosition(
  //     (position) => {
  //       form.setValue(
  //         'latitude',
  //         Number(position.coords.latitude.toFixed(6))
  //       );

  //       form.setValue(
  //         'longitude',
  //         Number(position.coords.longitude.toFixed(6))
  //       );
  //     },
  //     (error) => {
  //       console.error('GPS Error:', error);
  //     },
  //     {
  //       enableHighAccuracy: true
  //     }
  //   );
  // }, []);

  const uploadMutation = useMutation({
    mutationFn: uploadEvidence,
    onSuccess: (response) => {
      setUploadResult(response.data);
      setStage('ai');
      queryClient.invalidateQueries({ queryKey: ['my-files'] });
    },
    onError: (err) => setError(err.response?.data?.message || err.message)
  });

  const chainMutation = useMutation({
    mutationFn: async () => {
      setStage('chain');

      const chain = await addEvidenceOnChain(
        uploadResult.blockchainPayload
      );

      setTxHash(chain.txHash);
      setChainCompleted(true);

      setStage('finalize');

      const finalized = await finalizeEvidence(
        uploadResult.evidenceId,
        chain.txHash
      );

      return finalized;
    },

    onSuccess: (response) => {

      if (response?.data) {
        setUploadResult(response.data);
      }

      setStage('complete');
      alert(
        'Evidence uploaded successfully. Redirecting to Evidence Vault.'
      );

      queryClient.invalidateQueries({
        queryKey: ['my-files']
      });

      setTimeout(() => {

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        form.reset({
          caseId: '',
          deviceInfo: navigator.userAgent,
          latitude: 0,
          longitude: 0,
          capturedAt: new Date()
            .toISOString()
            .slice(0, 16)
        });

        setUploadResult(null);
        setTxHash('');
        setChainCompleted(false);
        setError('');
        setStage('collect');

        navigate('/citizen/evidence-vault');

      }, 5000);
    },

    onError: (err) => {
      console.error('Chain/Finalize Error:', err);

      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Something went wrong'
      );

      if (chainCompleted) {
        setStage('finalize');
      } else {
        setStage('ai');
      }
    }
  });



  const submit = async (values) => {

    setError('');

    // clear previous upload
    setUploadResult(null);
    setTxHash('');
    setChainCompleted(false);
    setStage('collect');

    try {

      const position =
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true,
              timeout: 10000
            }
          );
        });

      values.latitude = Number(
        position.coords.latitude.toFixed(6)
      );

      values.longitude = Number(
        position.coords.longitude.toFixed(6)
      );

    }
    catch (err) {

      if (err.code === 1) {
        alert(
          'Location access was denied. Please click Upload again and allow location access.'
        );
      } else {
        alert(
          'Unable to get GPS location. Please make sure location services are enabled.'
        );
      }

      return;
    }

    const file = values.evidence?.[0];

    if (!file) {
      setError('Evidence file is required.');
      return;
    }

    const formData = new FormData();

    formData.append('evidence', file);
    formData.append('caseId', values.caseId);

    formData.append(
      'captureMetadata',
      JSON.stringify({
        deviceInfo: navigator.userAgent,
        gpsLocation: {
          latitude: Number(values.latitude),
          longitude: Number(values.longitude)
        },
        capturedAt: new Date(
          values.capturedAt
        ).toISOString()
      })
    );

    setStage('upload');

    uploadMutation.mutate(formData);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <form className="section-card" onSubmit={form.handleSubmit(submit)}>
        <h1 className="mb-4 text-2xl font-extrabold">Live Evidence Upload</h1>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            ref={fileInputRef}
            className="input py-2"
            type="file"
            {...evidenceRegister}
            onChange={async (e) => {
              evidenceRegister.onChange(e);

              const file = e.target.files?.[0];

              if (!file) return;

              try {
                const exif = await exifr.parse(file);

                if (exif?.DateTimeOriginal) {
                  const d = new Date(exif.DateTimeOriginal);

                  const local = new Date(
                    d.getTime() - d.getTimezoneOffset() * 60000
                  )
                    .toISOString()
                    .slice(0, 16);

                  form.setValue('capturedAt', local);
                } else if (file.lastModified) {
                  const local = new Date(
                    file.lastModified -
                    new Date().getTimezoneOffset() * 60000
                  )
                    .toISOString()
                    .slice(0, 16);

                  form.setValue('capturedAt', local);
                }
              } catch (err) {
                console.error('EXIF Read Error:', err);

                if (file.lastModified) {
                  const local = new Date(
                    file.lastModified -
                    new Date().getTimezoneOffset() * 60000
                  )
                    .toISOString()
                    .slice(0, 16);

                  form.setValue('capturedAt', local);
                }
              }
            }}
          />
          <label><span className="label">Case ID</span><input className="input" {...form.register('caseId')} /></label>
          <label className="md:col-span-2"><span className="label">Device Fingerprint</span><input className="input" readOnly {...form.register('deviceInfo')} /></label>
          <input
            type="hidden"
            {...form.register('latitude')}
          />

          <input
            type="hidden"
            {...form.register('longitude')}
          />
          <label><span className="label">Timestamp</span><input className="input" type="datetime-local" {...form.register('capturedAt')} /></label>
        </div>
        {error ? <p className="mt-4 border border-red-400/50 bg-red-950/30 p-3 text-sm text-red-200">{error}</p> : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="btn-primary" disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
            Send To Backend
          </button>
        </div>
      </form>

      <div className="section-card">
        <h2 className="mb-4 text-xl font-bold">Pipeline Confirmation</h2>
        <div className="grid gap-3">
          {['collect', 'upload', 'ai', 'chain', 'finalize', 'complete']
            .map((step) => (
              <PipelineStep
                key={step}
                step={step}
                active={stage === step}
                done={isDone(stage, step, chainCompleted)}
              />
            ))}
        </div>

        {uploadResult ? (
          <div className="mt-5 grid gap-3">
            <StatusBadge
              status={txHash ? "verified" : uploadResult.status}
            />
            <Info label="Evidence ID" value={uploadResult.evidenceId} />
            <Info label="File Hash" value={uploadResult.fileHash} />
            <Info label="IPFS CID" value={uploadResult.ipfsCID} />
            <Info label="AI Score" value={`${uploadResult.aiAnalysis?.score ?? 0}%`} plain />
            {txHash ? <Info label="Tx Hash" value={txHash} /> : null}
            {!EVIDENCE_CONTRACT_ADDRESS ? <p className="flex gap-2 text-sm text-amber-300"><AlertTriangle size={16} />Set VITE_EVIDENCE_CONTRACT_ADDRESS before chain writes.</p> : null}
            {uploadResult.blockchainPayload && !txHash ? (
              <button
                className="btn-primary w-full"
                onClick={() => chainMutation.mutate()}
                disabled={
                  chainMutation.isPending ||
                  !EVIDENCE_CONTRACT_ADDRESS
                }
              >
                {chainMutation.isPending ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <ShieldCheck size={16} />
                )}
                Confirm With MetaMask
              </button>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-slate-400">Backend upload returns evidenceId, fileHash, ipfsCID, and aiScore before MetaMask is prompted.</p>
        )}
      </div>
    </div>
  );
}

function PipelineStep({ step, active, done }) {
  return (
    <div className={`flex items-center gap-3 border p-3 ${active ? 'border-sky-400 bg-sky-400/10' : done ? 'border-emerald-400/40' : 'border-slate-800'}`}>
      {done ? <CheckCircle2 className="text-emerald-300" size={17} /> : <span className="h-4 w-4 border border-slate-500" />}
      <span className="text-sm capitalize text-slate-200">{step}</span>
    </div>
  );
}

function isDone(current, step, chainCompleted = false) {
  const order = [
    'collect',
    'upload',
    'ai',
    'chain',
    'finalize',
    'complete'
  ];

  if (chainCompleted && step === 'chain') {
    return true;
  }

  return order.indexOf(current) > order.indexOf(step);
}

function Info({ label, value, plain }) {
  return <div><p className="label">{label}</p>{plain ? <p>{value}</p> : <HashValue value={value} compact={false} />}</div>;
}
