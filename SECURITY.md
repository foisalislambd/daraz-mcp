# Security

## Reporting

Open a private security advisory on GitHub or email the repository owner. Please do not file a public issue for a vulnerability.

## How secrets are stored

- Local CLI: AES-256-GCM. The 32-byte key is `~/.config/daraz-mcp/master.key` (mode `0600`). The ciphertext is `credentials.enc` (mode `0600`). Anyone who can read both files can decrypt the tokens. This is a file-permission control, not a hardware keystore.
- Hosted app: the same AES-256-GCM with `TOKEN_ENCRYPTION_KEY`. The key must not be committed. Losing it makes stored tokens unreadable.
- API keys are stored as SHA-256 hashes. The full key is shown once.
- Session cookies are random, HTTP-only, and stored as hashes.
- Passwords are scrypt hashes.
- Logs redact keys whose names look like tokens, secrets, or passwords.

## What this server can do

Write tools change live seller data when `confirm` is true: price, stock, products, images, packing, cancellation, and vouchers. Give MCP keys only to clients you trust. Revoke a key from the admin panel if it leaks.

## OAuth

The authorization `state` is stored server-side and expires after 15 minutes. Compare it on the callback before exchanging the code.

## Not in scope

This project does not review Daraz's own security, and it is not an official Daraz integration.
