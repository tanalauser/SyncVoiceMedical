# SyncVoice Medical - Project Documentation

## Overview

SyncVoice Medical is a voice-to-text transcription platform for medical professionals. It transforms doctor dictation into structured medical reports in seconds, reducing documentation time by 70%.

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Speech-to-Text**: Deepgram API
- **Email**: Nodemailer
- **Payments**: Stripe
- **Hosting**: Render.com (auto-deploys from GitHub)
- **Auth**: JWT + Google OAuth
- **Real-time**: WebSocket (for desktop client)
- **Logging**: Winston

## Key Features

### 1. Multi-Language Support
- Supported languages: French (fr), English (en), German (de), Spanish (es), Italian (it), Portuguese (pt)
- Language detection priority:
  1. URL parameter (`?lang=fr`)
  2. localStorage preference
  3. Country-based detection (via IP geolocation)
  4. Browser language
  5. Default: English

### 2. Currency Display
- French/German/Spanish/Italian/Portuguese users: EUR (€)
- English users: GBP (£)

### 3. Country-to-Language Mapping
Located in `public/languageDetection.js`:
- French-speaking: FR, BE, CH, CA, LU, MC, and African countries (SN, CI, MA, DZ, TN, etc.)
- English-speaking: GB, US, AU, NZ, IE, and others
- See file for complete mapping

## API Endpoints

### Health & Status
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/healthz` | GET | Basic health check |
| `/api/health` | GET | Detailed health status |
| `/api/status` | GET | Server status with Supabase connection info |
| `/api/config` | GET | Client configuration |
| `/api/stripe-config` | GET | Stripe public key configuration |
| `/api/version` | GET | Version information |

### Authentication & Account Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/send-activation` | POST | Register user and create Stripe payment intent |
| `/api/login` | POST | User login with email/password |
| `/api/activate/:code` | GET | Activate account with verification code |
| `/api/check-activation` | GET | Check if email is activated |
| `/api/check-email` | POST | Verify email and check trial status |
| `/api/user-details/:email` | GET | Get user details by email |
| `/api/forgot-password` | POST | Request password reset |
| `/api/reset-password` | POST | Reset password with token |

### Payment & Billing
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/create-payment-intent` | POST | Create Stripe payment intent |
| `/api/stripe-webhook` | POST | Handle Stripe webhook events |

### Email Campaign Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/send-campaign` | POST | Send email campaign with delay scheduling |
| `/api/admin/campaigns` | GET | List all campaigns |
| `/api/admin/campaign-status/:campaignId` | GET | Check specific campaign progress |
| `/api/admin/campaign-resume/:campaignId` | POST | Resume paused campaign |
| `/api/admin/campaign-pause/:campaignId` | POST | Pause running campaign |
| `/api/admin/email-events-debug` | GET | Debug raw email events data |
| `/api/admin/email-stats` | GET | Email stats dashboard |
| `/api/admin/subscription-stats` | GET | Subscription analytics (revenue, MRR/ARR) |
| `/api/detect-churns` | POST | Detect expired subscriptions |

### Tracking & Analytics
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/track/click` | GET | Track email link clicks |
| `/api/track/open` | GET | Track email opens (1x1 pixel) |
| `/api/analytics/summary` | GET | Conversion funnel analytics |
| `/api/unsubscribe` | GET | Handle email unsubscribe |

### Desktop Client
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/download-desktop` | GET | Desktop client download |
| `/api/test-deepgram` | GET | Test Deepgram API connectivity |

## Email Campaign System

### Email Templates

**Email 1 (Initial)** - `getCampaignEmailHtml()`
- Subject: "Gagnez 2 heures par jour sur vos comptes-rendus médicaux"
- Campaign names: `doctors_fr_v2`, `doctors_fr_new`, etc. (no "reminder/email2/followup")

**Email 2 (Soft Reminder)** - `getCampaignEmail2Html()`
- Subject: "Avez-vous vu notre démo de 2 minutes ?"
- Campaign names: Must contain `reminder`, `email2`, or `followup`
- Example: `doctors_fr_v2_reminder`

### PowerShell Commands

**Send Email 1 (Initial Campaign):**
```powershell
$emailList = [string[]](Get-Content "D:\Path\To\emails.txt" | Where-Object { $_ -match "@" })

$body = @{
    emails = $emailList
    campaign = "doctors_fr_v2"
    delayMinutes = 10
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://syncvoicemedical.onrender.com/api/admin/send-campaign" -Method POST -Body $body -ContentType "application/json"
```

**Send Email 2 (Follow-up):**
```powershell
$emailList = [string[]](Get-Content "D:\Path\To\emails.txt" | Where-Object { $_ -match "@" })

$body = @{
    emails = $emailList
    campaign = "doctors_fr_v2_reminder"
    delayMinutes = 10
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://syncvoicemedical.onrender.com/api/admin/send-campaign" -Method POST -Body $body -ContentType "application/json"
```

### Campaign Management Commands

