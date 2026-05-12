# Sterling ERP: Deployment & Migration Guide

This guide explains how to manage database changes using Prisma and automate deployments to your private Ubuntu server using GitHub Actions.

---

## 1. How Prisma Works in this Project

We have replaced manual SQL scripts with **Prisma**, a modern database toolkit. This changes how the database is updated:

### **The Implementation**
1.  **Introspection**: We ran `npx prisma db pull` to read your existing 57+ tables and convert them into a single file: `schema.prisma`.
2.  **Schema-First**: The `backend/prisma/schema.prisma` file is now the **"Source of Truth"**. Any change to the database must be written there first.
3.  **Client Generation**: `npx prisma generate` creates the JavaScript code that allows the backend to talk to the database safely.

### **The Automation Logic**
*   **Automatic SQL Writing**: You no longer write `ALTER TABLE` commands. When you change the schema, Prisma compares your code to the database and **automatically writes the SQL** for you.
*   **Version Control**: Each change is saved as a timestamped folder in `prisma/migrations`. This acts like a "Git History" for your database.
*   **Safety (Transactions)**: When a migration runs on the client's server, it is wrapped in a **transaction**. If something fails, it automatically rolls back, ensuring the client's data is never corrupted or half-updated.

---

## 2. CI/CD Workflow Script

This script is located at `.github/workflows/development-branch.yml`. It handles the entire automation process on your private server.

```yaml
name: Sterling ERP Development Deploy

on:
  push:
    branches: [ "development-branch" ]

jobs:
  deploy:
    runs-on: self-hosted
    steps:
      # 1. Pull the code into the specific directory on the Ubuntu server
      - name: Pull latest code
        run: |
          cd /var/www/Sterling-new-erp
          git pull origin development-branch

      # 2. Build Frontend
      - name: Update Frontend
        run: |
          cd /var/www/Sterling-new-erp/frontend
          npm install
          npm run build

      # 3. Update Backend & Database
      - name: Update Backend & Database
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          cd /var/www/Sterling-new-erp/backend
          npm install
          npx prisma generate
          # Applies new migrations to the database
          npx prisma migrate deploy

      # 4. Restart services via PM2
      - name: Restart Application
        run: |
          pm2 restart all
```

---

## 2. Database Migrations (Prisma)

### **Local Workflow (Developer Machine)**
1.  **Modify Schema**: Edit `backend/prisma/schema.prisma`.
2.  **Generate Migration**: Run `npx prisma migrate dev --name <description>`.
    *   *Note*: If you lack permissions for a "Shadow DB", Prisma will fail.
3.  **Check SQL**: Always open the generated `migration.sql` file. **If it is empty, do not push it**, as it will cause a "Query was empty" error in production.

### **Production Workflow (Private Server)**
Automation is handled by the YAML script above. It runs `npx prisma migrate deploy` which:
- Checks the `_prisma_migrations` table.
- Applies only migrations that have not been run yet.
- Keeps all existing client data safe.

---

## 3. Detailed Troubleshooting & Errors

### **Error: P1000 (Authentication Failed)**
*   **Description**: Prisma cannot connect to the database with the provided credentials.
*   **Cause**: Incorrect Username/Password or special characters in the connection string.
*   **Solution**: URL-encode special characters. Specifically, change `$` to `%24`.
    *   *Correct Format*: `mysql://user:pass%24word@host:port/db`

### **Error: P3014 / P1010 (Shadow Database Access Denied)**
*   **Description**: Prisma Migrate cannot create the temporary shadow database.
*   **Cause**: The MySQL user lacks `CREATE DATABASE` permissions.
*   **Solution**: Manually create an empty database named `sterling_db_shadow` on the server and provide its URL in your `.env` as `SHADOW_DATABASE_URL`.

### **Error: P3005 (Database Schema Not Empty)**
*   **Description**: Prisma detects tables but no migration history.
*   **Cause**: Running Prisma on an existing database for the first time.
*   **Solution**: You must **Baseline** the database once on the server:
    ```bash
    npx prisma migrate resolve --applied 0_initial_state
    ```

### **Error: P3009 / P3018 (Failed Migration / Empty Query)**
*   **Description**: A previous migration failed or the migration file is empty.
*   **Cause**: An empty `migration.sql` was pushed or a migration crashed midway.
*   **Solution**: 
    1.  Delete the empty migration folder in your local code and push again.
    2.  Clear the failure on the server by running:
        ```bash
        npx prisma migrate resolve --rolled-back "name_of_failed_folder"
        ```

---

## 4. One-Time Server Setup
To ensure the CI/CD works, perform these on the Ubuntu server:
1.  **Runner**: Install GitHub Self-Hosted Runner in `~/actions-runner`.
2.  **Service**: Run `sudo ./svc.sh install` and `sudo ./svc.sh start`.
3.  **PM2**: Ensure your app is started once with `pm2 start server.js --name sterling-backend`.
4.  **Baseline**: Run the `migrate resolve --applied 0_initial_state` command once.
