# 💸 Cashly — Simple Money Tracking

**Cashly** is a lightweight, modern, and secure personal finance tracking system designed for clarity, performance, and long-term reliability. Built using **pure HTML, CSS, and Vanilla JavaScript**, Cashly uses a **serverless Google Apps Script JSON API** with **Google Sheets** as its cloud-native datastore.

The application adopts a refined **glassmorphism-inspired UI**, emphasizing readability, soft contrast, and a distraction-free experience. Its minimal architecture ensures fast loading, predictable behavior, and easy maintenance without relying on heavy frameworks.

---

## 🏛 System Architecture

Cashly is built on a clean **two-layer architecture** that clearly separates presentation logic from data processing.

### 1. Backend — Google Apps Script (JSON API)

Acts as a stateless API layer between the frontend and Google Sheets.

**Core Responsibilities**

- **CRUD Transaction Handling**  
  Add, edit, and delete financial records with strict validation.

- **Hashed PIN Authentication**  
  PIN is **hashed client-side (SHA-256)** and stored as a hash only — the raw PIN is never saved or transmitted.

- **Automated Balance Calculation**  
  Running balances are calculated using **ARRAYFORMULA, MAP, and LAMBDA**, ensuring consistency and eliminating manual recalculation.

- **Dynamic Configuration**  
  Application title, subtitle, profile photo, parties, and categories are configurable via the `.Settings` sheet.

- **Serverless Deployment**  
  No infrastructure management — fully managed by Google Apps Script.

---

## 🎨 Design Philosophy

- **Clarity First** — Financial data must be readable at a glance
- **Minimal by Default** — No unnecessary UI elements
- **Soft Interactions** — Calm animations and transitions
- **Predictable Behavior** — No hidden automation or background mutations

---

### 2. Frontend — HTML5, CSS3, Vanilla JavaScript

A performance-oriented interface built without frameworks, optimized for speed and predictability.

**Interface Highlights**

- **Glassmorphism Design System**  
  Subtle transparency, blur, and soft shadows for a modern, premium feel.

- **PIN-Based Lock Screen**  
  Application remains locked until PIN verification succeeds.

- **Background Data Preloading**  
  Transaction data and metadata are fetched **while the lock screen is active**, allowing instant access after unlock.

- **SweetAlert2 Notification Layer**  
  Clean, consistent user feedback replacing native browser alerts.

---

## 🔐 Security Model

- PIN is **never stored or transmitted in plain text**
- Only a **SHA-256 hash** is saved in the `.Settings` sheet
- PIN verification is performed entirely on the client using the stored hash
- Backend remains stateless and does not handle authentication logic

---

## 🧩 Functional Overview

| Layer          | Responsibility                         | Technology                     |
|---------------|----------------------------------------|--------------------------------|
| Logic          | API routing & data processing           | Google Apps Script             |
| Interface      | UI rendering & user interaction         | HTML5, CSS3, Vanilla JS        |
| Storage        | Persistent cloud datastore              | Google Sheets                  |
| Authentication | Client-side PIN hash verification       | SHA-256 (Web Crypto API)       |
| Notifications  | User feedback & confirmations           | SweetAlert2                    |

---

## ⚙️ API Endpoints

### GET Requests

| Action        | Description                                   |
|---------------|-----------------------------------------------|
| `getOptions`  | Fetch app metadata and PIN hash               |
| `getSheets`   | Retrieve available transaction sheets         |
| `getData`     | Fetch transactions and current balances       |

---

### POST Requests

| Action        | Description                                   |
|---------------|-----------------------------------------------|
| `add`         | Add new transaction                           |
| `edit`        | Edit existing transaction                    |
| `delete`      | Delete transaction                            |
| `saveOptions` | Update app configuration                     |

---

## 🚀 Deployment

### Backend Setup

1. Open your Google Sheet
2. Open **Extensions → Apps Script**
3. Paste the provided `Code.gs`
4. Deploy as **Web App**
   - Execute as: **Me**
   - Access: **Anyone**
5. Copy the generated Web App URL

---

### Frontend Setup

1. Place `index.html`, `style.css`, and `script.js` in your project directory
2. Append your Apps Script **deployment ID** as a query parameter: `?config=YOUR_DEPLOYMENT_ID`
3. Serve the frontend as a `static web application`

---

## 📄 License

This project is released as open-source software.

Built with precision.  
Designed with restraint.
