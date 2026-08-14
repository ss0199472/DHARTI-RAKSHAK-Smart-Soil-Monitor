# DHARTI-RAKSHAK Firebase Setup Guide

Follow these steps to set up the Firebase Realtime Database for your Smart Soil Monitor IoT project.

## Step 1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click on **"Add project"** (or create a new project).
3. Enter `dharti-rakshak-iot` as the project name (or a name of your choice).
4. You can disable Google Analytics for this project as it's not needed right now.
5. Click **"Create project"** and wait for it to finish.

## Step 2: Enable Realtime Database
1. In the left-hand menu of the Firebase console, expand the **Build** section and click on **Realtime Database**.
2. Click the **"Create Database"** button.
3. Choose a database location closest to you or your target users (e.g., `us-central1` or an Asia region). Click Next.
4. Select **"Start in test mode"**. This temporarily allows anyone to read/write to the database for 30 days. We will lock this down later.
5. Click **"Enable"**.

## Step 3: Get Database Credentials
1. Once the database is created, you will see a URL at the top of the Data tab (it looks like `https://your-project-id.firebaseio.com/` or `https://your-project-id.europe-west1.firebasedatabase.app/`).
2. **Copy this Database URL**.
3. Open your ESP32 project code and locate `firmware/config.h` (or wherever your configuration variables are stored).
4. Paste the URL into the appropriate constant:
   ```cpp
   #define FIREBASE_HOST "your-project-id-default-rtdb.firebaseio.com" // Remove https:// and trailing slash
   ```

## Step 4: Apply Security Rules
To ensure your database structure remains consistent and doesn't get corrupted by invalid data, apply validation rules.
1. In the Realtime Database section of the Firebase console, click on the **"Rules"** tab.
2. Open the `firebase-rules.json` file provided in the `docs` folder of this project.
3. Copy the contents of the `firebase-rules.json` file (specifically the development rules).
4. Paste the copied rules into the Firebase console text editor, replacing the existing default rules.
5. Click the **"Publish"** button.

## Step 5: Verify Data Flow
1. Flash your ESP32 with the updated firmware containing the Firebase configuration.
2. Open the **"Data"** tab in the Realtime Database console.
3. As the ESP32 connects and sends data, you should see the `dharti_rakshak` node appear and populate with `live_readings`, `historical_logs`, and `device_info`.
4. The data will highlight yellow and green as it updates in real-time.

## Step 6: Get the Web API Key (For Future Auth/Web App)
You'll need the Web API Key when building the dashboard or upgrading to authenticated ESP32 writes.
1. Click the **Gear icon** (Project settings) next to "Project Overview" in the top left menu.
2. In the "General" tab, look for **"Web API Key"**.
3. Copy this key and save it securely.

## Step 7: Optional Next Steps
*   **Firebase Hosting**: Later, when you build the web dashboard (using the Google Stitch prompt), you can use Firebase Hosting to easily deploy the website for free. Look under **Build > Hosting** to get started.
