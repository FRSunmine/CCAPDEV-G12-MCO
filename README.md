# Animo Eats

Animo Eats is a school project web app built with Node.js, Express, MongoDB, Mongoose, and Handlebars using an MVC structure.

## Local Setup

1. Open a terminal in the project folder.
2. Install dependencies:

```bash
npm install
```

3. Make sure MongoDB is running locally before starting the app.

Linux:

```bash
sudo systemctl start mongod
sudo systemctl status mongod
mongosh
```

Windows:

PowerShell:

```powershell
net start MongoDB
mongosh
```

If `net start MongoDB` does not work, open `services.msc`, find the MongoDB service, and start it manually.

4. Optionally set a custom connection string:

Linux:

```bash
export MONGODB_URI="mongodb://127.0.0.1:27017/animo-eats"
```

Windows PowerShell:

```powershell
$env:MONGODB_URI="mongodb://127.0.0.1:27017/animo-eats"
```

Windows Command Prompt:

```cmd
set MONGODB_URI=mongodb://127.0.0.1:27017/animo-eats
```

5. Seed the database with the provided sample records:

```bash
npm run seed
```

6. Start the app:

```bash
npm start
```

7. Open the app in your browser:

```text
http://localhost:3000
```

## Sample Login After Seeding

- Reviewer email: `animonstah123@example.com`
- Reviewer password: `password123`
- Owner email: `campusfoodowner@example.com`
- Owner username: `campusfoodowner`
- Owner password: `password123`
- Admin email: `animoadmin@example.com`
- Admin username: `animoadmin`
- Admin password: `password123`

The login form accepts either email or username.

Owner requests can be submitted during registration or through `/admin-support`, and admins review them in `/admin`.

## Project Structure

- `config/` contains the MongoDB connection setup.
- `models/` contains the Mongoose schemas.
- `controllers/` contains the route handlers.
- `routes/` contains the Express route definitions.
- `middleware/` contains reusable Express middleware.
- `views/` contains Handlebars templates.
- `seeds/` contains the database seeding script.

## Notes

- Static assets such as CSS and images stay in `public/`.
- Old prototype files inside `public/pages/` are no longer used by the main app routes.
- If you see `ECONNREFUSED 127.0.0.1:27017`, MongoDB is not running or the URI is incorrect.
