# SyncVoice Medical - Project Documentation

## Overview

SyncVoice Medical is a voice-to-text transcription platform for medical professionals. It transforms doctor dictation into structured medical reports in seconds, reducing documentation time by 70%.

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Speech-to-Text**: Deepgram API
- **Email (transactional)**: Nodemailer + Gmail SMTP (activation, password reset, payment confirmation)
- **Email (bulk campaigns)**: Resend API (doctor outreach, reminders) — EU region `eu-west-1`
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
| `/webhook` | POST | Handle Stripe webhook events (must be before express.json()) |

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

> **As of 2026-04-06, bulk campaigns are sent via Resend, not Gmail SMTP.** See the "Bulk Email via Resend" section below for provider-specific details, DNS setup, API key management, and the active doctor outreach campaign. The PowerShell commands and template/campaign-name conventions in this section still apply — only the underlying SMTP transport changed.

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

## Bulk Email via Resend (2026-04-06)

Bulk campaigns (`/api/admin/send-campaign`) are routed through **Resend** instead of Gmail SMTP. Transactional emails (activation, password reset, payment confirmation) still use Nodemailer/Gmail SMTP — only the `processCampaignQueue()` function in `server.js` uses Resend.

### Why Resend
Gmail SMTP has a 500/day hard limit that made bulk doctor outreach impractical. Resend Pro ($20/month) allows 50 000/month with no daily cap, handles SPF/DKIM automatically, and provides per-email delivery logs.

### Setup completed
- **Domain**: `syncvoicemedical.com` verified in Resend (EU region `eu-west-1`)
- **DNS records added to Scaleway/Dedibox** (zone `Vuvuzela_7pRzxCM6`):
  - `send` MX → `feedback-smtp.eu-west-1.amazonses.com` (priority 10)
  - `send` TXT → `"v=spf1 include:amazonses.com ~all"`
  - `resend._domainkey` TXT → DKIM key (long `p=MIGfMA0G...` string)
  - `_dmarc` TXT → `"v=DMARC1; p=none;"`
  - Note: TXT values in Dedibox must be wrapped in double quotes
- **Existing records preserved**: `www` CNAME, NS records — never delete these
- **Resend plan**: Pro ($20/month) — 50 000 emails/month
- **API key**: stored as `RESEND_API_KEY` in Render.com env vars

### Code changes (commits d5583e6, a557848)
- `package.json`: added `resend ^4.8.0`
- `server.js`:
  - Line 16: `const { Resend } = require('resend');`
  - Lines 298–306: Resend client initialized at startup; warns if `RESEND_API_KEY` missing
  - Constants: `CAMPAIGN_FROM = 'SyncVoice Medical <noreply@syncvoicemedical.com>'`, `CAMPAIGN_REPLY_TO = 'syncvoiceMedical@gmail.com'`
  - `processCampaignQueue()`: replaced `transporter.sendMail(...)` with `resend.emails.send({ from, to, replyTo, subject, html })`
  - Early-exit if `RESEND_API_KEY` not configured (marks job as failed)
  - Rate-limit detection updated: now checks for `rate_limit_exceeded`, `Too many requests`, `daily_quota_exceeded` (Resend) instead of Gmail 550-5.4.5 errors
  - Winston logging fixed: error messages were being silently dropped as metadata; now inlined into the log string

### Sender configuration
- **From**: `SyncVoice Medical <noreply@syncvoicemedical.com>`
- **Reply-To**: `syncvoiceMedical@gmail.com`
- Resend SDK v4.x uses camelCase `replyTo` (not snake_case `reply_to`)

### Monitoring Resend campaigns
- **Resend Logs**: https://resend.com/emails — per-email delivery events
- **Resend Metrics**: https://resend.com/metrics — aggregate bounce/complaint/open rates
- **Your dashboard**: https://syncvoicemedical.onrender.com/admin-email-stats.html
- **Render logs**: look for `Campaign <id>: Resend message id <uuid> for <email>` on each successful send

