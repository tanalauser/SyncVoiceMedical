# SyncVoice Medical - Project Documentation

## Overview

SyncVoice Medical is a voice-to-text transcription platform for medical professionals. It transforms doctor dictation into structured medical reports in seconds, reducing documentation time by 70%.

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Email**: Nodemailer
- **Payments**: Stripe
- **Hosting**: Render.com (auto-deploys from GitHub)
- **Auth**: JWT + Google OAuth

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

**Check all campaigns status:**
```powershell
Invoke-RestMethod -Uri "https://syncvoicemedical.onrender.com/api/admin/campaigns" -Method GET | ConvertTo-Json -Depth 5
```

**Check specific campaign status:**
```powershell
Invoke-RestMethod -Uri "https://syncvoicemedical.onrender.com/api/admin/campaign-status/<campaignId>" -Method GET | ConvertTo-Json
```

**Resume a paused/stuck campaign:**
```powershell
Invoke-RestMethod -Uri "https://syncvoicemedical.onrender.com/api/admin/campaign-resume/<campaignId>" -Method POST
```

**Pause a running campaign:**
```powershell
Invoke-RestMethod -Uri "https://syncvoicemedical.onrender.com/api/admin/campaign-pause/<campaignId>" -Method POST
```

**Debug email events (check raw data):**
```powershell
Invoke-RestMethod -Uri "https://syncvoicemedical.onrender.com/api/admin/email-events-debug?limit=50" -Method GET | ConvertTo-Json -Depth 5
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

## Admin Pages

### Email Stats Dashboard
URL: `https://syncvoicemedical.onrender.com/admin-email-stats.html`

Displays:
- Total emails sent, opens, clicks
- Open rate, click-through rate, conversion rate
- Campaign breakdown table
- Clicks by link type

Note: Emails containing `nicolas.tanala` are filtered from stats display.

## Key Files

| File | Purpose |
|------|---------|
| `server.js` | Main Express server, email templates, API endpoints |
| `public/languageDetection.js` | Language detection module |
| `public/index.js` | Homepage logic, currency detection |
| `public/appForm.html` | Main application form |
| `public/appForm.js` | Application form logic |
| `public/admin-email-stats.html` | Email campaign statistics dashboard |

## Deployment

Push to GitHub master branch triggers automatic deployment on Render.com:
```bash
git add .
git commit -m "Your commit message"
git push origin master
```

## Recent Achievements

1. **Language Detection Fix**: Added `languageDetection.js` to `appForm.html` to fix "Parler en anglais" issue
2. **Currency Display**: Fixed to show GBP (£) for English users
3. **Country Mapping**: Added comprehensive French and English-speaking country lists
4. **Email 2 Template**: Created soft reminder email with testimonial and improved button styling
5. **Stats Dashboard**: Updated to show Email 2 click types separately
6. **Campaign System**: Template selection based on campaign name pattern
7. **Email Stats Pagination**: Fixed Supabase 1000-row limit issue with pagination
8. **Email Open Tracking**: Fixed `supabase.rpc().catch` syntax error
9. **Email Events Logging**: Added error logging for email_events insert failures

## Known Issues & Fixes

### Supabase 1000-Row Limit
Supabase enforces a server-side limit of 1000 rows per query (ignores client `.limit()`).
The email-stats endpoint uses pagination with `.range()` to fetch all records.

### Campaign Stuck After Server Restart
If campaigns show "running" status but progress isn't advancing:
- Server restarts clear the in-memory `activeProcessors` Set
- Auto-resume runs 5 seconds after startup
- If auto-resume fails, manually resume via API

### Deployments Interrupt Campaigns
Each `git push` triggers a Render deployment that restarts the server.
Campaigns will auto-resume after deployment completes.

## Environment Variables

Required in `.env`:
- `EMAIL_USER` - SMTP email address
- `EMAIL_PASS` - SMTP password
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon key
- `JWT_SECRET` - JWT signing secret
- `STRIPE_SECRET_KEY` - Stripe API key
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth secret
