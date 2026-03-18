# n8n Yahoo Intake

Use this in small steps so debugging stays simple.

## Step 1: Verify API reachability

1. Start the API locally.
2. Set `INTAKE_WEBHOOK_KEY` in the API env.
3. If you are self-hosting n8n with Docker from this repo, set `N8N_ENCRYPTION_KEY` in root `.env` and run `npm run n8n:up`.
4. From n8n, use one of these URLs:
   - `http://localhost:4000/api/intake/email` if n8n runs on the same host
   - `http://host.docker.internal:4000/api/intake/email` if n8n runs in Docker
5. Add header `x-intake-key: <your INTAKE_WEBHOOK_KEY value>`.
6. Send the JSON from [`yahoo-intake-payload-example.json`](./yahoo-intake-payload-example.json) through an `HTTP Request` node.

Expected result:

- First POST returns `duplicate: false`
- Reposting the same `externalId` returns `duplicate: true`

## Step 2: Add Yahoo IMAP parsing

Recommended node order:

1. `Email Trigger (IMAP)` or your Yahoo mail node
2. `Code` node using [`yahoo-email-to-intake.code.js`](./yahoo-email-to-intake.code.js)
3. `HTTP Request` node posting to `/api/intake/email`

The code node converts a raw Yahoo email into the backend payload contract. It is intentionally defensive because n8n mail nodes vary slightly in field names.

Important behavior:

- The code node now drops non-job Upwork notifications such as milestone, contract, and workroom emails by returning no items.
- Only emails that still look like real Upwork job alerts are forwarded to `/api/intake/email`.

### Yahoo IMAP credential

Create an `IMAP` credential in n8n with:

- Host: `imap.mail.yahoo.com`
- Port: `993`
- User: your Yahoo address
- Password: your Yahoo app password
- Secure connection / SSL: enabled

Do not store the Yahoo password in this repo. Add it only inside n8n credentials.

### Importable workflow

You can import [`yahoo-upwork-alerts.workflow.json`](./yahoo-upwork-alerts.workflow.json) into n8n.

After import:

1. Attach your Yahoo IMAP credential to `Yahoo IMAP Trigger`
2. Open `Post Intake to API` and replace the placeholder `x-intake-key` value with the actual `INTAKE_WEBHOOK_KEY` from your local `.env`
3. Adjust the API URL if your n8n runtime is not Docker on macOS
4. Run the workflow against one unread Upwork alert email first

### One-time backlog workflow

If you want to backfill existing unread Upwork alerts once, import
[`yahoo-upwork-backlog.workflow.json`](./yahoo-upwork-backlog.workflow.json).

Use it like this:

1. Attach the same Yahoo IMAP credential
2. Open `Post Backlog Intake to API` and replace the placeholder `x-intake-key`
3. Activate the backlog workflow temporarily
4. Let one new matching Upwork email arrive
5. Confirm the unread backlog gets posted to the API
6. Deactivate the backlog workflow and keep the live workflow active for future mail

Important limitation:

- n8n ships an IMAP trigger, not a one-shot IMAP read node
- So existing unread Yahoo emails are not fetched immediately just by activating the workflow
- The backlog workflow is configured with `trackLastMessageId: false`, so on the next matching mail event it backfills all unread matches instead of only new ones
- Keeping emails unread means duplicate attempts are possible, so the API dedupe remains required

## Step 3: Configure the HTTP Request node

- Method: `POST`
- URL: one of the Step 1 URLs
- Send Headers: `true`
- Header `Content-Type`: `application/json`
- Header `x-intake-key`: your shared secret
- Send Body: `true`
- Body Content Type: `JSON`
- JSON Body: `{{$json}}`

## Notes

- Reuse `messageId` as `externalId`. That is the current dedupe key in the API.
- Keep the full upstream email metadata inside `rawPayload`.
- Use `GET /api/health` first if you are unsure whether n8n can reach the API host at all.
- The live trigger template filters to unread emails from `donotreply@upwork.com` and keeps `trackLastMessageId` on so it behaves as a future-mail listener.
- The backlog trigger template uses the same filter but disables `trackLastMessageId` so it can backfill unread matches on the next trigger event.
- The repo Docker setup persists n8n data in the `n8n_data` volume and passes `INTAKE_WEBHOOK_KEY` into the n8n container.
- Self-hosted n8n may block `$env` access in node expressions. If that happens, paste the intake key directly into the `HTTP Request` node instead of using an expression.
