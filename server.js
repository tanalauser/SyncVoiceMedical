// Load environment variables
require('dotenv').config();

function calculateValidationEndDate(version, startDate = new Date()) {
    const daysToAdd = version === 'free' ? 7 : 30;
    return new Date(startDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
}

// TEMPORARY FIX - Force production mode
if (!process.env.NODE_ENV) {
    console.log('NODE_ENV not set, forcing to production');
    process.env.NODE_ENV = 'production';
}

// *** CRITICAL FIX: Never use localhost in production ***
// In server.js, update the BASE_URL logic
const BASE_URL = (function() {
    // For Render deployment - use the official external URL
    if (process.env.RENDER_EXTERNAL_URL) {
        // Check if the URL already has a protocol
        const renderUrl = process.env.RENDER_EXTERNAL_URL;
        if (renderUrl.startsWith('http://') || renderUrl.startsWith('https://')) {
            return renderUrl;
        } else {
            return `https://${renderUrl}`;
        }
    }
    // Allow manual override via environment variable
    if (process.env.BASE_URL && !process.env.BASE_URL.includes('localhost')) {
        return process.env.BASE_URL;
    }
    // For local development
    if (process.env.NODE_ENV === 'development') {
        return `http://localhost:${process.env.PORT || 8080}`;
    }
    // Default to your Render URL
    return 'https://syncvoicemedical.onrender.com';
})();

console.log('🌐 Using BASE_URL:', BASE_URL);
console.log('Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    RENDER_EXTERNAL_URL: process.env.RENDER_EXTERNAL_URL,
    BASE_URL_env: process.env.BASE_URL,
    BASE_URL_final: BASE_URL
});

console.log('Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    BASE_URL_env: process.env.BASE_URL,
    BASE_URL_final: BASE_URL
});

console.log('🌐 Using BASE_URL:', BASE_URL);

const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

// server.js or app.js TEST 10062025
const mongoose = require('mongoose');

// Create an array of development emails that can bypass the check
const DEV_EMAILS = [
    'info@solve3d.net',
    'nicolas.tanala@wanadoo.fr',
    'nicolas.tanala@v-stars3d.com',
    'nicolas.tanala@solve3d.net',
    'nicolas.tanala@gmail.com',
    'syncvoicemedical@gmail.com',
    'dr.d.m.tanala@wanadoo.fr'
];

// Validate required environment variables
const requiredEnvVars = [
    'EMAIL_PASS',            // Instead of GOOGLE_PASSWORD
    'EMAIL_USER',
    'APP_DB_USER',           // Instead of MONGODB_URI
    'APP_DB_PASS',
    'APP_DB_INSTANCE',
    'STRIPE_SECRET_KEY',
    'STRIPE_PRICE_ID',
    'STRIPE_WEBHOOK_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingEnvVars);
    process.exit(1);
}

// Import required modules
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
console.log('Nodemailer loaded:', typeof nodemailer, 'createTransport:', typeof nodemailer.createTransport);
const path = require('path');
const connectDB = require('./config/db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('./models/User');
const userRoutes = require('./routes/userRoutes');

// Test if crypto is loaded
console.log('Crypto module loaded:', typeof crypto);

// Create Express app instance
const app = express();


app.use(express.static('public'));

// CORS middleware
app.use(cors({
    origin: '*', // Be cautious with this in production
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.options('*', cors()); // Enable pre-flight for all routes

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    // Universal CSP - Compatible with all antivirus software
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self' https:; " +
        "script-src 'self' 'unsafe-inline' https:; " +
        "script-src-elem 'self' 'unsafe-inline' https:; " +
        "frame-src 'self' https://*.stripe.com https://*.stripe.network; " +
        "connect-src 'self' https:; " +
        "img-src 'self' data: https:; " +
        "style-src 'self' 'unsafe-inline' https:; " +
        "media-src 'self' blob: mediastream:; " +  // ← ADD THIS LINE
        "object-src 'none'; " +
        "base-uri 'self';"
    );
    next();
});

app.get('/debug-headers', (req, res) => {
    // Return all response headers (that were set by the main middleware)
    res.json({
        'csp-header': res.getHeader('Content-Security-Policy'),
        'all-headers': res.getHeaders(),
        'timestamp': new Date().toISOString()
    });
});

// Add this BEFORE connecting to MongoDB - TEST 10062025
mongoose.set('bufferTimeoutMS', 20000); // Increase timeout

// Connect to MongoDB
connectDB();

// ADD MONGODB CONNECTION MONITORING
mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connected successfully');
    console.log('📊 Database:', mongoose.connection.name);
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
    console.error('Error details:', {
        message: err.message,
        code: err.code,
        name: err.name
    });
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
    console.log('🔄 MongoDB reconnected');
});

// Monitor connection state changes
mongoose.connection.on('connecting', () => {
    console.log('🔄 Connecting to MongoDB...');
});

mongoose.connection.on('disconnecting', () => {
    console.log('🔄 Disconnecting from MongoDB...');
});

// Add a helper function to check MongoDB connection
function checkMongoConnection() {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    const state = mongoose.connection.readyState;
    return {
        isConnected: state === 1,
        state: states[state] || 'unknown',
        stateCode: state
    };
}

// Debug middleware - log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('Request body:', JSON.stringify(req.body, null, 2));
    }
    // ADD MongoDB state to request logs
    const dbState = checkMongoConnection();
    console.log('MongoDB state:', dbState);
    next();
});

app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    let event;

    try {
        const signature = req.headers['stripe-signature'];
        
        if (!signature) {
            return res.status(400).json({ error: 'Stripe signature missing' });
        }

        event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Handle specific events
    try {
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                await handleSuccessfulPayment(paymentIntent);
                break;
            case 'payment_intent.payment_failed':
                const failedPayment = event.data.object;
                await handleFailedPayment(failedPayment);
                break;
            case 'invoice.payment_succeeded':
                const invoice = event.data.object;
                await handleSuccessfulInvoice(invoice);
                break;
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                const subscription = event.data.object;
                await handleSubscriptionChange(subscription);
                break;
        }

        res.json({received: true});
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing error' });
    }
});

// Body parser middleware - MUST come before routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Define base directory for your application
const baseDir = __dirname;
console.log('Base directory for static files:', baseDir);

// Serve static files from the public directory
const publicDir = path.join(baseDir, 'public');
console.log('Public directory for static files:', publicDir);
app.use(express.static(publicDir));

// Serve root directory files as well (for non-public files)
app.use(express.static(baseDir));

// Serve terms files from the terms directory
const termsDir = path.join(baseDir, 'terms');
console.log('Terms directory for static files:', termsDir);
app.use('/terms', express.static(termsDir));

// Add a route to check if terms files exist (for debugging)
app.get('/debug-terms', (req, res) => {
    const languages = ['fr', 'en', 'de', 'es', 'it', 'pt'];
    const fileTypes = ['cge.html', 'cgv.html'];
    
    const results = {};
    
    languages.forEach(lang => {
        results[lang] = {};
        fileTypes.forEach(fileType => {
            const filePath = path.join(termsDir, lang, fileType);
            results[lang][fileType] = fs.existsSync(filePath);
        });
    });
    
    res.json({
        termsDirectoryExists: fs.existsSync(termsDir),
        filesExist: results,
        termsDirectoryPath: termsDir
    });
});

app.get('/check-terms-path', (req, res) => {
    const termsPath = path.join(__dirname, 'VoiceToText2/terms');
    const frPath = path.join(termsPath, 'fr');
    const cgePath = path.join(frPath, 'cge.html');
    
    res.json({
        termsPathExists: fs.existsSync(termsPath),
        frPathExists: fs.existsSync(frPath),
        cgePathExists: fs.existsSync(cgePath),
        termsPath,
        frPath,
        cgePath
    });
});

// Create transporter function for Gmail App Password
async function createTransporter() {
    try {
        console.log('Creating email transporter with App Password...');
        
        // Validate required environment variables
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            throw new Error('Missing required environment variables: EMAIL_USER or EMAIL_PASS');
        }
        
        // Create transporter with App Password
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS // Gmail App Password
            },
            tls: {
                rejectUnauthorized: false // Allow self-signed certificates
            }
        });
        
        // Verify the transporter
        await transporter.verify();
        console.log('✅ Email transporter verified successfully');
        
        return transporter;
        
    } catch (error) {
        console.error('❌ Error creating transporter:', error.message);
        throw new Error(`Email service configuration error: ${error.message}`);
    }
}

// Helper functions
function getExpiryDate() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
}
console.log('At definition time - getExpiryDate:', typeof getExpiryDate);

