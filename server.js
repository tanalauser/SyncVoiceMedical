// Load environment variables
require('dotenv').config();

console.log('🔍 Deepgram Configuration Check:');
console.log('  - API Key:', process.env.DEEPGRAM_API_KEY ? '✅ Configured' : '❌ Missing');
console.log('  - Key length:', process.env.DEEPGRAM_API_KEY?.length || 0);
console.log('  - Key starts with:', process.env.DEEPGRAM_API_KEY?.substring(0, 10) + '...' || 'N/A');

// Import ALL required modules at the TOP
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');
const axios = require('axios');
const WebSocket = require('ws');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const winston = require('winston');

// Create logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

// Validate environment variables with Joi
const envSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production'),
    EMAIL_USER: Joi.string().email().required(),
    EMAIL_PASS: Joi.string().required(),
    APP_DB_USER: Joi.string().required(),
    APP_DB_PASS: Joi.string().required(),
    APP_DB_INSTANCE: Joi.string().required(),
    STRIPE_SECRET_KEY: Joi.string().required(),
    STRIPE_PRICE_ID: Joi.string().required(),
    STRIPE_WEBHOOK_SECRET: Joi.string().required(),
    DEEPGRAM_API_KEY: Joi.string().optional(),
    JWT_SECRET: Joi.string().required(),
    PORT: Joi.number().default(8080),
    BASE_URL: Joi.string().optional()
}).unknown();

const { error } = envSchema.validate(process.env);
if (error) {
    logger.error('Config validation error:', error.message);
    process.exit(1);
}

// Import Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// MongoDB connection function
const connectDB = async () => {
    try {
        const uri = `mongodb+srv://${process.env.APP_DB_USER}:${process.env.APP_DB_PASS}@${process.env.APP_DB_INSTANCE}.mongodb.net/?retryWrites=true&w=majority`;
        
        await mongoose.connect(uri, {
            maxPoolSize: 10,
            minPoolSize: 2,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 5000,
        });
        logger.info('MongoDB connected with pooling');
    } catch (error) {
        logger.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// Import models and routes
const User = require('./models/User');
const userRoutes = require('./routes/userRoutes');

// Constants
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB limit

// Your functions and configuration
function calculateValidationEndDate(version, startDate = new Date()) {
    const daysToAdd = version === 'free' ? 7 : 30;
    return new Date(startDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
}

// TEMPORARY FIX - Force production mode
if (!process.env.NODE_ENV) {
    logger.info('NODE_ENV not set, forcing to production');
    process.env.NODE_ENV = 'production';
}

// In server.js, update the BASE_URL logic
const BASE_URL = (() => {
    // Priority 1: Manual override (but not localhost in production)
    if (process.env.BASE_URL) {
        const isLocalhost = process.env.BASE_URL.includes('localhost') || 
                           process.env.BASE_URL.includes('127.0.0.1');
        const isDev = process.env.NODE_ENV === 'development';
        
        if (!isLocalhost || isDev) {
            return process.env.BASE_URL;
        }
    }
    
    // Priority 2: Render deployment URL
    if (process.env.RENDER_EXTERNAL_URL) {
        const renderUrl = process.env.RENDER_EXTERNAL_URL;
        // Add protocol if missing
        if (!renderUrl.match(/^https?:\/\//)) {
            return `https://${renderUrl}`;
        }
        return renderUrl;
    }
    
    // Priority 3: Development mode
    if (process.env.NODE_ENV === 'development') {
        return `http://localhost:${process.env.PORT || 8080}`;
    }
    
    // Priority 4: Production default
    return 'https://syncvoicemedical.onrender.com';
})();

logger.info('Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    RENDER_EXTERNAL_URL: process.env.RENDER_EXTERNAL_URL,
    BASE_URL_env: process.env.BASE_URL,
    BASE_URL_final: BASE_URL
});

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

// Create Express app instance
const app = express();

// CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      'https://syncvoicemedical.onrender.com',
      'https://syncvoicemedical.com',
      'https://www.syncvoicemedical.com'
    ]
  : ['http://localhost:3000', 'http://localhost:8080'];

// CORS middleware
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP'
});

app.use('/api/', apiLimiter);

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many authentication attempts'
});

app.use('/api/send-activation', authLimiter);
app.use('/api/login', authLimiter);
app.use('/api/forgot-password', authLimiter);

// Webhook route (must be before express.json())
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    // Enhanced debug logging
    logger.info('🔍 Webhook Debug:', {
        url: req.url,
        method: req.method,
        signature: sig ? 'present' : 'missing',
        bodyType: typeof req.body,
        bodyLength: req.body ? req.body.length : 0
    });

    try {
        if (!sig) {
            logger.error('❌ Webhook called without signature');
            return res.status(400).send('Webhook Error: No signature');
        }

        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
        
        logger.info(`✅ Webhook verified: ${event.type}`);
    } catch (err) {
        logger.error(`❌ Webhook signature verification failed:`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Respond immediately to Stripe
    res.status(200).json({received: true});

    // Process the event asynchronously AFTER responding
    try {
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handleSuccessfulPayment(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await handleFailedPayment(event.data.object);
                break;
            case 'invoice.payment_succeeded':
                await handleSuccessfulInvoice(event.data.object);
                break;
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                await handleSubscriptionChange(event.data.object);
                break;
            default:
                logger.info(`Unhandled event type: ${event.type}`);
        }
    } catch (error) {
        logger.error('Error processing webhook:', error);
    }
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
const publicDir = path.join(__dirname, 'public');
logger.info('Serving static files from:', publicDir);
app.use(express.static(publicDir));

// Pre-flight requests
app.options('*', cors());

// Security headers
app.use((req, res, next) => {
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
        "media-src 'self' blob: mediastream:; " +
        "object-src 'none'; " +
        "base-uri 'self';"
    );
    next();
});

// MongoDB settings
mongoose.set('bufferTimeoutMS', 20000);

// Connect to MongoDB
connectDB();

// MongoDB connection monitoring
mongoose.connection.on('connected', () => {
    logger.info('✅ MongoDB connected successfully');
    logger.info('📊 Database:', mongoose.connection.name);
});

mongoose.connection.on('error', (err) => {
    logger.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    logger.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
    logger.info('🔄 MongoDB reconnected');
});

// Helper function to check MongoDB connection
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

// Debug middleware - log all requests (development only)
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        logger.info(`${req.method} ${req.url}`, {
            headers: req.headers,
            body: req.body
        });
        next();
    });
}

