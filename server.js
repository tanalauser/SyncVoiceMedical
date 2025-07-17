// Load environment variables
require('dotenv').config();



// TEMPORARY FIX - Force production mode
if (!process.env.NODE_ENV) {
    console.log('NODE_ENV not set, forcing to production');
    process.env.NODE_ENV = 'production';
}

// *** CRITICAL FIX: Never use localhost in production ***
// In server.js, update the BASE_URL logic
const BASE_URL = (function() {
    if (process.env.BASE_URL && !process.env.BASE_URL.includes('localhost')) {
        return process.env.BASE_URL;
    }
    // For Render deployment
    if (process.env.RENDER_EXTERNAL_URL) {
        return `https://${process.env.RENDER_EXTERNAL_URL}`;
    }
    // Default to your Render URL
    return 'https://syncvoicemedical.onrender.com';
})();

console.log('Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    BASE_URL_env: process.env.BASE_URL,
    BASE_URL_final: BASE_URL
});

console.log('🌐 Using BASE_URL:', BASE_URL);

const fs = require('fs');
const crypto = require('crypto');

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
                autoRenewal: otherData.autoRenewal
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
            updatedAt: new Date()
        };

        // Create or update user
        let user;
        // Check if email is in bypass list
        if (DEV_EMAILS.includes(email.toLowerCase())) {
            console.log('Processing dev email...');
            // For bypass emails, first check if user exists
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            
            if (existingUser) {
                console.log('Updating existing dev user...');
                // Update existing user
                Object.assign(existingUser, userData);
                user = await existingUser.save();
            } else {
                console.log('Creating new dev user...');
                // Create new user
                user = new User(userData);
                await user.save();
            }
        } else {
            console.log('Creating new user...');
            // Create new user
            user = new User(userData);
            await user.save();
        }

        // Verify user was created/updated successfully
        if (!user) {
            throw new Error('Failed to create or update user');
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
            updatedAt: new Date()
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

async function handleSuccessfulPayment(paymentIntent) {
    try {
        // CHECK DATABASE CONNECTION FIRST
        const dbState = checkMongoConnection();
        if (!dbState.isConnected) {
            console.error('Database not connected in handleSuccessfulPayment');
            return;
        }
        
        // Implement payment success logic
        console.log('Payment successful:', paymentIntent.id);
        
        // Find the user by metadata
        if (paymentIntent.metadata && paymentIntent.metadata.userId) {
            const user = await User.findById(paymentIntent.metadata.userId);
            
            if (user) {
                user.isPaid = true;
                user.isActive = true;
                user.paymentStatus = 'completed';
                user.lastPaymentDate = new Date();
                await user.save();
                console.log(`User ${user.email} marked as paid and active`);
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
        
        // Process successful invoice payment
        console.log('Invoice payment successful:', invoice.id);
        
        if (invoice.customer) {
            const user = await User.findOne({ stripeCustomerId: invoice.customer });
            
            if (user) {
                user.isPaid = true;
                user.isActive = true;
                user.paymentStatus = 'completed';
                user.lastPaymentDate = new Date();
                await user.save();
                console.log(`Invoice paid for user ${user.email}`);
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
        const { email, password } = req.body;
        
        // For testing purposes, accept any credentials
        // In production, you'd validate against a real user database
        if (email && password) {
            // Create a fake user ID for testing
            const testUserId = 'test-' + Date.now();
            
            res.json({
                success: true,
                message: 'Login successful',
                userId: testUserId,
                userEmail: email
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Email and password required'
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Test user details route - returns fake user data
app.get('/api/user-details/:email', async (req, res) => {
    try {
        const { email } = req.params;
        
        // Return fake user data for testing
        const fakeUser = {
            firstName: 'Test',
            lastName: 'User',
            email: email,
            company: 'Test Company',
            address: '123 Test Street',
            postalCode: '12345',
            city: 'Test City',
            country: 'France',
            activationCode: 'ABC123',
            validationStartDate: new Date(),
            validationEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            autoRenewal: false,
            version: 'free'
        };
        
        res.json({
            success: true,
            user: fakeUser
        });
    } catch (error) {
        console.error('User details error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
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

app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log('Environment variables:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('🔍 MongoDB Connection State:', checkMongoConnection());
});


// Export only the app - remove the conflicting module.exports
module.exports = app;