```powershell
# Check all campaigns status
Invoke-RestMethod -Uri "https://syncvoicemedical.onrender.com/api/admin/campaigns" -Method GET | ConvertTo-Json -Depth 5

# Check specific campaign status
Invoke-RestMethod -Uri "https://syncvoicemedical.onrender.com/api/admin/campaign-status/<campaignId>" -Method GET | ConvertTo-Json

# Resume a paused/stuck campaign
Invoke-RestMethod -Uri "https://syncvoicemedical.onrender.com/api/admin/campaign-resume/<campaignId>" -Method POST

# Pause a running campaign
Invoke-RestMethod -Uri "https://syncvoicemedical.onrender.com/api/admin/campaign-pause/<campaignId>" -Method POST

# Debug email events (check raw data)
Invoke-RestMethod -Uri "https://syncvoicemedical.onrender.com/api/admin/email-events-debug?limit=50" -Method GET | ConvertTo-Json -Depth 5

# Check subscription stats
Invoke-RestMethod -Uri "https://syncvoicemedical.onrender.com/api/admin/subscription-stats" -Method GET | ConvertTo-Json -Depth 5
```

### Campaign Auto-Resume

Campaigns automatically resume on server restart via `resumeIncompleteCampaigns()`. If campaigns appear stuck:
1. Check status with `/api/admin/campaigns`
2. If status is "running" but progress isn't advancing, the server may have restarted
3. Make any API request to wake the server - auto-resume triggers 5 seconds after startup
4. Or manually resume with `/api/admin/campaign-resume/<campaignId>`

### Email Tracking

All email links are tracked via `/api/track/click`:
- `video_cta` - Watch Demo Button (Email 1)
- `video_reminder` - Watch Demo Button (Email 2)
- `main_cta` - Start Trial Button (Email 1)
- `trial_reminder` - Start Trial Button (Email 2)
- `unsubscribe` - Unsubscribe Link

Open tracking via 1x1 pixel: `/api/track/open`

Note: Emails containing `nicolas.tanala` are filtered from stats display.

## WebSocket / Desktop Client

The desktop client uses WebSocket for real-time transcription.

### WebSocket Message Types

| Message | Direction | Description |
|---------|-----------|-------------|
| `auth` | Client → Server | Authenticate with email and activation code |
| `updateLanguage` | Client → Server | Change transcription language |
| `startTranscription` | Client → Server | Initialize transcription session |
| `audioChunk` | Client → Server | Stream audio data (base64 encoded) |
| `audioComplete` | Client → Server | Submit complete audio file |
| `stopTranscription` | Client → Server | Stop streaming and process audio |

### Supported Audio Formats
- WebM, WAV, MP3, OGG

### Deepgram Language Mapping
| Client Language | Deepgram Code |
|-----------------|---------------|
| French (fr) | fr |
| English (en) | en-US |
| German (de) | de |
| Spanish (es) | es |
| Italian (it) | it |
| Portuguese (pt) | pt |

## Admin Pages

### Email Stats Dashboard
URL: `https://syncvoicemedical.onrender.com/admin-email-stats.html`

Displays:
- Total emails sent, opens, clicks
- Open rate, click-through rate, conversion rate
- Campaign breakdown table
- Clicks by link type

## Key Files

| File | Purpose |
|------|---------|
| `server.js` | Main Express server, email templates, API endpoints |
| `config/supabase.js` | Supabase client initialization |
| `config/stripe.js` | Stripe helper functions |
| `utils/generateCode.js` | Activation code generation |
| `public/languageDetection.js` | Language detection module |
| `public/index.js` | Homepage logic, currency detection |
| `public/form.js` | Registration form logic |
| `public/appForm.js` | Application form with transcription |
| `public/appForm.html` | Main application form |
| `public/admin-email-stats.html` | Email campaign statistics dashboard |
| `desktop-client/` | Electron desktop application |

## Deployment

Push to GitHub master branch triggers automatic deployment on Render.com:
```bash
git add .
git commit -m "Your commit message"
git push origin master
```

## Environment Variables

All environment variables are configured in the **Render.com dashboard** (not local .env).

Required variables:
| Variable | Description |
|----------|-------------|
| `DEEPGRAM_API_KEY` | Speech-to-text API key |
| `EMAIL_USER` | SMTP email address |
| `EMAIL_PASS` | SMTP password |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key (RLS bypass) |
| `JWT_SECRET` | JWT signing secret |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_PRICE_ID` | Subscription price ID |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook validation |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `BASE_URL` | Application base URL |

## User Subscription Types

| Type | Duration | Price |
|------|----------|-------|
| Free Trial | 7 days | Free |
| Monthly | 30 days | €29/month |
| Yearly | 365 days | €199/year |

User status flow: `lead → trial → paid → churned`

## Troubleshooting

### DNS Resolution Errors
**Error:** `The remote name could not be resolved: 'syncvoicemedical.onrender.com'`

**Causes:**
- Temporary network/DNS glitch
- Render free tier cold start (service sleeping)
- Internet connectivity issues

**Solutions:**
1. Wait a few seconds and retry
2. Open the URL in a browser first to wake the server
3. Check internet connectivity with `Test-Connection google.com`

### Campaign Stuck After Server Restart
If campaigns show "running" status but progress isn't advancing:
- Server restarts clear the in-memory `activeProcessors` Set
- Auto-resume runs 5 seconds after startup
- If auto-resume fails, manually resume via `/api/admin/campaign-resume/<campaignId>`

### Supabase 1000-Row Limit
Supabase enforces a server-side limit of 1000 rows per query.
The email-stats endpoint uses pagination with `.range()` to fetch all records.

### Deployments Interrupt Campaigns
Each `git push` triggers a Render deployment that restarts the server.
Campaigns will auto-resume after deployment completes.

### Render Free Tier Cold Starts
Free Render services spin down after 15 minutes of inactivity. First request after sleep may take 30-60 seconds.

## Rate Limiting

The server implements rate limiting:
- General API limiter on `/api/*`
- Auth-specific limiter on login, signup, forgot-password endpoints
