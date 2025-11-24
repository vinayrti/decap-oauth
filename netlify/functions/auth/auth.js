exports.handler = async function (event) {
  const params = new URLSearchParams(event.rawQuery || "");
  const code = params.get("code");

  const client_id = process.env.GITHUB_CLIENT_ID;
  const client_secret = process.env.GITHUB_CLIENT_SECRET;
  const redirect_uri = process.env.REDIRECT_URI;

  // 1) No code yet -> send user to GitHub auth page
  if (!code) {
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", client_id);
    url.searchParams.set("redirect_uri", redirect_uri);
    url.searchParams.set("scope", "repo,user:email");
    return {
      statusCode: 302,
      headers: { Location: url.toString() },
    };
  }

  // 2) We have "code" -> exchange it for access token
  const tokenResponse = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: { Accept: "application/json" },
      body: JSON.stringify({
        client_id,
        client_secret,
        code,
        redirect_uri,
      }),
    }
  );

  const data = await tokenResponse.json();

  if (data.error) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "text/html" },
      body: `<p>OAuth error: ${data.error_description || data.error}</p>`,
    };
  }

  const token = data.access_token;
  const postMsgContent = {
    token,
    provider: "github",
  };

  // 3) Return HTML that sends the token back to Decap CMS and closes the popup
  const html = `<!doctype html>
<html>
  <body>
    <script>
      (function() {
        function receiveMessage(e) {
          window.opener.postMessage(
            'authorization:github:success:${JSON.stringify(postMsgContent)}',
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
    body: html,
  };
};