// Serve terms files
const termsDir = path.join(__dirname, 'terms');
app.use('/terms', express.static(termsDir));

// Email transporter
async function createTransporter() {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        
        await transporter.verify();
        logger.info('✅ Email transporter verified successfully');
        return transporter;
        
    } catch (error) {
        logger.error('❌ Error creating transporter:', error.message);
        throw new Error(`Email service configuration error: ${error.message}`);
    }
}

// Helper functions
function getExpiryDate() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
}

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

// API Error class
class ApiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

// Routes
app.use('/api', userRoutes);

// Health endpoints
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
        logger.error('Status check error:', error);
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

// Password reset request route
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.json({
                success: true,
                message: 'If this email exists, you will receive a password reset link.'
            });
        }
        
        if (user.version !== 'paid' || !user.password) {
            return res.json({
                success: false,
                message: 'Password reset is only available for paid accounts with existing passwords.'
            });
        }
        
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.passwordResetToken = resetToken;
        user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000);
        
        await user.save();
        
        const resetLink = `${BASE_URL}/reset-password.html?token=${resetToken}&email=${encodeURIComponent(email)}`;
        
        const lang = user.language || 'en';
        const emailSubject = {
            fr: 'SyncVoice Medical - Réinitialisation du mot de passe',
            en: 'SyncVoice Medical - Password Reset',
            de: 'SyncVoice Medical - Passwort zurücksetzen',
            es: 'SyncVoice Medical - Restablecer contraseña',
            it: 'SyncVoice Medical - Ripristino password',
            pt: 'SyncVoice Medical - Redefinir senha'
        };
        
        const emailBody = {
            fr: `
                <h2>Réinitialisation de votre mot de passe</h2>
                <p>Bonjour ${user.firstName},</p>
                <p>Vous avez demandé la réinitialisation de votre mot de passe pour SyncVoice Medical.</p>
                <p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
                <p><a href="${resetLink}" style="background: #296396; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Réinitialiser mon mot de passe</a></p>
                <p>Ce lien expire dans 1 heure.</p>
                <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
                <br>
                <p>L'équipe SyncVoice Medical</p>
            `,
            en: `
                <h2>Reset Your Password</h2>
                <p>Hello ${user.firstName},</p>
                <p>You have requested to reset your password for SyncVoice Medical.</p>
                <p>Click the link below to create a new password:</p>
                <p><a href="${resetLink}" style="background: #296396; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset My Password</a></p>
                <p>This link expires in 1 hour.</p>
                <p>If you didn't request this reset, please ignore this email.</p>
                <br>
                <p>The SyncVoice Medical Team</p>
            `,
            de: `
                <h2>Passwort zurücksetzen</h2>
                <p>Hallo ${user.firstName},</p>
                <p>Sie haben die Zurücksetzung Ihres Passworts für SyncVoice Medical angefordert.</p>
                <p>Klicken Sie auf den untenstehenden Link, um ein neues Passwort zu erstellen:</p>
                <p><a href="${resetLink}" style="background: #296396; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Mein Passwort zurücksetzen</a></p>
                <p>Dieser Link läuft in 1 Stunde ab.</p>
                <p>Falls Sie diese Zurücksetzung nicht angefordert haben, ignorieren Sie diese E-Mail.</p>
                <br>
                <p>Das SyncVoice Medical Team</p>
            `,
            es: `
                <h2>Restablecer su contraseña</h2>
                <p>Hola ${user.firstName},</p>
                <p>Ha solicitado restablecer su contraseña para SyncVoice Medical.</p>
                <p>Haga clic en el enlace de abajo para crear una nueva contraseña:</p>
                <p><a href="${resetLink}" style="background: #296396; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Restablecer mi contraseña</a></p>
                <p>Este enlace expira en 1 hora.</p>
                <p>Si no solicitó este restablecimiento, ignore este correo.</p>
                <br>
                <p>El equipo de SyncVoice Medical</p>
            `,
            it: `
                <h2>Ripristina la tua password</h2>
                <p>Ciao ${user.firstName},</p>
                <p>Hai richiesto di ripristinare la tua password per SyncVoice Medical.</p>
                <p>Clicca sul link qui sotto per creare una nuova password:</p>
                <p><a href="${resetLink}" style="background: #296396; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ripristina la mia password</a></p>
                <p>Questo link scade tra 1 ora.</p>
                <p>Se non hai richiesto questo ripristino, ignora questa email.</p>
                <br>
                <p>Il team di SyncVoice Medical</p>
            `,
            pt: `
                <h2>Redefinir sua senha</h2>
                <p>Olá ${user.firstName},</p>
                <p>Você solicitou a redefinição de sua senha para o SyncVoice Medical.</p>
                <p>Clique no link abaixo para criar uma nova senha:</p>
                <p><a href="${resetLink}" style="background: #296396; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Redefinir minha senha</a></p>
                <p>Este link expira em 1 hora.</p>
                <p>Se você não solicitou esta redefinição, ignore este email.</p>
                <br>
                <p>A equipe SyncVoice Medical</p>
            `
        };
        
        const transporter = await createTransporter();
        
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: emailSubject[lang] || emailSubject.en,
            html: emailBody[lang] || emailBody.en
        });
        
        res.json({
            success: true,
            message: 'Password reset link sent to your email.'
        });
        
    } catch (error) {
        logger.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.'
        });
    }
});

