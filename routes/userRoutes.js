// .\VoiceToText2\routes\userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { createPaymentIntent } = require('../config/stripe');
const generateActivationCode = require('../utils/generateCode');

// Create user and save to MongoDB
router.post('/api/create-user', async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            company,
            address,
            addressContinued,
            postalCode,
            city,
            country,
            autoRenewal,
            termsAccepted,
            version,
            language,
            isPaid
        } = req.body;

        // Generate activation code
        const activationCode = generateActivationCode();
        const activationCodeExpiry = new Date();
        activationCodeExpiry.setDate(activationCodeExpiry.getDate() + (isPaid ? 30 : 7)); // 30 days for paid, 7 for free

        // Create new user
        const user = new User({
            firstName,
            lastName,
            email,
            company,
            address,
            addressContinued,
            postalCode,
            city,
            country,
            autoRenewal,
            termsAccepted,
            version,
            language,
            isPaid,
            activationCode,
            activationCodeExpiry,
            isActive: false
        });

        await user.save();
        
        res.status(201).json({ 
            success: true, 
            userId: user._id,
            message: 'User created successfully'
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error creating user'
        });
    }
});

// Create payment intent
router.post('/api/create-payment', async (req, res) => {
    try {
        const { userId, amount, currency } = req.body;
        
        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Create payment intent
        const paymentIntent = await createPaymentIntent(amount, currency);
        
        res.status(200).json({
            success: true,
            clientSecret: paymentIntent.client_secret
        });
    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error creating payment'
        });
    }
});

module.exports = router;