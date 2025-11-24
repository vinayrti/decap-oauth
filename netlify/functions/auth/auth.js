// No need to import fetch — Netlify provides it globally


exports.handler = async function (event) {
  const params = new URLSearchParams(event.rawQuery || "");

  const client_id = process.env.GITHUB_CLIENT_ID;
  const client_secret = process.env.GITHUB_CLIENT_SECRET;
  const redirect_uri = process.env.REDIRECT_URI;

  // Step 1: Redirect user to GitHub authorization page
  if (!params.get("code")) {
    return {
      statusCode: 302,
      headers: {
        Location: `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&scope=repo,user:email`
      }
    };
  }

  // Step 2: Exchange code for GitHub access token
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json" },
    body: JSON.stringify({
      client_id,
      client_secret,
      code: params.get("code"),
      redirect_uri
    })
  });

  const data = await response.json();

  if (data.error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: data.error_description })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      token: data.access_token
    })
  };
};
