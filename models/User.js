// Enhanced User.js Model with Complete Tracking
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // === EXISTING FIELDS ===
    // Password Reset Fields
    passwordResetToken: { type: String, default: null },
    passwordResetExpiry: { type: Date, default: null },
    
    // Basic Information
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: function() { return this.version === 'paid'; }},
    
    // Company Information
    company: { type: String, trim: true },
    address: { type: String, trim: true },
    addressContinued: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    city: { type: String, trim: true },
    country: { type: String, trim: true },
    
    // Activation
    activationCode: { type: String, required: true },
    activationCodeExpiry: { type: Date, required: true },
    validationStartDate: { type: Date, default: Date.now, required: true },
    validationEndDate: { type: Date, required: true, default: function() {
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }},
    
    // === ENHANCED TRACKING FIELDS ===
    
    // Subscription & Version
    version: {
        type: String,
        enum: ['prospect', 'free', 'paid'],  // Added 'prospect' for email recipients
        required: true,
        default: 'prospect'
    },
    subscriptionStatus: {
        type: String,
        enum: ['prospect', 'trial', 'paid', 'cancelled', 'expired', 'churned'],
        default: 'prospect'
    },
    isPaid: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false },
    autoRenewal: { type: Boolean, default: false },
    
    // Email Engagement Tracking
    emailSentAt: { type: Date },
    emailSentCount: { type: Number, default: 0 },
    lastEmailCampaign: { type: String },
    
    emailOpened: { type: Boolean, default: false },
    emailOpenedAt: { type: Date },
    firstEmailOpenedAt: { type: Date },
    emailOpenCount: { type: Number, default: 0 },
    lastEmailOpenCampaign: { type: String },
    
    emailClicked: { type: Boolean, default: false },
    emailClickedAt: { type: Date },
    clickCount: { type: Number, default: 0 },
    lastClickedLink: { type: String },
    lastClickCampaign: { type: String },
    
    // Conversion Tracking
    trialStartDate: { type: Date },
    trialEndDate: { type: Date },
    conversionCampaign: { type: String },  // Which campaign converted them
    conversionSource: { type: String },    // email, web, direct, etc.
    
    subscriptionStartDate: { type: Date },
    paymentAmount: { type: Number },
    paymentCurrency: { type: String },
    conversionValue: { type: Number },     // Lifetime value
    
    // Churn Tracking
    churned: { type: Boolean, default: false },
    churnedAt: { type: Date },
    churnReason: { type: String },
    cancellationDate: { type: Date },
    cancellationReason: { type: String },
    
    // Win-back Tracking
    reactivatedAt: { type: Date },
    reactivationCampaign: { type: String },
    winBackAttempts: { type: Number, default: 0 },
    
    // Source Attribution
    source: {
        type: String,
        enum: ['email', 'web', 'direct', 'referral', 'social', 'ad'],
        default: 'web'
    },
    utmSource: { type: String },
    utmMedium: { type: String },
    utmCampaign: { type: String },
    utmContent: { type: String },
    utmTerm: { type: String },
    
    // Engagement Scoring
    engagementScore: { type: Number, default: 0 },  // 0-100
    lastActivityAt: { type: Date },
    loginCount: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
    
    // Stripe & Payment
    stripeCustomerId: { type: String },
    subscriptionId: { type: String },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    lastPaymentDate: { type: Date },
    
    // Email Preferences
    emailUnsubscribed: { type: Boolean, default: false },
    emailUnsubscribedAt: { type: Date },
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
            account_notifications: true,
            billing_notifications: true
        }
    },
    
    // System Fields
    language: { type: String, default: 'fr' },
    termsAccepted: { type: Boolean, required: true },
    downloadIntent: { type: Boolean, default: false },
    
    // Reminders
    expirationReminderSent: { type: Boolean, default: false },
    renewalReminderSent: { type: Boolean, default: false }
    
}, {
    timestamps: true,  // Adds createdAt and updatedAt
});

// === INDEXES FOR PERFORMANCE ===
userSchema.index({ email: 1 });
userSchema.index({ subscriptionStatus: 1 });
userSchema.index({ churned: 1 });
userSchema.index({ emailOpened: 1 });
userSchema.index({ engagementScore: -1 });
userSchema.index({ lastActivityAt: -1 });
userSchema.index({ validationEndDate: 1 });

// === METHODS ===
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