// Password reset route
app.post('/api/reset-password', async (req, res) => {
    try {
        const { token, email, newPassword } = req.body;
        
        if (!token || !email || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields.'
            });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long.'
            });
        }
        
        const user = await User.findOne({
            email: email.toLowerCase(),
            passwordResetToken: token,
            passwordResetExpiry: { $gt: new Date() }
        });
        
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token.'
            });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        user.password = hashedPassword;
        user.passwordResetToken = null;
        user.passwordResetExpiry = null;
        
        await user.save();
        
        res.json({
            success: true,
            message: 'Password reset successful. You can now login with your new password.'
        });
        
    } catch (error) {
        logger.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.'
        });
    }
});

app.get('/reset-password.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reset-password.html'));
});

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
        deploymentTest: 'PRODUCTION_URL_FIX_v3',
        isProduction: !BASE_URL.includes('localhost'),
        host: req.get('host'),
        protocol: req.protocol
    });
});

// Check if email exists for trial
app.post('/api/check-email', async (req, res) => {
    try {
        const dbState = checkMongoConnection();
        if (!dbState.isConnected) {
            return res.status(503).json({
                success: false,
                message: 'Database connection unavailable',
                details: dbState
            });
        }
        
        const { email } = req.body;
        
        if (DEV_EMAILS.includes(email.toLowerCase())) {
            return res.json({ success: true });
        }
        
        const existingUser = await User.findOne({ 
            email: email.toLowerCase(),
            version: 'free'
        });
        
        if (existingUser) {
            const trialStartDate = existingUser.createdAt || existingUser.updatedAt;
            const daysSinceStart = Math.floor((new Date() - new Date(trialStartDate)) / (1000 * 60 * 60 * 24));
            
            if (daysSinceStart < 7) {
                return res.json({ 
                    success: true, 
                    withinTrial: true,
                    daysRemaining: 7 - daysSinceStart,
                    message: `You have ${7 - daysSinceStart} days remaining in your trial`
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Your 7-day trial has expired. Please purchase a subscription to continue.'
                });
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        logger.error('Error in check-email:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            details: error.message
        });
    }
});

// Hash password helper
async function hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
}