// Email translations
const messages = {
    fr: {
        greeting: 'Bonjour',
        thankyou: 'Merci d\'essayer SyncVoice Medical',
        clickToActivate: 'Cliquez sur le code ci-dessous pour activer votre compte:',
        subject: 'Votre code d\'activation SyncVoice Medical',
        success: 'Code d\'activation envoyé avec succès',
        error: 'Erreur lors de l\'envoi du code d\'activation',
        codeLabel: 'Votre code d\'activation:'
    },
    en: {
        greeting: 'Hello',
        thankyou: 'Thank you for trying SyncVoice Medical',
        clickToActivate: 'Click on the code below to activate your account:',
        subject: 'Your SyncVoice Medical Activation Code',
        success: 'Activation code sent successfully',
        error: 'Error sending activation code',
        codeLabel: 'Your activation code:'
    },
    de: {
        greeting: 'Hallo',
        thankyou: 'Danke, dass Sie SyncVoice Medical testen',
        clickToActivate: 'Klicken Sie auf den untenstehenden Code, um Ihr Konto zu aktivieren:',
        subject: 'Ihr SyncVoice Medical Aktivierungscode',
        success: 'Aktivierungscode erfolgreich gesendet',
        error: 'Fehler beim Senden des Aktivierungscodes',
        codeLabel: 'Ihr Aktivierungscode:'
    },
    es: {
        greeting: 'Hola',
        thankyou: 'Gracias por probar SyncVoice Medical',
        clickToActivate: 'Haga clic en el código siguiente para activar su cuenta:',
        subject: 'Su Código de Activación de SyncVoice Medical',
        success: 'Código de activación enviado con éxito',
        error: 'Error al enviar el código de activación',
        codeLabel: 'Su código de activación:'
    },
    it: {
        greeting: 'Ciao',
        thankyou: 'Grazie per provare SyncVoice Medical',
        clickToActivate: 'Clicca sul codice qui sotto per attivare il tuo account:',
        subject: 'Il tuo Codice di Attivazione SyncVoice Medical',
        success: 'Codice di attivazione inviato con successo',
        error: 'Errore nell\'invio del codice di attivazione',
        codeLabel: 'Il tuo codice di attivazione:'
    },
    pt: {
        greeting: 'Olá',
        thankyou: 'Obrigado por experimentar o SyncVoice Medical',
        clickToActivate: 'Clique no código abaixo para ativar sua conta:',
        subject: 'Seu Código de Ativação do SyncVoice Medical',
        success: 'Código de ativação enviado com sucesso',
        error: 'Erro ao enviar código de ativação',
        codeLabel: 'Seu código de ativação:'
    }
};

// HEALTH ENDPOINTS - Production safe monitoring
app.get('/health', (req, res) => {
    const dbState = checkMongoConnection();
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbState
    });
});

app.get('/api/health', (req, res) => {
    const dbState = checkMongoConnection();
    res.json({
        success: true,
        message: 'API is operational',
        timestamp: new Date().toISOString(),
        database: dbState,
        endpoints: {
            authentication: '/api/send-activation',
            payments: '/api/create-payment-intent',
            users: '/api/check-email',
            status: '/api/status'
        }
    });
});

app.get('/api/status', (req, res) => {
    try {
        const dbState = checkMongoConnection();
        
        const requiredEnvVars = [
            'EMAIL_PASS', 'EMAIL_USER', 'APP_DB_USER', 'APP_DB_PASS', 'APP_DB_INSTANCE',
            'STRIPE_SECRET_KEY', 'STRIPE_PRICE_ID', 'STRIPE_WEBHOOK_SECRET'
        ];
        
        const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
        const isFullyConfigured = missingVars.length === 0;
        
        // Check service availability
        // Check service availability
        const services = {
            database: {
                configured: !!(process.env.APP_DB_USER && process.env.APP_DB_PASS && process.env.APP_DB_INSTANCE),
                status: dbState.isConnected ? 'connected' : 'disconnected',
                details: dbState
            },
            email: {
                configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
                status: 'unknown'
            },
            payments: {
                configured: !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID),
                status: 'unknown'
            },
            transcription: {
                service: 'Deepgram',
                configured: !!process.env.DEEPGRAM_API_KEY,
                status: process.env.DEEPGRAM_API_KEY ? 'configured' : 'missing',
                apiKeyPrefix: process.env.DEEPGRAM_API_KEY ? 
                    process.env.DEEPGRAM_API_KEY.substring(0, 8) + '...' : 
                    'not configured',
                apiKeyLength: process.env.DEEPGRAM_API_KEY ? process.env.DEEPGRAM_API_KEY.length : 0,
                required: 'For desktop client transcription'
            }
        };

        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            server: {
                status: 'running',
                uptime: Math.floor(process.uptime()),
                environment: process.env.NODE_ENV || 'development',
                version: '1.0.0'
            },
            configuration: {
                status: isFullyConfigured ? 'complete' : 'incomplete',
                completeness: `${((requiredEnvVars.length - missingVars.length) / requiredEnvVars.length * 100).toFixed(0)}%`
            },
            services
        });
        
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            success: false,
            timestamp: new Date().toISOString(),
            error: 'Status check failed',
            server: {
                status: 'error'
            }
        });
    }
});

// Routes
app.use('/api', userRoutes);

// API Routes
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working' });
});

app.get('/api/debug-baseurl', (req, res) => {
    res.json({
        BASE_URL: BASE_URL,
        NODE_ENV: process.env.NODE_ENV,
        BASE_URL_env: process.env.BASE_URL,
        timestamp: new Date().toISOString(),
        deploymentTest: 'PRODUCTION_URL_FIX_v3',  // ← CHANGE THIS
        isProduction: !BASE_URL.includes('localhost'),
        host: req.get('host'),
        protocol: req.protocol
    });
});

// Check if email exists for trial
app.post('/api/check-email', async (req, res) => {
    try {
        // CHECK DATABASE CONNECTION FIRST
        const dbState = checkMongoConnection();
        if (!dbState.isConnected) {
            console.error('Database not connected in /api/check-email');
            return res.status(503).json({
                success: false,
                message: 'Database connection unavailable',
                details: dbState
            });
        }
        
        const { email } = req.body;
        
        // Skip check for development emails
        if (DEV_EMAILS.includes(email.toLowerCase())) {
            return res.json({ success: true });
        }
        
        console.log('Checking email:', email);
        const existingUser = await User.findOne({ 
            email: email.toLowerCase(),
            version: 'free'
        });
        
        if (existingUser) {
            // Check if the trial period is still valid
            const trialStartDate = existingUser.createdAt || existingUser.updatedAt;
            const daysSinceStart = Math.floor((new Date() - new Date(trialStartDate)) / (1000 * 60 * 60 * 24));
            
            console.log(`User trial started: ${trialStartDate}, Days since start: ${daysSinceStart}`);
            
            // If within 7-day trial period, allow access
            if (daysSinceStart < 7) {
                console.log('User is within trial period');
                return res.json({ 
                    success: true, 
                    withinTrial: true,
                    daysRemaining: 7 - daysSinceStart,
                    message: `You have ${7 - daysSinceStart} days remaining in your trial`
                });
            } else {
                // Trial has expired
                console.log('User trial has expired');
                return res.status(400).json({
                    success: false,
                    message: 'Your 7-day trial has expired. Please purchase a subscription to continue.'
                });
            }
        }
        
        // No existing user, allow new trial
        res.json({ success: true });
    } catch (error) {
        console.error('Error in check-email:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            details: error.message
        });
    }
});

