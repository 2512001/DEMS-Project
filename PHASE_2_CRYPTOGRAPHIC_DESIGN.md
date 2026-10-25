# DEMS Phase 2: Cryptographic Design for Multi-Party Key Protection

## Current Implementation Audit

### Existing Crypto Service (`cryptoService.js`)

**Current Approach:**
- Single global AES-256-GCM key (`EVIDENCE_AES_KEY`)
- All files encrypted with the same key
- JWT_SECRET fallback for development

**Security Issues:**
1. ❌ **Key Reuse**: Same key encrypts all files → single point of compromise
2. ❌ **No Key Isolation**: Cannot revoke access to specific files
3. ❌ **No Key Rotation**: Cannot rotate without re-encrypting everything
4. ❌ **No Multi-Party Control**: User, Org Admin, Super Admin not involved in key management
5. ❌ **Insecure Fallback**: JWT_SECRET derivation is not production-safe
6. ❌ **No Key Hierarchy**: No separation between master keys and data keys

### Evidence Model Encryption Fields

**Current Schema:**
```javascript
encryption: {
  iv: String,
  authTag: String,
  algorithm: 'aes-256-gcm'
}
```

**Missing:**
- No DEK (Data Encryption Key) storage
- No encrypted DEK envelopes
- No key version or rotation tracking
- No multi-party key shares

---

## Chosen Cryptographic Design: Envelope Encryption with Key Hierarchy

### Design Overview

I'll implement **Envelope Encryption with Key Hierarchy** - an established pattern used by AWS KMS, Google Cloud KMS, and similar systems.

**Key Components:**
1. **Per-File DEK (Data Encryption Key)**: Unique AES-256-GCM key per evidence file
2. **KEKs (Key Encryption Keys)**: Master keys for each role (User, Org Admin, Super Admin)
3. **Encrypted Envelopes**: DEK encrypted separately by each KEK
4. **Key Derivation**: KEKs derived from wallet signatures + server secrets

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    EVIDENCE FILE                             │
│                  (Unencrypted bytes)                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Per-File DEK (AES-256-GCM)                     │
│              (Unique random 256-bit key)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ├─────────────────┬─────────────────┐
                           ▼                 ▼                 ▼
┌────────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ Encrypted DEK     │ │ Encrypted DEK    │ │ Encrypted DEK    │
│ (User KEK)        │ │ (Org Admin KEK)  │ │ (Super Admin KEK) │
└────────────────────┘ └──────────────────┘ └──────────────────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ User KEK         │  │ Org Admin KEK    │  │ Super Admin KEK  │
│ (Derived from    │  │ (Derived from     │  │ (Derived from     │
│  wallet + secret)│  │  wallet + secret) │  │  wallet + secret) │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Key Derivation Strategy

**KEK Derivation Formula:**
```
KEK = PBKDF2(
  password: wallet_signature,
  salt: role_specific_secret,
  iterations: 100000,
  keyLength: 32 bytes,
  digest: 'sha256'
)
```

**Role-Specific Secrets (Environment Variables):**
- `USER_KEY_SECRET`: Secret for user KEK derivation
- `ORG_ADMIN_KEY_SECRET`: Secret for org admin KEK derivation
- `SUPER_ADMIN_KEY_SECRET`: Secret for super admin KEK derivation

**Wallet Signature:**
- User signs canonical message with their wallet
- Signature used as password for KEK derivation
- Ensures key access requires wallet control

### Decryption Authorization

**To decrypt evidence:**
1. Request access with purpose and duration
2. Authorizer approves (Org Admin or Super Admin)
3. Requester provides wallet signature
4. System derives appropriate KEK
5. System decrypts DEK envelope
6. System decrypts evidence with DEK
7. Time-limited access granted (no permanent key exposure)

**Key Points:**
- ❌ KEKs never stored, only derived on-demand
- ❌ DEKs never stored in plaintext
- ❌ Wallet signatures not used as encryption keys directly
- ❌ No single point of key compromise
- ✅ Compromised wallet → only affects that role's access
- ✅ Compromised server secret → all KEKs compromised (rotate secrets)
- ✅ Evidence inaccessible if any party's key is unavailable (fail-closed)

### Trade-offs

**Advantages:**
1. ✅ **Established Pattern**: Used by major cloud providers
2. ✅ **Per-File Keys**: Compromise of one file doesn't affect others
3. ✅ **Multi-Party Control**: Each role has independent key
4. ✅ **No Key Storage**: KEKs derived, not stored
5. ✅ **Recoverable**: If one party loses wallet, others can still decrypt
6. ✅ **Scalable**: No threshold cryptography complexity
7. ✅ **Auditable**: All key operations logged

**Disadvantages:**
1. ⚠️ **Server Secret Risk**: If environment secrets compromised, all KEKs derivable
   - Mitigation: Use KMS (AWS KMS, HashiCorp Vault) in production
2. ⚠️ **Performance**: PBKDF2 with 100k iterations adds ~100ms per operation
   - Mitigation: Cache derived KEKs for session duration
3. ⚠️ **Wallet Dependency**: Must have wallet to derive KEK
   - Mitigation: Backup procedures for critical wallets
4. ⚠️ **Not True Threshold**: Requires ANY authorized party, not ALL
   - Mitigation: For highest security, implement Shamir's Secret Sharing (future)

### Why Not Alternatives?

