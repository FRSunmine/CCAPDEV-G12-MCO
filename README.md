# Animo Eats

Animo Eats is a full-stack restaurant discovery and review web application made for the DLSU community. The project helps users explore establishments near campus, search restaurants and reviews, post ratings and feedback, manage public profiles, and let verified owners respond to customer reviews.

Live app: https://ccapdev-g12-mco.onrender.com

## Main Features

- Restaurant browsing with database-backed content
- Search using restaurant details and review keywords
- Filters for cuisine, price range, and minimum rating
- User registration and login
- Session-based authentication
- Public user profiles
- Review create, edit, and delete
- Rating-only and anonymous reviews
- Helpful and unhelpful review voting
- Owner request workflow
- Owner responses to reviews
- Admin dashboard for owner assignment and request moderation

## Tech Stack

- Node.js
- Express
- Express Handlebars
- MongoDB
- Mongoose
- Express Session
- Connect Mongo
- BcryptJS
- Multer
- Leaflet
- OpenStreetMap
- Google Fonts (Fredoka)

## Project Structure

- `server.js` sets up the Express app, middleware, sessions, and route mounting.
- `config/` contains the MongoDB connection setup.
- `models/` contains the Mongoose schemas.
- `controllers/` contains the route handlers.
- `routes/` contains the Express route definitions.
- `middleware/` contains reusable middleware such as authentication guards.
- `services/` contains shared logic for validation, view-model preparation, flash feedback, and utility helpers.
- `views/` contains the Handlebars templates.
- `public/` contains static assets.
- `seeds/` contains the database seed script.

## Prerequisites

Before running the project locally, make sure you have:

- Node.js
- npm
- a working MongoDB connection

You may use either:

- a local MongoDB server, or
- MongoDB Atlas

## Environment Variables

Create a `.env` file in the project root and add:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/animo-eats
SESSION_SECRET=replace-this-with-a-long-random-secret
```

### Notes

- `MONGODB_URI` must point to a running MongoDB database.
- `SESSION_SECRET` is used to sign and secure user sessions.
- In production, sessions are stored in MongoDB using `connect-mongo`.

## Running The Project Locally

### 1. Clone the repository

```bash
git clone <repository-url>
cd CCAPDEV-G12-MCO
```

### 2. Install dependencies

```bash
npm install
```

If PowerShell blocks `npm`, use:

```powershell
npm.cmd install
```

### 3. Configure `.env`

Create the `.env` file using the values listed above.

### 4. Start MongoDB

If you are using local MongoDB:

Linux:

```bash
sudo systemctl start mongod
```

Windows PowerShell:

```powershell
net start MongoDB
```

If local MongoDB is not available, use a MongoDB Atlas connection string in `MONGODB_URI`.

### 5. Seed the database

```bash
npm run seed
```

If PowerShell blocks `npm`, use:

```powershell
npm.cmd run seed
```

### 6. Start the app

```bash
npm start
```

### 7. Open the app

```text
http://localhost:3000
```

## Sample Accounts

After seeding, you can use these accounts:

- Reviewer email: `animonstah123@example.com`
- Reviewer password: `password123`
- Owner email: `campusfoodowner@example.com`
- Owner username: `campusfoodowner`
- Owner password: `password123`
- Admin email: `animoadmin@example.com`
- Admin username: `animoadmin`
- Admin password: `password123`

The login form accepts either email or username.

## Seed Data Summary

Running `npm run seed` loads:

- 8 restaurants
- 8 users
- 8 reviews
- 5 owner requests

The seeded data also includes:

- anonymous reviews
- rating-only reviews
- helpful and unhelpful vote samples
- owner responses
- owner and admin accounts for moderation testing

## Useful Routes

- `/` welcome page
- `/restaurants` search and restaurant list
- `/restaurants/:restaurantId` restaurant detail page
- `/login` login page
- `/register` registration page
- `/profile/:username` public user profile
- `/admin-support` owner request page
- `/admin` admin dashboard
- `/about` About page with package and library listing

## Deployment Notes

The current deployed version is hosted on Render:

https://ccapdev-g12-mco.onrender.com

Typical production environment values:

```env
NODE_ENV=production
MONGODB_URI=<your-production-mongodb-uri>
SESSION_SECRET=<long-random-secret>
```

## Extra Notes

- The About page lists the npm packages and third-party libraries used by the project.
- Passwords are hashed using `bcryptjs`.
- Review uploads are handled through `multer`.
- Sessions persist until logout or browser close.
- Old prototype files inside `public/archived_pages/` are not part of the active MVC application.
- The seed script resets sample data, so do not run it on a database whose current data you want to preserve.

## Troubleshooting

### MongoDB is not connecting

If you see:

```text
ECONNREFUSED 127.0.0.1:27017
```

then MongoDB is either not running or `MONGODB_URI` is incorrect.

### PowerShell blocks npm

Use:

```powershell
npm.cmd install
npm.cmd run seed
npm.cmd start
```

### Render environment variable formatting

When setting environment variables in Render, use only the raw value.

Correct:

```text
mongodb://...
```

Wrong:

```text
MONGODB_URI=mongodb://...
```

## Submission Checklist

- `npm install`
- `npm run seed`
- `npm start`
- verify `/about`
- verify `/restaurants`
- verify review CRUD
- verify review voting
- verify owner request and owner response flow
- verify `/admin`
- verify the live deployment URL
