# Docker readiness checklist

## Required before running containers

1. Install Docker Desktop and confirm the engine is running.
2. Open a Windows terminal or PowerShell session after Docker Desktop is started.
3. Copy `.env.example` to `.env` and verify the values are not concatenated.
4. Set strong values for:
   - `JWT_SECRET`
   - `DEFAULT_ADMIN_PASSWORD`
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `REDIS_URL`
   - `FRONTEND_URL`
   - `VITE_API_URL`
   - `PORT`
5. Ensure the database has the SQL schema and RPC functions applied:
   - `backend/schema.sql`
   - `backend/rpc_functions.sql`
6. Confirm the ports are free: `5001` and `4173`.

## Run

```powershell
docker --version
docker compose up --build
```

## Smoke checks

- Frontend: http://localhost:4173
- Backend health: http://localhost:5001/api/health

## If Docker is not available in the terminal

This usually means Docker Desktop is not running or the shell session has not been launched from a Windows environment with the Docker CLI on PATH. Start Docker Desktop, wait for the whale icon to be active, and retry in a new PowerShell or Command Prompt window.
