# Dharti Rakshak — Web Dashboard Deployment Guide

## 1. Quick Local Testing
You can preview the dashboard locally with any static web server:
```bash
# Using Python
python -m http.server 8080

# Or using Node / npx
npx serve .
```
Then open `http://localhost:8080` in your web browser. The dashboard includes an interactive nature-tech simulation stream out-of-the-box so you can test all UI components immediately.

---

## 2. Deploying to Cloudflare Pages (Free & Instant)

### Method A: Cloudflare Dashboard (Drag & Drop or Git)
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Workers & Pages** $\rightarrow$ **Create Application** $\rightarrow$ **Pages**.
3. **Option 1 (Direct Upload)**: Drag and drop the `website/` folder. It will deploy globally across Cloudflare's edge in seconds.
4. **Option 2 (Connect to GitHub)**:
   - Connect your GitHub repository.
   - Set **Build output directory** to `website`.
   - Leave Build command empty (it's pure static HTML/CSS/ES Modules).
   - Click **Save and Deploy**.

### Method B: Deploy via Wrangler CLI
```bash
cd website
npx wrangler pages deploy . --project-name=dharti-rakshak
```

---

## 3. Connecting to Live Firebase
1. Open `website/js/firebase-config.js`.
2. Enter your Firebase project credentials into `firebaseConfig`:
   ```javascript
   export const firebaseConfig = {
     apiKey: "AIzaSyA5iOt3TL2ZOK42c-2N-Gu9Kz1TA12-vNg",
     authDomain: "dharti-rakshak-iot-59952.firebaseapp.com",
     databaseURL: "https://dharti-rakshak-iot-59952-default-rtdb.asia-southeast1.firebasedatabase.app",
     projectId: "dharti-rakshak-iot-59952",
     storageBucket: "dharti-rakshak-iot-59952.firebasestorage.app",
     messagingSenderId: "142965414553",
     appId: "1:142965414553:web:5a0b6947662622cdd8f608"
   };
   ```
3. Save the file. (This has already been pre-configured for you!)