// Send activation code
app.post('/api/send-activation', async (req, res) => {
    logger.info('=== SEND-ACTIVATION ROUTE CALLED ===');
    
    const dbState = checkMongoConnection();
    if (!dbState.isConnected) {
        return res.status(503).json({
            success: false,
            message: 'Database connection unavailable. Please try again later.',
            details: dbState
        });
    }

    try {
        const { email, firstName, lastName, version, language, termsAccepted, ...otherData } = req.body;
        const t = messages[language] || messages.en;
        
        // Handle paid version
        if (version === 'paid') {
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
                validationStartDate: new Date(),
                validationEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                downloadIntent: otherData.downloadIntent || false
            };

            let user = await User.findOne({ email: email.toLowerCase() });
            if (user) {
                Object.assign(user, userData);
            } else {
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
            
            await user.save();

            const currency = otherData.currency || 'eur';
            const amount = otherData.amount || 2500;

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: currency.toLowerCase(),
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
            if (!DEV_EMAILS.includes(email.toLowerCase())) {
                const existingUser = await User.findOne({ 
                    email: email.toLowerCase(),
                    version: 'free'
                });
                
                if (existingUser) {
                    const trialStartDate = existingUser.createdAt || existingUser.updatedAt;
                    const daysSinceStart = Math.floor((new Date() - new Date(trialStartDate)) / (1000 * 60 * 60 * 24));
                    
                    if (daysSinceStart < 7) {
                        const activationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
                        const expiryDate = getExpiryDate();
                        
                        existingUser.activationCode = activationCode;
                        existingUser.activationCodeExpiry = expiryDate;
                        existingUser.firstName = firstName;
                        existingUser.lastName = lastName;
                        existingUser.language = language;
                        existingUser.termsAccepted = termsAccepted;
                        existingUser.updatedAt = new Date();
                        
                        await existingUser.save();
                        
                        let activationLink = `${BASE_URL}/api/activate/${activationCode}?email=${encodeURIComponent(email)}&lang=${language}`;
                        
                        if (activationLink.includes('localhost') || activationLink.includes('127.0.0.1')) {
                            activationLink = `${BASE_URL}/api/activate/${activationCode}?email=${encodeURIComponent(email)}&lang=${language}`;
                        }
                        
                        const transporter = await createTransporter();
                        
                        const mailOptions = {
                            from: `SyncVoice Medical <${process.env.EMAIL_USER}>`,
                            to: existingUser.email,
                            subject: t.subject,
                            html: createActivationEmailHTML(existingUser, activationLink, existingUser.language || lang, existingUser.downloadIntent || false)
                        };
                        
                        await transporter.sendMail(mailOptions);
                        
                        return res.json({
                            success: true,
                            message: t.success,
                            userId: existingUser._id.toString(),
                            daysRemaining: 7 - daysSinceStart
                        });
                    } else {
                        return res.status(400).json({
                            success: false,
                            message: 'Your 7-day trial has expired. Please purchase a subscription to continue.'
                        });
                    }
                }
            }
        }

        // Generate activation code for new users
        const activationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        const expiryDate = getExpiryDate();

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

        if (otherData.password) {
            userData.password = await hashPassword(otherData.password);
        }

        let user;

        if (DEV_EMAILS.includes(email.toLowerCase())) {
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            
            if (existingUser) {
                existingUser.activationCode = activationCode;
                existingUser.activationCodeExpiry = expiryDate;
                existingUser.firstName = firstName;
                existingUser.lastName = lastName;
                existingUser.language = language;
                existingUser.termsAccepted = termsAccepted;
                existingUser.updatedAt = new Date();
                
                if (otherData.password) {
                    existingUser.password = await hashPassword(otherData.password);
                }
                
                if (!existingUser.validationStartDate) {
                    existingUser.validationStartDate = existingUser.createdAt || new Date();
                }
                if (!existingUser.validationEndDate) {
                    existingUser.validationEndDate = expiryDate;
                }
                
                await existingUser.save();
                user = existingUser;
            } else {
                user = new User(userData);
                await user.save();
            }
        } else {
            user = new User(userData);
            await user.save();
        }

        let activationLink = `${BASE_URL}/api/activate/${activationCode}?email=${encodeURIComponent(email)}&lang=${language}`;

        if (activationLink.includes('localhost') || activationLink.includes('127.0.0.1')) {
            activationLink = `https://www.syncvoicemedical.com/api/activate/${activationCode}?email=${encodeURIComponent(email)}&lang=${language}`;
        }

        const transporter = await createTransporter();
        
        const mailOptions = {
            from: `SyncVoice Medical <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: t.subject,
            html: createActivationEmailHTML(user, activationLink, user.language || lang, user.downloadIntent || false)
        };

        await transporter.sendMail(mailOptions);
        
        res.json({
            success: true,
            message: t.success,
            userId: user._id.toString()
        });

    } catch (error) {
        logger.error('Comprehensive error in /api/send-activation:', error);
        
        if (error.message.includes('buffering timed out')) {
            const dbState = checkMongoConnection();
            return res.status(503).json({
                success: false,
                message: 'Database connection timeout. Please check your MongoDB connection.',
                details: {
                    error: error.message,
                    dbState: dbState
                }
            });
        }
        
        if (error.message.includes('invalid_grant') || error.message.includes('credentials_required')) {
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

// Handle activation
app.get('/api/activate/:code', async (req, res) => {
    try {
        const dbState = checkMongoConnection();
        if (!dbState.isConnected) {
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

        user.isActive = true;
        user.lastLoginAt = new Date();
        user.loginCount = 1;
        await user.save();

        res.redirect(`/appForm.html?code=${code}&email=${encodeURIComponent(email)}&lang=${lang}`);

    } catch (error) {
        logger.error('Error in activation:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Payment routes
app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const { email, name, amount, currency } = req.body;
        
        if (!email || !name || !amount) {
            return res.status(400).json({ 
                error: 'Missing required parameters',
                receivedData: req.body 
            });
        }

        const paymentCurrency = currency || 'eur';
        
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: paymentCurrency.toLowerCase(),
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                email: email,
                name: name
            },
            description: 'SyncVoice Medical - Monthly Subscription'
        });

        res.json({ 
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        logger.error('Detailed error creating payment intent:', error);
        res.status(500).json({ 
            error: 'Failed to create payment intent',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Login route
app.post('/api/login', async (req, res) => {
    try {
        const dbState = checkMongoConnection();
        if (!dbState.isConnected) {
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

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        if (!user.password) {
            return res.status(401).json({
                success: false,
                message: 'Please complete your account setup. Contact support if needed.'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account not activated. Please check your email for activation instructions.'
            });
        }

        if (user.isSubscriptionExpired()) {
            return res.status(401).json({
                success: false,
                message: 'Your subscription has expired. Please renew to continue.'
            });
        }

        user.loginCount = (user.loginCount || 0) + 1;
        user.lastLoginAt = new Date();
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token: token,
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
        logger.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

// Webhook handlers
async function handleSuccessfulPayment(paymentIntent) {
    try {
        const dbState = checkMongoConnection();
        if (!dbState.isConnected) {
            logger.error('Database not connected in handleSuccessfulPayment');
            return;
        }
        
        logger.info('Payment successful:', paymentIntent.id);
        
        if (paymentIntent.metadata && paymentIntent.metadata.userId) {
            const user = await User.findById(paymentIntent.metadata.userId);
            
            if (user) {
                if (!user.activationCode) {
                    user.activationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
                    user.activationCodeExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                }
                
                user.isPaid = true;
                user.isActive = true;
                user.paymentStatus = 'completed';
                user.lastPaymentDate = new Date();
                user.validationStartDate = new Date();
                user.validationEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                
                await user.save();
                logger.info(`User ${user.email} marked as paid and active`);
                
                const lang = user.language || 'en';
                const t = messages[lang] || messages.en;
                
                try {
                    let activationLink = `${BASE_URL}/api/activate/${user.activationCode}?email=${encodeURIComponent(user.email)}&lang=${lang}`;
                    
                    if (activationLink.includes('localhost') || activationLink.includes('127.0.0.1')) {
                        activationLink = `https://syncvoicemedical.onrender.com/api/activate/${user.activationCode}?email=${encodeURIComponent(user.email)}&lang=${lang}`;
                    }
                    
                    const transporter = await createTransporter();
                    
                    const mailOptions = {
                        from: `SyncVoice Medical <${process.env.EMAIL_USER}>`,
                        to: user.email,
                        subject: t.subject,
                        html: createActivationEmailHTML(user, activationLink, user.language || lang, user.downloadIntent || false)
                    };
                    
                    await transporter.sendMail(mailOptions);
                    logger.info('Activation email sent successfully to:', user.email);
                    
                } catch (emailError) {
                    logger.error('Error sending activation email:', emailError);
                }
            }
        }
    } catch (error) {
        logger.error('Error handling successful payment:', error);
    }
}

