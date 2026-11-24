# Safarnama Education – Student App

Android + iPhone app for students of **Safarnama Education 5.0** (Dr. Humayra Aslam Sheikh).
Students log in with their email, join live Zoom classes, and watch each class recording for 24 hours.

| Part | Folder | Built with |
|---|---|---|
| Student app (Android + iOS) | `app/` | Expo / React Native |
| Database, logins, access rules | `supabase/` | Supabase (Postgres) |
| Admin panel for Humaira | lives in the website repo at `safarnama.club/admin/` | HTML + Supabase |
| Class recordings | — | Bunny Stream |
| Push notifications | — | Expo push service + Firebase (free) |
| Instant bug-fix updates | — | EAS Update (free up to 1,000 students/month) |
| Crash reports (optional) | — | Sentry (free plan) |

## How access works
- **Students only see what they paid for.** The database itself enforces this, not just the app.
- **Getting students in:** a Razorpay payment adds the buyer's email automatically. Humaira can also add anyone by hand in the admin panel.
- **Complete Course (₹11,000):** unlocks every programme.
- **Monthly programmes** (Project 60, Magic Book): access lasts 31 days per payment.
- **Recordings** disappear 24 hours after the class ends. Video links are signed and expire after 30 minutes.
- **One account = 2 phones.** The student's email moves across the video as a watermark, and screenshots are blocked on Android.
- **No prices or "buy" buttons in the app.** Apple and Google require this when selling happens on the website.

---

## One-time setup (≈ 1 hour)

### 1. Supabase (database + logins), free plan ✅ done 14 Nov 2026
Project `safarnama` (Mumbai): `https://mtcvkfyxxkurinfloazu.supabase.co` · all SQL below has been run.
1. Create a project at **supabase.com**. Name it `safarnama` and choose region **Mumbai (ap-south-1)**.
2. **SQL Editor** → New query → paste all of `supabase/migrations/20261111000000_init.sql` → **Run**.
3. New query → paste `supabase/migrations/20261113000000_push_and_settings.sql` → **Run**, then the same for `20261115000000_admin_emails.sql`.
4. New query → paste `supabase/seed.sql` → **Run**. This adds the 12 programmes and the December batch.
5. **Project Settings → API Keys**: the **publishable key** (`sb_publishable_…`) replaces the old "anon public" key. It's already in `app/src/lib/config.ts` and the website's `admin/config.js`.

### 2. Email sender ✅ done 15 Nov 2026
Resend domain `safarnama.club` (Tokyo) is verified, and its DNS records are in Namecheap. Supabase sends through `smtp.resend.com:465` as **login@safarnama.club**. Both code templates are set; codes are 6 digits and expire after 15 minutes; the limit is 100 emails/hour. The Resend API key is stored only in Supabase.

<details><summary>How it was set up (for reference)</summary>

