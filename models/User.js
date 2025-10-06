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
    
    // Email Unsubscribe Management
    emailUnsubscribed: {
        type: Boolean,
        default: false
    },
    emailUnsubscribedAt: {
        type: Date
    },
    unsubscribeReason: {
        type: String,
        enum: ['too_frequent', 'not_relevant', 'never_signed_up', 'other'],
        required: false
    },
    emailPreferences: {
        type: Object,
        default: {
            product_updates: true,
            tips_tutorials: true,
            special_offers: true,
            account_notifications: true,  // Can't be disabled
            billing_notifications: true   // Can't be disabled
        }
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
    // Tracking Fields - ADD THESE
    trialStartDate: {
        type: Date
    },
    source: {
        type: String,
        enum: ['email', 'web', 'direct', 'referral'],
        default: 'web'
    },
    emailSentAt: {
        type: Date
    },
    emailOpened: {
        type: Boolean,
        default: false
    },
    emailOpenedAt: {
        type: Date
    },
    lastEmailOpenCampaign: {
        type: String
    },
    subscriptionStatus: {
        type: String,
        enum: ['trial', 'paid', 'expired', 'churned'],
        default: 'trial'
    },
    churned: {
        type: Boolean,
        default: false
    },
    churnedAt: {
        type: Date
    },
    downloadIntent: {
        type: Boolean,
        default: false
    },
}, {
    timestamps: true,
});

// Existing Methods
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

// New Email Management Methods
userSchema.methods.canReceiveMarketingEmails = function() {
    return !this.emailUnsubscribed;
};

userSchema.methods.canReceiveEmailType = function(emailType) {
    // If user is completely unsubscribed, no marketing emails
    if (this.emailUnsubscribed) {
        return false;
    }
    
    // Always allow transactional emails
    if (['account_notifications', 'billing_notifications'].includes(emailType)) {
        return true;
    }
    
    // Check specific preferences for marketing emails
    return this.emailPreferences && this.emailPreferences[emailType] !== false;
};

userSchema.methods.unsubscribeFromAll = function(reason) {
    this.emailUnsubscribed = true;
    this.emailUnsubscribedAt = new Date();
    if (reason) {
        this.unsubscribeReason = reason;
    }
    return this.save();
};

userSchema.methods.updateEmailPreferences = function(preferences) {
    // Merge new preferences with existing ones
    this.emailPreferences = {
        ...this.emailPreferences,
        ...preferences,
        // Ensure transactional emails can't be disabled
        account_notifications: true,
        billing_notifications: true
    };
    return this.save();
};

module.exports = mongoose.model('User', userSchema);