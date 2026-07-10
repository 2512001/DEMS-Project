import React from 'react';
export default function Features() {
  const items = ['Wallet nonce authentication', 'JWT route protection', 'Role based route guards', 'Officer verification queue', 'AES encrypted evidence upload', 'IPFS CID proof fields', 'Sepolia network enforcement', 'Audit dashboard'];
  return (
    <section className="py-12">
      <h1 className="mb-5 text-3xl font-extrabold">Security Controls</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => <div className="section-card text-slate-200" key={item}>{item}</div>)}
      </div>
    </section>
  );
}
