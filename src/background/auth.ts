// This function uses the token to get user data from the GitHub API.
async function getUserInfo(token: string): Promise<any> {
  console.log('Auth: Getting user info with the new token...');
  const response = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  if (!response.ok) {
    throw new Error("Failed to fetch user info from GitHub API.");
  }
  return response.json();
}


export async function login() {
  const manifest = chrome.runtime.getManifest();
  const clientId = manifest.oauth2?.client_id;
  const scopes = manifest.oauth2?.scopes || [];
  const scopeString = encodeURIComponent(scopes.join(' '));

  // getRedirectURL will generate: https://<YOUR_EXTENSION_ID>.chromiumapp.org/
  const redirectUri = chrome.identity.getRedirectURL("github");

  console.log('Auth: Starting launchWebAuthFlow with redirectUri:', redirectUri);

  const authUrl = `https://github.com/login/oauth/authorize` +
                  `?client_id=${clientId}` +
                  `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                  `&scope=${scopeString}`;

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true,
    }, async (redirectUrl) => {
      if (chrome.runtime.lastError || !redirectUrl) {
        const errorMsg = chrome.runtime.lastError?.message || "Login flow was cancelled by the user.";
        console.error("Auth: Error in launchWebAuthFlow:", errorMsg);
        reject(new Error(errorMsg));
        return;
      }

      console.log('Auth: Successful redirect, extracting code...');
      const code = new URL(redirectUrl).searchParams.get("code");

      if (!code) {
        console.error("Auth: Code not found in redirect URL.");
        reject(new Error("Could not find authorization code."));
        return;
      }

      try {
        console.log('Auth: Sending code to backend to exchange for token...');
        // This localhost URL is for local development. You'll need to replace it
        // with your actual backend server URL in production.
        const response = await fetch("http://localhost:3000/auth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();
        if (data.error || !data.access_token) {
          throw new Error(data.error_description || 'Backend failed to retrieve token.');
        }

        const { access_token } = data;
        console.log('Auth: Access token received from backend.');

        const userInfo = await getUserInfo(access_token);

        await chrome.storage.local.set({ user: userInfo, token: access_token });
        resolve(userInfo);
      } catch (error) {
        console.error("Auth: Failed to communicate with backend or GitHub API:", error);
        reject(error);
      }
    });
  });
}

export async function logout() {
  console.log('Auth: Logging out, clearing session data...');
  // --- FINAL FIX ---
  // We ONLY remove session data (user and token).
  // The user's repository configuration (userRepos_username) MUST be kept.
  await chrome.storage.local.remove(['user', 'token']);
}
