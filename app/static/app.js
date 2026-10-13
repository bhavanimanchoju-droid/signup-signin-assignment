
const form = document.querySelector("#auth-form");
const signinTab = document.querySelector("#signin-tab");
const signupTab = document.querySelector("#signup-tab");
const nameField = document.querySelector("#name-field");
const nameInput = document.querySelector("#name");
const passwordInput = document.querySelector("#password");
const passwordHint = document.querySelector("#password-hint");
const submitButton = document.querySelector("#submit-button");
const notice = document.querySelector("#notice");
const profile = document.querySelector("#profile");
const togglePassword = document.querySelector("#toggle-password");

let mode = "signin";
let accessToken = null;

function setMode(next) {
  mode = next;

  const signup = mode === "signup";

  signinTab.classList.toggle("active", !signup);
  signupTab.classList.toggle("active", signup);

  nameField.hidden = !signup;
  nameInput.required = signup;

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
    user.name || "Your account";

  document.querySelector("#profile-email").textContent =
    user.email || "";

  document.querySelector("#avatar").textContent =
    (user.name || user.email || "U")
      .trim()
      .charAt(0)
      .toUpperCase();
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

  submitButton.disabled = true;

  const originalText = mode === "signup"
    ? "Create account"
    : "Sign in";

  submitButton.textContent = "Please wait…";

  const payload = {
    email: document.querySelector("#email").value.trim(),
    password: passwordInput.value
  };

  if (mode === "signup") {
    payload.name = nameInput.value.trim();
  }

  try {
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Something went wrong. Please try again."
      );
    }

    accessToken = data.access_token;

    showNotice(
      data.message || "Authentication successful.",
      "success"
    );

    showProfile(data.user);

    form.hidden = true;
    document.querySelector(".tabs").hidden = true;

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

document.querySelector("#me-button").addEventListener("click", async () => {
  if (!accessToken) return;

  try {
    const response = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Token verification failed.");
    }

    showNotice(`Token verified for ${data.email}.`, "success");

  } catch (error) {
    showNotice(error.message || "Token verification failed.");
  }
});

document.querySelector("#logout-button").addEventListener("click", () => {
  accessToken = null;

  form.reset();
  form.hidden = false;
  profile.hidden = true;
  document.querySelector(".tabs").hidden = false;

  setMode("signin");
  showNotice("You have signed out.", "success");
});

setMode("signin");