(Required because Supabase's built-in sender only emails your own team.)
1. Create a free account at **resend.com** (3,000 emails/month free) or **brevo.com**.
2. Add the domain `safarnama.club`. Put the DNS records it shows into **Namecheap → Advanced DNS**, then wait for "Verified".
3. In Supabase → **Authentication → Emails → SMTP Settings**, turn on custom SMTP:
   - Host / port / user / password: from Resend or Brevo
   - Sender: `login@safarnama.club`, name `Safarnama Education`
4. **Authentication → Emails → Templates → Magic Link**:
   - Subject: `आपका Safarnama login code`
   - Body: paste `supabase/email-template.html`. It shows the code (`{{ .Token }}`) instead of a link.
5. **Authentication → Sign In / Providers → Email**: keep Email on. If the **Email OTP length** setting is shown, set it to **6**. The app accepts 6–8 digits either way.
6. **Authentication → Rate Limits**: raise "emails per hour" to around 100.
7. Also apply the same template to **Confirm sign up** (a new student's first code uses it), and set the **Email OTP expiration** to 900 seconds.
</details>

### 3. Make Humaira the admin ✅ done 15 Nov 2026
Admins are listed in the `admin_emails` table (migration `20261115000000_admin_emails.sql`). `humayrasheikh03@gmail.com` is on it, and her first code login at safarnama.club/admin creates her account as an admin. No passwords are involved.
To add another admin (SQL Editor):
```sql
insert into public.admin_emails values ('someone@example.com');
update public.profiles set is_admin = true where email = 'someone@example.com';
```

### 4. Bunny Stream (recordings) ✅ done 18 Nov 2026 (library 809902)
1. At **bunny.net** → Stream → **Add Video Library**. Name it `safarnama` and pick the Asia region.
2. Library → **API**: copy the **Library ID** and **API Key**.
3. Library → **Security**: turn on **Embed view token authentication**, then copy the **Token authentication key**. It is a different key from the API Key.

### 5. Deploy the backend functions ✅ done 18–22 Nov 2026 (deployed from the Supabase dashboard; includes `create-order`)
```bash
cd safarnama-app
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF      # the part before .supabase.co
npx supabase secrets set BUNNY_LIBRARY_ID=xxxx BUNNY_API_KEY=xxxx BUNNY_TOKEN_KEY=xxxx RAZORPAY_WEBHOOK_SECRET=choose-a-long-random-text
npx supabase functions deploy video-url bunny-upload razorpay-webhook delete-account send-push
```
`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are provided to functions automatically.

### 6. Admin panel ✅ connected
Open **https://safarnama.club/admin/** and log in with Humaira's email. This needs steps 2 and 3 first.

### 7. Razorpay → automatic enrolment ✅ done 23 Nov 2026
The website now takes payments itself: **Join** on safarnama.club calls the `create-order` function, which charges the price stored in the database and writes the programme into the order. The webhook enrols the buyer's email automatically. Secrets: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`. One-to-one sessions are still booked on WhatsApp.

### 8. Sarava Parihaara shop checkout (saravaparihaaraglobal.com)
The product website uses the same Razorpay account through a separate function, `shop-order`.
- **Prices live inside `supabase/functions/shop-order/index.ts`** (the browser sends only product ids and quantities). Free shipping. When a price changes, update it there **and** in the website's `assets/js/products.js`.
- Each Razorpay payment's **Notes** show the items, total, name, phone and delivery address. Fulfil orders from **Razorpay Dashboard → Transactions → Payments**.
- Shop orders are marked `type: shop`, and `razorpay-webhook` skips them, so they never create enrolments or show up as unmatched payments.
- Deploy: Supabase Dashboard → Edge Functions → **Deploy a new function → Via editor**, name `shop-order`, paste `shop-order/index.ts`, then turn **off** "Verify JWT" (Razorpay keys are already set as secrets). Redeploy `razorpay-webhook` after updating it.

Older notes (Payment Pages, only needed if you ever add one):
1. Razorpay Dashboard → **Accounts & Settings → Webhooks → Add new webhook**:
   - URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/razorpay-webhook`
   - Secret: the same text you used for `RAZORPAY_WEBHOOK_SECRET`
   - Event: **payment.captured**
2. In the admin panel → **Payments → Teach the matcher**: add each Payment Page ID (`pl_…`) with its programme.
   - The ₹11,000, ₹2,100 and ₹3,500 pages are matched by price automatically. The ₹999 pages need this step because several programmes cost ₹999.
   - Anything that can't be matched appears under **Payments** for one-click enrolment.

### 8. Link the app to Expo ✅ done 23 Nov 2026 (project `@safarnamaclubs-team/safarnama`, builds run from GitHub, base directory `/app`)
```bash
cd app
npx eas-cli@latest login
npx eas-cli@latest init                 # creates the Expo project and writes its ID into app.json
npx eas-cli@latest update:configure     # turns on instant updates (adds the updates URL to app.json)
```
Commit the changed `app.json`.

### 9. Push notifications: Android (Firebase, free) ✅ done 23 Nov 2026 (Firebase project `safarnamaclub-19edf`, FCM V1 key uploaded to Expo)
1. **console.firebase.google.com** → Add project `safarnama` (Analytics off).
2. Add an **Android app**. Package name: `club.safarnama.app`.
3. Download **google-services.json** and put it in the `app/` folder. It is picked up automatically.
4. Firebase → Project settings → **Service accounts** → **Generate new private key**. This downloads a JSON key; keep it private and don't commit it.
5. Upload that key to Expo: `npx eas-cli@latest credentials` → Android → production → **Google Service Account** → **Manage your Google Service Account Key for Push Notifications (FCM V1)** → choose the file.

iPhone needs no extra step: EAS sets up Apple's push key during the first iOS build.

### 10. Crash reports (optional, recommended) — not set up yet
1. **sentry.io** → free account → new **React Native** project → copy the **DSN**.
2. Add it to EAS so builds include it: `npx eas-cli@latest env:create --name EXPO_PUBLIC_SENTRY_DSN --value "https://...ingest.sentry.io/..." --environment production --environment preview --visibility plaintext`
3. Crashes then arrive by email with the screen and phone model. Student names and emails are never sent.

### 11. Run the app on your phone
```bash
cd app
npm install
npx expo start                 # scan the QR code with the Expo Go app
```
- To preview with sample data and no Supabase: `npm run demo`.
- **Expo Go can't receive push notifications.** To test them, install a preview build (next step) instead.

### 12. Build for the stores (no Mac needed) — first Android test APK built 23 Nov 2026; store builds pending
```bash
npx eas-cli@latest login                                   # free expo.dev account
npx eas-cli@latest build -p android --profile preview      # APK to share with test students
npx eas-cli@latest build -p all --profile production       # store builds
npx eas-cli@latest submit -p android                       # Google Play
npx eas-cli@latest submit -p ios                           # App Store
```
Accounts, in Humaira's name:
- **Google Play Console:** $25, one time
- **Apple Developer:** $99/year

For App Review, give both stores a **demo login**: a test email enrolled in one programme. In the review notes, explain that students enrol on safarnama.club or offline, and the app only gives them access.

---

## Sending fixes and updates later
| What changed | How it reaches students | Command |
|---|---|---|
| Database, access rules, backend functions, admin panel, website | Instantly. These run on servers. | `npx supabase functions deploy …` or push to GitHub |
| App screens, text, logic (JavaScript) | **Over-the-air**: downloads quietly and applies on the next app open. No store review. | `cd app && npx eas-cli@latest update --channel production --message "Fix login text"` |
| New native features, Expo SDK upgrade, app version change | New store build (Google review, usually under a day) | `eas build -p all --profile production` then `eas submit` |

To make everyone install a new store version, raise **More → Force app update** in the admin panel *after* the new version is live in the store.

## Everyday use (Humaira, admin panel)
- **Schedule classes:** Classes → choose the programme, title, date/time and Zoom link. Tick "repeat daily" for multi-day programmes.
- **After each class:** Recordings → choose the class → upload the Zoom recording. Students can watch it for 24 hours.
- **Cash / UPI students:** Students → Add a student.
- **Student changed phone:** More → Reset devices.
- **Notice for everyone:** More → Announcement. It shows at the top of the app home screen.
- **Push notification:** Notify → write a title and message → choose all students, one programme or one email → Send.
- **Automatic notifications:** a reminder 10 minutes before every class (scheduled on the phone), and "🎬 New recording" when a recording is uploaded.

## Development
- `app/` → `npm run typecheck`, `npm run demo`, `npm run export:web`
- `supabase/functions` → `deno test -A functions/tests.ts`
