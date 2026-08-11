# Kids Screen Time Tracker

A simple, kid-friendly web app for tracking daily screen time. Designed to be added to an iPhone or iPad home screen so it feels like a native app.

**Children:** Jacob & Liam  
**Categories:** Video Games · TV Show · Movie  
**Daily limit:** 2 hours (120 minutes) total per child  
**Tracking:** Tap **+ 10 min** after watching (no timers — just honest documentation)  
**Persistence:** localStorage · automatically resets at **4:00 AM** local time

## How it works

- Each child has a running total for the day (shown with a progress bar).
- Time is logged in 10-minute increments against one of the three categories.
- Once the 120-minute total is reached, all buttons for that child are disabled.
- Data stays only on the device. No accounts or servers.

## How to use on iPad / iPhone

1. Open the live site in Safari.
2. Tap the Share button → **Add to Home Screen**.
3. Open it from the home screen icon — it launches full-screen without browser chrome.

## Live URL

Once GitHub Pages is enabled (Settings → Pages → Deploy from branch `main` / root):

`https://hatlestad.github.io/kids-screen-time/`

## Local testing

Just open `index.html` in a browser, or serve the folder with any static server.

---

Data never leaves the device. No accounts, no backend, no tracking.