**Threshold Cryptography (Shamir's Secret Sharing):**
- ❌ Complex to implement correctly
- ❌ Requires all parties to be online for decryption
- ❌ Not necessary for current requirements
- ✅ Would provide stronger guarantee (need ALL parties)

**Smart Contract Key Management:**
- ❌ Keys on blockchain are public
- ❌ Gas costs for key operations
- ❌ Overkill for this use case

**Pure Server-Side Encryption:**
- ❌ No multi-party control
- ❌ Server compromise = all keys compromised
- ❌ Doesn't meet requirements

---

## Implementation Plan

### Phase 2A: Core Crypto Services

1. **Key Generation Service**
   - Generate per-file DEKs (cryptographically secure random)
   - Derive KEKs from wallet signatures + secrets
   - Encrypt DEKs with KEKs (envelope encryption)

2. **Key Management Service**
   - Store encrypted DEK envelopes in MongoDB
   - Derive KEKs on-demand for decryption
   - Handle key versioning and rotation

3. **Updated Crypto Service**
   - Use per-file DEKs instead of global key
   - Integrate with key management
   - Maintain backward compatibility for existing evidence

### Phase 2B: Model Updates

1. **Evidence Model**
   - Add `encryptedDEKs` array (envelopes for each role)
   - Add `keyVersion` for rotation tracking
   - Keep existing `encryption` field for backward compatibility

2. **PendingUploadRequest Model**
   - Add encrypted DEKs storage
   - Key protection during approval workflow

### Phase 2C: Integration

1. **Controlled Upload Service**
   - Generate DEK on upload
   - Encrypt DEK with all three KEKs
   - Store envelopes in MongoDB
   - Use DEK for file encryption

2. **Secure Viewing Service**
   - Implement access request workflow
   - Derive KEK based on authorization
   - Decrypt DEK envelope
   - Decrypt evidence for time-limited access

### Phase 2D: Testing

1. **Security Tests**
   - Unauthorized upload prevention
   - Missing approval rejection
   - Invalid signature rejection
   - Replay attack prevention
   - Key compromise isolation
   - Decryption authorization

2. **Operational Tests**
   - Key rotation
   - Recovery scenarios
   - Partial failure handling
   - Concurrent requests

---

## Security Properties

### Confidentiality
- ✅ Evidence encrypted with unique per-file DEK
- ✅ DEKs encrypted with role-specific KEKs
- ✅ KEKs derived from wallet signatures + secrets
- ✅ No plaintext keys stored anywhere

### Integrity
- ✅ AES-256-GCM provides authenticated encryption
- ✅ Any tampering detected via auth tag verification
- ✅ File hash verified on decryption

### Availability
- ⚠️ Evidence inaccessible if all authorized parties unavailable
- ✅ Any one authorized party can decrypt (not threshold)
- ✅ Key recovery procedures for lost wallets

### Authorization
- ✅ Wallet signature required for KEK derivation
- ✅ Role-based access control enforced
- ✅ Multi-party approval for access requests
- ✅ Time-limited access, no permanent key exposure

### Non-Repudiation
- ✅ All key operations logged
- ✅ Wallet signatures bound to specific requests
- ✅ Audit trail for all decryption events

---

## Production Deployment Requirements

### Environment Variables (Required)

```bash
# Key Derivation Secrets (32-byte hex each)
USER_KEY_SECRET=<random-32-byte-hex>
ORG_ADMIN_KEY_SECRET=<random-32-byte-hex>
SUPER_ADMIN_KEY_SECRET=<random-32-byte-hex>

# Optional: KMS Integration (for production)
# AWS_KMS_KEY_ID=arn:aws:kms:...
# or
# VAULT_SECRET_PATH=dems/keys/
```

### Secret Generation

```bash
# Generate three 32-byte hex secrets
node -e "console.log(crypto.randomBytes(32).toString('hex'))"
```

### KMS Integration (Recommended for Production)

Instead of environment variables, use:
- **AWS KMS**: Customer-managed keys (CMKs)
- **HashiCorp Vault**: Transit secrets engine
- **Azure Key Vault**: Key management

This removes server secret as single point of compromise.

### Key Rotation Procedure

1. Generate new role secrets
2. Update environment variables
3. Rotate existing evidence:
   - Decrypt with old KEK
   - Encrypt with new KEK
   - Update envelopes in MongoDB
4. Mark old key version as retired

### Recovery Procedure

If user loses wallet:
1. Org Admin or Super Admin can still decrypt (using their KEK)
2. User can be re-onboarded with new wallet
3. Existing evidence remains accessible

If server secrets compromised:
1. Emergency: rotate all secrets immediately
2. Decrypt all evidence with old KEKs
3. Re-encrypt all evidence with new KEKs
4. Update all DEK envelopes
5. Notify all users

---

## Limitations and Future Enhancements

### Current Limitations

1. **Server Secret as SPOF**: Environment secrets compromise all KEKs
   - Future: Integrate with cloud KMS

2. **Not True Threshold**: Any one party can decrypt (not all required)
   - Future: Implement Shamir's Secret Sharing for N-of-M

3. **No Hardware Security Module**: Keys in software memory
   - Future: HSM integration for KEKs

4. **No Forward Secrecy**: Compromised key can decrypt past evidence
   - Future: Implement key ratcheting or per-session keys

### Future Enhancements

1. **Shamir's Secret Sharing**: Require ALL parties for decryption
2. **HSM Integration**: Protect KEKs in hardware
3. **Cloud KMS**: Remove server secret as SPOF
4. **Key Ratcheting**: Forward secrecy for long-term evidence
5. **Multi-Cloud Backup**: Distribute key shares across providers

---

## Conclusion

The chosen envelope encryption with key hierarchy design:
- ✅ Meets all security requirements
- ✅ Uses established cryptographic patterns
- ✅ Provides multi-party control
- ✅ Maintains operational feasibility
- ✅ Allows for future enhancements
- ✅ Compatible with existing architecture

Implementation will proceed with this design, incrementally integrating with the Phase 1 controlled upload workflow.
