# Security Policy

## Principles

- Never commit API keys, passwords, access tokens, private keys, or service-role credentials.
- Treat all external input and imported content as untrusted.
- Use least-privilege credentials and isolate credentials per application and environment.
- Production deployments should fail closed when required security configuration is missing.
- Rotate any credential immediately if it is exposed in source, logs, URLs, screenshots, or chat transcripts.

## Reporting a security issue

Do not open a public issue containing secrets, exploit details, personal data, or credentials. Revoke or rotate exposed credentials first, then document the affected component, time window, and remediation steps privately.

## Incident response

1. Contain the affected feature or credential.
2. Rotate exposed credentials and invalidate old sessions or tokens.
3. Review relevant deployment, authentication, and access logs.
4. Redeploy from a known-good commit and verify security controls.
5. Add a regression check so the same failure cannot recur.
