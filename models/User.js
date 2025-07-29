// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // Password Reset Fields
    passwordResetToken: {
        type: String,
        default: null
    },
    passwordResetExpiry: {
        type: Date,
        default: null
    },
    
    // Basic Information
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: function() {
            return this.version === 'paid';
        }
    },
    
    // Company Information (for paid users)
    company: {
        type: String,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    addressContinued: {
        type: String,
        trim: true
    },
    postalCode: {
        type: String,
        trim: true
    },
    city: {
        type: String,
        trim: true
    },
    country: {
        type: String,
        trim: true
    },
    
    // Activation and Access
    activationCode: {
        type: String,
        required: true
    },
    activationCodeExpiry: {
        type: Date,
        required: true
    },
    validationStartDate: {
    type: Date,
    default: Date.now,
    required: true
},
validationEndDate: {
    type: Date,
    required: true,  // Always required
    default: function() {
        // Default to 7 days from now (for free users)
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
},
    
    // Subscription Details
    version: {
        type: String,
        enum: ['free', 'paid'],
        required: true
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: false
    },
    autoRenewal: {
        type: Boolean,
        default: false
    },
    
    // Stripe Information
    stripeCustomerId: {
        type: String
    },
    subscriptionId: {
        type: String
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    lastPaymentDate: {
        type: Date
    },
    
    // Email Reminders
    expirationReminderSent: {
        type: Boolean,
        default: false
    },
    renewalReminderSent: {
        type: Boolean,
        default: false
    },
    
    // System Fields
    language: {
        type: String,
        default: 'fr'
    },
    termsAccepted: {
        type: Boolean,
        required: true
    },
    loginCount: {
        type: Number,
        default: 0
    },
    lastLoginAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Methods
userSchema.methods.isCodeExpired = function() {
    return new Date() > this.activationCodeExpiry;
};

userSchema.methods.isSubscriptionExpired = function() {
    if (this.version === 'free') {
        return this.isCodeExpired();
    }
    return this.validationEndDate && new Date() > this.validationEndDate;
};

userSchema.methods.daysUntilExpiration = function() {
    const endDate = this.version === 'free' ? this.activationCodeExpiry : this.validationEndDate;
    if (!endDate) return 0;
    
    const days = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
};

module.exports = mongoose.model('User', userSchema);