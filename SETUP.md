# What's the Craic: hosted site setup

## What's in this folder

| File | What it does |
|---|---|
| `index.html` + `data.xxxx.js` | The app. The listings live in the data file so browsers cache them. |
| `privacy.html` | Privacy notice, linked from the app's footer. |
| `admin.html` | Your private page for approving events people send in. |
| `netlify/functions/tm-events.mjs` | Live Ticketmaster listings, refreshed hourly. |
| `netlify/functions/skiddle-events.mjs` | Live Skiddle listings, once you add a key. |
| `netlify/functions/admin-submissions.mjs`, `approved-events.mjs` | The approval step for submitted events. |
| `package.json` | Tells Netlify to install the storage library the approval step uses. |
| `_headers` | Caching rules. |
| `manifest.webmanifest`, icons | Let people add the app to their phone's home screen. |
| `sw.js` | Lets the app open offline with the last listings it saw. |
| `netlify.toml` | Tells Netlify where everything is. |

This folder is the whole site, ready to go. Because it includes server functions, it needs to go on Netlify through GitHub (dragging the folder onto Netlify only works for plain pages):

1. Make a free GitHub account if you don't have one, and create an empty repository called `whats-the-craic`.
2. Put these files in it (Claude can do this for you once the repository exists).
3. Make a free Netlify account, choose **Add new site > Import an existing project > GitHub**, and pick `whats-the-craic`. Leave the build settings as they are and press Deploy.
4. In Netlify, turn on form detection: Site configuration > Forms > Enable form detection. Then redeploy.

## Netlify settings

Site configuration > Environment variables. Add:

| Key | Value | Needed for |
|---|---|---|
| `TM_KEY` | Your Ticketmaster Consumer Key | Live Ticketmaster listings |
| `SKIDDLE_KEY` | Your Skiddle API key (when you have one) | Skiddle listings |
| `ADMIN_KEY` | A long password you make up | Signing in to `/admin.html` |
| `NETLIFY_API_TOKEN` | A personal access token from Netlify: User settings > Applications > New access token | Reading form submissions |

Redeploy after adding them.

## Checking it works

- `https://YOUR-SITE/api/tm-events` should show a list of events.
- `https://YOUR-SITE/api/skiddle-events` shows events once `SKIDDLE_KEY` is set. If titles or towns come back empty, Skiddle uses different field names from the ones guessed; ask Claude to adjust the function.
- `https://YOUR-SITE/admin.html`: type your `ADMIN_KEY`, then Approve or Remove submitted events. Approved events appear in the app within a minute.

## Ticketmaster affiliate links (optional)

If you join Ticketmaster's affiliate programme, find the line `const TM_AFFILIATE = '';` near the end of the data file and paste the deep-link format from your affiliate dashboard, with `{url}` where the event link goes. Ticketmaster links in the app will then go through it.

## Keeping the listings fresh

Ticketmaster and Skiddle update themselves. The Discover NI and whatsonni.com listings are a snapshot inside the data file: the weekly scheduled task refreshes the version inside Claude, and to bring the hosted site up to date, ask Claude to rebuild these files and redeploy.
