# Gato migration roadmap
- [x] Import all Gato screens (src/gato) and show at /
- [x] Enable Lovable Cloud
- [x] Company data (products, customers, orders, quotes, finance, branches) saved per account in Cloud (tenant_data key/value)
- [ ] Port remaining DB migrations to dedicated Cloud tables
- [x] Login/signup/Google via Cloud auth (master password + persona switch still pending)
- [ ] Port /api/db/*, caixa, quotes, vehicles, rbac, credentials to server functions
- [ ] Port AI assistant (/api/gemini/assist) to Lovable AI
- [ ] Port billing (Asaas) + email notifications — needs user's Asaas/SendGrid keys