async function handleFailedPayment(failedPayment) {
    try {
        const dbState = checkMongoConnection();
        if (!dbState.isConnected) {
            logger.error('Database not connected in handleFailedPayment');
            return;
        }
        
        logger.error('Payment failed:', failedPayment.id);
        
        if (failedPayment.metadata && failedPayment.metadata.userId) {
            const user = await User.findById(failedPayment.metadata.userId);
            
            if (user) {
                user.paymentStatus = 'failed';
                await user.save();
                logger.info(`Payment failed for user ${user.email}`);
            }
        }
    } catch (error) {
        logger.error('Error handling failed payment:', error);
    }
}

async function handleSuccessfulInvoice(invoice) {
    try {
        const dbState = checkMongoConnection();
        if (!dbState.isConnected) {
            logger.error('Database not connected in handleSuccessfulInvoice');
            return;
        }
        
        logger.info('Invoice payment successful:', invoice.id);
        
        if (invoice.customer) {
            const user = await User.findOne({ stripeCustomerId: invoice.customer });
            
            if (user) {
                if (!user.activationCode) {
                    user.activationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
                    user.activationCodeExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                }
                
                user.isPaid = true;
                user.isActive = true;
                user.paymentStatus = 'completed';
                user.lastPaymentDate = new Date();
                user.validationStartDate = new Date();
                user.validationEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                
                await user.save();
                logger.info(`Invoice paid for user ${user.email}`);
                
                const lang = user.language || 'en';
                const t = messages[lang] || messages.en;
                
                try {
                    let activationLink = `${BASE_URL}/api/activate/${user.activationCode}?email=${encodeURIComponent(user.email)}&lang=${lang}`;
                    
                    if (activationLink.includes('localhost') || activationLink.includes('127.0.0.1')) {
                        activationLink = `https://syncvoicemedical.onrender.com/api/activate/${user.activationCode}?email=${encodeURIComponent(user.email)}&lang=${lang}`;
                    }
                    
                    const transporter = await createTransporter();
                    
                    const mailOptions = {
                        from: `SyncVoice Medical <${process.env.EMAIL_USER}>`,
                        to: user.email,
                        subject: t.subject,
                        html: createActivationEmailHTML(user, activationLink, user.language || lang, user.downloadIntent || false)
                    };
                    
                    await transporter.sendMail(mailOptions);
                    logger.info('Activation email sent successfully to:', user.email);
                    
                } catch (emailError) {
                    logger.error('Error sending activation email:', emailError);
                }
            }
        }
    } catch (error) {
        logger.error('Error handling successful invoice:', error);
    }
}

async function handleSubscriptionChange(subscription) {
    try {
        const dbState = checkMongoConnection();
        if (!dbState.isConnected) {
            logger.error('Database not connected in handleSubscriptionChange');
            return;
        }
        
        logger.info('Subscription changed:', subscription.id);
        
        if (subscription.customer) {
            const user = await User.findOne({ stripeCustomerId: subscription.customer });
            
            if (user) {
                user.subscriptionStatus = subscription.status;
                
                if (subscription.status === 'active') {
                    user.isPaid = true;
                    user.isActive = true;
                } else if (subscription.status === 'canceled') {
                    user.autoRenewal = false;
                }
                
                await user.save();
                logger.info(`Subscription updated for user ${user.email} to ${subscription.status}`);
            }
        }
    } catch (error) {
        logger.error('Error handling subscription change:', error);
    }
}