app.get('/test-email', async (req, res) => {
    try {
        console.log('Testing email transporter...');
        
        // Test transporter creation
        const transporter = await createTransporter();
        console.log('✅ Transporter created successfully');
        
        // Test sending an actual email
        const testEmail = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Send to yourself for testing
            subject: 'Test Email - ' + new Date().toISOString(),
            text: 'This is a test email to verify the transporter works!',
            html: '<p>This is a test email to verify the transporter works!</p>'
        };
        
        const result = await transporter.sendMail(testEmail);
        console.log('✅ Email sent successfully:', result.messageId);
        
        res.json({ 
            success: true, 
            message: 'Email sent successfully',
            messageId: result.messageId 
        });
        
    } catch (error) {
        console.error('❌ Email test failed:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

async function hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
}

// *** FIXED: Send activation code and handle user creation ***
app.post('/api/send-activation', async (req, res) => {
    console.log('=== SEND-ACTIVATION ROUTE CALLED ===');
    console.log('Starting activation request processing');
    console.log('🌐 Using BASE_URL:', BASE_URL);
    
    // CHECK DATABASE CONNECTION FIRST
    const dbState = checkMongoConnection();
    console.log('Database state at start of send-activation:', dbState);
    
    if (!dbState.isConnected) {
        console.error('❌ Database not connected in /api/send-activation');
        return res.status(503).json({
            success: false,
            message: 'Database connection unavailable. Please try again later.',
            details: dbState
        });
    }

    try {
        const { email, firstName, lastName, version, language, termsAccepted, ...otherData } = req.body;
        const t = messages[language] || messages.en;
        
        console.log('Processing activation for:', { email, version });
        
        // Handle paid version first
        if (version === 'paid') {
    console.log('Processing paid version...');
    
    // Create or update user for paid version
    const userData = {
        firstName,
        lastName,
        email: email.toLowerCase(),
        version,
        language,
        termsAccepted,
        isActive: false,
        isPaid: false,
        updatedAt: new Date(),
        company: otherData.company,
        address: otherData.address,
        addressContinued: otherData.addressContinued,
        postalCode: otherData.postalCode,
        city: otherData.city,
        country: otherData.country,
        autoRenewal: otherData.autoRenewal,
        // ADD THESE:
        validationStartDate: new Date(),
        validationEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days for paid
    };

            // Create or update user
            console.log('Looking for existing user...');
            let user = await User.findOne({ email: email.toLowerCase() });
            if (user) {
                console.log('Found existing user, updating...');
                Object.assign(user, userData);
            } else {
                console.log('Creating new user with Stripe customer...');
                // Create Stripe customer for new user
                const customer = await stripe.customers.create({
                    email: email.toLowerCase(),
                    name: `${firstName} ${lastName}`,
                    metadata: {
                        firstName,
                        lastName
                    }
                });
                userData.stripeCustomerId = customer.id;
                user = new User(userData);
            }
            console.log('Saving user...');
            await user.save();
            console.log('User saved successfully');

            // Get currency and amount from request (passed from frontend)
            const currency = otherData.currency || 'eur';
            const amount = otherData.amount || 2500;
            
            console.log(`Creating payment intent with currency: ${currency}, amount: ${amount}`);

            // Create payment intent with dynamic currency
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount, // Dynamic amount based on currency
                currency: currency.toLowerCase(), // Dynamic currency (eur or gbp)
                automatic_payment_methods: {
                    enabled: true,
                },
                metadata: {
                    userEmail: email.toLowerCase(),
                    userName: `${firstName} ${lastName}`,
                    userId: user._id.toString()
                },
                description: 'SyncVoice Medical - Monthly Subscription'
            });
            console.log('Payment intent created successfully with currency:', currency);

            // Return payment data
            return res.json({
                success: true,
                requiresPayment: true,
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                userId: user._id.toString()
            });
        }

        // Handle free version
        if (version === 'free') {
            console.log('Processing free version...');
            
            // Skip check for development emails
            if (!DEV_EMAILS.includes(email.toLowerCase())) {
                console.log('Checking for existing free trial user...');
                const existingUser = await User.findOne({ 
                    email: email.toLowerCase(),
                    version: 'free'
                });
                
                if (existingUser) {
                    // Check if the trial period is still valid
                    const trialStartDate = existingUser.createdAt || existingUser.updatedAt;
                    const daysSinceStart = Math.floor((new Date() - new Date(trialStartDate)) / (1000 * 60 * 60 * 24));
                    
                    console.log(`Existing user found. Trial started: ${trialStartDate}, Days since start: ${daysSinceStart}`);
                    
                    if (daysSinceStart < 7) {
                        // Still within trial period
                        console.log('User is within trial period - allowing re-activation');
                        
                        // Update the existing user with new activation code
                        let activationCode;
                        try {
                            activationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
                            console.log('Code generated successfully:', activationCode);
                        } catch (genError) {
                            console.error('Error generating code:', genError);
                            throw genError;
                        }
                        
                        const expiryDate = getExpiryDate();
                        
                        // Update existing user
                        existingUser.activationCode = activationCode;
                        existingUser.activationCodeExpiry = expiryDate;
                        existingUser.firstName = firstName;
                        existingUser.lastName = lastName;
                        existingUser.language = language;
                        existingUser.termsAccepted = termsAccepted;
                        existingUser.updatedAt = new Date();
                        
                        await existingUser.save();
                        console.log('Existing user updated with new activation code');
                        
                        // FIXED: Create activation link using global BASE_URL
                        let activationLink = `${BASE_URL}/api/activate/${activationCode}?email=${encodeURIComponent(email)}&lang=${language}`;
                        console.log('🔗 Generated activation link:', activationLink);

                        // SAFETY CHECK: Never send localhost links in production
if (activationLink.includes('localhost') || activationLink.includes('127.0.0.1')) {
    console.warn('⚠️ WARNING: Activation link contains localhost, forcing production URL');
    activationLink = `${BASE_URL}/api/activate/${activationCode}?email=${encodeURIComponent(email)}&lang=${language}`;
}

console.log('🔗 Final activation link:', activationLink);
                        
                        // Create transporter with fresh token
                        let transporter;
                        try {
                            console.log('Creating email transporter...');
                            transporter = await createTransporter();
                            console.log('Email transporter created successfully');
                        } catch (transporterError) {
                            console.error('Failed to create transporter:', transporterError);
                            throw new Error('Email service temporarily unavailable: ' + transporterError.message);
                        }
                        
                        // Prepare mail options
                        const mailOptions = {
                            from: `SyncVoice Medical <${process.env.EMAIL_USER}>`,
                            to: email,
                            subject: t.subject,
                            html: `
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            </head>
                            <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif;">
                                <p style="margin: 40px 0; font-size: 24px; color: #333333;">
                                    ${t.greeting} ${firstName} ${lastName},
                                </p>
                                <div style="text-align: center;">
                                    <p style="margin: 20px 0; color: #666666;">
                                        ${t.thankyou}<br>
                                        ${t.clickToActivate}
                                    </p>
                                    <p style="margin: 20px 0; color: #69B578; font-weight: bold;">
                                        You have ${7 - daysSinceStart} days remaining in your trial.
                                    </p>
                                    <div style="margin: 20px 0;">
                                        <a href="${activationLink}"
                                           style="display: inline-block; background-color: #69B578; color: white; text-decoration: none; padding: 15px 25px; border-radius: 5px; font-family: monospace; font-size: 24px; font-weight: bold;">
                                            ${activationCode}
                                        </a>
                                    </div>
                                </div>
                            </body>
                            </html>`
                        };
                        
                        // Send email
                        try {
                            console.log('Sending activation email...');
                            await transporter.sendMail(mailOptions);
                            console.log('Email sent successfully');
                            res.json({
                                success: true,
                                message: t.success,
                                userId: existingUser._id.toString(),
                                daysRemaining: 7 - daysSinceStart
                            });
                            return; // Important: return here to prevent creating a new user
                        } catch (emailError) {
                            console.error('Email sending error:', emailError);
                            throw new Error('Failed to send email: ' + emailError.message);
                        }
                    } else {
                        // Trial has expired
                        console.log('User trial has expired');
                        return res.status(400).json({
                            success: false,
                            message: 'Your 7-day trial has expired. Please purchase a subscription to continue.'
                        });
                    }
                }
            }
        }

        // Generate activation code and expiry for new users
        console.log('About to generate activation code...');
        
        let activationCode;
try {
    activationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    console.log('Code generated successfully:', activationCode);
} catch (genError) {
    console.error('Error generating code:', genError);
    throw genError;
}

const expiryDate = getExpiryDate();
console.log('Generated activation code:', activationCode);

// Prepare user data
const userData = {
    firstName,
    lastName,
    email: email.toLowerCase(),
    activationCode,
    activationCodeExpiry: expiryDate,
    version,
    language,
    termsAccepted,
    isActive: false,
    updatedAt: new Date(),
    validationStartDate: new Date(),
    validationEndDate: expiryDate
};

// Add password for both free and paid users
if (otherData.password) {
    userData.password = await hashPassword(otherData.password);
}

// *** ADD THIS LINE ***
let user;

        // Create or update user
        if (DEV_EMAILS.includes(email.toLowerCase())) {
    console.log('Processing dev email...');
    // For bypass emails, first check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    
    if (existingUser) {
        // Update existing user
        existingUser.activationCode = activationCode;
        existingUser.activationCodeExpiry = expiryDate;
        existingUser.firstName = firstName;
        existingUser.lastName = lastName;
        existingUser.language = language;
        existingUser.termsAccepted = termsAccepted;
        existingUser.updatedAt = new Date();
        
        // Add password if provided
        if (otherData.password) {
            existingUser.password = await hashPassword(otherData.password);
        }
        
        // ADD THESE if not already present:
        if (!existingUser.validationStartDate) {
            existingUser.validationStartDate = existingUser.createdAt || new Date();
        }
        if (!existingUser.validationEndDate) {
            existingUser.validationEndDate = expiryDate;
        }
        
        await existingUser.save();
        console.log('Existing dev user updated successfully');
        
        // *** FIX: Assign the updated user to the user variable ***
        user = existingUser;
    } else {
        // Create new dev user
        console.log('Creating new dev user...');
        user = new User(userData);
        await user.save();
        console.log('New dev user created successfully');
    }
} else {
    console.log('Creating new user...');
    // Create new user
    user = new User(userData);
    await user.save();
}
        console.log('User saved successfully with ID:', user._id);

        // FIXED: Create activation link using global BASE_URL
let activationLink = `${BASE_URL}/api/activate/${activationCode}?email=${encodeURIComponent(email)}&lang=${language}`;

// SAFETY CHECK: Never send localhost links in production
if (activationLink.includes('localhost') || activationLink.includes('127.0.0.1')) {
    console.warn('⚠️ WARNING: Activation link contains localhost, forcing production URL');
    activationLink = `https://www.syncvoicemedical.com/api/activate/${activationCode}?email=${encodeURIComponent(email)}&lang=${language}`;
}

console.log('🔗 Generated activation link:', activationLink);

        // Create transporter with fresh token
        let transporter;
        try {
            console.log('Creating email transporter...');
            transporter = await createTransporter();
            console.log('Email transporter created successfully');
        } catch (transporterError) {
            console.error('Failed to create transporter:', transporterError);
            throw new Error('Email service temporarily unavailable: ' + transporterError.message);
        }
        
        // Prepare mail options
        const mailOptions = {
            from: `SyncVoice Medical <${process.env.EMAIL_USER}>`,
            to: email,
            subject: t.subject,
            html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif;">
                <p style="margin: 40px 0; font-size: 24px; color: #333333;">
                    ${t.greeting} ${firstName} ${lastName},
                </p>
                <div style="text-align: center;">
                    <p style="margin: 20px 0; color: #666666;">
                        ${t.thankyou}<br>
                        ${t.clickToActivate}
                    </p>
                    <div style="margin: 20px 0;">
                        <a href="${activationLink}"
                           style="display: inline-block; background-color: #69B578; color: white; text-decoration: none; padding: 15px 25px; border-radius: 5px; font-family: monospace; font-size: 24px; font-weight: bold;">
                            ${activationCode}
                        </a>
                    </div>
                </div>
            </body>
            </html>`
        };

        // Send email
        try {
            console.log('Sending activation email...');
            await transporter.sendMail(mailOptions);
            console.log('Email sent successfully');
            res.json({
                success: true,
                message: t.success,
                userId: user._id.toString()
            });
        } catch (emailError) {
            console.error('Email sending error:', emailError);
            
            // Check if this is an authentication error
            if (emailError.message.includes('invalid_grant')) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required. Please re-authenticate with Google.',
                    reAuth: true
                });
            }
            
            throw new Error('Failed to send email: ' + emailError.message);
        }

    } catch (error) {
        console.error('Comprehensive error in /api/send-activation:', error);
        console.error('Error stack:', error.stack);
        
        // Check if this is a MongoDB timeout error
        if (error.message.includes('buffering timed out')) {
            const dbState = checkMongoConnection();
            console.error('MongoDB timeout - Current DB state:', dbState);
            
            return res.status(503).json({
                success: false,
                message: 'Database connection timeout. Please check your MongoDB connection.',
                details: {
                    error: error.message,
                    dbState: dbState
                }
            });
        }
        
        // Handle authentication errors
        if (error.message.includes('invalid_grant') || error.message.includes('credentials_required')) {
            // Refresh token is invalid, tell the client to re-authenticate
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please re-authenticate with Google.',
                reAuth: true
            });
        }
        
        res.status(500).json({
            success: false,
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

app.get('/api/debug-user/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email.toLowerCase() });
        if (user) {
            res.json({
                email: user.email,
                version: user.version,
                isPaid: user.isPaid,
                isActive: user.isActive,
                validationStartDate: user.validationStartDate,
                validationEndDate: user.validationEndDate,
                daysRemaining: Math.ceil((user.validationEndDate - new Date()) / (1000 * 60 * 60 * 24)),
                activationCode: user.activationCode
            });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/trial-status/:email', async (req, res) => {
    try {
        const dbState = checkMongoConnection();
        if (!dbState.isConnected) {
            return res.status(503).json({
                success: false,
                message: 'Database connection unavailable'
            });
        }
        
        const { email } = req.params;
        
        const user = await User.findOne({ 
            email: email.toLowerCase(),
            version: 'free'
        });
        
        if (!user) {
            return res.json({
                success: true,
                hasTrialStarted: false,
                message: 'No trial found for this email'
            });
        }
        
        const trialStartDate = user.createdAt || user.updatedAt;
        const daysSinceStart = Math.floor((new Date() - new Date(trialStartDate)) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(0, 7 - daysSinceStart);
        const isExpired = daysSinceStart >= 7;
        
        res.json({
            success: true,
            hasTrialStarted: true,
            trialStartDate: trialStartDate,
            daysSinceStart: daysSinceStart,
            daysRemaining: daysRemaining,
            isExpired: isExpired,
            isActive: user.isActive,
            message: isExpired ? 'Trial has expired' : `${daysRemaining} days remaining`
        });
        
    } catch (error) {
        console.error('Error checking trial status:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            details: error.message
        });
    }
});

// Handle activation
app.get('/api/activate/:code', async (req, res) => {
    try {
        // CHECK DATABASE CONNECTION FIRST
        const dbState = checkMongoConnection();
        if (!dbState.isConnected) {
            console.error('Database not connected in /api/activate');
            return res.status(503).send('Database unavailable. Please try again later.');
        }
        
        const { code } = req.params;
        const { email, lang } = req.query;
        
        const user = await User.findOne({ 
            email: email.toLowerCase(),
            activationCode: code
        });

        if (!user || user.isCodeExpired()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired activation code'
            });
        }

        // Activate user
        user.isActive = true;
        user.lastLoginAt = new Date();
        user.loginCount = 1;
        await user.save();

        // Redirect to app
        res.redirect(`/appForm.html?code=${code}&email=${encodeURIComponent(email)}&lang=${lang}`);

    } catch (error) {
        console.error('Error in activation:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Payment routes
app.post('/api/create-payment-intent', async (req, res) => {
    console.log('Payment intent request received');
    console.log('Full request body:', JSON.stringify(req.body, null, 2));
    
    try {
        const { email, name, amount, currency } = req.body;
        
        if (!email || !name || !amount) {
            return res.status(400).json({ 
                error: 'Missing required parameters',
                receivedData: req.body 
            });
        }

        // Use dynamic currency, default to EUR if not provided
        const paymentCurrency = currency || 'eur';
        
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount, // Use passed amount
            currency: paymentCurrency.toLowerCase(), // Use dynamic currency
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                email: email,
                name: name
            },
            description: 'SyncVoice Medical - Monthly Subscription'
        });

        console.log(`Payment intent created successfully: ${paymentIntent.id} with currency: ${paymentCurrency}`);
        res.json({ 
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        console.error('Detailed error creating payment intent:', error);
        res.status(500).json({ 
            error: 'Failed to create payment intent',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

app.post('/api/create-subscription', async (req, res) => {
    try {
        // CHECK DATABASE CONNECTION FIRST
        const dbState = checkMongoConnection();
        if (!dbState.isConnected) {
            console.error('Database not connected in /api/create-subscription');
            return res.status(503).json({
                error: 'Database connection unavailable'
            });
        }
        
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // First, check if the customer has a payment method
        const paymentMethods = await stripe.paymentMethods.list({
            customer: user.stripeCustomerId,
            type: 'card',
        });

        if (!paymentMethods.data.length) {
            return res.status(400).json({ error: 'No payment method found for this customer' });
        }

        // Create the subscription
        const subscription = await stripe.subscriptions.create({
            customer: user.stripeCustomerId,
            items: [{ price: process.env.STRIPE_PRICE_ID }],
            default_payment_method: paymentMethods.data[0].id,
            payment_behavior: 'default_incomplete',
            expand: ['latest_invoice.payment_intent'],
        });

        // Update user
        user.subscriptionId = subscription.id;
        await user.save();

        res.json({
            subscriptionId: subscription.id,
            clientSecret: subscription.latest_invoice.payment_intent.client_secret
        });
    } catch (error) {
        console.error('Subscription creation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add this route to create users
app.post('/api/create-user', async (req, res) => {
    console.log('Received create user request:', JSON.stringify(req.body, null, 2));
    
    try {
        // CHECK DATABASE CONNECTION FIRST
        const dbState = checkMongoConnection();
        if (!dbState.isConnected) {
            console.error('Database not connected in /api/create-user');
            return res.status(503).json({
                success: false,
                message: 'Database connection unavailable'
            });
        }
        
        const { email, firstName, lastName, version, language, termsAccepted, ...otherData } = req.body;
        
        // Prepare user data
        const userData = {
        firstName,
        lastName,
        email: email.toLowerCase(),
        version,
        language,
        termsAccepted,
        isActive: false,
        updatedAt: new Date(),
        // ADD THESE:
        validationStartDate: new Date(),
        validationEndDate: version === 'free' 
            ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)  // 7 days for free
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days for paid
    };


        // Handle paid version specifics
        if (version === 'paid') {
        userData.isPaid = true;
        userData.company = otherData.company;
        userData.address = otherData.address;
        userData.addressContinued = otherData.addressContinued;
        userData.postalCode = otherData.postalCode;
        userData.city = otherData.city;
        userData.country = otherData.country;
        userData.autoRenewal = otherData.autoRenewal;

        // Create Stripe customer
        const customer = await stripe.customers.create({
            email: email.toLowerCase(),
            name: `${firstName} ${lastName}`
        });
        userData.stripeCustomerId = customer.id;
    }

        // Log user data before saving
        console.log('User data to be saved:', JSON.stringify(userData, null, 2));

        // Create user
        const user = new User(userData);
        await user.save();

        // Log created user
        console.log('Created user:', JSON.stringify(user, null, 2));

        res.json({ 
            success: true, 
            message: 'User created', 
            userId: user._id 
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Add this route for development/testing
app.get('/reset-trials', async (req, res) => {
    try {
        // CHECK DATABASE CONNECTION FIRST
        const dbState = checkMongoConnection();
        if (!dbState.isConnected) {
            console.error('Database not connected in /reset-trials');
            return res.status(503).json({
                success: false,
                message: 'Database connection unavailable'
            });
        }
        
        await User.deleteMany({ 
            version: 'free', 
            isActive: false 
        });
        res.json({ 
            success: true, 
            message: 'All inactive free trial users deleted' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Stripe webhook


async function handleSuccessfulPayment(paymentIntent) {
    try {
        // CHECK DATABASE CONNECTION FIRST
        const dbState = checkMongoConnection();
        if (!dbState.isConnected) {
            console.error('Database not connected in handleSuccessfulPayment');
            return;
        }
        
        console.log('Payment successful:', paymentIntent.id);
        
        // Find the user by metadata
        if (paymentIntent.metadata && paymentIntent.metadata.userId) {
            const user = await User.findById(paymentIntent.metadata.userId);
            
            if (user) {
                // Generate activation code if not already set
                if (!user.activationCode) {
                    user.activationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
                    user.activationCodeExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
                }
                
                // Update user status
                user.isPaid = true;
                user.isActive = true;
                user.paymentStatus = 'completed';
                user.lastPaymentDate = new Date();
                user.validationStartDate = new Date();
                user.validationEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                
                await user.save();
                console.log(`User ${user.email} marked as paid and active`);
                
                // SEND ACTIVATION EMAIL
                const lang = user.language || 'en';
                const t = messages[lang] || messages.en;
                
                try {
                    // Create activation link
                    let activationLink = `${BASE_URL}/api/activate/${user.activationCode}?email=${encodeURIComponent(user.email)}&lang=${lang}`;
                    
                    // Safety check
                    if (activationLink.includes('localhost') || activationLink.includes('127.0.0.1')) {
                        activationLink = `https://syncvoicemedical.onrender.com/api/activate/${user.activationCode}?email=${encodeURIComponent(user.email)}&lang=${lang}`;
                    }
                    
                    console.log('Sending activation email for paid user:', user.email);
                    
                    // Create transporter
                    const transporter = await createTransporter();
                    
                    // Email content
                    const mailOptions = {
                        from: `SyncVoice Medical <${process.env.EMAIL_USER}>`,
                        to: user.email,
                        subject: t.subject,
                        html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        </head>
                        <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif;">
                            <p style="margin: 40px 0; font-size: 24px; color: #333333;">
                                ${t.greeting} ${user.firstName} ${user.lastName},
                            </p>
                            <div style="text-align: center;">
                                <p style="margin: 20px 0; color: #666666;">
                                    ${t.thankyou}<br>
                                    ${t.clickToActivate}
                                </p>
                                <p style="margin: 20px 0; color: #69B578; font-weight: bold;">
                                    Your payment was successful! You now have 30 days of access.
                                </p>
                                <div style="margin: 20px 0;">
                                    <a href="${activationLink}"
                                       style="display: inline-block; background-color: #69B578; color: white; text-decoration: none; padding: 15px 25px; border-radius: 5px; font-family: monospace; font-size: 24px; font-weight: bold;">
                                        ${user.activationCode}
                                    </a>
                                </div>
                            </div>
                        </body>
                        </html>`
                    };
                    
                    // Send email
                    await transporter.sendMail(mailOptions);
                    console.log('Activation email sent successfully to:', user.email);
                    
                } catch (emailError) {
                    console.error('Error sending activation email:', emailError);
                    // Don't throw - payment was successful even if email fails
                }
            }
        }
    } catch (error) {
        console.error('Error handling successful payment:', error);
    }
}

async function handleFailedPayment(failedPayment) {
    try {
        // CHECK DATABASE CONNECTION FIRST
        const dbState = checkMongoConnection();
        if (!dbState.isConnected) {
            console.error('Database not connected in handleFailedPayment');
            return;
        }
        
        // Implement payment failure logic
        console.error('Payment failed:', failedPayment.id);
        
        // Find the user by metadata
        if (failedPayment.metadata && failedPayment.metadata.userId) {
            const user = await User.findById(failedPayment.metadata.userId);
            
            if (user) {
                user.paymentStatus = 'failed';
                await user.save();
                console.log(`Payment failed for user ${user.email}`);
            }
        }
    } catch (error) {
        console.error('Error handling failed payment:', error);
    }
}

async function handleSuccessfulInvoice(invoice) {
    try {
        // CHECK DATABASE CONNECTION FIRST
        const dbState = checkMongoConnection();
        if (!dbState.isConnected) {
            console.error('Database not connected in handleSuccessfulInvoice');
            return;
        }
        
        console.log('Invoice payment successful:', invoice.id);
        
        if (invoice.customer) {
            const user = await User.findOne({ stripeCustomerId: invoice.customer });
            
            if (user) {
                // Generate activation code if not already set
                if (!user.activationCode) {
                    user.activationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
                    user.activationCodeExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                }
                
                // Update user status
                user.isPaid = true;
                user.isActive = true;
                user.paymentStatus = 'completed';
                user.lastPaymentDate = new Date();
                user.validationStartDate = new Date();
                user.validationEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                
                await user.save();
                console.log(`Invoice paid for user ${user.email}`);
                
                // SEND ACTIVATION EMAIL (same logic as above)
                const lang = user.language || 'en';
                const t = messages[lang] || messages.en;
                
                try {
                    // Create activation link
                    let activationLink = `${BASE_URL}/api/activate/${user.activationCode}?email=${encodeURIComponent(user.email)}&lang=${lang}`;
                    
                    if (activationLink.includes('localhost') || activationLink.includes('127.0.0.1')) {
                        activationLink = `https://syncvoicemedical.onrender.com/api/activate/${user.activationCode}?email=${encodeURIComponent(user.email)}&lang=${lang}`;
                    }
                    
                    console.log('Sending activation email for paid user (invoice):', user.email);
                    
                    const transporter = await createTransporter();
                    
                    const mailOptions = {
                        from: `SyncVoice Medical <${process.env.EMAIL_USER}>`,
                        to: user.email,
                        subject: t.subject,
                        html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        </head>
                        <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif;">
                            <p style="margin: 40px 0; font-size: 24px; color: #333333;">
                                ${t.greeting} ${user.firstName} ${user.lastName},
                            </p>
                            <div style="text-align: center;">
                                <p style="margin: 20px 0; color: #666666;">
                                    ${t.thankyou}<br>
                                    ${t.clickToActivate}
                                </p>
                                <p style="margin: 20px 0; color: #69B578; font-weight: bold;">
                                    Your payment was successful! You now have 30 days of access.
                                </p>
                                <div style="margin: 20px 0;">
                                    <a href="${activationLink}"
                                       style="display: inline-block; background-color: #69B578; color: white; text-decoration: none; padding: 15px 25px; border-radius: 5px; font-family: monospace; font-size: 24px; font-weight: bold;">
                                        ${user.activationCode}
                                    </a>
                                </div>
                            </div>
                        </body>
                        </html>`
                    };
                    
                    await transporter.sendMail(mailOptions);
                    console.log('Activation email sent successfully to:', user.email);
                    
                } catch (emailError) {
                    console.error('Error sending activation email:', emailError);
                }
            }
        }
    } catch (error) {
        console.error('Error handling successful invoice:', error);
    }
}

async function handleSubscriptionChange(subscription) {
    try {
        // CHECK DATABASE CONNECTION FIRST
        const dbState = checkMongoConnection();
        if (!dbState.isConnected) {
            console.error('Database not connected in handleSubscriptionChange');
            return;
        }
        
        // Process subscription updates
        console.log('Subscription changed:', subscription.id);
        
        if (subscription.customer) {
            const user = await User.findOne({ stripeCustomerId: subscription.customer });
            
            if (user) {
                user.subscriptionStatus = subscription.status;
                
                if (subscription.status === 'active') {
                    user.isPaid = true;
                    user.isActive = true;
                } else if (subscription.status === 'canceled') {
                    // Don't immediately deactivate - they still have access until the end of their billing period
                    user.autoRenewal = false;
                }
                
                await user.save();
                console.log(`Subscription updated for user ${user.email} to ${subscription.status}`);
            }
        }
    } catch (error) {
        console.error('Error handling subscription change:', error);
    }
}

// Version check endpoint
app.get('/api/version', (req, res) => {
    res.json({
        version: '1.0.2',  // ← CHANGE THIS
        deployedAt: '2025-06-17T16:45:00Z',  // ← UPDATE THIS
        hasGenerateFunction: true,
        baseUrlFix: true,  // ← ADD THIS
        currentBaseUrl: BASE_URL,  // ← ADD THIS
        message: 'SyncVoiceMedical API v1.0.2 - BASE_URL Fix Applied'  // ← CHANGE THIS
    });
});

// Also add a simple test
app.get('/test', (req, res) => {
    res.send('Server is working!');
});

// Add this route BEFORE your catch-all handlers in server.js
app.get('/debug-files', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    
    const baseDir = __dirname;
    const publicDir = path.join(baseDir, 'public');
    
    try {
        // Check if directories exist
        const publicExists = fs.existsSync(publicDir);
        
        // List files in public directory
        let filesInPublic = [];
        if (publicExists) {
            filesInPublic = fs.readdirSync(publicDir);
        }
        
        // Check specific files
        const loginHtmlExists = fs.existsSync(path.join(publicDir, 'login.html'));
        const formHtmlExists = fs.existsSync(path.join(publicDir, 'form.html'));
        const indexHtmlExists = fs.existsSync(path.join(publicDir, 'index.html'));
        
        res.json({
            success: true,
            paths: {
                baseDir: baseDir,
                publicDir: publicDir
            },
            directories: {
                publicExists: publicExists
            },
            files: {
                filesInPublic: filesInPublic,
                loginHtmlExists: loginHtmlExists,
                formHtmlExists: formHtmlExists,
                indexHtmlExists: indexHtmlExists
            },
            staticMiddleware: {
                configured: true,
                path: publicDir
            }
        });
    } catch (error) {
        res.json({
            success: false,
            error: error.message,
            paths: {
                baseDir: baseDir,
                publicDir: publicDir
            }
        });
    }
});

// Test login route - accepts any email/password for testing
app.post('/api/login', async (req, res) => {
    try {
        // CHECK DATABASE CONNECTION FIRST
        const dbState = checkMongoConnection();
        if (!dbState.isConnected) {
            console.error('Database not connected in /api/login');
            return res.status(503).json({
                success: false,
                message: 'Database connection unavailable'
            });
        }

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if user has a password (for backward compatibility)
        if (!user.password) {
            return res.status(401).json({
                success: false,
                message: 'Please complete your account setup. Contact support if needed.'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if user account is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account not activated. Please check your email for activation instructions.'
            });
        }

        // Check if subscription is still valid
        if (user.isSubscriptionExpired()) {
            return res.status(401).json({
                success: false,
                message: 'Your subscription has expired. Please renew to continue.'
            });
        }

        // Update login tracking
        user.loginCount = (user.loginCount || 0) + 1;
        user.lastLoginAt = new Date();
        await user.save();

        // Successful login
        res.json({
            success: true,
            message: 'Login successful',
            userId: user._id.toString(),
            userEmail: user.email,
            userInfo: {
                firstName: user.firstName,
                lastName: user.lastName,
                version: user.version,
                daysRemaining: user.daysUntilExpiration()
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

// Test user details route - returns fake user data
app.get('/api/user-details/:email', async (req, res) => {
    try {
        // CHECK DATABASE CONNECTION FIRST
        const dbState = checkMongoConnection();
        if (!dbState.isConnected) {
            console.error('Database not connected in /api/user-details');
            return res.status(503).json({
                success: false,
                message: 'Database connection unavailable'
            });
        }

        const { email } = req.params;
        
        // Find the user in the database
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Return real user data
        const userData = {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            company: user.company || '',
            address: user.address || '',
            postalCode: user.postalCode || '',
            city: user.city || '',
            country: user.country || '',
            activationCode: user.activationCode,
            validationStartDate: user.validationStartDate || user.createdAt,
            validationEndDate: user.version === 'free' ? user.activationCodeExpiry : user.validationEndDate,
            autoRenewal: user.autoRenewal || false,
            version: user.version,
            isActive: user.isActive,
            daysRemaining: user.daysUntilExpiration()
        };
        
        res.json({
            success: true,
            user: userData
        });
        
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

app.post('/api/forgot-password', async (req, res) => {
    try {
        const dbState = checkMongoConnection();
        if (!dbState.isConnected) {
            return res.status(503).json({
                success: false,
                message: 'Database connection unavailable'
            });
        }

        const { email } = req.body;
        
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            // Don't reveal if email exists or not
            return res.json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent.'
            });
        }

        // Generate new activation code for password reset
        const resetCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        const resetExpiry = new Date();
        resetExpiry.setHours(resetExpiry.getHours() + 1); // 1 hour expiry

        user.activationCode = resetCode;
        user.activationCodeExpiry = resetExpiry;
        await user.save();

        // Send password reset email (implement this based on your email system)
        // ... email sending logic here ...

        res.json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent.'
        });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

app.get('/api/test-deepgram', async (req, res) => {
    try {
        console.log('=== Testing Deepgram Configuration ===');
        
        // Check if API key exists
        if (!process.env.DEEPGRAM_API_KEY) {
            console.log('❌ Deepgram API key not found');
            return res.json({
                success: false,
                message: 'Deepgram API key not configured',
                hasApiKey: false,
                envVars: Object.keys(process.env).filter(key => key.includes('DEEPGRAM')),
                instructions: 'Add DEEPGRAM_API_KEY environment variable in Render.com'
            });
        }
        
        const apiKey = process.env.DEEPGRAM_API_KEY;
        console.log('✅ Deepgram API key found, length:', apiKey.length);
        console.log('✅ API key starts with:', apiKey.substring(0, 5) + '...');
        
        // Test Deepgram API connection
        try {
            const axios = require('axios');
            
            console.log('🔍 Testing Deepgram API connection...');
            
            // Test with Deepgram projects endpoint (simple API test)
            const response = await axios.get('https://api.deepgram.com/v1/projects', {
                headers: {
                    'Authorization': `Token ${apiKey}`,
                },
                timeout: 10000
            });
            
            console.log('✅ Deepgram API connection successful');
            
            res.json({
                success: true,
                message: 'Deepgram API configured and accessible',
                hasApiKey: true,
                apiKeyPrefix: apiKey.substring(0, 8) + '...',
                apiKeyLength: apiKey.length,
                apiStatus: 'connected',
                projectsCount: response.data?.projects?.length || 0,
                testTime: new Date().toISOString()
            });
            
        } catch (apiError) {
            console.error('❌ Deepgram API test failed:', apiError.message);
            
            res.json({
                success: false,
                message: 'Deepgram API key configured but connection failed',
                hasApiKey: true,
                apiKeyPrefix: apiKey.substring(0, 8) + '...',
                apiKeyLength: apiKey.length,
                apiStatus: 'error',
                error: apiError.response?.data || apiError.message,
                statusCode: apiError.response?.status,
                instructions: 'Check if your Deepgram API key is valid and active'
            });
        }
        
    } catch (error) {
        console.error('❌ Deepgram test error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error testing Deepgram',
            error: error.message
        });
    }
});

// Catch unmatched API routes and return JSON instead of HTML
app.use('/api/*', (req, res) => {
    console.log(`API route not found: ${req.method} ${req.url}`);
    res.status(404).json({
        success: false,
        message: `API endpoint not found: ${req.method} ${req.url}`,
        timestamp: new Date().toISOString(),
        availableEndpoints: [
            'GET /health',
            'GET /api/health',
            'GET /api/status', 
            'GET /api/test',
            'POST /api/login',
            'GET /api/user-details/:email',
            'POST /api/send-activation',
            'POST /api/check-email',
            'POST /api/create-payment-intent',
            'POST /api/create-subscription',
            'POST /api/create-user',
            'GET /api/activate/:code'
        ]
    });
});

// Error handling middleware should be last
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    
    // Determine error status code
    const statusCode = err.status || 500;
    
    // Send error response
    res.status(statusCode).json({
        success: false,
        message: err.message || 'An unexpected error occurred',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Print registered routes for debugging
console.log('Registered routes:');
app._router.stack.forEach(function(r){
    if (r.route && r.route.path){
        console.log(`Route: ${Object.keys(r.route.methods).join(',')} ${r.route.path}`);
    }
});

// ScaleWay Serverless Container Configuration
// Get port from environment variable or default to 8080
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log('Environment variables:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('🔍 MongoDB Connection State:', checkMongoConnection());
    console.log('WebSocket server is ready on the same port');
});

// Add this RIGHT AFTER the const server = app.listen(...) line

// Create WebSocket server using the same HTTP server (for Render.com)
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });

// Store active WebSocket connections
const activeConnections = new Map();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
    const connectionId = crypto.randomBytes(16).toString('hex');
    console.log(`New WebSocket connection: ${connectionId}`);
    
    // Store connection
    activeConnections.set(connectionId, {
        ws,
        authenticated: false,
        email: null,
        language: 'en'
    });
    
    // Send connection acknowledgment
    ws.send(JSON.stringify({
        type: 'connection',
        connectionId,
        status: 'connected'
    }));
    
    ws.on('message', async (message) => {
    try {
        const data = JSON.parse(message);
        const connection = activeConnections.get(connectionId);
        
        switch (data.type) {
            case 'auth':
                // Authenticate desktop client
                const { email, activationCode } = data;
                const user = await User.findOne({ 
                    email: email.toLowerCase(),
                    activationCode: activationCode
                });
                
                if (user && user.isActive) {
                    // Update connection info
                    connection.authenticated = true;
                    connection.email = email.toLowerCase();
                    connection.language = user.language || 'en';
                    
                    // Calculate days remaining
                    const daysRemaining = user.subscriptionEnd 
                        ? Math.ceil((new Date(user.subscriptionEnd) - new Date()) / (1000 * 60 * 60 * 24))
                        : 0;
                    
                    ws.send(JSON.stringify({
                        type: 'auth',
                        status: 'success',
                        user: {
                            firstName: user.firstName,
                            lastName: user.lastName,
                            email: user.email,
                            daysRemaining: daysRemaining > 0 ? daysRemaining : 0
                        },
                        language: connection.language
                    }));
                } else {
                    ws.send(JSON.stringify({
                        type: 'auth',
                        status: 'error',
                        message: 'Invalid credentials or inactive account'
                    }));
                }
                break;
                
            case 'startTranscription':
                if (!connection.authenticated) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Not authenticated'
                    }));
                    return;
                }
                
                // Initialize audio chunks array
                connection.audioChunks = [];
                
                ws.send(JSON.stringify({
                    type: 'transcriptionStarted'
                }));
                break;
                
            case 'audioChunk':
                // Handle audio chunk from desktop client
                if (!connection.authenticated) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Not authenticated'
                    }));
                    return;
                }
                
                // Store audio chunks for this connection
                if (!connection.audioChunks) {
                    connection.audioChunks = [];
                }
                
                // Decode base64 audio
                const audioBuffer = Buffer.from(data.audio, 'base64');
                connection.audioChunks.push(audioBuffer);
                
                // For real-time transcription, you could process chunks here
                // For now, we'll process when recording stops
                
                console.log(`Received audio chunk: ${audioBuffer.length} bytes`);
                break;
                
            case 'audioComplete':
    // Process complete audio with Deepgram - DESKTOP CLIENT ONLY
    if (!connection.authenticated || connection.clientType !== 'desktop') {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Not authenticated or invalid client type'
        }));
        return;
    }
    
    try {
        console.log('🎵 Processing audio complete for:', connection.email);
        
        // Combine all audio chunks with better error handling
        let fullAudioBuffer;
        
        if (connection.audioChunks && Array.isArray(connection.audioChunks) && connection.audioChunks.length > 0) {
            console.log(`📦 Combining ${connection.audioChunks.length} audio chunks`);
            
            // Add the final chunk if provided
            if (data.audio && typeof data.audio === 'string') {
                try {
                    const finalBuffer = Buffer.from(data.audio, 'base64');
                    connection.audioChunks.push(finalBuffer);
                    console.log(`📎 Added final chunk: ${finalBuffer.length} bytes`);
                } catch (bufferError) {
                    console.error('❌ Error creating final buffer:', bufferError.message);
                }
            }
            
            // Combine all chunks with error handling
            try {
                fullAudioBuffer = Buffer.concat(connection.audioChunks);
                console.log(`🔗 Combined audio buffer: ${fullAudioBuffer.length} bytes`);
                connection.audioChunks = []; // Clear chunks
            } catch (concatError) {
                console.error('❌ Error concatenating audio chunks:', concatError.message);
                throw new Error('Failed to combine audio chunks: ' + concatError.message);
            }
            
        } else if (data.audio && typeof data.audio === 'string') {
            // Single audio blob
            try {
                fullAudioBuffer = Buffer.from(data.audio, 'base64');
                console.log(`📦 Single audio buffer: ${fullAudioBuffer.length} bytes`);
            } catch (bufferError) {
                console.error('❌ Error creating single audio buffer:', bufferError.message);
                throw new Error('Failed to decode audio data: ' + bufferError.message);
            }
        } else {
            console.warn('⚠️ No audio data to process');
            ws.send(JSON.stringify({
                type: 'transcriptionResult',
                transcript: '',
                isFinal: true,
                source: 'no-audio',
                message: 'No audio data received'
            }));
            return;
        }
        
        // Validate audio buffer
        if (!fullAudioBuffer || fullAudioBuffer.length === 0) {
            console.warn('⚠️ Empty audio buffer');
            ws.send(JSON.stringify({
                type: 'transcriptionResult',
                transcript: '',
                isFinal: true,
                source: 'empty-audio',
                message: 'Empty audio buffer'
            }));
            return;
        }
        
        // Check minimum audio size
        if (fullAudioBuffer.length < 1000) {
            console.warn(`⚠️ Audio buffer too small: ${fullAudioBuffer.length} bytes`);
            ws.send(JSON.stringify({
                type: 'transcriptionResult',
                transcript: '',
                isFinal: true,
                source: 'audio-too-small',
                message: 'Audio too short for transcription'
            }));
            return;
        }
        
        console.log(`🎤 Processing ${fullAudioBuffer.length} bytes of audio for ${connection.email}`);
        
        // Check if Deepgram API key is available
        if (!process.env.DEEPGRAM_API_KEY) {
            console.warn('⚠️ Deepgram API key not found, using simulated transcription');
            
            // SIMULATED TRANSCRIPTION for testing
            setTimeout(() => {
                ws.send(JSON.stringify({
                    type: 'transcriptionResult',
                    transcript: `Test transcription ${Date.now()} - Please configure Deepgram API key for real transcription.`,
                    isFinal: true,
                    source: 'simulation'
                }));
            }, 1000);
            return;
        }
        
        console.log('🚀 Sending audio to Deepgram...');
        
        // Map language codes for Deepgram
        const deepgramLanguage = connection.language === 'fr' ? 'fr' :
                                connection.language === 'de' ? 'de' :
                                connection.language === 'es' ? 'es' :
                                connection.language === 'it' ? 'it' :
                                connection.language === 'pt' ? 'pt' : 'en';
        
        console.log(`🌍 Using Deepgram language: ${deepgramLanguage} (from user language: ${connection.language})`);
        
        // Import axios safely
        let axios;
        try {
            axios = require('axios');
        } catch (axiosError) {
            console.error('❌ Axios not available:', axiosError.message);
            throw new Error('HTTP client not available: ' + axiosError.message);
        }
        
        // Send to Deepgram's API with enhanced error handling
        try {
            const response = await axios.post(
                `https://api.deepgram.com/v1/listen?model=general&punctuate=true&language=${deepgramLanguage}`,
                fullAudioBuffer,
                {
                    headers: {
                        'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
                        'Content-Type': 'audio/webm'
                    },
                    timeout: 30000, // 30 second timeout
                    maxContentLength: 50 * 1024 * 1024, // 50MB max
                    maxBodyLength: 50 * 1024 * 1024
                }
            );
            
            console.log('✅ Deepgram response received');
            console.log('📊 Response status:', response.status);
            console.log('📋 Response data keys:', Object.keys(response.data || {}));
            
            // Safely extract transcript with detailed logging
            let transcript = '';
            
            try {
                if (response.data && 
                    response.data.results && 
                    response.data.results.channels && 
                    response.data.results.channels.length > 0 &&
                    response.data.results.channels[0].alternatives &&
                    response.data.results.channels[0].alternatives.length > 0) {
                    
                    transcript = response.data.results.channels[0].alternatives[0].transcript || '';
                    console.log('📝 Raw transcript from Deepgram:', JSON.stringify(transcript));
                } else {
                    console.warn('⚠️ Unexpected Deepgram response structure');
                    console.log('📄 Full response:', JSON.stringify(response.data, null, 2));
                }
            } catch (extractError) {
                console.error('❌ Error extracting transcript:', extractError.message);
                console.log('📄 Raw response data:', JSON.stringify(response.data, null, 2));
            }
            
            if (transcript && transcript.trim()) {
                console.log(`🎯 Sending transcription to client: "${transcript.trim()}"`);
                
                // Send back to desktop client
                ws.send(JSON.stringify({
                    type: 'transcriptionResult',
                    transcript: transcript.trim(),
                    isFinal: true,
                    source: 'deepgram',
                    language: deepgramLanguage
                }));
            } else {
                console.log('📭 Deepgram returned empty transcript');
                
                ws.send(JSON.stringify({
                    type: 'transcriptionResult',
                    transcript: '',
                    isFinal: true,
                    source: 'deepgram',
                    message: 'No speech detected in audio'
                }));
            }
            
        } catch (apiError) {
            console.error('❌ Deepgram API error:', apiError.message);
            console.error('📊 Error status:', apiError.response?.status);
            console.error('📋 Error data:', apiError.response?.data);
            
            // Provide more specific error messages
            let errorMessage = 'Transcription failed';
            if (apiError.response?.status === 401) {
                errorMessage = 'Invalid Deepgram API key';
            } else if (apiError.response?.status === 400) {
                errorMessage = 'Invalid audio format or data';
            } else if (apiError.code === 'ECONNABORTED') {
                errorMessage = 'Transcription timeout';
            } else if (apiError.code === 'ENOTFOUND') {
                errorMessage = 'Cannot connect to Deepgram service';
            }
            
            ws.send(JSON.stringify({
                type: 'error',
                message: errorMessage + ': ' + (apiError.response?.data?.error || apiError.message),
                source: 'deepgram-api',
                statusCode: apiError.response?.status
            }));
        }
        
    } catch (error) {
        console.error('❌ Audio processing error:', error.message);
        console.error('📊 Error stack:', error.stack);
        
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to process audio: ' + error.message,
            source: 'audio-processing'
        }));
    }
    break;
                
            case 'transcriptionChunk':
                // Legacy handler for web speech API (keeping for web client compatibility)
                if (!connection.authenticated) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Not authenticated'
                    }));
                    return;
                }
                
                // Echo back the transcript (web client handles its own transcription)
                const { transcript, isFinal } = data;
                
                ws.send(JSON.stringify({
                    type: 'transcriptionResult',
                    transcript,
                    isFinal
                }));
                break;
                
            case 'stopTranscription':
                // Handle stop transcription
                if (!connection.authenticated) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Not authenticated'
                    }));
                    return;
                }
                
                // If there are any remaining audio chunks, process them
                if (connection.audioChunks && connection.audioChunks.length > 0) {
                    // Trigger final audio processing
                    ws.emit('message', JSON.stringify({
                        type: 'audioComplete',
                        audio: '', // Empty final chunk
                        language: connection.language
                    }));
                }
                
                ws.send(JSON.stringify({
                    type: 'transcriptionStopped'
                }));
                break;
                
            case 'ping':
                ws.send(JSON.stringify({ type: 'pong' }));
                break;
                
            default:
                console.log(`Unknown message type: ${data.type}`);
                ws.send(JSON.stringify({
                    type: 'error',
                    message: `Unknown message type: ${data.type}`
                }));
        }
    } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Server error'
        }));
    }
});

