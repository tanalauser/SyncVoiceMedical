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

// Supabase import
const { supabase, testConnection, checkSupabaseConnection } = require('./config/supabase');

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
    SUPABASE_URL: Joi.string().uri().required(),
    SUPABASE_ANON_KEY: Joi.string().required(),
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

// Test Supabase connection on startup
testConnection();

// Constants
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB limit

// Helper function to calculate validation end date
function calculateValidationEndDate(version, startDate = new Date()) {
    const daysToAdd = version === 'free' ? 7 : 30;
    return new Date(startDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
}

// Helper function to calculate days until expiration
function calculateDaysRemaining(endDate) {
    if (!endDate) return 0;
    const now = new Date();
    const end = new Date(endDate);
    const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
}

// Helper function to check if subscription is expired
function isSubscriptionExpired(user) {
    const endDate = user.subscription_type === 'free' ? user.trial_end_date : user.subscription_end;
    if (!endDate) return true;
    return new Date() > new Date(endDate);
}

// TEMPORARY FIX - Force production mode
if (!process.env.NODE_ENV) {
    logger.info('NODE_ENV not set, forcing to production');
    process.env.NODE_ENV = 'production';
}

// BASE_URL logic
const BASE_URL = (() => {
    if (process.env.BASE_URL) {
        const isLocalhost = process.env.BASE_URL.includes('localhost') ||
                           process.env.BASE_URL.includes('127.0.0.1');
        const isDev = process.env.NODE_ENV === 'development';

        if (!isLocalhost || isDev) {
            return process.env.BASE_URL;
        }
    }

    if (process.env.RENDER_EXTERNAL_URL) {
        const renderUrl = process.env.RENDER_EXTERNAL_URL;
        if (!renderUrl.match(/^https?:\/\//)) {
            return `https://${renderUrl}`;
        }
        return renderUrl;
    }

    if (process.env.NODE_ENV === 'development') {
        return `http://localhost:${process.env.PORT || 8080}`;
    }

    return 'https://syncvoicemedical.onrender.com';
})();

logger.info('Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    RENDER_EXTERNAL_URL: process.env.RENDER_EXTERNAL_URL,
    BASE_URL_env: process.env.BASE_URL,
    BASE_URL_final: BASE_URL
});

// Development emails that can bypass checks
const DEV_EMAILS = [
    'info@solve3d.net',
    'nicolas.tanala@wanadoo.fr',
    'nicolas.tanala@v-stars3d.com',
    'nicolas.tanala@solve3d.net',
    'nicolas.tanala@gmail.com',
    'syncvoicemedical@gmail.com',
    'dr.d.m.tanala@wanadoo.fr',
    'etanala@yahoo.fr',
    'taneus77@gmail.com',
    'laura.walker@nwas.nhs.uk',
    'jamescoleman.mills@gmail.com'
];

// Create Express app instance
const app = express();

// Trust proxy - Required for Render.com and other reverse proxy setups
app.set('trust proxy', 1);

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

// Health endpoints
app.get('/healthz', async (req, res) => {
    const dbState = await checkSupabaseConnection();
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbState
    });
});

