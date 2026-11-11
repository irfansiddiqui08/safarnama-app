# Safarnama Education – Student App

Android + iPhone app for students of **Safarnama Education 5.0** (Dr. Humayra Aslam Sheikh).
Students log in with their email, join live Zoom classes, and watch each class recording for 24 hours.

| Part | Folder | Built with |
|---|---|---|
| Student app (Android + iOS) | `app/` | Expo / React Native |
| Database, logins, access rules | `supabase/` | Supabase (Postgres) |
| Admin panel for Humaira | lives in the website repo at `safarnama.club/admin/` | HTML + Supabase |
| Class recordings | — | Bunny Stream |

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

### 1. Supabase (database + logins), free plan
1. Create a project at **supabase.com**. Name it `safarnama` and choose region **Mumbai (ap-south-1)**.
2. **SQL Editor** → New query → paste all of `supabase/migrations/20261111000000_init.sql` → **Run**.
3. New query → paste `supabase/seed.sql` → **Run**. This adds the 12 programmes and the December batch.
4. **Project Settings → API**: copy the **Project URL** and the **anon public** key. You'll need them in steps 6 and 7.

### 2. Email sender (required: Supabase's built-in sender only emails your own team)
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

### 3. Make Humaira the admin
1. **Authentication → Users → Add user**: enter Humaira's email and turn on "Auto confirm".
2. SQL Editor:
   ```sql
   update public.profiles set is_admin = true where email = 'humayrasheikh03@gmail.com';
   ```

### 4. Bunny Stream (recordings)
1. At **bunny.net** → Stream → **Add Video Library**. Name it `safarnama` and pick the Asia region.
2. Library → **API**: copy the **Library ID** and **API Key**.
3. Library → **Security**: turn on **Embed view token authentication**, then copy the **Token authentication key**. It is a different key from the API Key.

### 5. Deploy the backend functions (from your computer)
```bash
cd safarnama-app
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF      # the part before .supabase.co
npx supabase secrets set BUNNY_LIBRARY_ID=xxxx BUNNY_API_KEY=xxxx BUNNY_TOKEN_KEY=xxxx RAZORPAY_WEBHOOK_SECRET=choose-a-long-random-text
npx supabase functions deploy video-url bunny-upload razorpay-webhook delete-account
```
`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are provided to functions automatically.

### 6. Admin panel
In the **website repo**, edit `admin/config.js` and paste in the Project URL and anon key. Then open **https://safarnama.club/admin/** and log in with Humaira's email.

### 7. Razorpay → automatic enrolment
1. Razorpay Dashboard → **Accounts & Settings → Webhooks → Add new webhook**:
   - URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/razorpay-webhook`
   - Secret: the same text you used for `RAZORPAY_WEBHOOK_SECRET`
   - Event: **payment.captured**
2. In the admin panel → **Payments → Teach the matcher**: add each Payment Page ID (`pl_…`) with its programme.
   - The ₹11,000, ₹2,100 and ₹3,500 pages are matched by price automatically. The ₹999 pages need this step because several programmes cost ₹999.
   - Anything that can't be matched appears under **Payments** for one-click enrolment.

### 8. Run the app on your phone
```bash
cd app
cp .env.example .env           # paste the Supabase URL + anon key
npm install
npx expo start                 # scan the QR code with the Expo Go app
```
To preview with sample data and no Supabase: `npm run demo`.

### 9. Build for the stores (no Mac needed)
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

## Everyday use (Humaira, admin panel)
- **Schedule classes:** Classes → choose the programme, title, date/time and Zoom link. Tick "repeat daily" for multi-day programmes.
- **After each class:** Recordings → choose the class → upload the Zoom recording. Students can watch it for 24 hours.
- **Cash / UPI students:** Students → Add a student.
- **Student changed phone:** More → Reset devices.
- **Notice for everyone:** More → Announcement. It shows at the top of the app home screen.

## Development
- `app/` → `npm run typecheck`, `npm run demo`, `npm run export:web`
- `supabase/functions` → `deno test -A functions/tests.ts`
