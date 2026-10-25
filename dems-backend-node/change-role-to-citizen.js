const mongoose = require('mongoose');
const User = require('./model/userModel');
require('dotenv').config();

async function changeUserRole() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://127.0.0.1:27017/DEMS');
    console.log('Connected successfully');

    const wallet = '0xcd619abb8228e65bba8aca9cbedfd4a45f8afbcc';
    
    const user = await User.findOne({ walletAddress: wallet });
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }

    console.log('Current user role:', user.role);
    console.log('Current user email:', user.profile?.email);
    console.log('Current organizationId:', user.organizationId);

    // Change to citizen for testing employee invitation
    user.role = 'citizen';
    user.organizationId = null; // Remove organization assignment
    user.membershipStatus = 'none';
    await user.save();

    console.log('User role changed to: citizen');
    console.log('Organization removed');
    console.log('Membership status reset to: none');
    console.log('\nYou can now accept employee invitations with this wallet.');
    console.log('After testing, you can restore admin role by running this script again with original values.');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

changeUserRole();
