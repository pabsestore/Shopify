# Pabs Shopify Workspace

A small, self-healing workspace for talking to **Pabs eStore** through the
Shopify Admin API — designed to run on *both* of your devices (this PC and the
Ubuntu/Termux tablet) with nothing to keep in sync except the code.

```
AI/
├── .env              your secrets — per-device, NEVER in git
├── .env.example      template for creating .env on a new device
├── .gitignore        keeps secrets out of git
├── shopify.js        the helper: mint → cache → refresh → retry
├── shopify-token.js  CLI: `node shopify-token.js status`
├── test.js           connectivity test
├── setup-device.sh   bootstrap script for a new device
├── scripts/          (future) your business scripts
└── README.md         this file
```

---

## 1 · Everyday commands

```bash
node shopify-token.js status          # is my token valid? when does it expire?
node shopify-token.js status --force  # force-mint a fresh token now
node test.js                          # verify the connection works
node my-script.js                     # run any script that requires('./shopify')
```

---

## 2 · How the Shopify auth works (so you understand it)

Shopify no longer hands out permanent access tokens. Since January 2026,
apps created in the Dev Dashboard get a **Client ID** and a **Client secret**
(starting with `shpss_`), and you *exchange* them for a working access token
that **expires after 24 hours**.

This is called the **client credentials grant**. One POST to
`https://<store>.myshopify.com/admin/oauth/access_token` returns:

```json
{ "access_token": "shpat_…", "scope": "write_products,…", "expires_in": 86399 }
```

What `shopify.js` does for you automatically:

1. **Mint** — requests a fresh token from your Client ID + Secret when needed
2. **Cache** — saves it to `token.json` so separate runs reuse it
3. **Refresh** — treats the token as stale 60s before expiry and mints a new one
4. **Retry** — if a call comes back `401` (expired mid-flight) or `429`
   (rate limited), it refreshes/waits and tries again by itself

That means **you never handle tokens day-to-day**. The only thing that ever
changes is the *secret* — and only when you rotate it in the Dev Dashboard.

> ⚠️ Token prefixes: `shpss_` = client secret · `shpat_` = Admin API token ·
> `atkn_` = CLI/automation token (useless for Admin API — don't bother with it).

---

## 3 · Git + GitHub (primary code sync)

**The mental model.** Git is a time machine for your files: every meaningful
change becomes a *commit* — a snapshot with a message. Git works fully
offline. **GitHub** is a cloud server that holds a copy of your repo, so two
devices can share commits.

- `origin` — the nickname your local clone gives to the GitHub URL
- `push` — send your new commits up to GitHub
- `pull` — bring commits from GitHub down to this device
- `clone` — copy the whole repo from GitHub to a new device

**The daily loop:**

```bash
git add .                     # stage all changes
git commit -m "what I did"    # snapshot with a message
git push                      # send them to GitHub
```

On the *other* device:

```bash
git pull                      # receive them here
```

**First-time setup (already done on this PC):**

```bash
git init -b main
git remote add origin https://github.com/pabsestore/Shopify.git
git add . && git commit -m "initial workspace"
git push -u origin main
```

**Authentication.** Pushing to GitHub over HTTPS needs to prove who you are.
Easiest path: install the GitHub CLI and log in once (it stores credentials
safely, no tokens in files):

```bash
# Windows:                        # Termux / Ubuntu:
winget install GitHub.cli        #  pkg install gh  |  apt install gh
gh auth login                    #  gh auth login
```

> 🔐 **Why secrets stay safe:** `.env` and `token.json` are listed in
> `.gitignore`, so `git add .` and `git push` can never send them to GitHub —
> even by accident. The tablet gets its `.env` by *copying the file directly*
> (see §4), not through git.

---

## 4 · SSH between devices (secondary sync + remote commands)

**The mental model.** SSH lets one device open a terminal on another. The
device you *connect to* runs a **server**; the device you type on is the
**client**. The server listens on a **port** — Termux uses **8022** (Android
won't let apps bind the default 22). A device's home-WiFi address is a private
**IP** like `192.168.1.42`; it can change, so you re-check it with `ip addr`.

**On the tablet — Termux app (the "five lines"):**

```bash
pkg install openssh -y     # 1. install the SSH server
passwd                     # 2. set a login password for this user
sshd                       # 3. start the server (listens on port 8022)
whoami                     # 4. copy your username (e.g. u0_a123)
ip addr show               # 5. find the tablet IP (wlan0 → inet 192.168.x.x)
```

**From the PC, connect with one command:**

```bash
ssh -p 8022 u0_a123@192.168.1.42
```

If opencode runs inside Ubuntu (proot-distro) on the tablet, enter it after
connecting:

```bash
proot-distro login ubuntu
```

**Copy a file the other way — `scp`** (uses the same SSH connection):

```bash
# PC → tablet (e.g. deliver .env to a freshly cloned tablet)
scp -P 8022 .env u0_a123@192.168.1.42:~/AI/

# tablet → PC
scp -P 8022 u0_a123@192.168.1.42:~/AI/output.csv .
```

**Notes that save you 20 minutes of confusion:**

- `sshd` only runs while Termux is alive — if the app was closed, restart it
  (`sshd`) before connecting.
- Wrong IP / "Connection refused" → re-check with `ip addr`, confirm `sshd`
  is running, and that you used `-p 8022`.
- Password login is the easy first step. Later we can switch to **SSH keys**
  (`ssh-keygen` on the PC, then copy the public key) for passwordless login.
- Optional reverse direction: enable Windows' built-in **OpenSSH Server**
  (Settings → Optional features → add "OpenSSH Server") so the tablet can
  `ssh user@pc-ip` too.

---

## 5 · How it all fits together

| What you want to do | How |
|---|---|
| Get code changes from PC → tablet (or back) | `git push` / `git pull` |
| Run a quick check on the tablet from the PC | `ssh -p 8022 <user>@<tablet-ip>` |
| Give a new device the secret | copy `.env` via `scp`, or `cp .env.example .env` + edit |
| Tokens expiring | never — each device self-heals its own 24h tokens |
| Secret rotation | update `.env` on **each** device once (or `scp`) |

---

## 6 · Security rules (read once, then it's habit)

- **`.env` and `token.json` never leave a device through git.** If you push
  and they appear in the terminal output, something is wrong — stop and check.
- A secret that has been pasted into a chat/email is no longer secret.
  Rotate it in the Dev Dashboard and update `.env` on both devices.
- The Client secret is the master key to your store's data. Guard it like a
  password.

---

## 7 · Troubleshooting

| Symptom | Cause & fix |
|---|---|
| `Token request failed (401)` | Wrong Client ID/Secret in `.env`, or the secret was rotated → update `.env`, then `node shopify-token.js status --force` |
| `429 rate limit` | Too many requests. The helper waits and retries automatically; slow down your loops (add a small `sleep` between calls) |
| `GraphQL errors` | Query asks for data outside your app's scopes → add scopes in the Dev Dashboard and release a new app version |
| `ssh: Connection refused` | `sshd` not running on the tablet, wrong IP, or missing `-p 8022` |
| `git push` asks for a password | Run `gh auth login` once on that device |
| Node says `--env-file` is unknown | This workspace loads `.env` itself — just run `node test.js` (no flag needed) |