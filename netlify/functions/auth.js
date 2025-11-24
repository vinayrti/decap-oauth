exports.handler = async function (event) {
  const params = new URLSearchParams(event.rawQuery || "");
  const code = params.get("code");

  const client_id = process.env.GITHUB_CLIENT_ID;
  const client_secret = process.env.GITHUB_CLIENT_SECRET;
  const redirect_uri = process.env.REDIRECT_URI;

  // 1) No code yet → send user to GitHub auth page
  if (!code) {
    const authUrl = new URL("https://github.com/login/oauth/authorize");
    authUrl.searchParams.set("client_id", client_id);
    authUrl.searchParams.set("redirect_uri", redirect_uri);
    authUrl.searchParams.set("scope", "repo,user:email");
    return {
      statusCode: 302,
      headers: { Location: authUrl.toString() }
    };
  }

  // 2) Exchange code for token (MUST be form-urlencoded)
  const form = new URLSearchParams();
  form.append("client_id", client_id);
  form.append("client_secret", client_secret);
  form.append("code", code);
  form.append("redirect_uri", redirect_uri);

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: form.toString()
  });

  const data = await tokenResponse.json();

  if (data.error) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "text/html" },
      body: `<p>OAuth error: ${data.error_description || data.error}</p>`
    };
  }

  const token = data.access_token;
  const msg = {
    token,
    provider: "github"
  };

  // 3) HTML that posts token back to CMS and closes popup
  const html = `<!DOCTYPE html>
<html>
  <body>
    <script>
      (function() {
        function receiveMessage(e) {
          window.opener.postMessage(
            'authorization:github:success:${JSON.stringify(msg)}',
            e.origin
          );
        }
        window.addEventListener('message', receiveMessage, false);
        window.opener.postMessage('authorizing:github', '*');
      })();
    </script>
  </body>
</html>`;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html" },
    body: html
  };
};
