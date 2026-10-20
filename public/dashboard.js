const logoutButton = document.querySelector("#logout-button");
const verifyButton = document.querySelector("#verify-button");
const notice = document.querySelector("#dashboard-notice");
const sessionStatus = document.querySelector("#session-status");

let accessToken = null;
let currentUser = null;

function showNotice(message, type = "error") {
  notice.textContent = message;
  notice.className = `notice show ${type}`;
}

function hideNotice() {
  notice.textContent = "";
  notice.className = "notice";
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
    throw new Error("Your session has expired. Please sign in again.");
  }

  accessToken = data.access_token;

  return accessToken;
}

async function getCurrentUser() {
  if (!accessToken) {
    throw new Error("No active access token.");
  }

  const response = await fetch("/api/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    credentials: "same-origin"
  });

  if (response.status === 401) {
    await refreshAccessToken();

    const retryResponse = await fetch("/api/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      credentials: "same-origin"
    });

    return readResponse(retryResponse);
  }

  return readResponse(response);
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(
    typeof value === "number" && value < 100000000000
      ? value * 1000
      : value
  );

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function renderProfile(user) {
  currentUser = user;

  const displayName = user.name || user.username || "User";

  document.querySelector("#welcome-name").textContent = displayName;
  document.querySelector("#profile-name").textContent = displayName;

  document.querySelector("#profile-email").textContent =
    user.email || "";

  document.querySelector("#profile-username").textContent =
    user.username || "Not available";

  document.querySelector("#profile-email-detail").textContent =
    user.email || "Not available";

  document.querySelector("#profile-id").textContent =
    user.id ?? "Not available";

  document.querySelector("#profile-created").textContent =
    formatDate(user.created_at);

  document.querySelector("#profile-avatar").textContent =
    displayName.trim().charAt(0).toUpperCase() || "U";

  sessionStatus.textContent = "Session active";
}

async function loadDashboard() {
  sessionStatus.textContent = "Checking session...";

  try {
    await refreshAccessToken();

    const user = await getCurrentUser();

    renderProfile(user);
  } catch (error) {
    accessToken = null;

    window.location.replace("/?reason=session-expired");
  }
}

verifyButton.addEventListener("click", async () => {
  verifyButton.disabled = true;
  verifyButton.textContent = "Verifying...";
  hideNotice();

  try {
    const user = await getCurrentUser();

    renderProfile(user);

    showNotice(
      `Session verified successfully for ${user.email}.`,
      "success"
    );
  } catch (error) {
    accessToken = null;

    showNotice(
      "Your session could not be verified. Please sign in again."
    );

    window.setTimeout(() => {
      window.location.replace("/?reason=session-expired");
    }, 1200);
  } finally {
    verifyButton.disabled = false;
    verifyButton.textContent = "Verify my session";
  }
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  logoutButton.textContent = "Signing out...";

  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin"
    });

    await readResponse(response);

    accessToken = null;
    currentUser = null;

    window.location.replace("/?reason=signed-out");
  } catch (error) {
    showNotice(
      error.message || "Unable to sign out. Please try again."
    );

    logoutButton.disabled = false;
    logoutButton.textContent = "Sign out";
  }
});

loadDashboard();