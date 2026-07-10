import React from 'react';
export default function About() {
  return (
    <section className="mx-auto max-w-4xl py-12">
      <div className="panel p-7">
        <p className="mb-2 text-xs font-bold uppercase text-sky-300">About DEMS</p>
        <h1 className="text-3xl font-extrabold">Government-grade custody for digital evidence</h1>
        <p className="mt-4 leading-8 text-slate-300">
          DEMS separates identity, metadata, encrypted storage, AI review, and blockchain proof. The backend never signs blockchain transactions. Officers and admins complete on-chain writes from MetaMask on Sepolia.
        </p>
      </div>
    </section>
  );
}
