Sign Up & Sign In — Full-Stack Authentication Assignment
A full-stack authentication application featuring a responsive glassmorphism interface and an authentication API.

This repository contains two implementations:
- Node.js/Express — the implementation intended for the Node.js deployment, using PostgreSQL.
- Python/FastAPI — the original implementation, retained separately in the repository.
The Node.js interface features a dark navy background, purple-blue gradients, translucent glass-style panels, responsive layouts, and interactive form elements.
Features
- User registration and sign-in
- Password hashing with bcrypt
- Short-lived JWT access tokens
- HTTP-only refresh-token cookies
- Refresh-token rotation and session revocation on logout
- Protected current-user profile endpoint
- Input validation and duplicate-account prevention
- Responsive authentication and dashboard pages
- Health-check endpoints
- Automated authentication tests
Technology stack
Technology	Purpose
Node.js	JavaScript runtime
Express.js	HTTP server and REST API
PostgreSQL	Persistent database for users and refresh sessions
pg	PostgreSQL client for Node.js
pg-mem	In-memory PostgreSQL-compatible test database
HTML5, CSS3, JavaScript	Frontend interface and interactions
bcrypt	Password hashing
JSON Web Tokens (jsonwebtoken)	Signed access tokens
cookie-parser	Reading authentication cookies
dotenv	Loading environment variables
Jest and Supertest	Automated API tests


The original Python/FastAPI implementation and its Python dependencies and tests are also retained.
Project structure
signup-signin-assignment/
├── app/                         # Original Python application
├── public/
│   ├── index.html                # Authentication page
│   ├── app.js                    # Authentication frontend logic
│   ├── styles.css                # Responsive interface styling
│   ├── dashboard.html            # Dashboard page
│   └── dashboard.js              # Dashboard interactions
├── src/
│   ├── config/
│   │   └── database.js           # PostgreSQL connection and schema
│   ├── controllers/
│   │   └── auth.controller.js    # Authentication handlers
│   ├── middleware/
│   │   └── auth.middleware.js    # Access-token authentication
│   ├── routes/
│   │   └── auth.routes.js        # Authentication API routes
│   ├── services/
│   │   ├── refresh-token.service.js
│   │   └── token.service.js
│   └── server.js                 # Express application and server
├── tests/
│   ├── auth.test.js              # Node.js authentication tests
│   └── test_auth.py              # Original Python tests
├── .env.example                 # Environment-variable template
├── .gitignore
├── package.json
├── package-lock.json
├── requirements.txt             # Python dependencies
└── README.md
Do not commit .env files or database credentials. The Node.js implementation connects to PostgreSQL using DATABASE_URL. The original Python implementation has its own configuration and should be treated separately.
Prerequisites
For the Node.js implementation:
- Node.js and npm
- A PostgreSQL database for local execution or deployment
- Git (optional, for cloning the repository)
For the original Python implementation, Python and pip are also required.
Getting started — Node.js
1. Clone the repository
git clone https://github.com/bhavanimanchoju-droid/signup-signin-assignment.git
cd signup-signin-assignment
If you already cloned the repository, open a terminal in the project directory.
2. Install dependencies
npm install
3. Configure environment variables
Create a local .env file from the template.

Windows PowerShell:
Copy-Item .env.example .env
notepad .env
Configure the values for your local environment. Example:
NODE_ENV=development
PORT=3000
JWT_SECRET=replace-with-a-strong-random-secret-of-at-least-32-characters
ACCESS_TOKEN_TTL_SECONDS=120
REFRESH_TOKEN_TTL_DAYS=7
COOKIE_SECURE=false
DATABASE_URL=postgresql://username:password@localhost:5432/assignment
Replace the PostgreSQL username, password, host, port, and database name with your actual local database settings. Create the database before starting the app if it does not already exist.

Security notes
- Replace the example JWT secret with a strong, randomly generated value of at least 32 characters.
- Keep .env private and never commit it.
- Use a separate strong secret for production.
- In production, set NODE_ENV=production and serve the application over HTTPS so the refresh cookie uses the Secure attribute.
- Set DATABASE_URL to the PostgreSQL connection string supplied by your database provider.
- Never paste database credentials or JWT secrets into public issues, source control, or chat messages.
4. Start the application
npm start
For development with automatic server restarts:
npm run dev
The server uses the port provided by PORT, or port 3000 by default.

Open:
- Application: http://localhost:3000
- Health check: http://localhost:3000/health
- API health check: http://localhost:3000/api/health
The frontend and API are served from the same Express server.
5. Run the automated tests
npm test
The Node.js test suite currently covers:
- Successful registration
- Duplicate registration
- Successful sign-in
- Incorrect password
- Missing access token
- Refresh-token rotation and rejection of the previous token
- Logout and refresh-token revocation
The seven Node.js authentication tests have passed using pg-mem, an in-memory PostgreSQL-compatible test database. This test result does not by itself confirm that the app has been tested against a live PostgreSQL server. Run the tests against a real PostgreSQL instance before treating the database migration as fully verified for production.
API reference — Node.js
All authentication endpoints use the /api/auth prefix.
1. Sign up
Endpoint: POST /api/auth/signup