// Keep the existing cleanup handler
process.on('SIGTERM', () => {
    wss.close(() => {
        console.log('WebSocket server closed');
    });
});


// Export only the app - remove the conflicting module.exports
module.exports = app;
});

// STEP 1: Sign up at https://deepgram.com (NO credit card)
// STEP 2: Get your API key
// STEP 3: Add to Render.com environment variables:
//         DEEPGRAM_API_KEY = your_api_key_here

// STEP 4: Add this to your server code:

const axios = require('axios');

// WebSocket connection handler
wss.on('connection', (ws, req) => {
    const connectionId = crypto.randomBytes(16).toString('hex');
    console.log(`New WebSocket connection: ${connectionId}`);
    
    // Store connection
    activeConnections.set(connectionId, {
        ws,
        authenticated: false,
        email: null,
        language: 'en',
        clientType: 'unknown', // 'web' or 'desktop'
        audioChunks: []
    });
    
    // Send connection acknowledgment
    ws.send(JSON.stringify({
        type: 'connection',
        connectionId,
        status: 'connected'
    }));
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            const connection = activeConnections.get(connectionId);
            
            switch (data.type) {
                case 'auth':
    // Authenticate both web and desktop clients
    const { email, activationCode, clientType } = data;  // ADD clientType HERE
    const user = await User.findOne({ 
        email: email.toLowerCase(),
        activationCode: activationCode
    });
    
    if (user && user.isActive) {
        // Update connection info
        connection.authenticated = true;
        connection.email = email.toLowerCase();
        connection.language = user.language || 'en';
        
        // USE EXPLICIT CLIENT TYPE OR FALLBACK TO DETECTION
        connection.clientType = clientType || 'web';  // Default to web if not specified
        
        console.log(`✅ Authenticated ${connection.clientType} client: ${email} (explicitly set: ${!!clientType})`);
        
        // Calculate days remaining
        const daysRemaining = user.daysUntilExpiration ? user.daysUntilExpiration() : 0;
        
        ws.send(JSON.stringify({
            type: 'auth',
            status: 'success',
            user: {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                daysRemaining: daysRemaining > 0 ? daysRemaining : 0
            },
            language: connection.language,
            clientType: connection.clientType
        }));
    } else {
        ws.send(JSON.stringify({
            type: 'auth',
            status: 'error',
            message: 'Invalid credentials or inactive account'
        }));
    }
    break;
                    
                case 'startTranscription':
                    if (!connection.authenticated) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Not authenticated'
                        }));
                        return;
                    }
                    
                    // Initialize audio chunks for desktop clients
                    if (connection.clientType === 'desktop') {
                        connection.audioChunks = [];
                        console.log(`Started transcription for desktop client: ${connection.email}`);
                    } else {
                        console.log(`Started transcription for web client: ${connection.email}`);
                    }
                    
                    ws.send(JSON.stringify({
                        type: 'transcriptionStarted',
                        clientType: connection.clientType
                    }));
                    break;
                    
                case 'audioChunk':
                    // Handle audio chunk from DESKTOP CLIENT ONLY
                    if (!connection.authenticated) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Not authenticated'
                        }));
                        return;
                    }
                    
                    if (connection.clientType !== 'desktop') {
                        console.log('Ignoring audio chunk from web client');
                        return;
                    }
                    
                    // Store audio chunks for desktop client
                    if (!connection.audioChunks) {
                        connection.audioChunks = [];
                    }
                    
                    // Decode base64 audio
                    const audioBuffer = Buffer.from(data.audio, 'base64');
                    connection.audioChunks.push(audioBuffer);
                    
                    console.log(`Received audio chunk from desktop client: ${audioBuffer.length} bytes`);
                    break;
                    
                case 'audioComplete':
                    // Process complete audio with Deepgram - DESKTOP CLIENT ONLY
                    if (!connection.authenticated || connection.clientType !== 'desktop') {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Not authenticated or invalid client type'
                        }));
                        return;
                    }
                    
                    try {
                        // Combine all audio chunks
                        let fullAudioBuffer;
                        if (connection.audioChunks && connection.audioChunks.length > 0) {
                            // Add the final chunk if provided
                            if (data.audio) {
                                const finalBuffer = Buffer.from(data.audio, 'base64');
                                connection.audioChunks.push(finalBuffer);
                            }
                            
                            // Combine all chunks
                            fullAudioBuffer = Buffer.concat(connection.audioChunks);
                            connection.audioChunks = []; // Clear chunks
                        } else if (data.audio) {
                            // Single audio blob
                            fullAudioBuffer = Buffer.from(data.audio, 'base64');
                        }
                        
                        console.log(`Processing complete audio for desktop client: ${fullAudioBuffer.length} bytes`);
                        
                        // Check if Deepgram API key is available
                        if (process.env.DEEPGRAM_API_KEY) {
                            console.log('Sending audio to Deepgram...');
                            
                            // Map language codes for Deepgram
                            const deepgramLanguage = connection.language === 'fr' ? 'fr' :
                                                    connection.language === 'de' ? 'de' :
                                                    connection.language === 'es' ? 'es' :
                                                    connection.language === 'it' ? 'it' :
                                                    connection.language === 'pt' ? 'pt' : 'en';
                            
                            // Send to Deepgram's API
                            const response = await axios.post(
                                `https://api.deepgram.com/v1/listen?model=general&punctuate=true&language=${deepgramLanguage}`,
                                fullAudioBuffer,
                                {
                                    headers: {
                                        'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
                                        'Content-Type': 'audio/webm'
                                    },
                                    timeout: 30000 // 30 second timeout
                                }
                            );
                            
                            // Get the transcription
                            const transcript = response.data.results?.channels?.[0]?.alternatives?.[0]?.transcript;
                            
                            if (transcript && transcript.trim()) {
                                // Send back to desktop client
                                ws.send(JSON.stringify({
                                    type: 'transcriptionResult',
                                    transcript: transcript.trim(),
                                    isFinal: true,
                                    source: 'deepgram'
                                }));
                                
                                console.log(`Deepgram transcription sent to desktop client: "${transcript}"`);
                            } else {
                                console.log('Deepgram returned empty transcript');
                                ws.send(JSON.stringify({
                                    type: 'transcriptionResult',
                                    transcript: '',
                                    isFinal: true,
                                    source: 'deepgram'
                                }));
                            }
                            
                        } else {
                            console.warn('⚠️ Deepgram API key not found, using simulated transcription');
                            
                            // SIMULATED TRANSCRIPTION for testing
                            setTimeout(() => {
                                ws.send(JSON.stringify({
                                    type: 'transcriptionResult',
                                    transcript: 'Test transcription - Please configure Deepgram API key for real transcription.',
                                    isFinal: true,
                                    source: 'simulation'
                                }));
                            }, 1000);
                        }
                        
                    } catch (error) {
                        console.error('Audio processing error:', error.response?.data || error.message);
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Transcription failed: ' + (error.response?.data?.error || error.message)
                        }));
                    }
                    break;
                    
                case 'transcriptionChunk':
                    // Handle transcription from WEB CLIENT (Web Speech API results)
                    if (!connection.authenticated) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Not authenticated'
                        }));
                        return;
                    }
                    
                    if (connection.clientType === 'desktop') {
                        console.log('Ignoring transcription chunk from desktop client');
                        return;
                    }
                    
                    // Echo back the transcript for web client (they handle their own speech recognition)
                    const { transcript, isFinal } = data;
                    
                    console.log(`Received transcription from web client: "${transcript}" (final: ${isFinal})`);
                    
                    ws.send(JSON.stringify({
                        type: 'transcriptionResult',
                        transcript,
                        isFinal,
                        source: 'web-speech-api'
                    }));
                    break;
                    
                case 'stopTranscription':
                    // Handle stop transcription for both client types
                    if (!connection.authenticated) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Not authenticated'
                        }));
                        return;
                    }
                    
                    // For desktop clients, process any remaining audio chunks
                    if (connection.clientType === 'desktop' && connection.audioChunks && connection.audioChunks.length > 0) {
                        console.log('Processing remaining audio chunks...');
                        // Trigger final audio processing
                        const combinedAudio = Buffer.concat(connection.audioChunks);
                        connection.audioChunks = [];
                        
                        // Process final audio if there's enough data
                        if (combinedAudio.length > 1000) { // Only if we have some audio data
                            // This would trigger the audioComplete handler above
                            ws.emit('message', JSON.stringify({
                                type: 'audioComplete',
                                audio: combinedAudio.toString('base64'),
                                language: connection.language
                            }));
                            return; // Don't send transcriptionStopped yet, wait for processing
                        }
                    }
                    
                    console.log(`Stopped transcription for ${connection.clientType} client: ${connection.email}`);
                    
                    ws.send(JSON.stringify({
                        type: 'transcriptionStopped',
                        clientType: connection.clientType
                    }));
                    break;
                    
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
                    
                default:
                    console.log(`Unknown message type from ${connection.clientType || 'unknown'} client: ${data.type}`);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: `Unknown message type: ${data.type}`
                    }));
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Server error: ' + error.message
            }));
        }
    });
    
    ws.on('close', () => {
        console.log(`WebSocket disconnected: ${connectionId}`);
        const connection = activeConnections.get(connectionId);
        if (connection) {
            console.log(`Disconnected ${connection.clientType || 'unknown'} client: ${connection.email || 'unknown'}`);
        }
        activeConnections.delete(connectionId);
    });
    
    ws.on('error', (error) => {
        console.error(`WebSocket error for ${connectionId}:`, error);
        activeConnections.delete(connectionId);
    });
});

// Log Deepgram API key status on startup
console.log('🎤 Deepgram API Key configured:', !!process.env.DEEPGRAM_API_KEY);
console.log('🌐 WebSocket server ready for both web and desktop clients');