app.get('/api/health', async (req, res) => {
    const dbState = await checkSupabaseConnection();
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

app.get('/api/status', async (req, res) => {
    try {
        const dbState = await checkSupabaseConnection();

        const requiredEnvVars = [
            'EMAIL_PASS', 'EMAIL_USER', 'SUPABASE_URL', 'SUPABASE_ANON_KEY',
            'STRIPE_SECRET_KEY', 'STRIPE_PRICE_ID', 'STRIPE_WEBHOOK_SECRET'
        ];

        const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
        const isFullyConfigured = missingVars.length === 0;

        const services = {
            database: {
                configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
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
                version: '2.0.0-supabase'
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

// N8N tracking webhook
app.post('/api/n8n-tracking', async (req, res) => {
    try {
        const { email, event, ...data } = req.body;

        if (!email || !event) {
            return res.status(400).json({
                success: false,
                message: 'Email and event are required'
            });
        }

        // Find user by email
        const { data: user, error: findError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (findError && findError.code !== 'PGRST116') {
            throw findError;
        }

        if (!user) {
            // Create lead for tracking event from unknown users
            const { data: newUser, error: insertError } = await supabase
                .from('users')
                .insert({
                    email: email.toLowerCase(),
                    first_name: data.firstName || 'Unknown',
                    last_name: data.lastName || 'Unknown',
                    status: 'lead',
                    subscription_type: 'free',
                    language: 'fr',
                    activation_code: 'PENDING',
                    is_verified: false
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // Record email event if applicable
            if (['email_opened', 'email_sent', 'link_clicked'].includes(event)) {
                const eventType = event === 'email_opened' ? 'opened' : event === 'link_clicked' ? 'clicked' : 'sent';
                await supabase.from('email_events').insert({
                    email: email.toLowerCase(),
                    event_type: eventType,
                    utm_campaign: data.campaign || 'automated',
                    link_url: data.link || null
                });
            }

            return res.json({
                success: true,
                message: `Lead created from ${event}`,
                userId: newUser.id
            });
        }

        // Build update object based on event type
        const updateData = { updated_at: new Date().toISOString() };

        switch(event) {
            case 'trial_signup':
                updateData.trial_start_date = new Date().toISOString();
                updateData.trial_end_date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
                updateData.status = 'trial';
                updateData.is_verified = true;
                break;

            case 'paid_subscription':
                updateData.status = 'paid';
                updateData.subscription_type = data.subscriptionType || 'monthly';
                updateData.subscription_start = new Date().toISOString();
                updateData.subscription_end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                break;

            case 'subscription_cancelled':
            case 'subscription_expired':
                updateData.status = 'churned';
                break;

            case 'reactivated':
                updateData.status = 'paid';
                break;
        }

        // Update user
        const { error: updateError } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', user.id);

        if (updateError) throw updateError;

        // Record email events
        if (['email_sent', 'email_opened', 'link_clicked'].includes(event)) {
            const eventType = event === 'email_opened' ? 'opened' : event === 'link_clicked' ? 'clicked' : 'sent';
            await supabase.from('email_events').insert({
                email: email.toLowerCase(),
                event_type: eventType,
                utm_campaign: data.campaign,
                link_url: data.link || null
            });
        }

        res.json({
            success: true,
            message: `Event '${event}' tracked`,
            userId: user.id,
            currentStatus: updateData.status || user.status
        });

    } catch (error) {
        logger.error('N8N tracking error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Password reset request route
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        const { data: user, error: findError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (findError && findError.code !== 'PGRST116') {
            throw findError;
        }

        if (!user) {
            return res.json({
                success: true,
                message: 'If this email exists, you will receive a password reset link.'
            });
        }

        if (user.status !== 'paid' || !user.password_hash) {
            return res.json({
                success: false,
                message: 'Password reset is only available for paid accounts with existing passwords.'
            });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
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
            fr: `<h2>Réinitialisation de votre mot de passe</h2><p>Bonjour ${user.first_name},</p><p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p><p><a href="${resetLink}" style="background: #296396; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Réinitialiser mon mot de passe</a></p><p>Ce lien expire dans 1 heure.</p>`,
            en: `<h2>Reset Your Password</h2><p>Hello ${user.first_name},</p><p>Click the link below to create a new password:</p><p><a href="${resetLink}" style="background: #296396; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset My Password</a></p><p>This link expires in 1 hour.</p>`,
            de: `<h2>Passwort zurücksetzen</h2><p>Hallo ${user.first_name},</p><p>Klicken Sie auf den untenstehenden Link:</p><p><a href="${resetLink}" style="background: #296396; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Mein Passwort zurücksetzen</a></p>`,
            es: `<h2>Restablecer su contraseña</h2><p>Hola ${user.first_name},</p><p>Haga clic en el enlace:</p><p><a href="${resetLink}" style="background: #296396; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Restablecer mi contraseña</a></p>`,
            it: `<h2>Ripristina la tua password</h2><p>Ciao ${user.first_name},</p><p>Clicca sul link:</p><p><a href="${resetLink}" style="background: #296396; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ripristina la mia password</a></p>`,
            pt: `<h2>Redefinir sua senha</h2><p>Olá ${user.first_name},</p><p>Clique no link:</p><p><a href="${resetLink}" style="background: #296396; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Redefinir minha senha</a></p>`
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

        const { data: user, error: findError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (findError || !user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token.'
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const { error: updateError } = await supabase
            .from('users')
            .update({ password_hash: hashedPassword })
            .eq('id', user.id);

        if (updateError) throw updateError;

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

// API test routes
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working' });
});

app.get('/api/debug-baseurl', (req, res) => {
    res.json({
        BASE_URL: BASE_URL,
        NODE_ENV: process.env.NODE_ENV,
        BASE_URL_env: process.env.BASE_URL,
        timestamp: new Date().toISOString(),
        deploymentTest: 'SUPABASE_MIGRATION_v1',
        isProduction: !BASE_URL.includes('localhost'),
        host: req.get('host'),
        protocol: req.protocol
    });
});

// Check if email exists for trial
app.post('/api/check-email', async (req, res) => {
    try {
        const dbState = await checkSupabaseConnection();
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

        const { data: existingUser, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .eq('subscription_type', 'free')
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        if (existingUser) {
            const trialStartDate = existingUser.trial_start_date || existingUser.created_at;
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

// Analytics endpoint
app.get('/api/analytics/summary', async (req, res) => {
    try {
        // Use the Supabase view for conversion funnel
        const { data: funnelData, error: funnelError } = await supabase
            .from('v_conversion_funnel')
            .select('*')
            .single();

        if (funnelError) {
            // Fallback to manual counts
            const [leads, trials, paid, churned] = await Promise.all([
                supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'lead'),
                supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'trial'),
                supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
                supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'churned')
            ]);

            return res.json({
                success: true,
                timestamp: new Date().toISOString(),
                metrics: {
                    totals: {
                        leads: leads.count || 0,
                        trials: trials.count || 0,
                        paid: paid.count || 0,
                        churned: churned.count || 0
                    }
                }
            });
        }

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            metrics: {
                totals: {
                    leads: funnelData.leads || 0,
                    trials: funnelData.trials || 0,
                    paid: funnelData.paid_users || 0,
                    churned: funnelData.churned || 0,
                    total: funnelData.total_users || 0
                },
                rates: {
                    leadToTrial: `${funnelData.lead_to_trial_rate || 0}%`,
                    trialToPaid: `${funnelData.trial_to_paid_rate || 0}%`
                }
            }
        });

    } catch (error) {
        logger.error('Analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Analytics query failed',
            error: error.message
        });
    }
});

// Email events stats endpoint (excludes nicolas.tanala emails)
app.get('/api/admin/email-stats', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('email_events')
            .select('email, event_type, utm_campaign, link_url')
            .not('email', 'ilike', '%nicolas.tanala%');

        if (error) throw error;

        // Calculate totals
        const totalSent = data.filter(e => e.event_type === 'sent').length;
        const totalOpened = data.filter(e => e.event_type === 'opened').length;
        const totalClicked = data.filter(e => e.event_type === 'clicked').length;

        // Calculate unique counts (distinct emails)
        const uniqueSentEmails = new Set(data.filter(e => e.event_type === 'sent').map(e => e.email));
        const uniqueOpenedEmails = new Set(data.filter(e => e.event_type === 'opened').map(e => e.email));
        const uniqueClickedEmails = new Set(data.filter(e => e.event_type === 'clicked').map(e => e.email));

        const uniqueSent = uniqueSentEmails.size;
        const uniqueOpened = uniqueOpenedEmails.size;
        const uniqueClicked = uniqueClickedEmails.size;

        // Calculate rates
        const overallOpenRate = uniqueSent > 0 ? ((uniqueOpened / uniqueSent) * 100).toFixed(1) : '0.0';
        const clickThroughRate = uniqueOpened > 0 ? ((uniqueClicked / uniqueOpened) * 100).toFixed(1) : '0.0';
        const conversionRate = uniqueSent > 0 ? ((uniqueClicked / uniqueSent) * 100).toFixed(1) : '0.0';

        // Click breakdown by link type
        const clicksByLink = {};
        data.filter(e => e.event_type === 'clicked').forEach(event => {
            const link = event.link_url || 'unknown';
            clicksByLink[link] = (clicksByLink[link] || 0) + 1;
        });

        // Group by campaign
        const campaignMap = {};
        data.forEach(event => {
            const campaign = event.utm_campaign || 'unknown';
            if (!campaignMap[campaign]) {
                campaignMap[campaign] = {
                    sent: 0, opened: 0, clicked: 0,
                    sentEmails: new Set(), openedEmails: new Set(), clickedEmails: new Set()
                };
            }
            if (event.event_type === 'sent') {
                campaignMap[campaign].sent++;
                campaignMap[campaign].sentEmails.add(event.email);
            }
            if (event.event_type === 'opened') {
                campaignMap[campaign].opened++;
                campaignMap[campaign].openedEmails.add(event.email);
            }
            if (event.event_type === 'clicked') {
                campaignMap[campaign].clicked++;
                campaignMap[campaign].clickedEmails.add(event.email);
            }
        });

        const byCampaign = Object.entries(campaignMap).map(([campaign, stats]) => ({
            campaign,
            sent: stats.sent,
            opened: stats.opened,
            clicked: stats.clicked,
            uniqueSent: stats.sentEmails.size,
            uniqueOpened: stats.openedEmails.size,
            uniqueClicked: stats.clickedEmails.size,
            openRate: stats.sentEmails.size > 0 ? ((stats.openedEmails.size / stats.sentEmails.size) * 100).toFixed(1) + '%' : '0.0%',
            clickRate: stats.openedEmails.size > 0 ? ((stats.clickedEmails.size / stats.openedEmails.size) * 100).toFixed(1) + '%' : '0.0%'
        })).sort((a, b) => b.sent - a.sent);

        res.json({
            success: true,
            stats: {
                totalSent,
                totalOpened,
                totalClicked,
                uniqueSent,
                uniqueOpened,
                uniqueClicked,
                overallOpenRate: overallOpenRate + '%',
                clickThroughRate: clickThroughRate + '%',
                conversionRate: conversionRate + '%',
                clicksByLink,
                byCampaign
            }
        });

    } catch (error) {
        logger.error('Email stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Email stats query failed',
            error: error.message
        });
    }
});

// Email events diagnostic endpoint - shows recent events
app.get('/api/admin/email-events-debug', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;

        const { data, error } = await supabase
            .from('email_events')
            .select('*')
            .not('email', 'ilike', '%nicolas.tanala%')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        // Get total counts
        const { count: totalCount } = await supabase
            .from('email_events')
            .select('*', { count: 'exact', head: true })
            .not('email', 'ilike', '%nicolas.tanala%');

        const { count: sentCount } = await supabase
            .from('email_events')
            .select('*', { count: 'exact', head: true })
            .eq('event_type', 'sent')
            .not('email', 'ilike', '%nicolas.tanala%');

        res.json({
            success: true,
            totalEventsInDb: totalCount,
            totalSentInDb: sentCount,
            recentEvents: data,
            note: 'Showing most recent events first'
        });

    } catch (error) {
        logger.error('Email events debug error:', error);
        res.status(500).json({
            success: false,
            message: 'Debug query failed',
            error: error.message
        });
    }
});

// Admin subscription stats endpoint
app.get('/api/admin/subscription-stats', async (req, res) => {
    try {
        // Get counts by status
        const { data: statusCounts, error: statusError } = await supabase
            .from('users')
            .select('status');

        if (statusError) throw statusError;

        // Get paid users with subscription type breakdown
        const { data: paidUsers, error: paidError } = await supabase
            .from('users')
            .select('subscription_type, created_at')
            .eq('status', 'paid');

        if (paidError) throw paidError;

        // Calculate status breakdown
        const statusBreakdown = statusCounts.reduce((acc, user) => {
            acc[user.status] = (acc[user.status] || 0) + 1;
            return acc;
        }, {});

        // Calculate subscription type breakdown for paid users
        const subscriptionBreakdown = paidUsers.reduce((acc, user) => {
            const type = user.subscription_type || 'unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        // Calculate estimated revenue
        const monthlyCount = subscriptionBreakdown.monthly || 0;
        const yearlyCount = subscriptionBreakdown.yearly || 0;
        const estimatedMRR = (monthlyCount * 29) + (yearlyCount * (199 / 12));
        const estimatedARR = estimatedMRR * 12;

        // Get recent signups (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: recentSignups, error: recentError } = await supabase
            .from('users')
            .select('status, subscription_type, created_at')
            .gte('created_at', thirtyDaysAgo.toISOString());

        const recentStats = recentSignups ? {
            total: recentSignups.length,
            trials: recentSignups.filter(u => u.status === 'trial').length,
            paid: recentSignups.filter(u => u.status === 'paid').length,
            monthly: recentSignups.filter(u => u.subscription_type === 'monthly').length,
            yearly: recentSignups.filter(u => u.subscription_type === 'yearly').length
        } : null;

        // Get list of paid subscribers with details
        const { data: subscribers, error: subError } = await supabase
            .from('users')
            .select('email, first_name, last_name, subscription_type, subscription_end, created_at')
            .eq('status', 'paid')
            .order('created_at', { ascending: false });

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            overview: {
                totalUsers: statusCounts.length,
                byStatus: {
                    leads: statusBreakdown.lead || 0,
                    trials: statusBreakdown.trial || 0,
                    paid: statusBreakdown.paid || 0,
                    churned: statusBreakdown.churned || 0,
                    unsubscribed: statusBreakdown.unsubscribed || 0
                }
            },
            subscriptions: {
                total: paidUsers.length,
                byType: {
                    monthly: monthlyCount,
                    yearly: yearlyCount,
                    unknown: subscriptionBreakdown.unknown || 0
                }
            },
            revenue: {
                estimatedMRR: `$${estimatedMRR.toFixed(2)}`,
                estimatedARR: `$${estimatedARR.toFixed(2)}`,
                breakdown: {
                    monthlyRevenue: `$${(monthlyCount * 29).toFixed(2)}/month`,
                    yearlyRevenue: `$${(yearlyCount * 199).toFixed(2)}/year`
                }
            },
            last30Days: recentStats,
            subscribers: subscribers || []
        });

    } catch (error) {
        logger.error('Admin subscription stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscription stats',
            error: error.message
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL CAMPAIGN ENDPOINT (Persistent with Supabase)
// ═══════════════════════════════════════════════════════════════════════════

// Track active campaign processors (to avoid duplicate processing)
const activeProcessors = new Set();

// Process campaign queue - sends emails one by one with delays
async function processCampaignQueue(jobId) {
    if (activeProcessors.has(jobId)) {
        logger.info(`Campaign ${jobId} already being processed`);
        return;
    }
    activeProcessors.add(jobId);

    try {
        const transporter = await createTransporter();

        while (true) {
            // Get job status
            const { data: job, error: jobError } = await supabase
                .from('email_campaign_jobs')
                .select('*')
                .eq('id', jobId)
                .single();

            if (jobError || !job) {
                logger.error(`Campaign job ${jobId} not found`);
                break;
            }

            if (job.status === 'completed' || job.status === 'paused' || job.status === 'failed') {
                logger.info(`Campaign ${jobId} status is ${job.status}, stopping processor`);
                break;
            }

            // Get next pending email
            const { data: nextEmail, error: queueError } = await supabase
                .from('email_campaign_queue')
                .select('*')
                .eq('job_id', jobId)
                .eq('status', 'pending')
                .order('created_at', { ascending: true })
                .limit(1)
                .single();

            if (queueError || !nextEmail) {
                // No more pending emails - mark job as completed
                await supabase
                    .from('email_campaign_jobs')
                    .update({ status: 'completed', completed_at: new Date().toISOString() })
                    .eq('id', jobId);
                logger.info(`Campaign ${jobId} completed - no more pending emails`);
                break;
            }

            // Send the email
            try {
                const html = getCampaignEmailHtml(nextEmail.email, job.campaign_name);
                await transporter.sendMail({
                    from: `SyncVoice Medical <${process.env.EMAIL_USER}>`,
                    to: nextEmail.email,
                    subject: 'Gagnez 2 heures par jour sur vos comptes-rendus médicaux',
                    html: html
                });

                // Mark as sent in queue
                await supabase
                    .from('email_campaign_queue')
                    .update({ status: 'sent', sent_at: new Date().toISOString() })
                    .eq('id', nextEmail.id);

                // Record in email_events
                await supabase.from('email_events').insert({
                    email: nextEmail.email,
                    event_type: 'sent',
                    utm_campaign: job.campaign_name,
                    utm_source: 'campaign'
                });

                // Update job progress
                await supabase
                    .from('email_campaign_jobs')
                    .update({
                        sent_count: job.sent_count + 1,
                        current_index: job.current_index + 1,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', jobId);

                logger.info(`Campaign ${jobId}: sent to ${nextEmail.email} (${job.sent_count + 1}/${job.total_emails})`);

            } catch (sendError) {
                // Mark as failed in queue
                await supabase
                    .from('email_campaign_queue')
                    .update({ status: 'failed', error_message: sendError.message })
                    .eq('id', nextEmail.id);

                // Update job progress
                await supabase
                    .from('email_campaign_jobs')
                    .update({
                        failed_count: job.failed_count + 1,
                        current_index: job.current_index + 1,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', jobId);

                logger.error(`Campaign ${jobId}: failed to send to ${nextEmail.email}:`, sendError.message);
            }

            // Wait before next email
            const delayMs = (job.delay_minutes || 10) * 60 * 1000;
            logger.info(`Campaign ${jobId}: waiting ${job.delay_minutes} minutes before next email...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    } catch (error) {
        logger.error(`Campaign processor error for ${jobId}:`, error);
    } finally {
        activeProcessors.delete(jobId);
    }
}

// Resume incomplete campaigns on startup
async function resumeIncompleteCampaigns() {
    try {
        const { data: runningJobs, error } = await supabase
            .from('email_campaign_jobs')
            .select('id, campaign_name, sent_count, total_emails')
            .eq('status', 'running');

        if (error) {
            logger.error('Error checking for incomplete campaigns:', error);
            return;
        }

        if (runningJobs && runningJobs.length > 0) {
            logger.info(`Found ${runningJobs.length} incomplete campaign(s) to resume`);
            for (const job of runningJobs) {
                logger.info(`Resuming campaign ${job.id} (${job.campaign_name}): ${job.sent_count}/${job.total_emails} sent`);
                processCampaignQueue(job.id); // Don't await - run in background
            }
        } else {
            logger.info('No incomplete campaigns to resume');
        }
    } catch (error) {
        logger.error('Error resuming campaigns:', error);
    }
}

// Campaign email template (doctors_fr_v3 - SHORT version with video CTA)
function getCampaignEmailHtml(recipientEmail, campaignName) {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>2h/jour perdues en paperasse ? Regardez cette démo de 90 secondes</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <style type="text/css">
        table { border-collapse: collapse; }
        .button-link { padding: 15px 40px !important; }
    </style>
    <![endif]-->
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .content-padding { padding: 20px !important; }
            h1 { font-size: 24px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="display: none; font-size: 1px; color: #f5f5f5; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
        90 secondes pour découvrir comment économiser 2h par jour sur vos comptes-rendus
    </div>
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 30px 15px;">
                <table class="container" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 30px 30px 20px 30px; background: linear-gradient(135deg, #1a5f7a 0%, #0d3d4d 100%);">
                            <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">
                                🎙️ SyncVoice Medical
                            </h1>
                            <p style="margin: 8px 0 0 0; color: #a8d4e6; font-size: 13px;">
                                Transcription médicale par IA • 100% Française
                            </p>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td class="content-padding" style="padding: 35px 40px;">
                            <p style="font-size: 17px; color: #333; line-height: 1.6; margin: 0 0 20px 0;">
                                Docteur,
                            </p>
                            <p style="font-size: 17px; color: #333; line-height: 1.6; margin: 0 0 25px 0;">
                                <strong>2 à 3 heures par jour</strong> à rédiger des comptes-rendus ?<br>
                                C'est du temps que vous pourriez passer avec vos patients.
                            </p>
                            <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 30px 0;">
                                SyncVoice Medical transforme votre dictée en compte-rendu structuré <strong>en quelques secondes</strong>. Regardez comment ça marche :
                            </p>
                            <!-- VIDEO CTA - PRIMARY -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 20px 0;">
                                <tr>
                                    <td align="center">
                                        <table border="0" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);">
                                                    <a href="https://syncvoicemedical.onrender.com/api/track/click?email=${encodeURIComponent(recipientEmail)}&campaign=${encodeURIComponent(campaignName)}&link=video_cta&url=${encodeURIComponent('https://syncvoicemedical.onrender.com/videos.html?utm_source=email&utm_campaign=' + encodeURIComponent(campaignName) + '&utm_content=video_cta')}"
                                                        target="_blank"
                                                        class="button-link"
                                                        style="display: block; padding: 18px 50px; font-size: 18px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 10px;">
                                                        ▶️ Voir la démo (90 sec)
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <!-- Key benefits - compact -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0; background: #f8f9fa; border-radius: 10px; padding: 20px;">
                                <tr>
                                    <td style="padding: 15px 20px;">
                                        <p style="margin: 0 0 12px 0; font-size: 14px; color: #333;"><strong style="color: #27ae60;">✓</strong> &nbsp;Réduction de <strong>70%</strong> du temps de documentation</p>
                                        <p style="margin: 0 0 12px 0; font-size: 14px; color: #333;"><strong style="color: #27ae60;">✓</strong> &nbsp;Précision de <strong>99%</strong> sur le vocabulaire médical</p>
                                        <p style="margin: 0; font-size: 14px; color: #333;"><strong style="color: #27ae60;">✓</strong> &nbsp;Données <strong>jamais stockées</strong> • Conforme RGPD</p>
                                    </td>
                                </tr>
                            </table>
                            <!-- TRIAL CTA - SECONDARY -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding-top: 10px;">
                                        <p style="font-size: 14px; color: #666; margin: 0 0 15px 0;">
                                            Prêt à essayer ? <strong>7 jours gratuits</strong>, sans carte bancaire.
                                        </p>
                                        <table border="0" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center" style="border-radius: 8px; border: 2px solid #1a5f7a;">
                                                    <a href="https://syncvoicemedical.onrender.com/api/track/click?email=${encodeURIComponent(recipientEmail)}&campaign=${encodeURIComponent(campaignName)}&link=main_cta&url=${encodeURIComponent('https://syncvoicemedical.onrender.com/?email=' + encodeURIComponent(recipientEmail) + '&utm_source=email&utm_campaign=' + encodeURIComponent(campaignName) + '&utm_content=main_cta')}"
                                                        target="_blank"
                                                        style="display: block; padding: 12px 35px; font-size: 15px; font-weight: 600; color: #1a5f7a; text-decoration: none; border-radius: 8px;">
                                                        Démarrer l'essai gratuit →
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px 40px; border-top: 1px solid #e9ecef;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <p style="font-size: 13px; color: #666; margin: 0 0 5px 0;"><strong>SyncVoice Medical</strong> • Orléans, France</p>
                                        <p style="font-size: 11px; color: #999; margin: 10px 0 0 0;">
                                            <a href="https://syncvoicemedical.onrender.com/api/track/click?email=${encodeURIComponent(recipientEmail)}&campaign=${encodeURIComponent(campaignName)}&link=unsubscribe&url=${encodeURIComponent('https://syncvoicemedical.onrender.com/api/unsubscribe?email=' + encodeURIComponent(recipientEmail) + '&utm_source=email&utm_campaign=' + encodeURIComponent(campaignName))}" style="color: #1a5f7a;">Se désinscrire</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
    <img src="https://syncvoicemedical.onrender.com/api/track/open?email=${encodeURIComponent(recipientEmail)}&campaign=${encodeURIComponent(campaignName)}&source=email" width="1" height="1" alt="" style="display: block; width: 1px; height: 1px; border: 0;" />
</body>
</html>`;
}

// Parse CSV content to extract emails (supports comma or semicolon delimiters)
function parseCSVEmails(csvContent) {
    const lines = csvContent.split('\n');
    const emails = [];

    // Detect delimiter (semicolon or comma)
    const header = lines[0];
    const delimiter = header.includes(';') ? ';' : ',';

    // Find email column index from header
    const columns = header.toLowerCase().split(delimiter).map(col => col.trim().replace(/"/g, ''));
    const emailIndex = columns.findIndex(col =>
        col.includes('email') || col.includes('mail') || col.includes('adresse email')
    );

    if (emailIndex === -1) {
        throw new Error('No email column found in CSV. Expected column name containing "email" or "mail"');
    }

    // Extract emails from data rows
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parse with detected delimiter
        const values = line.split(delimiter).map(val => val.trim().replace(/"/g, ''));
        const email = values[emailIndex];

        // Validate email format
        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            emails.push(email.toLowerCase());
        }
    }

    return [...new Set(emails)]; // Remove duplicates
}

// Parse CSV content to extract full contact info (supports comma or semicolon delimiters)
function parseCSVContacts(csvContent) {
    const lines = csvContent.split('\n');
    const contacts = [];

    // Detect delimiter (semicolon or comma)
    const header = lines[0];
    const delimiter = header.includes(';') ? ';' : ',';

    // Parse header columns
    const columns = header.split(delimiter).map(col => col.trim().replace(/"/g, '').toLowerCase());

    // Map column names to indices (flexible matching for French/English)
    const findIndex = (patterns) => columns.findIndex(col => patterns.some(p => col.includes(p)));

    const indices = {
        name: findIndex(['nom']),
        address: findIndex(['adresse']),
        postalCode: findIndex(['code postal', 'postal']),
        city: findIndex(['ville', 'city']),
        phone: findIndex(['telephone', 'phone', 'tel']),
        email: findIndex(['email', 'mail']),
        activity: findIndex(['activite', 'activity'])
    };

    if (indices.email === -1) {
        throw new Error('No email column found in CSV');
    }

    // Extract data from rows
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(delimiter).map(val => val.trim().replace(/"/g, ''));
        const email = values[indices.email];

        // Validate email format
        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            contacts.push({
                email: email.toLowerCase(),
                last_name: indices.name !== -1 ? values[indices.name] || null : null,
                address: indices.address !== -1 ? values[indices.address] || null : null,
                postal_code: indices.postalCode !== -1 ? values[indices.postalCode] || null : null,
                city: indices.city !== -1 ? values[indices.city] || null : null,
                phone: indices.phone !== -1 ? values[indices.phone] || null : null,
                activity: indices.activity !== -1 ? values[indices.activity] || null : null
            });
        }
    }

    // Remove duplicates by email
    const uniqueContacts = [];
    const seenEmails = new Set();
    for (const contact of contacts) {
        if (!seenEmails.has(contact.email)) {
            seenEmails.add(contact.email);
            uniqueContacts.push(contact);
        }
    }

    return uniqueContacts;
}

// Send campaign endpoint (now with Supabase persistence)
app.post('/api/admin/send-campaign', async (req, res) => {
    try {
        const { emails, csv, campaign = 'doctors_fr_v2', delayMinutes = 10 } = req.body;

        let contacts = [];

        // Parse contacts from CSV or use provided email array
        if (csv) {
            contacts = parseCSVContacts(csv);
        } else if (emails && Array.isArray(emails)) {
            // Simple email array - create basic contact objects
            contacts = emails
                .map(e => e.toLowerCase())
                .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
                .map(email => ({ email }));
        } else {
            return res.status(400).json({
                success: false,
                message: 'Please provide either "emails" array or "csv" content'
            });
        }

        if (contacts.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid emails found'
            });
        }

        // Check for unsubscribed users
        const { data: unsubscribedUsers } = await supabase
            .from('users')
            .select('email')
            .eq('status', 'unsubscribed');

        const unsubscribedEmails = new Set((unsubscribedUsers || []).map(u => u.email.toLowerCase()));
        const filteredContacts = contacts.filter(c => !unsubscribedEmails.has(c.email));
        const skippedUnsubscribed = contacts.length - filteredContacts.length;

        // Create campaign job in Supabase
        const { data: job, error: jobError } = await supabase
            .from('email_campaign_jobs')
            .insert({
                campaign_name: campaign,
                status: 'running',
                total_emails: filteredContacts.length,
                delay_minutes: delayMinutes,
                started_at: new Date().toISOString()
            })
            .select()
            .single();

        if (jobError) {
            throw new Error(`Failed to create campaign job: ${jobError.message}`);
        }

        // Add all emails to queue
        const queueItems = filteredContacts.map(contact => ({
            job_id: job.id,
            email: contact.email,
            status: 'pending'
        }));

        const { error: queueError } = await supabase
            .from('email_campaign_queue')
            .insert(queueItems);

        if (queueError) {
            throw new Error(`Failed to add emails to queue: ${queueError.message}`);
        }

        logger.info(`Campaign ${job.id} created with ${filteredContacts.length} emails`);

        // Start processing in background
        processCampaignQueue(job.id);

        // Return immediately with campaign ID
        res.json({
            success: true,
            message: `Campaign started. Emails will be sent with ${delayMinutes}-minute delays. Campaign will resume if server restarts.`,
            campaignId: job.id,
            totalEmails: filteredContacts.length,
            skippedUnsubscribed,
            estimatedDuration: `${Math.ceil((filteredContacts.length - 1) * delayMinutes / 60)} hours ${((filteredContacts.length - 1) * delayMinutes) % 60} minutes`,
            checkStatusUrl: `/api/admin/campaign-status/${job.id}`
        });

    } catch (error) {
        logger.error('Send campaign error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start campaign',
            error: error.message
        });
    }
});

// Check campaign status endpoint (now queries Supabase)
app.get('/api/admin/campaign-status/:campaignId', async (req, res) => {
    try {
        const { campaignId } = req.params;

        const { data: job, error } = await supabase
            .from('email_campaign_jobs')
            .select('*')
            .eq('id', campaignId)
            .single();

        if (error || !job) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found.'
            });
        }

        res.json({
            success: true,
            campaignId: job.id,
            status: job.status,
            campaign: job.campaign_name,
            totalEmails: job.total_emails,
            sent: job.sent_count,
            failed: job.failed_count,
            progress: `${job.sent_count + job.failed_count}/${job.total_emails}`,
            delayMinutes: job.delay_minutes,
            startedAt: job.started_at,
            completedAt: job.completed_at
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Resume a paused campaign
app.post('/api/admin/campaign-resume/:campaignId', async (req, res) => {
    try {
        const { campaignId } = req.params;

        const { data: job, error } = await supabase
            .from('email_campaign_jobs')
            .select('*')
            .eq('id', campaignId)
            .single();

        if (error || !job) {
            return res.status(404).json({ success: false, message: 'Campaign not found.' });
        }

        if (job.status === 'completed') {
            return res.status(400).json({ success: false, message: 'Campaign already completed.' });
        }

        if (job.status === 'running' && activeProcessors.has(campaignId)) {
            return res.status(400).json({ success: false, message: 'Campaign already running.' });
        }

        // Update status to running
        await supabase
            .from('email_campaign_jobs')
            .update({ status: 'running', updated_at: new Date().toISOString() })
            .eq('id', campaignId);

        // Start processing
        processCampaignQueue(campaignId);

        res.json({
            success: true,
            message: 'Campaign resumed',
            campaignId,
            remainingEmails: job.total_emails - job.sent_count - job.failed_count
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Pause a running campaign
app.post('/api/admin/campaign-pause/:campaignId', async (req, res) => {
    try {
        const { campaignId } = req.params;

        await supabase
            .from('email_campaign_jobs')
            .update({ status: 'paused', updated_at: new Date().toISOString() })
            .eq('id', campaignId);

        res.json({ success: true, message: 'Campaign paused. It will stop after the current email.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// List all campaigns
app.get('/api/admin/campaigns', async (req, res) => {
    try {
        const { data: jobs, error } = await supabase
            .from('email_campaign_jobs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        res.json({
            success: true,
            campaigns: jobs.map(job => ({
                campaignId: job.id,
                campaign: job.campaign_name,
                status: job.status,
                progress: `${job.sent_count + job.failed_count}/${job.total_emails}`,
                sent: job.sent_count,
                failed: job.failed_count,
                startedAt: job.started_at,
                completedAt: job.completed_at
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


// Churn detection
app.post('/api/detect-churns', async (req, res) => {
    try {
        const now = new Date();

        // Find expired paid subscriptions
        const { data: expiredUsers, error } = await supabase
            .from('users')
            .select('*')
            .eq('status', 'paid')
            .lt('subscription_end', now.toISOString())
            .neq('status', 'churned');

        if (error) throw error;

        const churnedEmails = [];

        for (const user of expiredUsers || []) {
            const { error: updateError } = await supabase
                .from('users')
                .update({ status: 'churned' })
                .eq('id', user.id);

            if (!updateError) {
                churnedEmails.push({
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    churnedAt: now.toISOString()
                });
            }
        }

        // Send to n8n for win-back campaigns
        if (churnedEmails.length > 0) {
            try {
                await axios.post('https://n8n.srv1030172.hstgr.cloud/webhook/churns-detected', {
                    churns: churnedEmails,
                    count: churnedEmails.length,
                    detectedAt: now.toISOString()
                }, { timeout: 5000 });
            } catch (webhookError) {
                logger.warn('n8n churn webhook error:', webhookError.message);
            }
        }

        res.json({
            success: true,
            message: `Detected ${churnedEmails.length} churned users`,
            churns: churnedEmails
        });

    } catch (error) {
        logger.error('Churn detection error:', error);
        res.status(500).json({
            success: false,
            message: 'Churn detection failed',
            error: error.message
        });
    }
});

// Email open tracking handler (shared by both endpoints)
async function handleEmailOpenTracking(req, res) {
    try {
        const { email, campaign, source } = req.query;

        if (!email) {
            return res.status(400).send('Email required');
        }

        // Record email open event
        await supabase.from('email_events').insert({
            email: email.toLowerCase(),
            event_type: 'opened',
            utm_campaign: campaign || 'unknown',
            utm_source: source || 'direct'
        });

        // Update user's email tracking fields
        await supabase
            .from('users')
            .update({
                email_opened: true,
                email_opened_at: new Date().toISOString(),
                email_open_count: supabase.rpc ? undefined : 1, // Will use raw SQL increment below
                last_email_open_campaign: campaign || 'unknown'
            })
            .eq('email', email.toLowerCase());

        // Increment open count using raw update
        await supabase.rpc('increment_email_open_count', { user_email: email.toLowerCase() }).catch(() => {
            // Function may not exist, ignore error
        });

        logger.info(`Email opened tracked for: ${email}`, { campaign, source });

        // Return 1x1 transparent pixel
        const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
        res.writeHead(200, {
            'Content-Type': 'image/gif',
            'Content-Length': pixel.length,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(pixel);
    } catch (error) {
        logger.error('Email open tracking error:', error);
        const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
        res.writeHead(200, {'Content-Type': 'image/gif'});
        res.end(pixel);
    }
}

// Email open tracking endpoints (both URLs work)
app.get('/api/email-open', handleEmailOpenTracking);
app.get('/api/track/open', handleEmailOpenTracking);

// Email click tracking endpoint
app.get('/api/track/click', async (req, res) => {
    try {
        const { email, campaign, link, url } = req.query;

        if (!url) {
            return res.status(400).send('Missing URL parameter');
        }

        // Record click event if email is provided
        if (email) {
            await supabase.from('email_events').insert({
                email: email.toLowerCase(),
                event_type: 'clicked',
                utm_campaign: campaign || 'unknown',
                utm_source: 'email',
                link_url: link || url
            });

            // Update user click tracking
            await supabase
                .from('users')
                .update({
                    email_clicked: true,
                    email_clicked_at: new Date().toISOString(),
                    last_clicked_link: link || url
                })
                .eq('email', email.toLowerCase());

            logger.info(`Email click tracked: ${email}`, { campaign, link, url });
        }

        // Redirect to destination URL
        res.redirect(302, decodeURIComponent(url));
    } catch (error) {
        logger.error('Email click tracking error:', error);
        // Still redirect even if tracking fails
        const url = req.query.url;
        if (url) {
            res.redirect(302, decodeURIComponent(url));
        } else {
            res.status(400).send('Invalid request');
        }
    }
});

// Send activation code
app.post('/api/send-activation', async (req, res) => {
    logger.info('=== SEND-ACTIVATION ROUTE CALLED ===');

    const dbState = await checkSupabaseConnection();
    if (!dbState.isConnected) {
        return res.status(503).json({
            success: false,
            message: 'Database connection unavailable. Please try again later.',
            details: dbState
        });
    }

    try {
        const { email, firstName, lastName, version, language, termsAccepted, company, address, postalCode, city, country, ...otherData } = req.body;
        const t = messages[language] || messages.en;

        // Handle paid version
        if (version === 'paid') {
            // Check if user exists
            const { data: existingUser } = await supabase
                .from('users')
                .select('*')
                .eq('email', email.toLowerCase())
                .single();

            let userId;
            let stripeCustomerId = existingUser?.stripe_customer_id;

            if (!stripeCustomerId) {
                const customer = await stripe.customers.create({
                    email: email.toLowerCase(),
                    name: `${firstName} ${lastName}`,
                    metadata: { firstName, lastName, company: company || '' },
                    address: {
                        line1: address || '',
                        city: city || '',
                        postal_code: postalCode || '',
                        country: country || ''
                    }
                });
                stripeCustomerId = customer.id;
            }

            const userData = {
                email: email.toLowerCase(),
                first_name: firstName,
                last_name: lastName,
                company: company || null,
                address: address || null,
                postal_code: postalCode || null,
                city: city || null,
                country: country || null,
                status: 'lead',
                subscription_type: 'monthly',
                language,
                stripe_customer_id: stripeCustomerId,
                is_verified: false
            };

            if (existingUser) {
                const { error } = await supabase
                    .from('users')
                    .update(userData)
                    .eq('id', existingUser.id);
                if (error) throw error;
                userId = existingUser.id;
            } else {
                const { data: newUser, error } = await supabase
                    .from('users')
                    .insert(userData)
                    .select()
                    .single();
                if (error) throw error;
                userId = newUser.id;
            }

            const currency = otherData.currency || 'eur';
            const amount = otherData.amount || 2500;

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: currency.toLowerCase(),
                automatic_payment_methods: { enabled: true },
                metadata: {
                    userEmail: email.toLowerCase(),
                    userName: `${firstName} ${lastName}`,
                    userId: userId
                },
                description: 'SyncVoice Medical - Monthly Subscription'
            });

            return res.json({
                success: true,
                requiresPayment: true,
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                userId: userId
            });
        }

        // Handle free version
        if (version === 'free') {
            if (!DEV_EMAILS.includes(email.toLowerCase())) {
                const { data: existingUser } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', email.toLowerCase())
                    .eq('subscription_type', 'free')
                    .single();

                if (existingUser) {
                    const trialStartDate = existingUser.trial_start_date || existingUser.created_at;
                    const daysSinceStart = Math.floor((new Date() - new Date(trialStartDate)) / (1000 * 60 * 60 * 24));

                    if (daysSinceStart < 7) {
                        const activationCode = crypto.randomBytes(3).toString('hex').toUpperCase();

                        await supabase
                            .from('users')
                            .update({
                                first_name: firstName,
                                last_name: lastName,
                                activation_code: activationCode,
                                language,
                                status: 'trial'
                            })
                            .eq('id', existingUser.id);

                        let activationLink = `${BASE_URL}/api/activate/${activationCode}?email=${encodeURIComponent(email)}&lang=${language}`;

                        const transporter = await createTransporter();
                        await transporter.sendMail({
                            from: `SyncVoice Medical <${process.env.EMAIL_USER}>`,
                            to: email,
                            subject: t.subject,
                            html: createActivationEmailHTML({
                                first_name: firstName,
                                last_name: lastName,
                                email,
                                activationCode,
                                activation_code: activationCode
                            }, activationLink, language)
                        });

                        return res.json({
                            success: true,
                            message: t.success,
                            userId: existingUser.id,
                            daysRemaining: 7 - daysSinceStart
                        });
                    } else {
                        await supabase
                            .from('users')
                            .update({ status: 'churned' })
                            .eq('id', existingUser.id);

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
            email: email.toLowerCase(),
            first_name: firstName,
            last_name: lastName,
            company: company || null,
            address: address || null,
            postal_code: postalCode || null,
            city: city || null,
            country: country || null,
            activation_code: activationCode,
            status: 'trial',
            subscription_type: 'free',
            trial_start_date: new Date().toISOString(),
            trial_end_date: expiryDate.toISOString(),
            language,
            is_verified: false
        };

        if (otherData.password) {
            userData.password_hash = await hashPassword(otherData.password);
        }

        // Check if dev email user exists
        let userId;
        if (DEV_EMAILS.includes(email.toLowerCase())) {
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('email', email.toLowerCase())
                .single();

            if (existingUser) {
                await supabase.from('users').update(userData).eq('id', existingUser.id);
                userId = existingUser.id;
            } else {
                const { data: newUser, error } = await supabase
                    .from('users')
                    .insert(userData)
                    .select()
                    .single();
                if (error) throw error;
                userId = newUser.id;
            }
        } else {
            const { data: newUser, error } = await supabase
                .from('users')
                .insert(userData)
                .select()
                .single();
            if (error) throw error;
            userId = newUser.id;
        }

        let activationLink = `${BASE_URL}/api/activate/${activationCode}?email=${encodeURIComponent(email)}&lang=${language}`;

        if (activationLink.includes('localhost') || activationLink.includes('127.0.0.1')) {
            activationLink = `https://www.syncvoicemedical.com/api/activate/${activationCode}?email=${encodeURIComponent(email)}&lang=${language}`;
        }

        const transporter = await createTransporter();

        await transporter.sendMail({
            from: `SyncVoice Medical <${process.env.EMAIL_USER}>`,
            to: email,
            subject: t.subject,
            html: createActivationEmailHTML({
                first_name: firstName,
                last_name: lastName,
                email,
                activationCode,
                activation_code: activationCode
            }, activationLink, language)
        });

        // Call n8n webhook
        try {
            await axios.post('https://n8n.srv1030172.hstgr.cloud/webhook/trial-signup', {
                email: email.toLowerCase(),
                firstName,
                lastName,
                version,
                source: otherData.source || 'website',
                signupDate: new Date().toISOString()
            }, { headers: { 'Content-Type': 'application/json' }, timeout: 5000 });
        } catch (webhookError) {
            logger.debug('n8n webhook non-critical error');
        }

        res.json({
            success: true,
            message: t.success,
            userId: userId,
            activationCode: activationCode,
            userEmail: email
        });

    } catch (error) {
        logger.error('Error in /api/send-activation:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Debug endpoint
app.get('/api/debug/db-info', async (req, res) => {
    try {
        const { count, error } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        res.json({
            database: {
                type: 'Supabase (PostgreSQL)',
                connected: !error,
                url: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : 'Not configured'
            },
            userCount: count || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Stripe webhook endpoint
app.post('/api/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];

    try {
        const event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                const userEmail = paymentIntent.metadata.userEmail;

                if (userEmail) {
                    const { data: user } = await supabase
                        .from('users')
                        .select('*')
                        .eq('email', userEmail.toLowerCase())
                        .single();

                    if (user) {
                        const activationCode = user.activation_code || crypto.randomBytes(3).toString('hex').toUpperCase();

                        await supabase
                            .from('users')
                            .update({
                                status: 'paid',
                                subscription_type: 'monthly',
                                subscription_start: new Date().toISOString(),
                                subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                                is_verified: true,
                                activation_code: activationCode
                            })
                            .eq('id', user.id);

                        logger.info(`User ${userEmail} converted to paid subscription`);

                        try {
                            await axios.post('https://n8n.srv1030172.hstgr.cloud/webhook/stripe-webhook', {
                                type: 'payment_succeeded',
                                email: userEmail,
                                amount: paymentIntent.amount / 100,
                                currency: paymentIntent.currency
                            });
                        } catch (webhookError) {
                            logger.debug('n8n webhook non-critical error');
                        }
                    }
                }
                break;

            case 'customer.subscription.deleted':
                const subscription = event.data.object;
                const customer = await stripe.customers.retrieve(subscription.customer);

                if (customer.email) {
                    await supabase
                        .from('users')
                        .update({ status: 'churned' })
                        .eq('email', customer.email.toLowerCase());

                    logger.info(`User ${customer.email} subscription cancelled`);
                }
                break;

            default:
                logger.info(`Unhandled Stripe event type: ${event.type}`);
        }

        res.json({received: true});

    } catch (err) {
        logger.error('Stripe webhook error:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

// Handle activation
app.get('/api/activate/:code', async (req, res) => {
    try {
        const dbState = await checkSupabaseConnection();
        if (!dbState.isConnected) {
            return res.status(503).send('Database unavailable. Please try again later.');
        }

        const { code } = req.params;
        const { email, lang } = req.query;

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .eq('activation_code', code)
            .single();

        if (error || !user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired activation code'
            });
        }

        // Check if expired
        const endDate = user.subscription_type === 'free' ? user.trial_end_date : user.subscription_end;
        if (endDate && new Date() > new Date(endDate)) {
            return res.status(400).json({
                success: false,
                message: 'Your subscription has expired'
            });
        }

        await supabase
            .from('users')
            .update({ is_verified: true })
            .eq('id', user.id);

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
            automatic_payment_methods: { enabled: true },
            metadata: { email, name },
            description: 'SyncVoice Medical - Monthly Subscription'
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        logger.error('Error creating payment intent:', error);
        res.status(500).json({
            error: 'Failed to create payment intent',
            details: error.message
        });
    }
});

// Login route
app.post('/api/login', async (req, res) => {
    try {
        const dbState = await checkSupabaseConnection();
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

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        if (!user.password_hash) {
            return res.status(401).json({
                success: false,
                message: 'Please complete your account setup. Contact support if needed.'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        if (!user.is_verified) {
            return res.status(401).json({
                success: false,
                message: 'Account not activated. Please check your email for activation instructions.'
            });
        }

        if (isSubscriptionExpired(user)) {
            return res.status(401).json({
                success: false,
                message: 'Your subscription has expired. Please renew to continue.'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        const endDate = user.subscription_type === 'free' ? user.trial_end_date : user.subscription_end;

        res.json({
            success: true,
            message: 'Login successful',
            token: token,
            userId: user.id,
            userEmail: user.email,
            userInfo: {
                firstName: user.first_name,
                lastName: user.last_name,
                version: user.subscription_type,
                daysRemaining: calculateDaysRemaining(endDate)
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
        logger.info('Payment successful:', paymentIntent.id);

        if (paymentIntent.metadata && paymentIntent.metadata.userId) {
            const { data: user } = await supabase
                .from('users')
                .select('*')
                .eq('id', paymentIntent.metadata.userId)
                .single();

            if (user) {
                const activationCode = user.activation_code || crypto.randomBytes(3).toString('hex').toUpperCase();

                await supabase
                    .from('users')
                    .update({
                        status: 'paid',
                        subscription_type: 'monthly',
                        subscription_start: new Date().toISOString(),
                        subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        is_verified: true,
                        activation_code: activationCode
                    })
                    .eq('id', user.id);

                logger.info(`User ${user.email} marked as paid and active`);

                // Send activation email
                const lang = user.language || 'en';
                const t = messages[lang] || messages.en;

                try {
                    let activationLink = `${BASE_URL}/api/activate/${activationCode}?email=${encodeURIComponent(user.email)}&lang=${lang}`;

                    const transporter = await createTransporter();

                    await transporter.sendMail({
                        from: `SyncVoice Medical <${process.env.EMAIL_USER}>`,
                        to: user.email,
                        subject: t.subject,
                        html: createActivationEmailHTML({
                            first_name: user.first_name,
                            last_name: user.last_name,
                            email: user.email,
                            activationCode,
                            activation_code: activationCode
                        }, activationLink, lang)
                    });

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
        logger.error('Payment failed:', failedPayment.id);

        if (failedPayment.metadata && failedPayment.metadata.userId) {
            await supabase
                .from('users')
                .update({ status: 'lead' })
                .eq('id', failedPayment.metadata.userId);
        }
    } catch (error) {
        logger.error('Error handling failed payment:', error);
    }
}

async function handleSuccessfulInvoice(invoice) {
    try {
        logger.info('Invoice payment successful:', invoice.id);

        if (invoice.customer) {
            const { data: user } = await supabase
                .from('users')
                .select('*')
                .eq('stripe_customer_id', invoice.customer)
                .single();

            if (user) {
                const activationCode = user.activation_code || crypto.randomBytes(3).toString('hex').toUpperCase();

                await supabase
                    .from('users')
                    .update({
                        status: 'paid',
                        subscription_start: new Date().toISOString(),
                        subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        is_verified: true,
                        activation_code: activationCode
                    })
                    .eq('id', user.id);

                logger.info(`Invoice paid for user ${user.email}`);
            }
        }
    } catch (error) {
        logger.error('Error handling successful invoice:', error);
    }
}

async function handleSubscriptionChange(subscription) {
    try {
        logger.info('Subscription changed:', subscription.id);

        if (subscription.customer) {
            const { data: user } = await supabase
                .from('users')
                .select('*')
                .eq('stripe_customer_id', subscription.customer)
                .single();

            if (user) {
                const updateData = {};

                if (subscription.status === 'active') {
                    updateData.status = 'paid';
                } else if (subscription.status === 'canceled') {
                    updateData.status = 'churned';
                }

                if (Object.keys(updateData).length > 0) {
                    await supabase
                        .from('users')
                        .update(updateData)
                        .eq('id', user.id);

                    logger.info(`Subscription updated for user ${user.email} to ${subscription.status}`);
                }
            }
        }
    } catch (error) {
        logger.error('Error handling subscription change:', error);
    }
}

// Email template
const createActivationEmailHTML = (user, activationLink, lang) => {
    const t = messages[lang] || messages.fr;
    const firstName = user.first_name || user.firstName || '';
    const lastName = user.last_name || user.lastName || '';
    const activationCode = user.activation_code || user.activationCode || '';

    const optionsSection = `
        <div style="background: linear-gradient(135deg, #e3f2fd, #bbdefb); border: 1px solid #2196F3; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1565C0; margin-top: 0; text-align: center;">
                ${lang === 'fr' ? '🎯 Choisissez votre méthode de travail' : '🎯 Choose your work method'}
            </h3>

            <div style="background: white; border-radius: 8px; padding: 15px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h4 style="color: #296396; margin: 0 0 10px 0;">
                    🌐 ${lang === 'fr' ? 'Option 1: Plateforme Web' : 'Option 1: Web Platform'}
                </h4>
                <p style="color: #666; margin: 10px 0;">
                    ${lang === 'fr'
                        ? 'Accédez à SyncVoice Medical depuis n\'importe quel navigateur.'
                        : 'Access SyncVoice Medical from any browser.'
                    }
                </p>
                <div style="text-align: center; margin: 15px 0;">
                    <a href="${activationLink}"
                       style="display: inline-block; background-color: #69B578; color: white; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold;">
                        ${lang === 'fr' ? '🚀 Lancer la plateforme web' : '🚀 Launch web platform'}
                    </a>
                </div>
            </div>

            <div style="background: white; border-radius: 8px; padding: 15px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h4 style="color: #296396; margin: 0 0 10px 0;">
                    💻 ${lang === 'fr' ? 'Option 2: Application Bureau' : 'Option 2: Desktop Application'}
                </h4>
                <p style="color: #666; margin: 10px 0;">
                    ${lang === 'fr'
                        ? 'Téléchargez l\'application Windows pour une intégration directe avec Word, Excel, PowerPoint.'
                        : 'Download the Windows application for direct integration with Word, Excel, PowerPoint.'
                    }
                </p>
                <div style="text-align: center; margin: 15px 0;">
                    <a href="${BASE_URL}/api/download-desktop?lang=${lang}&email=${encodeURIComponent(user.email)}&code=${activationCode}&source=email"
                       style="display: inline-block; background-color: #296396; color: white; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold;">
                        ${lang === 'fr' ? '⬇️ Télécharger pour Windows' : '⬇️ Download for Windows'}
                    </a>
                </div>
            </div>

            <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 12px; margin-top: 15px;">
                <p style="margin: 0; color: #856404; font-size: 14px; text-align: center;">
                    <strong>⚠️ ${lang === 'fr' ? 'Important' : 'Important'}:</strong><br>
                    ${lang === 'fr'
                        ? 'Votre code d\'activation <strong style="font-family: monospace; font-size: 16px; color: #296396;">' + activationCode + '</strong> fonctionne pour les DEUX options.'
                        : 'Your activation code <strong style="font-family: monospace; font-size: 16px; color: #296396;">' + activationCode + '</strong> works for BOTH options.'
                    }
                </p>
            </div>
        </div>
    `;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #296396, #69B578); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">SyncVoice Medical</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
                    ${lang === 'fr' ? 'Transcription Médicale Intelligente' : 'Intelligent Medical Transcription'}
                </p>
            </div>

            <div style="padding: 30px;">
                <p style="margin: 0 0 20px 0; font-size: 24px; color: #333333;">
                    ${t.greeting} ${firstName} ${lastName},
                </p>

                <p style="margin: 20px 0; color: #666666; line-height: 1.6;">
                    ${t.thankyou}
                </p>

                <div style="text-align: center; margin: 30px 0;">
                    <p style="color: #666; margin-bottom: 10px; font-size: 16px;">
                        ${t.codeLabel}
                    </p>
                    <div style="display: inline-block; background-color: #f8f9fa; border: 2px solid #69B578; padding: 20px 30px; border-radius: 8px;">
                        <span style="font-family: monospace; font-size: 32px; font-weight: bold; color: #296396; letter-spacing: 3px;">
                            ${activationCode}
                        </span>
                    </div>
                </div>

                ${optionsSection}

                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #856404;">
                        <strong>${lang === 'fr' ? '💡 Besoin d\'aide?' : '💡 Need help?'}</strong><br>
                        ${lang === 'fr'
                            ? 'Support technique: support@syncvoicemedical.com'
                            : 'Technical support: support@syncvoicemedical.com'
                        }
                    </p>
                </div>
            </div>

            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                <p style="margin: 0; color: #666; font-size: 14px;">
                    © 2025 SyncVoice Medical. ${lang === 'fr' ? 'Tous droits réservés.' : 'All rights reserved.'}
                </p>
            </div>
        </div>

        <img src="${BASE_URL}/api/email-open?email=${encodeURIComponent(user.email)}&campaign=trial_activation" width="1" height="1" style="display:none;" alt="">
    </body>
    </html>`;
};

// Version endpoint
app.get('/api/version', (req, res) => {
    res.json({
        version: '2.0.0-supabase',
        deployedAt: new Date().toISOString(),
        database: 'Supabase (PostgreSQL)',
        currentBaseUrl: BASE_URL,
        message: 'SyncVoiceMedical API v2.0.0 - Supabase Edition'
    });
});

// Check activation endpoint
app.get('/api/check-activation', async (req, res) => {
    try {
        const { email, code } = req.query;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email parameter required',
                usage: '/api/check-activation?email=user@example.com&code=ABC123'
            });
        }

        const dbState = await checkSupabaseConnection();
        if (!dbState.isConnected) {
            return res.status(503).json({
                success: false,
                message: 'Database connection unavailable'
            });
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (error || !user) {
            return res.json({
                success: false,
                diagnostic: {
                    emailFound: false,
                    message: `No user found with email: ${email}`
                }
            });
        }

        const endDate = user.subscription_type === 'free' ? user.trial_end_date : user.subscription_end;
        const isExpired = endDate ? new Date() > new Date(endDate) : true;

        const diagnostic = {
            emailFound: true,
            email: user.email,
            storedActivationCode: user.activation_code,
            providedCode: code || 'NOT PROVIDED',
            codeMatch: code ? (user.activation_code?.toUpperCase() === code.toUpperCase()) : 'NOT TESTED',
            isActive: user.is_verified,
            status: user.status,
            subscriptionType: user.subscription_type,
            isExpired,
            daysRemaining: calculateDaysRemaining(endDate),
            createdAt: user.created_at
        };

        let recommendation = '';
        if (!user.activation_code) {
            recommendation = 'No activation code set. User may need to re-register.';
        } else if (code && user.activation_code.toUpperCase() !== code.toUpperCase()) {
            recommendation = `Code mismatch! Expected: "${user.activation_code}", Received: "${code}".`;
        } else if (!user.is_verified) {
            recommendation = 'Account not activated. User needs to click the activation link.';
        } else if (isExpired) {
            recommendation = 'Account has expired. User needs to renew.';
        } else if (code && diagnostic.codeMatch) {
            recommendation = 'All checks passed! Code should work.';
        }

        diagnostic.recommendation = recommendation;

        return res.json({
            success: true,
            diagnostic
        });

    } catch (error) {
        logger.error('Diagnostic endpoint error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// User details route
app.get('/api/user-details/:email', async (req, res) => {
    try {
        const dbState = await checkSupabaseConnection();
        if (!dbState.isConnected) {
            return res.status(503).json({
                success: false,
                message: 'Database connection unavailable'
            });
        }

        const { email } = req.params;

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (error || !user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const endDate = user.subscription_type === 'free' ? user.trial_end_date : user.subscription_end;

        const userData = {
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            activationCode: user.activation_code,
            validationStartDate: user.subscription_start || user.trial_start_date || user.created_at,
            validationEndDate: endDate,
            version: user.subscription_type,
            isActive: user.is_verified,
            daysRemaining: calculateDaysRemaining(endDate)
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
                instructions: 'Add DEEPGRAM_API_KEY environment variable'
            });
        }

        const apiKey = process.env.DEEPGRAM_API_KEY;

        try {
            const response = await axios.get('https://api.deepgram.com/v1/projects', {
                headers: { 'Authorization': `Token ${apiKey}` },
                timeout: 10000
            });

            res.json({
                success: true,
                message: 'Deepgram API configured and accessible',
                hasApiKey: true,
                apiKeyPrefix: apiKey.substring(0, 8) + '...',
                apiStatus: 'connected',
                projectsCount: response.data?.projects?.length || 0
            });

        } catch (apiError) {
            res.json({
                success: false,
                message: 'Deepgram API key configured but connection failed',
                hasApiKey: true,
                apiStatus: 'error',
                error: apiError.response?.data || apiError.message
            });
        }

    } catch (error) {
        logger.error('Deepgram test error:', error);
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
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email.toLowerCase())
                .eq('activation_code', code)
                .single();

            if (error || !user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials. Please register first.'
                });
            }
        }

        const filePath = path.join(__dirname, 'public', 'downloads', 'SyncVoiceMedical-Setup.exe');

        if (!fs.existsSync(filePath)) {
            logger.error('Desktop installer file not found at:', filePath);
            return res.status(404).json({
                success: false,
                message: 'Desktop application file not found. Please contact support.'
            });
        }

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', 'attachment; filename="SyncVoiceMedical-Setup.exe"');

        res.download(filePath, 'SyncVoiceMedical-Setup.exe', (err) => {
            if (err) {
                logger.error('Error sending file:', err);
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        message: 'Error downloading file. Please try again.'
                    });
                }
            }
        });

    } catch (error) {
        logger.error('Desktop download error:', error);
        res.status(500).json({
            success: false,
            message: 'Download service temporarily unavailable.'
        });
    }
});

// Unsubscribe endpoint
app.get('/api/unsubscribe', async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).send('Email required');
        }

        await supabase
            .from('users')
            .update({ status: 'unsubscribed' })
            .eq('email', email.toLowerCase());

        res.redirect('/unsubscribed.html?email=' + encodeURIComponent(email));

    } catch (error) {
        logger.error('Unsubscribe error:', error);
        res.redirect('/error.html');
    }
});

// Keep alive ping (for free tier hosting)
if (process.env.NODE_ENV === 'production') {
    setInterval(() => {
        axios.get(`${BASE_URL}/healthz`)
            .then(() => logger.info('Keep-alive ping successful'))
            .catch(err => logger.error('Keep-alive ping failed:', err.message));
    }, 14 * 60 * 1000);
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

const server = app.listen(PORT, HOST, async () => {
    logger.info(`Server running on http://${HOST}:${PORT}`);
    logger.info('Environment:', process.env.NODE_ENV);
    logger.info('Database: Supabase (PostgreSQL)');
    const dbState = await checkSupabaseConnection();
    logger.info('Supabase Connection State:', dbState);
    logger.info('WebSocket server is ready on the same port');

    // Resume any incomplete email campaigns after startup
    setTimeout(() => {
        resumeIncompleteCampaigns();
    }, 5000); // Wait 5 seconds for full startup
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

    return languageMap[clientLanguage] || 'en';
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

                    logger.info(`🔐 Auth attempt - Email: ${email}, Code: ${activationCode ? activationCode.substring(0, 2) + '***' : 'missing'}`);

                    const { data: userByEmail, error: userError } = await supabase
                        .from('users')
                        .select('*')
                        .eq('email', email.toLowerCase())
                        .single();

                    if (userError || !userByEmail) {
                        logger.warn(`❌ Auth failed - No user found with email: ${email}`);
                        ws.send(JSON.stringify({
                            type: 'auth',
                            status: 'error',
                            message: 'No account found with this email'
                        }));
                        break;
                    }

                    const codeMatches = userByEmail.activation_code &&
                        userByEmail.activation_code.toUpperCase() === activationCode.toUpperCase();

                    if (!codeMatches) {
                        logger.warn(`❌ Auth failed - Code mismatch for ${email}`);
                        ws.send(JSON.stringify({
                            type: 'auth',
                            status: 'error',
                            message: 'Invalid activation code'
                        }));
                        break;
                    }

                    if (!userByEmail.is_verified) {
                        logger.warn(`❌ Auth failed - Account not activated for ${email}`);
                        ws.send(JSON.stringify({
                            type: 'auth',
                            status: 'error',
                            message: 'Account not activated. Please click the activation link in your email.'
                        }));
                        break;
                    }

                    if (isSubscriptionExpired(userByEmail)) {
                        logger.warn(`❌ Auth failed - Account expired for ${email}`);
                        ws.send(JSON.stringify({
                            type: 'auth',
                            status: 'error',
                            message: 'Your subscription has expired. Please renew to continue.'
                        }));
                        break;
                    }

                    connection.authenticated = true;
                    connection.email = email.toLowerCase();
                    connection.language = userByEmail.language || 'en';
                    connection.clientType = clientType || 'desktop';

                    const endDate = userByEmail.subscription_type === 'free' ? userByEmail.trial_end_date : userByEmail.subscription_end;
                    const daysRemaining = calculateDaysRemaining(endDate);

                    logger.info(`✅ Auth success - ${email} connected (${daysRemaining} days remaining)`);

                    ws.send(JSON.stringify({
                        type: 'auth',
                        status: 'success',
                        user: {
                            firstName: userByEmail.first_name,
                            lastName: userByEmail.last_name,
                            email: userByEmail.email,
                            daysRemaining
                        },
                        language: connection.language,
                        clientType: connection.clientType
                    }));
                    break;

                case 'updateLanguage':
                    if (!connection.authenticated) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
                        return;
                    }

                    const { language } = data;
                    if (language && ['fr', 'en', 'de', 'es', 'it', 'pt'].includes(language)) {
                        connection.language = language;
                        ws.send(JSON.stringify({ type: 'languageUpdated', language }));
                    } else {
                        ws.send(JSON.stringify({ type: 'error', message: 'Invalid language specified' }));
                    }
                    break;

                case 'startTranscription':
                    if (!connection.authenticated) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
                        return;
                    }

                    const transcriptionLanguage = data.language || connection.language || 'en';

                    if (['fr', 'en', 'de', 'es', 'it', 'pt'].includes(transcriptionLanguage)) {
                        connection.language = transcriptionLanguage;
                    }

                    connection.audioChunks = [];

                    ws.send(JSON.stringify({
                        type: 'transcriptionStarted',
                        clientType: connection.clientType,
                        language: connection.language
                    }));
                    break;

                case 'audioChunk':
                    if (!connection.authenticated) return;

                    const totalSize = connection.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
                    if (totalSize > MAX_AUDIO_SIZE) {
                        connection.audioChunks = [];
                        ws.send(JSON.stringify({ type: 'error', message: 'Audio size limit exceeded' }));
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
                    if (!connection.authenticated) return;

                    if (data.language && ['fr', 'en', 'de', 'es', 'it', 'pt'].includes(data.language)) {
                        connection.language = data.language;
                    }

                    try {
                        let audioBuffer = null;

                        if (data.audio && typeof data.audio === 'string') {
                            audioBuffer = Buffer.from(data.audio, 'base64');
                        } else {
                            ws.send(JSON.stringify({ type: 'transcriptionError', message: 'No audio data provided' }));
                            return;
                        }

                        logger.info(`Audio received from desktop client:`, {
                            bufferSize: audioBuffer.length,
                            mimeType: data.mimeType,
                            language: connection.language,
                            email: connection.email
                        });

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
                            logger.error('Deepgram API key not configured');
                            ws.send(JSON.stringify({ type: 'transcriptionError', message: 'Transcription service not configured' }));
                            return;
                        }

                        const deepgramLanguage = mapLanguageForDeepgram(connection.language);

                        let contentType = 'audio/webm';
                        let deepgramParams = `model=general&punctuate=true&smart_format=true&language=${deepgramLanguage}`;

                        if (data.mimeType) {
                            if (data.mimeType.includes('webm')) {
                                contentType = 'audio/webm';
                                deepgramParams += '&encoding=opus';
                            } else if (data.mimeType.includes('wav')) {
                                contentType = 'audio/wav';
                                deepgramParams += '&encoding=linear16&sample_rate=16000&channels=1';
                            } else if (data.mimeType.includes('mp3')) {
                                contentType = 'audio/mp3';
                            } else if (data.mimeType.includes('ogg')) {
                                contentType = 'audio/ogg';
                            }
                        }

                        if (deepgramLanguage === 'en') {
                            deepgramParams += '&detect_language=true';
                        }

                        const deepgramUrl = `https://api.deepgram.com/v1/listen?${deepgramParams}`;

                        logger.info('Sending to Deepgram:', { url: deepgramUrl, contentType, bufferSize: audioBuffer.length });

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
                        const results = response.data?.results;
                        if (results && results.channels && results.channels[0] &&
                            results.channels[0].alternatives && results.channels[0].alternatives[0]) {
                            transcript = results.channels[0].alternatives[0].transcript || '';
                        }

                        if (transcript && transcript.trim()) {
                            logger.info(`✅ Transcription successful: "${transcript.substring(0, 50)}..."`);
                            ws.send(JSON.stringify({
                                type: 'transcriptionResult',
                                transcript: transcript.trim(),
                                isFinal: true,
                                source: 'deepgram',
                                language: deepgramLanguage,
                                confidence: response.data?.results?.channels?.[0]?.alternatives?.[0]?.confidence || null
                            }));
                        } else {
                            logger.warn('Empty transcript returned from Deepgram');
                            ws.send(JSON.stringify({
                                type: 'transcriptionResult',
                                transcript: '',
                                isFinal: true,
                                source: 'deepgram',
                                message: 'No speech detected in audio'
                            }));
                        }

                    } catch (error) {
                        logger.error('Audio processing error:', { message: error.message });
                        ws.send(JSON.stringify({
                            type: 'transcriptionError',
                            message: 'Transcription failed: ' + error.message,
                            source: 'server'
                        }));
                    }
                    break;

                case 'stopTranscription':
                    if (!connection.authenticated) return;

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

                                const transcript = response.data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

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
            ws.send(JSON.stringify({ type: 'error', message: 'Server processing error' }));
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
            process.exit(0);
        });
    });
});

// Export for testing
module.exports = app;
