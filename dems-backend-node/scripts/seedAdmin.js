const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../model/userModel');
const Organization = require('../model/organizationModel');
const { generateOrganizationCode } = require('../services/organizationService');

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/DEMS';

async function seedSuperAdmin() {
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const adminWallet = process.env.SUPER_ADMIN_WALLET || '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
        const normalizedWallet = adminWallet.toLowerCase();

        const existingAdmin = await User.findOne({ walletAddress: normalizedWallet });
        if (existingAdmin) {
            console.log(`User ${normalizedWallet} already exists with role: ${existingAdmin.role}`);
            if (existingAdmin.role !== 'super_admin') {
                existingAdmin.role = 'super_admin';
                existingAdmin.organizationId = null; // Super admin should not belong to any organization
                await existingAdmin.save();
                console.log(`Updated user role to super_admin and removed organization association`);
            } else {
                console.log(`User is already a super admin`);
            }
        } else {
            const admin = await User.create({
                walletAddress: normalizedWallet,
                role: 'super_admin',
                organizationId: null, // Super admin should not belong to any organization
                nonce: crypto.randomBytes(32).toString('hex')
            });
            console.log(`Created super admin with wallet: ${normalizedWallet}`);
        }

        console.log('\n=== Super Admin Setup Complete ===');
        console.log(`Super Admin Wallet: ${normalizedWallet}`);
        console.log(`Role: super_admin`);
        console.log(`Organization: None (platform-level administrator)`);
        console.log('\nNext steps:');
        console.log('1. Login with this wallet in the frontend');
        console.log('2. Access /superadmin/dashboard');
        console.log('3. Create organizations and assign organization admins');
    } catch (error) {
        console.error('Error seeding super admin:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

seedSuperAdmin();