### Doctor outreach campaign — launched 2026-04-06
- **List**: 6438 GP doctors from Base-Emails (GDPR-compliant B2B French medical list)
- **Source file**: `C:\NTI\Dev\Base-Emails\Médecins en France_used\MEDECINS_MédecineGénéraleEtOrientationHoméopathie_2751_9751_7000InTotal.txt` (UTF-16 LE, CRLF)
- **Strategy**: 3-phase gradual rollout to protect brand-new domain reputation
  - **Phase 1 (warmup)**: 500 emails, `delayMinutes=5`, ~42h → campaign `doctors_fr_resend_warmup` — launched 2026-04-06, id `4a6822c5-6aa2-4d36-9eaf-c769677bc493`
  - **Phase 2 (scale)**: 2000 emails, `delayMinutes=3`, ~4.2 days → campaign `doctors_fr_resend_batch1` — pending Phase 1 checkpoint
  - **Phase 3 (full)**: 3938 emails, `delayMinutes=2`, ~5.5 days → campaign `doctors_fr_resend_batch2` — pending Phase 2 checkpoint
- **Total duration**: ~11.4 days
- **Checkpoint criteria before advancing phases**: bounce rate < 5%, complaint rate < 0.2%, delivery rate > 90%, Resend domain status still Verified

### Launch command pattern (PowerShell)
```powershell
$filePath = "C:\NTI\Dev\Base-Emails\Médecins en France_used\MEDECINS_MédecineGénéraleEtOrientationHoméopathie_2751_9751_7000InTotal.txt"
$allEmails = [string[]]((Get-Content $filePath | ForEach-Object { $_.Trim() }) | Where-Object { $_ -match "^[^\s@]+@[^\s@]+\.[^\s@]+$" })

# Slice per phase
$phase1 = $allEmails[0..499]        # 500 emails
$phase2 = $allEmails[500..2499]     # 2000 emails
$phase3 = $allEmails[2500..($allEmails.Count - 1)]  # 3938 emails

$body = @{
    emails = $phase1
    campaign = "doctors_fr_resend_warmup"
    delayMinutes = 5
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://syncvoicemedical.onrender.com/api/admin/send-campaign" -Method POST -Body $body -ContentType "application/json"
```

### Troubleshooting Resend issues
- **"API key is invalid" (401)**: `RESEND_API_KEY` in Render has a typo or stray whitespace. Regenerate key in Resend dashboard → API Keys, paste carefully into Render env vars.
- **Empty error message in Render logs**: fixed in commit a557848 — Winston was treating `sendError.message` as metadata. Errors now inlined into log strings.
- **Campaign stuck at `status: running` with progress `n/n`**: processor killed mid-loop by Render redeploy. Pause the campaign manually, then launch a fresh one (failed queue items are not retried automatically).
- **UTF-16 file encoding**: PowerShell `Get-Content` auto-detects BOM for UTF-16 LE — no conversion needed. Verify with `wc -l` before launching.

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
| `RESEND_API_KEY` | Resend API key for bulk campaign sending (Pro plan, EU region) |

## User Subscription Types

| Type | Duration | EUR | GBP |
|------|----------|-----|-----|
| Free Trial | 7 days | Free | Free |
| Monthly | recurring | €25/month | £25/month |
| Yearly | recurring | €250/year | £218/year |

User status flow: `lead → trial → paid → churned`

Currency is selected by language: `en` → GBP, all others (`fr`, `de`, `es`, `it`, `pt`) → EUR.

## Subscription Payment System (2026-04-28)

Paid signup creates a real **recurring Stripe Subscription**, not a one-off PaymentIntent. This was the rewrite that unblocked the conversion funnel after the doctor outreach campaign produced 0 paid users.

### Flow

