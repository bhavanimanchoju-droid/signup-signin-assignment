# Sign Up & Sign In — Full-Stack Authentication Assignment

A full-stack authentication application featuring a responsive glassmorphism interface and a secure authentication API.

The repository contains a Python/FastAPI implementation and a Node.js/Express implementation. The Node.js implementation provides user registration, sign-in, JWT-based authentication, refresh-token rotation, logout, and protected user-profile access.

The interface features a dark navy background, purple-blue gradients, translucent glass-style panels, responsive layouts, and interactive form elements.

## Features

- **User Registration:** Create an account using the required registration details.
- **User Sign In:** Authenticate using registered credentials.
- **Password Security:** Hash passwords with bcrypt before storing them.
- **JWT Access Tokens:** Issue signed access tokens with a configurable expiration time.
- **Refresh Tokens:** Maintain authenticated sessions using refresh tokens stored as hashes in the database.
- **Refresh Token Rotation:** Issue a new refresh token when an existing valid refresh token is used.
- **Token Revocation:** Revoke refresh sessions when users log out.
- **Protected User Profile:** Verify the access token before returning the authenticated user's profile.
- **Input Validation:** Validate authentication requests and return appropriate error responses.
- **Duplicate Account Prevention:** Prevent duplicate usernames and email addresses.
- **Responsive UI:** Provide a modern glassmorphism interface for authentication.
- **Password Visibility:** Allow users to show or hide their passwords.
- **Health Checks:** Provide endpoints to check whether the application is running.
- **Automated Tests:** Test registration, sign-in, authentication failures, token refresh, and logout.

## Technology Stack

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime for the backend |
| Express.js | HTTP server and REST API framework |
| SQLite | Relational database for users and refresh sessions |
| better-sqlite3 | SQLite database access |
| HTML5 | Structure of the authentication interface |
| CSS3 | Responsive styling and glassmorphism design |
| JavaScript | Frontend interactions and API requests |
| bcrypt | Password hashing |
| JSON Web Tokens (JWT) | Signed, expiring access tokens |
| Cookie Parser | Reading authentication cookies |
| dotenv | Loading environment variables |
| Jest | Automated testing |
| Supertest | Testing HTTP endpoints |

The repository also retains the original Python/FastAPI implementation and its Python dependencies and tests.

## Project Structure

```text
signup-signin-assignment/
├── app/                         # Original Python application
├── public/
│   ├── index.html               # Authentication page
│   ├── app.js                   # Authentication frontend logic
│   ├── styles.css               # Responsive interface styling
│   ├── dashboard.html           # Dashboard page
│   └── dashboard.js             # Dashboard interactions
├── src/
│   ├── config/
│   │   └── database.js          # SQLite setup and schema
│   ├── controllers/
│   │   └── auth.controller.js   # Authentication handlers
│   ├── middleware/
│   │   └── auth.middleware.js  # Authentication middleware
│   ├── routes/
│   │   └── auth.routes.js      # Authentication API routes
│   ├── services/
│   │   ├── refresh-token.service.js
│   │   └── token.service.js
│   └── server.js                # Express application and server
├── tests/
│   ├── auth.test.js             # Node.js authentication tests
│   └── test_auth.py             # Original Python tests
├── data/                        # Local SQLite database directory
├── .env.example                 # Environment-variable template
├── .gitignore
├── package.json
├── package-lock.json
├── requirements.txt             # Python dependencies
└── README.md
```

The local SQLite database and `.env` file should not be committed to Git.

## Prerequisites

For the Node.js implementation:

- Node.js
- npm
- Git (optional, for cloning the repository)

For the original Python implementation, Python and pip are also required.

## Getting Started — Node.js

### 1. Clone the repository

```bash
git clone https://github.com/bhavanimanchoju-droid/signup-signin-assignment.git
cd signup-signin-assignment
```

If you have already cloned the repository, open a terminal in the project directory instead.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a local `.env` file using `.env.example` as a reference.

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
notepad .env
```

Configure the following values:

```dotenv
NODE_ENV=development
PORT=3000

JWT_SECRET=replace-with-a-strong-random-secret-of-at-least-32-characters
ACCESS_TOKEN_TTL_SECONDS=120

REFRESH_TOKEN_TTL_DAYS=7
COOKIE_SECURE=false

