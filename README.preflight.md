# Trae Preflight

This folder is prepared for `wangxt-855-1`.

Use `.env` for stable local ports and compose project identity:

- APP_PORT: 18155
- API_PORT: 19155
- WEB_PORT: 20155
- DB_PORT: 21155
- REDIS_PORT: 22155

Smoke entry:

```bash
bash scripts/smoke.sh
```

The preflight files are environment scaffolding only. The generated business
project can replace or extend them when needed.