// Email template
const createActivationEmailHTML = (user, activationLink, lang, downloadIntent = false) => {
    const t = messages[lang] || messages.fr;
    
    const downloadSection = downloadIntent ? `
        <div style="background: linear-gradient(135deg, #e3f2fd, #bbdefb); border: 1px solid #2196F3; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <h3 style="color: #1565C0; margin-top: 0;">📥 ${lang === 'fr' ? 'Téléchargez votre application desktop' : 'Download your desktop application'}</h3>
            <p style="color: #1565C0; margin-bottom: 15px;">
                ${lang === 'fr' 
                    ? 'Votre application SyncVoice Medical pour Windows est prête à être téléchargée.'
                    : 'Your SyncVoice Medical application for Windows is ready to download.'
                }
            </p>
            <a href="${BASE_URL}/api/download-desktop?lang=${lang}&email=${encodeURIComponent(user.email)}&code=${user.activationCode}&source=email"
               style="display: inline-block; background-color: #296396; color: white; text-decoration: none; padding: 15px 25px; border-radius: 5px; font-weight: bold; margin: 10px 0;">
                ${lang === 'fr' ? '⬇️ Télécharger pour Windows' : '⬇️ Download for Windows'}
            </a>
            <p style="color: #666; font-size: 12px; margin-bottom: 0;">
                ${lang === 'fr' 
                    ? 'Système requis: Windows 10 ou supérieur'
                    : 'System requirements: Windows 10 or higher'
                }
            </p>
        </div>
    ` : '';
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #296396, #69B578); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">SyncVoice Medical</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
                    ${lang === 'fr' ? 'Transcription Médicale Intelligente' : 'Intelligent Medical Transcription'}
                </p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
                <p style="margin: 0 0 20px 0; font-size: 24px; color: #333333;">
                    ${t.greeting} ${user.firstName} ${user.lastName},
                </p>
                
                <p style="margin: 20px 0; color: #666666; line-height: 1.6;">
                    ${t.thankyou}<br>
                    ${t.clickToActivate}
                </p>
                
                <!-- Activation Button -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${activationLink}"
                       style="display: inline-block; background-color: #69B578; color: white; text-decoration: none; padding: 20px 30px; border-radius: 8px; font-family: monospace; font-size: 24px; font-weight: bold; box-shadow: 0 4px 12px rgba(105, 181, 120, 0.3);">
                        ${user.activationCode}
                    </a>
                </div>
                
                <!-- Download Section (if download intent) -->
                ${downloadSection}
                
                <!-- Instructions -->
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #296396; margin-top: 0;">
                        ${lang === 'fr' ? '🚀 Comment commencer:' : '🚀 How to get started:'}
                    </h3>
                    <ol style="color: #666; line-height: 1.6; margin: 0; padding-left: 20px;">
                        <li>${lang === 'fr' ? 'Cliquez sur le code d\'activation ci-dessus' : 'Click on the activation code above'}</li>
                        ${downloadIntent ? `<li>${lang === 'fr' ? 'Téléchargez et installez l\'application desktop' : 'Download and install the desktop application'}</li>` : ''}
                        <li>${lang === 'fr' ? 'Entrez vos identifiants dans l\'application' : 'Enter your credentials in the application'}</li>
                        <li>${lang === 'fr' ? 'Commencez à transcrire!' : 'Start transcribing!'}</li>
                    </ol>
                </div>
                
                <!-- Support -->
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #856404;">
                        <strong>${lang === 'fr' ? '💡 Besoin d\'aide?' : '💡 Need help?'}</strong><br>
                        ${lang === 'fr' 
                            ? 'Contactez notre support: support@syncvoicemedical.com'
                            : 'Contact our support: support@syncvoicemedical.com'
                        }
                    </p>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                <p style="margin: 0; color: #666; font-size: 14px;">
                    © 2025 SyncVoice Medical. ${lang === 'fr' ? 'Tous droits réservés.' : 'All rights reserved.'}
                </p>
                <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">
                    ${lang === 'fr' 
                        ? 'Cet email a été envoyé car vous vous êtes inscrit sur SyncVoice Medical.'
                        : 'This email was sent because you signed up for SyncVoice Medical.'
                    }
                </p>
            </div>
        </div>
    </body>
    </html>`;
};

// Version endpoint
app.get('/api/version', (req, res) => {
    res.json({
        version: '1.0.3',
        deployedAt: new Date().toISOString(),
        hasGenerateFunction: true,
        baseUrlFix: true,
        currentBaseUrl: BASE_URL,
        message: 'SyncVoiceMedical API v1.0.3 - Production Ready'
    });
});

// User details route
app.get('/api/user-details/:email', async (req, res) => {
    try {
        const dbState = checkMongoConnection();
        if (!dbState.isConnected) {
            return res.status(503).json({
                success: false,
                message: 'Database connection unavailable'
            });
        }

        const { email } = req.params;
        
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

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
        logger.error('Error fetching user details:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Deepgram test endpoint
app.get('/api/test-deepgram', async (req, res) => {
    try {
        if (!process.env.DEEPGRAM_API_KEY) {
            return res.json({
                success: false,
                message: 'Deepgram API key not configured',
                hasApiKey: false,
                instructions: 'Add DEEPGRAM_API_KEY environment variable in Render.com'
            });
        }
        
        const apiKey = process.env.DEEPGRAM_API_KEY;
        
        try {
            const response = await axios.get('https://api.deepgram.com/v1/projects', {
                headers: {
                    'Authorization': `Token ${apiKey}`,
                },
                timeout: 10000
            });
            
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
        logger.error('❌ Deepgram test error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error testing Deepgram',
            error: error.message
        });
    }
});

// Desktop download endpoint
app.get('/api/download-desktop', async (req, res) => {
    try {
        const { lang, email, code, source } = req.query;
        
        logger.info('Desktop download request:', { lang, email, code, source });
        
        if (email && code) {
            const user = await User.findOne({ 
                email: email.toLowerCase(),
                activationCode: code
            });
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials. Please register first.'
                });
            }
        }
        
        const downloadUrl = 'https://github.com/syncvoicemedical/desktop-client/releases/latest/download/SyncVoiceMedical-Setup.exe';
        res.redirect(downloadUrl);
        
    } catch (error) {
        logger.error('Desktop download error:', error);
        res.status(500).json({
            success: false,
            message: 'Download service temporarily unavailable. Please try again later.'
        });
    }
});

// Keep alive ping (for free tier hosting)
if (process.env.NODE_ENV === 'production') {
    setInterval(() => {
        axios.get(`${BASE_URL}/health`)
            .then(() => logger.info('Keep-alive ping successful'))
            .catch(err => logger.error('Keep-alive ping failed:', err.message));
    }, 14 * 60 * 1000); // Every 14 minutes
}

// Catch unmatched API routes
app.use('/api/*', (req, res) => {
    logger.warn(`API route not found: ${req.method} ${req.url}`);
    res.status(404).json({
        success: false,
        message: `API endpoint not found: ${req.method} ${req.url}`,
        timestamp: new Date().toISOString()
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled Error:', err);
    
    const statusCode = err.statusCode || err.status || 500;
    
    res.status(statusCode).json({
        success: false,
        error: {
            message: err.message || 'An unexpected error occurred',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
});

// Server configuration
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
    logger.info(`Server running on http://${HOST}:${PORT}`);
    logger.info('Environment:', process.env.NODE_ENV);
    logger.info('MongoDB Connection State:', checkMongoConnection());
    logger.info('WebSocket server is ready on the same port');
});