1. **Form submit** (`POST /api/send-activation` with `version: 'paid'`):
   - Creates/updates a Stripe Customer
   - Hashes and stores password (`bcrypt` → `users.password_hash`)
   - Calls `stripe.subscriptions.create({ customer, items: [{price: priceId}], payment_behavior: 'default_incomplete', expand: ['latest_invoice.payment_intent'] })`
   - Returns `clientSecret` from `subscription.latest_invoice.payment_intent.client_secret`
2. **payment.html** (`/payment.html?clientSecret=...`):
   - Mounts Stripe Elements with the clientSecret
   - On submit, calls `stripe.confirmPayment(...)` — same code as before, no change needed for the subscription rework
3. **Stripe webhooks** (`POST /webhook`):
   - `payment_intent.succeeded` → **skipped** when part of a subscription invoice (avoids double-handling)
   - `invoice.payment_succeeded` → `handleSuccessfulInvoice` marks user `paid`, sets `subscription_end` from `invoice.lines[0].period.end`, sends activation email **only on first invoice** (`billing_reason === 'subscription_create'`)
   - `invoice.payment_failed` → `handleFailedInvoice` notifies user
   - `invoice.upcoming` → `handleUpcomingInvoice` sends 7-day warning (in practice this rarely fires soon enough — the cron does the work, see below)
   - `customer.subscription.created/updated/deleted` → `handleSubscriptionChange`

### Stripe configuration

- **Account**: `acct_1QgwsQP3dr2cRIwx` (SARL NTI MEASURE), live mode
- **Product**: `SyncVoiceMedical` (`prod_Ra7XhGppBh0oTX`)
- **Price IDs** (hard-coded in `STRIPE_PRICES` constant in server.js, near top):
  - Monthly EUR €25: `price_1QgxITP3dr2cRIwxjyrv5BEe`
  - Monthly GBP £25: `price_1Sn61bP3dr2cRIwxqGc9MmRX`
  - Yearly EUR €250: `price_1Sn62NP3dr2cRIwxP9vOgLpE`
  - Yearly GBP £218: `price_1Sn630P3dr2cRIwxnOVwcf6x`
- **Webhook endpoint**: `vibrant-radiance-snapshot` → `https://syncvoicemedical.onrender.com/webhook`, listens to all (~225) events, signing secret stored in Render env `STRIPE_WEBHOOK_SECRET`
- **API keys** in Render env: `STRIPE_SECRET_KEY` (`sk_live_…`) and `STRIPE_PUBLISHABLE_KEY` (`pk_live_…`). **Both must be from the same account** — the publishable key prefix (after `pk_live_` / `sk_live_`) encodes the account ID, so the first ~12 chars of each must match.

### Renewal warning cron (7 days before)

Stripe's `invoice.upcoming` webhook for auto-renewing subscriptions only fires a few hours before charge — too late for a 7-day warning. So a daily cron in server.js (`dailyRenewalWarnings`) does it instead:

- Runs 90 seconds after server startup, then every 24 hours
- Queries Supabase for `users` where `status='paid'` and `subscription_end` is in `[now+6 days, now+8 days]`
- Sends bilingual (FR/EN) renewal warning email via `createRenewalWarningEmailHTML`
- Dedup via `users.renewal_warning_sent_at` column (timestamptz, nullable). Skips users warned within the last 14 days, so each renewal cycle gets exactly one warning.
- Required Supabase column (added 2026-04-28): `ALTER TABLE users ADD COLUMN renewal_warning_sent_at timestamptz;`

### TODO — Stripe invoice configuration

Stripe doesn't yet send proper branded invoice PDFs to customers on each renewal. To set up:
- Stripe Dashboard → Settings → Business → Account details → fill SARL NTI MEASURE business info, VAT number, address
- Settings → Branding → upload logo, set brand colors (matches our teal `#0e7c86`)
- Settings → Customer emails → enable "Send finalized invoices to customers" so each renewal triggers a Stripe-sent invoice PDF
- Once enabled, our `handleSuccessfulInvoice` doesn't need to do anything extra — Stripe handles the PDF + email

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
