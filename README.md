# Sign Up & Sign In — Full-Stack Authentication Assignment

It is a full-stack authentication application developed using **FastAPI, Python, and SQLite**, and includes a contemporary, responsive **glassmorphism UI**.

Users can set up an account, log in using their credentials, and verify their authenticated session. The frontend has a dark navy background, glowing purple-blue gradients, translucent glass-style panels, and interactive form elements, whereas the backend is responsible for validation, password security, and token-based authentication.

## Features

– To register as a user, you must set up an account by providing your name, email address, and password.
- **User Login:** Log in existing users using the credentials with which they registered.
– Passwords are stored as salted hashes derived from PBKDF2-HMAC-SHA256, and are never saved in plain text.
- **Token-Based Authentication:** The use of signed access tokens which have an expiry date.
- **Protected User Profile:** The endpoint named `/api/auth/me` checks the access token and sends back the profile of the user who is authenticated.
- **Input Validation:** Check user details and handle invalid requests.
- **Prevention of duplicate accounts:** Ensure that there are not multiple registrations using the same email address.
- **Glassmorphism UI:** This refers to an authentication interface that features frosted-glass cards, gradient buttons, responsive layouts, and the ability to show or hide passwords.
- **User Feedback:** Show the messages indicating success, the validation errors, and the authentication status.
- **Automated Tests:** Test the primary authentication flows and the common error situations.
- **Interactive API Documentation:** You can explore and test the endpoints using the documentation that comes built into FastAPI.

## Technology Stack

| Technology | Purpose |
|------------|----------------------------------------------------------------------------|
Python takes charge of implementing the backend logic, the authentication workflows, and the data handling.
| FastAPI | offers the REST APIs, carries out request validation, and provides automatic API documentation. |
SQLite stores user account information in a lightweight relational database without needing its own separate database server.
| HTML5 | establishes the structure of the sign-up, sign-in, and profile interface. |
CSS3 is responsible for creating the responsive glassmorphism design, the gradients, the translucent panels, the animations, and the styling of forms.
JavaScript is responsible for handling interactions with the form, communicating with the backend APIs, switching the visibility of the password, and updating the user interface according to the authentication results.
| Pydantic | Checks the data received in the request and ensures that it conforms to the expected data structure. |
| PBKDF2-HMAC-SHA256 | It hashes the passwords using individual salts before storing them. |
| JWT | Is used to provide signed access tokens that have an expiry date for authenticated requests. |
Pytest and HTTPX allow for the automated testing of API endpoints and authentication behaviour.

## Why I Chose This Tech Stack

I selected this stack so that the application would be lightweight, secure, easy to run on your local machine, and simple to maintain.

– FastAPI makes it simple to create clear REST endpoints, to validate the data received, and to offer interactive API documentation all without having to write a lot of boilerplate code.
- SQLite offers persistent storage requiring only a minimal amount of setup, which makes it appropriate for a self-contained assignment.
– HTML, CSS, and JavaScript enable the frontend to stay lightweight by eliminating the need for a separate frontend build process, with CSS being responsible for the glassmorphism visual design and JavaScript linking the interface to the authentication APIs.
- PBKDF2-HMAC-SHA256 protects passwords that are stored by generating password hashes with the use of individual salts.
- JWT access tokens enable the application to show that requests are authenticated and to handle token expiration.
It is possible to automatically verify the core authentication workflows using Pytest and HTTPX.

It simplifies the project at the same time as showing the main concepts that are involved in the development of a full-stack authentication application.

## Project Structure

```text
signup_signin_assignment/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── database.py
│   ├── security.py
│   └── static/
│       ├── index.html
│       ├── styles.css
│       └── app.js
├── tests/
│   └── test_auth.py
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.10 or a later version
- pip
- A terminal such as PowerShell, Command Prompt, or a macOS/Linux terminal

### 1. Create and turn on a virtual environment

**Windows PowerShell**

python -m venv .venv
.\.venv\Scripts\Activate.ps1

**macOS/Linux**


python3 -m venv .venv
source .venv/bin/activate


### 2. Install dependencies

Run this command from the project root:

python -m pip install -r requirements.txt

### 3. Set up the token secret

When developing the application, a development fallback secret can be used. However, before you share or deploy the application, it is necessary to set up a strong and random secret.

**Windows PowerShell**

$env:JWT_SECRET = "replace-with-a-long-random-secret"


**macOS/Linux**

export JWT_SECRET="replace-with-a-long-random-secret"


The value of DATABASE_PATH can optionally be used to configure the database path; by default the application uses app/auth.db.

### 4. Begin the application

From the project root, run:

uvicorn app.main:app --reload

When the server has started, open the application in your browser.

- **Web interface:** http://127.0.0.1:8000
- **API documentation:** http://127.0.0.1:8000/docs
- **Health check:** http://127.0.0.1:8000/health

## API Reference

### 1. Sign Up

**Endpoint:** `POST /api/auth/signup`

Request body:


{
  "name": "Bhavani Manchoju",
  "email": "bhavani@example.com",
  "password": "SecurePass123"
}


It sets up a new user account and supplies a safe user profile together with an access token.

Expected responses:

- `201 Created` — the account has been created successfully.
- `409 Conflict` — there is already an account with that email address.
- `422 Unprocessable Entity`. Request validation failed.

### 2. Sign In

**Endpoint:** `POST /api/auth/signin`

Request body:

{
  "email": "bhavani@example.com",
  "password": "SecurePass123"
}

It verifies the provided credentials and then returns the user profile associated with the authenticated user together with an access token.

Expected responses:

- 200 OK — authentication has been successful.
- `401 Unauthorized` – The credentials are invalid.
- `422 Unprocessable Entity`. Request validation failed.

### 3. Obtain the current user

**Endpoint:** `GET /api/auth/me`

Include the access token in the request header:

Authorization: Bearer <access-token>

The endpoint checks the token and then returns the profile of the authenticated user; if the token is missing, invalid, or has expired a response with status code 401 Unauthorized should be returned.

### 4. Health Check

**Endpoint:** `GET /health`

Returns a simple response indicating whether the application is running:

{
  "status": "ok"
}

## Implementation Approach

The application was developed in the following steps:

1. Set up the FastAPI application and divide the backend into separate modules dealing with routing, database operations, and security.
2. Set up request schemas and check incoming user data.
3. Make the SQLite users table and make sure each email is unique.
Before storing them, hash the passwords using PBKDF2-HMAC-SHA256 together with individual salts.
5. Make sure the sign-up and sign-in endpoints are implemented, including those for handling duplicate accounts and invalid credentials.
After successful authentication, generate signed, expiring access tokens.
7. Include a protected endpoint to show that tokens are being verified.
8. Create the frontend with HTML and CSS using the glassmorphism technique, and then link it to the backend by making JavaScript fetch requests.
9. Include automated tests for registration, login, error handling, and for access to the protected profile.

## Running the Tests

From the project root, run:

python -m pytest -q

The test suite is intended to cover:

- Successful user registration
- Duplicate registration attempts
- Successful sign-in
- Invalid credentials
- Access to the protected profile endpoint

## Conclusion

The assignment shows a full authentication process, starting with account creation and the secure storage of passwords and ending with token-based authentication and access to the protected profile. It uses a simple Python backend together with a responsive glassmorphism frontend in order to produce an application that is not only functional but also visually appealing and easy to run on a local basis.