// WebSocket server setup
const wss = new WebSocket.Server({ server });

// WebSocket helpers
function mapLanguageForDeepgram(clientLanguage) {
    const languageMap = {
        'fr': 'fr',
        'en': 'en',
        'de': 'de',
        'es': 'es',
        'it': 'it',
        'pt': 'pt'
    };
    
    const mappedLanguage = languageMap[clientLanguage] || 'en';
    logger.info(`Language mapping: ${clientLanguage} → ${mappedLanguage}`);
    return mappedLanguage;
}

// Store active WebSocket connections
const activeConnections = new Map();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
    const connectionId = crypto.randomBytes(16).toString('hex');
    logger.info(`New WebSocket connection: ${connectionId}`);
    
    activeConnections.set(connectionId, {
        ws,
        authenticated: false,
        email: null,
        language: 'en',
        clientType: 'unknown',
        audioChunks: []
    });
    
    ws.send(JSON.stringify({
        type: 'connection',
        connectionId,
        status: 'connected'
    }));
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            const connection = activeConnections.get(connectionId);
            
            logger.info(`Message from ${connectionId}: ${data.type}`);
            
            switch (data.type) {
                case 'auth':
                    const { email, activationCode, clientType } = data;
                    const user = await User.findOne({ 
                        email: email.toLowerCase(),
                        activationCode: activationCode
                    });
                    
                    if (user && user.isActive) {
                        connection.authenticated = true;
                        connection.email = email.toLowerCase();
                        connection.language = user.language || 'en';
                        connection.clientType = clientType || 'desktop';
                        
                        let daysRemaining = 0;
                        try {
                            if (user.daysUntilExpiration && typeof user.daysUntilExpiration === 'function') {
                                daysRemaining = user.daysUntilExpiration();
                            } else if (user.validationEndDate) {
                                const now = new Date();
                                const endDate = new Date(user.validationEndDate);
                                daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
                            }
                        } catch (dateError) {
                            logger.warn('Error calculating days remaining:', dateError.message);
                            daysRemaining = 0;
                        }
                        
                        ws.send(JSON.stringify({
                            type: 'auth',
                            status: 'success',
                            user: {
                                firstName: user.firstName,
                                lastName: user.lastName,
                                email: user.email,
                                daysRemaining: daysRemaining
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

                case 'updateLanguage':
                    if (!connection.authenticated) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Not authenticated'
                        }));
                        return;
                    }
                    
                    const { language } = data;
                    if (language && ['fr', 'en', 'de', 'es', 'it', 'pt'].includes(language)) {
                        connection.language = language;
                        ws.send(JSON.stringify({
                            type: 'languageUpdated',
                            language: language
                        }));
                    } else {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Invalid language specified'
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
                    
                    const transcriptionLanguage = data.language || connection.language || 'en';
                    
                    if (['fr', 'en', 'de', 'es', 'it', 'pt'].includes(transcriptionLanguage)) {
                        if (connection.language !== transcriptionLanguage) {
                            connection.language = transcriptionLanguage;
                        }
                    }
                    
                    connection.audioChunks = [];
                    
                    ws.send(JSON.stringify({
                        type: 'transcriptionStarted',
                        clientType: connection.clientType,
                        language: connection.language
                    }));
                    break;
                    
                case 'audioChunk':
                    if (!connection.authenticated) {
                        return;
                    }
                    
                    const totalSize = connection.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
                    if (totalSize > MAX_AUDIO_SIZE) {
                        connection.audioChunks = [];
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Audio size limit exceeded'
                        }));
                        return;
                    }
                    
                    if (data.audio && typeof data.audio === 'string') {
                        const chunkBuffer = Buffer.from(data.audio, 'base64');
                        connection.audioChunks.push(chunkBuffer);
                    }
                    
                    ws.send(JSON.stringify({
                        type: 'audioChunkReceived',
                        chunkIndex: connection.audioChunks.length - 1,
                        totalSize: connection.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0)
                    }));
                    break;
                    
                case 'audioComplete':
                    if (!connection.authenticated) {
                        return;
                    }
                    
                    if (data.language && ['fr', 'en', 'de', 'es', 'it', 'pt'].includes(data.language)) {
                        connection.language = data.language;
                    }
                    
                    try {
                        let audioBuffer = null;
                        
                        if (data.audio && typeof data.audio === 'string') {
                            audioBuffer = Buffer.from(data.audio, 'base64');
                        } else {
                            ws.send(JSON.stringify({
                                type: 'transcriptionError',
                                message: 'No audio data provided'
                            }));
                            return;
                        }
                        
                        if (!audioBuffer || audioBuffer.length < 100) {
                            ws.send(JSON.stringify({
                                type: 'transcriptionResult',
                                transcript: '',
                                isFinal: true,
                                message: 'Audio too short or empty'
                            }));
                            return;
                        }
                        
                        if (!process.env.DEEPGRAM_API_KEY) {
                            setTimeout(() => {
                                ws.send(JSON.stringify({
                                    type: 'transcriptionResult',
                                    transcript: `Test transcription from ${connection.language} at ${new Date().toLocaleTimeString()}`,
                                    isFinal: true,
                                    source: 'test'
                                }));
                            }, 1000);
                            return;
                        }
                        
                        const deepgramLanguage = mapLanguageForDeepgram(connection.language);
                        
                        let contentType = 'audio/wav';
                        let deepgramParams = `model=general&punctuate=true&smart_format=true&language=${deepgramLanguage}`;
                        
                        if (data.mimeType) {
                            if (data.mimeType.includes('webm')) {
                                contentType = 'audio/webm';
                            } else if (data.mimeType.includes('wav')) {
                                contentType = 'audio/wav';
                                deepgramParams += '&encoding=linear16&sample_rate=16000&channels=1';
                            } else if (data.mimeType.includes('mp3')) {
                                contentType = 'audio/mp3';
                            } else if (data.mimeType.includes('ogg')) {
                                contentType = 'audio/ogg';
                            }
                        }
                        
                        const deepgramUrl = `https://api.deepgram.com/v1/listen?${deepgramParams}`;
                        
                        const response = await axios.post(deepgramUrl, audioBuffer, {
                            headers: {
                                'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
                                'Content-Type': contentType
                            },
                            timeout: 30000,
                            maxContentLength: 50 * 1024 * 1024,
                            maxBodyLength: 50 * 1024 * 1024
                        });
                        
                        let transcript = '';
                        try {
                            const results = response.data?.results;
                            if (results && results.channels && results.channels[0] && 
                                results.channels[0].alternatives && results.channels[0].alternatives[0]) {
                                transcript = results.channels[0].alternatives[0].transcript || '';
                            }
                        } catch (extractError) {
                            logger.error('Error extracting transcript:', extractError.message);
                        }
                        
                        if (transcript && transcript.trim()) {
                            ws.send(JSON.stringify({
                                type: 'transcriptionResult',
                                transcript: transcript.trim(),
                                isFinal: true,
                                source: 'deepgram',
                                language: deepgramLanguage,
                                confidence: response.data?.results?.channels?.[0]?.alternatives?.[0]?.confidence || null
                            }));
                        } else {
                            ws.send(JSON.stringify({
                                type: 'transcriptionResult',
                                transcript: '',
                                isFinal: true,
                                source: 'deepgram',
                                language: deepgramLanguage,
                                message: 'No speech detected in audio'
                            }));
                        }
                        
                    } catch (error) {
                        logger.error('Audio processing error:', error.message);
                        ws.send(JSON.stringify({
                            type: 'transcriptionError',
                            message: `Transcription failed: ${error.message}`,
                            source: 'server'
                        }));
                    }
                    break;
                    
                case 'stopTranscription':
                    if (!connection.authenticated) {
                        return;
                    }
                    
                    if (connection.audioChunks && connection.audioChunks.length > 0) {
                        const fullAudioBuffer = Buffer.concat(connection.audioChunks);
                        connection.audioChunks = [];
                        
                        if (fullAudioBuffer.length > 100 && process.env.DEEPGRAM_API_KEY) {
                            const language = mapLanguageForDeepgram(connection.language);
                            
                            try {
                                const response = await axios.post(
                                    `https://api.deepgram.com/v1/listen?model=general&punctuate=true&language=${language}`,
                                    fullAudioBuffer,
                                    {
                                        headers: {
                                            'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
                                            'Content-Type': 'audio/webm'
                                        },
                                        timeout: 30000
                                    }
                                );
                                
                                let transcript = response.data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
                                
                                ws.send(JSON.stringify({
                                    type: 'transcriptionResult',
                                    transcript: transcript.trim(),
                                    isFinal: true,
                                    source: 'deepgram'
                                }));
                            } catch (error) {
                                logger.error('Deepgram error:', error.message);
                            }
                        }
                    }
                    
                    ws.send(JSON.stringify({
                        type: 'transcriptionStopped',
                        clientType: connection.clientType
                    }));
                    break;
                    
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
                    
                default:
                    logger.warn(`Unknown message type: ${data.type}`);
            }
            
        } catch (error) {
            logger.error('WebSocket message error:', error.message);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Server processing error'
            }));
        }
    });
    
    ws.on('close', () => {
        logger.info(`WebSocket disconnected: ${connectionId}`);
        activeConnections.delete(connectionId);
    });
    
    ws.on('error', (error) => {
        logger.error(`WebSocket error for ${connectionId}: ${error.message}`);
        activeConnections.delete(connectionId);
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, closing server...');
    wss.close(() => {
        logger.info('WebSocket server closed');
        server.close(() => {
            logger.info('HTTP server closed');
            mongoose.connection.close(false, () => {
                logger.info('MongoDB connection closed');
                process.exit(0);
            });
        });
    });
});

// Export for testing
module.exports = app;