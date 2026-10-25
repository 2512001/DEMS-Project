const mongoose = require('mongoose');
const User = require('./model/userModel');
const Organization = require('./model/organizationModel');
require('dotenv').config();

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://127.0.0.1:27017/DEMS');
    console.log('Connected successfully');

    // Create organization
    console.log('\nCreating organization...');
    const organization = await Organization.findOneAndUpdate(
      { name: 'Test Organization' },
      {
        name: 'Test Organization',
        organizationCode: 'TESTORG001',
        organizationType: 'law_enforcement',
        status: 'active',
        policy: {
          requireAIForEmployees: true,
          requireBlockchainForEmployees: false
        }
      },
      { upsert: true, returnDocument: 'after' }
    );
    console.log('Organization created/updated:', organization._id);

    // Create admin user
    console.log('\nCreating admin user...');
    const adminWallet = '0xcd619abb8228e65bba8aca9cbedfd4a45f8afbcc';
    
    const admin = await User.findOneAndUpdate(
      { walletAddress: adminWallet },
      {
        walletAddress: adminWallet,
        role: 'admin',
        organizationId: organization._id,
        accountStatus: 'active',
        membershipStatus: 'active',
        profile: {
          displayName: 'Test Admin',
          email: 'admin@test.com',
          phone: '+1234567890',
          department: 'IT',
          designation: 'System Administrator',
          employeeId: 'ADMIN001',
          emailVerified: true,
          emailVerifiedAt: new Date()
        }
      },
      { upsert: true, returnDocument: 'after' }
    );
    console.log('Admin user created/updated:', admin._id);
    console.log('  Wallet:', admin.walletAddress);
    console.log('  Role:', admin.role);
    console.log('  Organization:', admin.organizationId);
    console.log('  Membership Status:', admin.membershipStatus);

    // Create a test officer user
    console.log('\nCreating test officer user...');
    const officerWallet = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    
    const officer = await User.findOneAndUpdate(
      { walletAddress: officerWallet },
      {
        walletAddress: officerWallet,
        role: 'officer',
        organizationId: organization._id,
        accountStatus: 'active',
        membershipStatus: 'active',
        profile: {
          displayName: 'Test Officer',
          email: 'officer@test.com',
          phone: '+1234567891',
          department: 'Field Operations',
          designation: 'Evidence Officer',
          employeeId: 'OFFICER001',
          emailVerified: true,
          emailVerifiedAt: new Date()
        }
      },
      { upsert: true, returnDocument: 'after' }
    );
    console.log('Officer user created/updated:', officer._id);
    console.log('  Wallet:', officer.walletAddress);
    console.log('  Role:', officer.role);
    console.log('  Organization:', officer.organizationId);

    console.log('\n✅ Database seeded successfully!');
    console.log('\nYou can now log in with:');
    console.log('  Admin wallet: 0xcd619abb8228e65bba8aca9cbedfd4a45f8afbcc');
    console.log('  Officer wallet: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    console.log('  Organization code: TESTORG001');

    process.exit(0);
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
}

seedDatabase();
