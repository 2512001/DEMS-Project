const mongoose = require('mongoose');
const User = require('../model/userModel');
require('dotenv').config();

// Your wallet address from the error log
const WALLET_ADDRESS = '0x3a77487857411dc27d3f121c6f7aa200496c4ec1';

async function addUser() {
  try {
    // Connect to MongoDB using the same connection as the app
    await mongoose.connect('mongodb://127.0.0.1:27017/DEMS');
    console.log('Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ walletAddress: WALLET_ADDRESS });
    if (existingUser) {
      console.log('User already exists with role:', existingUser.role);
      
      // Update role to super_admin
      existingUser.role = 'super_admin';
      existingUser.organizationId = null;
      await existingUser.save();
      
      console.log('User updated to super_admin:', existingUser);
      console.log('You can now login with wallet address:', WALLET_ADDRESS);
      return;
    }

    // Create new user with super_admin role
    const newUser = await User.create({
      walletAddress: WALLET_ADDRESS,
      role: 'super_admin',
      organizationId: null,
      profile: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com'
      }
    });

    console.log('User created successfully:', newUser);
    console.log('You can now login with wallet address:', WALLET_ADDRESS);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

addUser();