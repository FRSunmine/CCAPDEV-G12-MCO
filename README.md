# Animo Eats

Animo Eats is a full-stack restaurant review web application for the DLSU community. It lets users browse establishments near campus, search restaurants and review text, create accounts, post ratings and reviews, mark reviews as helpful or unhelpful, manage public profiles, and let establishment owners respond to reviews.

## Core Features

- Restaurant browsing with database-backed search, cuisine filters, price filters, and minimum rating filters
- Review keyword search that can surface restaurants based on matching review text
- User registration and login with hashed passwords
- Persistent session-based authentication until logout or browser close
- Public user profiles with review history and critique level
- Review CRUD with optional anonymous posting and optional media uploads
- Helpful and unhelpful review feedback
- Establishment owner request workflow and public owner responses
- Admin dashboard for approving owner requests and assigning restaurant owners

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

- `server.js` sets up the Express app, sessions, middleware, and route mounting.
- `config/` contains the MongoDB connection setup.
- `models/` contains the Mongoose schemas.
- `controllers/` contains the route handlers.
- `routes/` contains the Express route definitions.
- `middleware/` contains reusable Express middleware.
- `services/` contains shared validation, page-mapping, flash-message, and metadata helpers.
- `views/` contains Handlebars templates grouped by feature area.
- `public/` contains static assets.
- `seeds/` contains the database seeding script.

## Environment Variables

Create a `.env` file from `.env.example` or set these values directly in your shell:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/animo-eats
SESSION_SECRET=replace-this-with-a-long-random-secret
```

Notes:

- `MONGODB_URI` must point to a running MongoDB instance.
- `SESSION_SECRET` is required in production.
- Sessions are stored in MongoDB through `connect-mongo`.

## Local Setup

1. Install dependencies.

```bash
npm install
```

2. Start MongoDB locally.

Linux:

```bash
sudo systemctl start mongod
```

Windows PowerShell:

```powershell
net start MongoDB
```

3. Seed the database.

```bash
npm run seed
```

4. Start the app.

```bash
npm start
```

5. Open:

```text
http://localhost:3000
```

## Sample Seeded Accounts

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

After running `npm run seed`, the app loads:

- 8 restaurants
- 8 users including reviewer, owner, and admin accounts
- 8 reviews
- 5 owner requests

## Validation and Security Notes

- Passwords are hashed with `bcryptjs`.
- Sessions are stored in MongoDB and use `httpOnly` cookies.
- Registration, profile editing, reviews, and owner-request forms have front-end and back-end validation.
- Review uploads accept up to 3 images or 1 video.
- Anonymous reviews hide the author identity on the restaurant page.

## Deployment Guide

This repository includes `.env.example` and `render.yaml` for a Render deployment.

Recommended production steps:

1. Create a MongoDB Atlas database.
2. Create a Render Web Service from this repository.
3. Set:
   `NODE_ENV=production`
   `MONGODB_URI=<your Atlas connection string>`
   `SESSION_SECRET=<long random value>`
4. Deploy the app.
5. Run `npm run seed` once against the production database using the Render shell or a local shell pointed at the production `MONGODB_URI`.
6. Verify login, review CRUD, review voting, owner requests, owner responses, and the admin dashboard.
7. Add the final live URL below before submission.

Deployment URL:

```text
TO_BE_FILLED_AFTER_DEPLOYMENT
```

## Submission Checklist

- `npm install`
- `npm run seed`
- `npm start`
- Verify `/about` lists all packages and libraries used
- Verify `/admin` with the seeded admin account
- Verify owner response flow with the seeded owner account
- Replace the deployment placeholder in this README with the final live URL

## Notes

- Old prototype files inside `public/archived_pages/` are not part of the current MVC app.
- If you see `ECONNREFUSED 127.0.0.1:27017`, MongoDB is not running or `MONGODB_URI` is incorrect.