DATABASE_PATH=./data/auth.db
```

**Security notes:**

- Replace the example JWT secret with a strong, randomly generated secret.
- Keep `.env` private and never commit it.
- Use a different secret in production.
- Set `NODE_ENV=production` and enable secure cookies when deploying behind HTTPS.
- Configure a persistent database location appropriate for the deployment platform.

The values shown above are for local development. Production settings must be configured separately.

### 4. Start the application

Start the server:

```bash
npm start
```

For development with automatic server restarts:

```bash
npm run dev
```

By default, the application runs on port `3000`.

Open these endpoints in your browser:

- **Application:** http://localhost:3000
- **Health check:** http://localhost:3000/health
- **API health check:** http://localhost:3000/api/health

The application serves the frontend and API from the same Express server.

### 5. Run the automated tests

Run:

```bash
npm test
```

The Node.js authentication test suite covers:

- Successful registration
- Duplicate registration
- Successful sign-in
- Incorrect password
- Missing access token
- Refresh-token rotation and rejection of the previous token
- Logout and refresh-token revocation

The current implementation has passed all seven automated authentication tests.

## API Reference — Node.js

All authentication endpoints use the `/api/auth` prefix.

### 1. Sign Up

**Endpoint:** `POST /api/auth/signup`

Register a new account with the required user details.

Example request:

```json
{
  "name": "Example User",
  "username": "exampleuser",
  "email": "example@example.com",
  "password": "StrongPassword123"
}
```

The actual required fields and validation rules are defined by the implementation.

Expected responses include:

- `201 Created` — account created successfully.
- `409 Conflict` — account details conflict with an existing account.
- `400 Bad Request` — invalid request data, where applicable.

### 2. Sign In

**Endpoint:** `POST /api/auth/signin`

Authenticate using the registered username or email address and password.

Example request:

```json
{
  "username": "exampleuser",
  "password": "StrongPassword123"
}
```

The endpoint also supports email-based sign-in.

Expected responses include:

- `200 OK` — authentication successful.
- `401 Unauthorized` — invalid credentials.

A successful authentication provides an access token. The refresh token is managed using an HTTP-only cookie.

### 3. Get the Current User

**Endpoint:** `GET /api/auth/me`

Requires a valid access token.

Include the access token in the request header:

```http
Authorization: Bearer <access-token>
```

Expected responses:

- `200 OK` — authenticated user profile returned.
- `401 Unauthorized` — access token missing, invalid, or expired.

### 4. Refresh the Access Token

**Endpoint:** `POST /api/auth/refresh`

Uses the refresh-token cookie to issue a new access token and rotate the refresh token.

The refresh token is managed using an HTTP-only cookie rather than being exposed to frontend JavaScript.

Expected responses:

- `200 OK` — token refresh successful.
- `401 Unauthorized` — refresh token invalid, expired, revoked, or otherwise rejected.

### 5. Sign Out

**Endpoint:** `POST /api/auth/logout`

Revokes the active refresh session and clears the refresh-token cookie.

Expected response:

- `200 OK` — logout request processed successfully.

### 6. Health Checks

**Endpoint:** `GET /health`

**Endpoint:** `GET /api/health`

Both endpoints return a JSON response indicating that the application is running.

Example:

```json
{
  "status": "ok"
}
```

## Authentication and Security

The Node.js implementation uses the following mechanisms:

- Passwords are hashed using bcrypt.
- Access tokens are signed JWTs with a configurable lifetime.
- The default access-token lifetime is 120 seconds.
- Refresh tokens are generated using cryptographically secure random values.
- Refresh-token hashes are stored in SQLite.
- Refresh-token rotation invalidates the previous token when a refresh succeeds.
- Logout revokes the active refresh session.
- Refresh tokens are delivered using HTTP-only cookies.
- Production cookies should use the `Secure` attribute over HTTPS.
- Sensitive configuration is supplied through environment variables.

Access tokens are short-lived. The frontend can use the refresh endpoint to obtain a new access token when the current token expires, provided that the refresh session remains valid.

## Database

The Node.js application uses SQLite with `better-sqlite3`.

The database schema contains:

- `users` — user account details and password hashes.
- `refresh_sessions` — refresh-session identifiers, token hashes, expiration times, and revocation information.

The default local database path is:

```text
data/auth.db
```

The `DATABASE_PATH` environment variable can override this location.

**Deployment consideration:** The database must be stored on persistent storage in production. A temporary filesystem may lose the database during restarts or redeployments.

## Original Python Implementation

The repository also contains the original Python/FastAPI application.

Its dependencies can be installed using:

```bash
python -m pip install -r requirements.txt
```

To run the original Python application:

```bash
uvicorn app.main:app --reload
```

The default development address is:

- **Application:** http://127.0.0.1:8000
- **Health check:** http://127.0.0.1:8000/health
- **Interactive API documentation:** http://127.0.0.1:8000/docs

These commands apply to the Python implementation, not the Node.js implementation.

## Design

The frontend uses a glassmorphism-inspired visual style with:

- A dark navy background
- Purple and blue gradients
- Translucent panels
- Responsive layouts
- Interactive form elements
- Password visibility controls
- Authentication feedback messages

The frontend is served directly by Express, so a separate frontend build process is not required.

## Conclusion

This repository demonstrates a full-stack authentication application with a responsive frontend, secure password hashing, JWT access tokens, refresh-token rotation, protected user-profile access, and automated tests.

The Node.js implementation uses Express and SQLite, while the original Python/FastAPI implementation remains in the repository.