// Esta función usa el token para obtener los datos del usuario de la API de GitHub
async function getUserInfo(token: string): Promise<any> {
    console.log('Auth: Obteniendo info del usuario con el nuevo token...');
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
  
  // Función principal de login que implementa el flujo manual
  export async function login() {
    const manifest = chrome.runtime.getManifest();
    const clientId = manifest.oauth2?.client_id;
    const scopes = manifest.oauth2?.scopes || [];
    const scopeString = encodeURIComponent(scopes.join(' '));
  
    // getRedirectURL generará: https://<ID_DE_TU_EXTENSION>.chromiumapp.org/
    // Le podemos añadir un path si lo registramos en GitHub, pero no es necesario.
    const redirectUri = chrome.identity.getRedirectURL("github");
  
    console.log('Auth: Iniciando launchWebAuthFlow con redirectUri:', redirectUri);
  
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
          console.error("Auth: Error en launchWebAuthFlow:", errorMsg);
          reject(new Error(errorMsg));
          return;
        }
  
        console.log('Auth: Redirección exitosa, extrayendo código...');
        const code = new URL(redirectUrl).searchParams.get("code");
  
        if (!code) {
          console.error("Auth: No se encontró el código en la URL de redirección.");
          reject(new Error("Could not find authorization code."));
          return;
        }
  
        try {
          console.log('Auth: Enviando código al backend para intercambiar por token...');
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
          console.log('Auth: Token de acceso recibido del backend.');
  
          const userInfo = await getUserInfo(access_token);
  
          await chrome.storage.local.set({ user: userInfo, token: access_token });
          resolve(userInfo);
        } catch (error) {
          console.error("Auth: Fallo en la comunicación con el backend o la API de GitHub:", error);
          reject(error);
        }
      });
    });
  }
  
  // El nuevo logout es más simple
  export async function logout() {
    console.log('Auth: Cerrando sesión, borrando datos de storage...');
    await chrome.storage.local.remove(['user', 'token']);
  }