const form = document.querySelector("#auth-form");
const signinTab = document.querySelector("#signin-tab");
const signupTab = document.querySelector("#signup-tab");
const nameField = document.querySelector("#name-field");
const nameInput = document.querySelector("#name");
const usernameInput = document.querySelector("#username");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const passwordHint = document.querySelector("#password-hint");
const submitButton = document.querySelector("#submit-button");
const notice = document.querySelector("#notice");
const profile = document.querySelector("#profile");
const togglePassword = document.querySelector("#toggle-password");
const tabs = document.querySelector(".tabs");
const meButton = document.querySelector("#me-button");
const logoutButton = document.querySelector("#logout-button");

let mode = "signin";
let accessToken = null;
let isAuthenticated = false;

function setMode(next) {
  mode = next;

  const signup = mode === "signup";

  signinTab.classList.toggle("active", !signup);
  signupTab.classList.toggle("active", signup);

  nameField.hidden = !signup;
  nameInput.required = signup;
  usernameInput.required = signup;

  passwordInput.autocomplete = signup
    ? "new-password"
    : "current-password";

  passwordHint.textContent = signup
    ? "Use at least 8 characters."
    : "Use the password linked to your account.";

  document.querySelector("#form-title").textContent = signup
    ? "Create your account"
    : "Welcome back";

  document.querySelector("#form-subtitle").textContent = signup
    ? "Enter your details to get started."
    : "Sign in to continue to your account.";

  submitButton.innerHTML = signup
    ? 'Create account <span>→</span>'
    : 'Sign in <span>→</span>';

  passwordInput.type = "password";
  togglePassword.textContent = "Show";
  togglePassword.setAttribute("aria-label", "Show password");
  togglePassword.setAttribute("aria-pressed", "false");

  hideNotice();
}

function showNotice(message, type = "error") {
  notice.textContent = message;
  notice.className = `notice show ${type}`;
}

function hideNotice() {
  notice.className = "notice";
  notice.textContent = "";
}

function showProfile(user) {
  profile.hidden = false;

  document.querySelector("#profile-name").textContent =
    user.name || user.username || "Your account";

  document.querySelector("#profile-email").textContent =
    user.email || "";

  document.querySelector("#avatar").textContent =
    (user.name || user.username || user.email || "U")
      .trim()
      .charAt(0)
      .toUpperCase();

  form.hidden = true;
  tabs.hidden = true;
  isAuthenticated = true;
}

function showAuthForm() {
  accessToken = null;
  isAuthenticated = false;

  form.hidden = false;
  profile.hidden = true;
  tabs.hidden = false;
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || "Something went wrong. Please try again."
    );
  }

  return data;
}

async function refreshAccessToken() {
  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "same-origin"
  });

  const data = await readResponse(response);

  if (!data.access_token) {
    throw new Error("Unable to refresh your session. Please sign in again.");
  }

  accessToken = data.access_token;

  return accessToken;
}

async function apiRequest(url, options = {}, retry = true) {
  if (!accessToken) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "same-origin"
  });

  if (response.status === 401 && retry) {
    try {
      await refreshAccessToken();
      return apiRequest(url, options, false);
    } catch {
      showAuthForm();
      throw new Error("Your session has expired. Please sign in again.");
    }
  }

  return readResponse(response);
}

signinTab.addEventListener("click", () => setMode("signin"));
signupTab.addEventListener("click", () => setMode("signup"));

togglePassword.addEventListener("click", () => {
  const show = passwordInput.type === "password";

  passwordInput.type = show ? "text" : "password";
  togglePassword.textContent = show ? "Hide" : "Show";

  togglePassword.setAttribute(
    "aria-label",
    show ? "Hide password" : "Show password"
  );

  togglePassword.setAttribute("aria-pressed", String(show));
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  hideNotice();

  if (!form.reportValidity()) {
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Please wait...";

  const payload = {
    password: passwordInput.value
  };

  if (mode === "signup") {
    payload.name = nameInput.value.trim();
    payload.username = usernameInput.value.trim();
    payload.email = emailInput.value.trim();
  } else {
    payload.identifier = emailInput.value.trim();
  }

  try {
    const data = await readResponse(
      await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "same-origin",
        body: JSON.stringify(payload)
      })
    );

    accessToken = data.access_token;

    window.location.replace("/dashboard.html");
  } catch (error) {
    showNotice(
      error.message || "Unable to reach the server. Please try again."
    );
  } finally {
    submitButton.disabled = false;

    if (!form.hidden) {
      submitButton.innerHTML = mode === "signup"
        ? 'Create account <span>→</span>'
        : 'Sign in <span>→</span>';
    }
  }
});

meButton.addEventListener("click", async () => {
  meButton.disabled = true;
  hideNotice();

  try {
    // Obtain a fresh access token using the HttpOnly refresh cookie.
    await refreshAccessToken();

    // Verify the session with the fresh access token.
    const user = await apiRequest("/api/auth/me", {}, false);

    showNotice(
      `Session verified for ${user.email}.`,
      "success"
    );
  } catch (error) {
    showAuthForm();

    showNotice(
      error.message || "Session verification failed. Please sign in again."
    );
  } finally {
    meButton.disabled = false;
  }
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;

  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin"
    });

    const data = await readResponse(response);

    showAuthForm();
    form.reset();
    setMode("signin");

    showNotice(data.message || "You have signed out.", "success");
  } catch (error) {
    showNotice(
      error.message || "Unable to complete sign out. Please try again."
    );
  } finally {
    logoutButton.disabled = false;
  }
});

async function restoreSession() {
  try {
    await refreshAccessToken();

    const user = await apiRequest("/api/auth/me", {}, false);

    showProfile(user);
    showNotice("Welcome back! Your session has been restored.", "success");
  } catch {
    showAuthForm();
  }
}

const pageReason = new URLSearchParams(
  window.location.search
).get("reason");

setMode("signin");

if (pageReason === "signed-out") {
  showNotice("You have signed out successfully.", "success");
} else if (pageReason === "session-expired") {
  showNotice("Your session has expired. Please sign in again.");
}