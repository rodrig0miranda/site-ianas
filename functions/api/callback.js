export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const provider = url.searchParams.get('provider') || 'github';

  if (!code) {
    return new Response('Missing authorization code', { status: 400 });
  }

  try {
    // Troca o código pelo access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code: code
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return new Response(`GitHub API Error: ${tokenData.error_description}`, { status: 400 });
    }

    // Devolve o token ao Sveltia CMS no formato esperado
    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body>
      <script>
        (function() {
          function receiveMessage(e) {
            window.opener.postMessage(
              'authorization:${provider}:success:${JSON.stringify({ token: tokenData.access_token, provider: provider })}',
              e.origin
            );
            window.removeEventListener('message', receiveMessage);
          }
          window.addEventListener('message', receiveMessage, false);
          window.opener.postMessage('authorizing:${provider}', '*');
        })();
      </script>
    </body>
    </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });

  } catch (err) {
    return new Response(`Internal Server Error: ${err.message}`, { status: 500 });
  }
}