userSchema.methods.canReceiveMarketingEmails = function() {
    return !this.emailUnsubscribed;
};

userSchema.methods.canReceiveEmailType = function(emailType) {
    if (this.emailUnsubscribed) {
        return false;
    }
    
    if (['account_notifications', 'billing_notifications'].includes(emailType)) {
        return true;
    }
    
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
    this.emailPreferences = {
        ...this.emailPreferences,
        ...preferences,
        account_notifications: true,
        billing_notifications: true
    };
    return this.save();
};

// === NEW TRACKING METHODS ===
userSchema.methods.trackEmailOpen = function(campaign) {
    this.emailOpened = true;
    this.emailOpenedAt = new Date();
    if (!this.firstEmailOpenedAt) {
        this.firstEmailOpenedAt = new Date();
    }
    this.emailOpenCount = (this.emailOpenCount || 0) + 1;
    this.lastEmailOpenCampaign = campaign;
    this.lastActivityAt = new Date();
    return this.save();
};

userSchema.methods.trackClick = function(link, campaign) {
    this.emailClicked = true;
    this.emailClickedAt = new Date();
    this.clickCount = (this.clickCount || 0) + 1;
    this.lastClickedLink = link;
    this.lastClickCampaign = campaign;
    this.lastActivityAt = new Date();
    return this.save();
};

userSchema.methods.convertToTrial = function(campaign, source) {
    this.version = 'free';
    this.subscriptionStatus = 'trial';
    this.trialStartDate = new Date();
    this.trialEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    this.conversionCampaign = campaign;
    this.conversionSource = source;
    this.isActive = true;
    this.lastActivityAt = new Date();
    return this.save();
};

userSchema.methods.convertToPaid = function(amount, currency, campaign) {
    this.version = 'paid';
    this.subscriptionStatus = 'paid';
    this.isPaid = true;
    this.subscriptionStartDate = new Date();
    this.paymentAmount = amount;
    this.paymentCurrency = currency;
    this.conversionValue = amount;
    if (campaign) this.conversionCampaign = campaign;
    this.lastActivityAt = new Date();
    return this.save();
};

userSchema.methods.markAsChurned = function(reason) {
    this.churned = true;
    this.churnedAt = new Date();
    this.churnReason = reason;
    this.subscriptionStatus = 'churned';
    this.isActive = false;
    return this.save();
};

userSchema.methods.reactivate = function(campaign) {
    this.churned = false;
    this.reactivatedAt = new Date();
    this.reactivationCampaign = campaign;
    this.subscriptionStatus = 'paid';
    this.isActive = true;
    this.lastActivityAt = new Date();
    return this.save();
};

// === STATIC METHODS FOR ANALYTICS ===
userSchema.statics.getEngagementMetrics = async function(dateFilter = {}) {
    return this.aggregate([
        { $match: dateFilter },
        {
            $group: {
                _id: '$subscriptionStatus',
                count: { $sum: 1 },
                avgEngagement: { $avg: '$engagementScore' },
                avgOpenRate: { 
                    $avg: { 
                        $cond: [{ $gt: ['$emailSentCount', 0] }, 
                            { $divide: ['$emailOpenCount', '$emailSentCount'] }, 
                            0
                        ] 
                    }
                }
            }
        }
    ]);
};

userSchema.statics.getConversionFunnel = async function(startDate, endDate) {
    const dateFilter = {};
    if (startDate) dateFilter.createdAt = { $gte: new Date(startDate) };
    if (endDate) dateFilter.createdAt = { ...dateFilter.createdAt, $lte: new Date(endDate) };
    
    return this.aggregate([
        { $match: dateFilter },
        {
            $facet: {
                prospects: [
                    { $match: { subscriptionStatus: 'prospect' } },
                    { $count: 'total' }
                ],
                emailOpeners: [
                    { $match: { emailOpened: true } },
                    { $count: 'total' }
                ],
                trials: [
                    { $match: { subscriptionStatus: { $in: ['trial', 'paid', 'churned'] } } },
                    { $count: 'total' }
                ],
                paid: [
                    { $match: { subscriptionStatus: { $in: ['paid', 'churned'] }, isPaid: true } },
                    { $count: 'total' }
                ],
                churned: [
                    { $match: { churned: true } },
                    { $count: 'total' }
                ]
            }
        }
    ]);
};

module.exports = mongoose.model('User', userSchema);