Example request:
{
  "name": "Example User",
  "username": "exampleuser",
  "email": "example@example.com",
  "password": "StrongPassword123"
}
Typical responses:
- 201 Created — account created
- 409 Conflict — username or email conflicts with an existing account
- 400 Bad Request — invalid request data, where applicable
The implementation defines the precise validation rules.
2. Sign in
Endpoint: POST /api/auth/signin

Sign in with a username or email address and password. Example:
{
  "identifier": "exampleuser",
  "password": "StrongPassword123"
}
The accepted request field is defined by the current controller; use identifier if that is what the implementation expects.

Typical responses:
- 200 OK — authentication successful
- 401 Unauthorized — invalid credentials
A successful response includes an access token. The refresh token is managed in an HTTP-only cookie.
3. Get the current user
Endpoint: GET /api/auth/me

Send the access token in the request header:
Authorization: Bearer <access-token>
- 200 OK — authenticated profile returned
- 401 Unauthorized — access token is missing, invalid, or expired
4. Refresh the access token
Endpoint: POST /api/auth/refresh

Send the refresh-token cookie with the request. The endpoint issues a new access token and rotates the refresh token.
- 200 OK — refresh successful
- 401 Unauthorized — refresh token is invalid, expired, revoked, or rejected
The refresh token is stored in an HTTP-only cookie and is not exposed to frontend JavaScript.
5. Sign out
Endpoint: POST /api/auth/logout

Revokes the active refresh session and clears the refresh-token cookie.
- 200 OK — logout request processed
6. Health checks
- GET /health
- GET /api/health
Both endpoints return a JSON status response.
Authentication and security
The Node.js implementation uses:
- bcrypt password hashing
- Signed JWT access tokens with a short lifetime (120 seconds by default in this assignment)
- Cryptographically random refresh tokens
- SHA-256 hashes of refresh tokens stored in the database
- Refresh-token rotation after a successful refresh
- Refresh-session revocation on logout
- HTTP-only refresh-token cookies
- Environment variables for sensitive configuration
In production, serve the application over HTTPS and ensure the refresh cookie's Secure attribute is enabled. Review database-provider TLS requirements and configure the PostgreSQL connection accordingly before production deployment.
Database
The Node.js implementation uses PostgreSQL. It requires the DATABASE_URL environment variable and creates the users and refresh_sessions tables during application initialization.
- users stores account details and password hashes.
- refresh_sessions stores refresh-session identifiers, token hashes, expiration times, and revocation information.
For deployment, use a PostgreSQL database whose lifetime and storage are suitable for the application. Do not rely on an ephemeral local filesystem for production data.

The automated Node.js tests use pg-mem; this is a test-only in-memory database and is not a substitute for validating against the actual PostgreSQL provider used in deployment.
Original Python implementation
The original Python/FastAPI application remains in the repository and is separate from the Node.js service.

Install Python dependencies:
python -m pip install -r requirements.txt
Run the Python application:
uvicorn app.main:app --reload
Typical local addresses:
- Application: http://127.0.0.1:8000
- Health check: http://127.0.0.1:8000/health
- Interactive API documentation: http://127.0.0.1:8000/docs
These commands apply to the Python implementation, not the Node.js implementation. Keep its configuration and data separate from the Node.js PostgreSQL setup.
Design
The frontend uses a glassmorphism-inspired visual style with:
- A dark navy background
- Purple and blue gradients
- Translucent panels
- Responsive layouts
- Interactive form elements
- Password visibility controls
- Authentication feedback messages
The frontend is served directly by Express, so a separate frontend build process is not required.
Deployment notes
For a Node.js hosting service:
1. Create a separate Node.js web service so the existing Python deployment remains untouched during migration.
2. Provision PostgreSQL and configure the service's DATABASE_URL.
3. Set NODE_ENV=production.
4. Set a strong, unique JWT_SECRET.
5. Confirm the hosting platform provides HTTPS and verify secure-cookie and database TLS settings.
6. Deploy and verify /health, /api/health, sign-up, sign-in, token refresh, and logout.
7. Run an end-to-end check against the deployed service and its real PostgreSQL database.
Do not claim production readiness until the real database connection and deployed authentication flow have been verified.
Conclusion
This repository demonstrates a full-stack authentication application with a responsive frontend, password hashing, JWT access tokens, refresh-token rotation, protected profile access, and automated tests. The Node.js implementation uses Express and PostgreSQL, while the original Python/FastAPI implementation remains in the repository.