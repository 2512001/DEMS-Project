const mongoose = require('mongoose');
const User = require('./model/userModel');
require('dotenv').config();

async function addSuperAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://127.0.0.1:27017/DEMS');
    console.log('Connected successfully');

    const wallet = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
    
    const user = await User.findOne({ walletAddress: wallet });
    if (user) {
      console.log('User found:', user.role);
      user.role = 'super_admin';
      user.organizationId = null;
      user.membershipStatus = 'none';
      await user.save();
      console.log('✅ User role updated to: super_admin');
      console.log('✅ Organization removed (super_admin does not belong to organizations)');
      console.log('✅ Membership status set to: none');
    } else {
      console.log('User not found, creating new super admin...');
      const newUser = await User.create({
        walletAddress: wallet,
        role: 'super_admin',
        organizationId: null,
        membershipStatus: 'none',
        profile: {
          displayName: 'Super Admin',
          emailVerified: true
        }
      });
      console.log('✅ New super admin created');
    }

    console.log('\nSuper admin wallet:', wallet);
    console.log('This account now has global access to all organization data.');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

addSuperAdmin();
