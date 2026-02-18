# Titans Budget Manager ⚾️💰

A comprehensive financial management tool for baseball teams. Track player fees, budgets, expenses, and sponsorships in one offline-capable Progressive Web App (PWA).

## 🚀 Features

-   **Roster Management**: Track players, coaches, and their specific fee packages (Full/Partial).
-   **Dynamic Budgeting**: Automatically calculates "Per Player Cost" based on tournaments, uniforms, and extra games.
-   **Ledger System**: Track payments (Cash, Check, Venmo) and visualize who is paid up or owes money.
-   **Sponsorship Integration**: Manage team sponsors and apply general funds to reduce player costs.
-   **Custom Fee Structures**: Flexible configuration for Uniforms, Coach Gear, and dynamic "Player Extras" (e.g., Bags, Hats).
-   **PDF Exports**: Generate professional reports for Budgets and Player Ledgers.
-   **Offline Capable**: Works without an internet connection once loaded.

---

## 📱 How to Install on Mobile (App Experience)

This application is a **Progressive Web App (PWA)**. You can install it on your phone for a native app-like experience (full screen, offline access).

### 🍎 iOS (iPhone/iPad)
1.  Open the application link in **Safari**.
2.  Tap the **Share Icon** (Square with an arrow pointing up) at the bottom.
3.  Scroll down and tap **"Add to Home Screen"**.
4.  Confirm the name and click **Add**.
5.  Launch the app from your home screen!

### 🤖 Android (Chrome)
1.  Open the application link in **Chrome**.
2.  Tap the **Three Dots Menu** (top right).
3.  Tap **"Install App"** (or "Add to Home Screen").
4.  Follow the prompts to install.
5.  Launch the app from your app drawer or home screen!

---

## 📖 Usage Guide

### 1. Setup (Gear Icon ⚙️)
Start here to configure your season.
-   **Team Details**: Set your Age Group (e.g., 18U) and Season Year.
-   **Fee Structure**: Define the base cost for "Full Uniform" and "Coach Packages".
-   **Player Extras**: Add optional items like "Team Bag" or "Helmet" that players can purchase.
-   **Organization Fees**: Add overhead costs (Insurance, Website, etc.) that are shared by the team.

### 2. Roster (Users Icon 👥)
Add your players and coaches.
-   **Add Person**: Click `+` to add a Player or Coach.
-   **Packages**: Select "Full" or "Partial" package.
-   **Extras**: Check any extra items they are purchasing (e.g., 3rd Jersey).
-   The app effectively calculates their individual "Share" of the budget.

### 3. Budget (Pie Chart Icon 🥧)
Plan your team's expenses.
-   **Tournaments**: Add tournaments with their entry fees.
-   **Expenses**: Add other costs like Equipment, Baseballs, or Umpire Fees.
-   **The "Gap"**: The app automatically calculates the difference between "Projected Cost" and "Collected Fees".

### 4. Ledger (Clipboard Icon 📋)
Track who has paid.
-   **Log Payment**: Click `+` to record a payment (Date, Amount, Method).
-   **Scoreboard**: See a visual breakdown of "Paid vs Owed" for each player.
-   **Shortfalls**: Quickly identify who is behind on payments.

### 5. Sponsors (Handshake Icon 🤝)
-   **Add Sponsor**: Track companies sponsoring the team.
-   **Contribution**: Sponsorship money reduces the "Per Player Cost" or covers team extras.

---

## 💻 Local Development

To run this project locally on your computer:

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/ddusky519/TitansBudgetManager.git
    cd TitansBudgetManager
    ```

2.  **Start a local server** (Python 3):
    ```bash
    python3 -m http.server 8000
    ```

3.  **Open in Browser**:
    Navigate to `http://localhost:8000`

*Note: This is a "No-Build" React application. It uses Babel standalone to compile JSX in the browser, making it incredibly easy to deploy and modify without complex build tools.*