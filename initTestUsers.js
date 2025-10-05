// initTestUsers.js - Run this locally to set up test accounts
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const connectDB = require('./config/db');

async function initTestUsers() {
    try {
        // Connect to database
        await connectDB();
        console.log('Connected to database');
        
        // Test users to create
        const testUsers = [
            {
                email: 'nicolas.tanala@v-stars3d.com',
                firstName: 'Nicolas',
                lastName: 'Tanala',
                password: 'DevTest2025!', // Change this to your preferred password
                version: 'free',
                isActive: true
            },
            {
                email: 'nicolas.tanala@wanadoo.fr',
                firstName: 'Nicolas',
                lastName: 'Tanala',
                password: 'DevTest2025!', // Change this to your preferred password
                version: 'paid',
                isActive: true,
                isPaid: true
            }
        ];
        
        for (const userData of testUsers) {
            const existingUser = await User.findOne({ email: userData.email });
            
            if (existingUser) {
                console.log(`Updating existing user: ${userData.email}`);
                existingUser.password = await bcrypt.hash(userData.password, 12);
                existingUser.isActive = true;
                existingUser.firstName = userData.firstName;
                existingUser.lastName = userData.lastName;
                await existingUser.save();
            } else {
                console.log(`Creating new user: ${userData.email}`);
                const hashedPassword = await bcrypt.hash(userData.password, 12);
                const newUser = new User({
                    ...userData,
                    password: hashedPassword,
                    language: 'fr',
                    termsAccepted: true,
                    activationCode: 'TESTCODE',
                    activationCodeExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                });
                await newUser.save();
            }
            
            console.log(`✅ User ${userData.email} is ready for testing`);
        }
        
        console.log('\n🎉 Test users initialized successfully!');
        console.log('You can now login with:');
        console.log('Email: nicolas.tanala@v-stars3d.com or nicolas.tanala@wanadoo.fr');
        console.log('Password: DevTest2025! (or whatever you set)');
        
    } catch (error) {
        console.error('Error initializing test users:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

// Run the initialization
initTestUsers();