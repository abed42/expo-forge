# Security Policy

## Supported Versions

Currently, only the latest on `main` branch is supported with security updates.

## Reporting a Vulnerability

To report a vulnerability, open a new issue.

Note that the template itself ships no server-side secrets: all `EXPO_PUBLIC_*` environment variables are embedded in the client bundle by design and must only ever hold publishable keys. If you find a place where the template encourages putting a secret key in an `EXPO_PUBLIC_*` variable, that is a security bug — please report it.
