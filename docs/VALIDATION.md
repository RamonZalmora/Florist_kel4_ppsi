# Atelier release validation

Current environment: Linux cloud, Node.js 24.19, persisted PGlite, Chromium desktop/mobile. Public hosting and live email are not yet configured.

- Backend/storage: 14 tests passed, covering existing order/catalog/report flows plus verified email, expired/one-use reset links, concurrent reset requests, session revocation, password change, role-limited table access, credential-free JSON export and budget sorting.
- Browser: 14 tests passed, 0 failed/skipped. Desktop/mobile cover catalog, budget/order filters, role workflows, PDF downloads, agenda, data explorer/export, unavailable email explanation and invalid reset links.
- Frontend production build and formatting checks passed.
- Generated floral hero and three product assets integrated. Screenshot previews are in docs/screenshots. Product visuals remain examples and must be replaced/approved against actual merchandise.
- Existing migrations are preserved; 002 adds verified recovery emails and hashed, expiring account tokens.
- Recovery delivery uses a test mail transport for automated tests. Real Resend delivery, Neon connectivity, and Render deployment remain unverified until user-owned accounts and secure configuration are available.
- Render blueprint and native startup are supplied; startup enforces external PostgreSQL and an HTTPS canonical URL and runs migrations. Live provider build/start/health checks are still required.

Initial browser runs exposed a select-locator assumption and one HMR interruption while assets were being updated. Test locators were corrected, files frozen, and the owned dev service restarted before final verification. No assertions or security controls were disabled.

See DEPLOYMENT.md for the exact public validation checklist and PRODUCT-DIRECTION.md for scope.
