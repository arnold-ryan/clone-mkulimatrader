/* ═══════════════════════════════════════════════════
   MKULIMA TRADER — OAuth 2.0 + PKCE Auth Helper
   ═══════════════════════════════════════════════════
   Handles login, signup, and the /callback redirect.
   Included on every page that has auth buttons,
   and on callback/index.html.
   ═══════════════════════════════════════════════════ */

const MT_AUTH = {

  CLIENT_ID:    '33HZlRw8XSyl7WGXqqnog',
  AUTH_URL:     'https://auth.deriv.com/oauth2/auth',
  TOKEN_URL:    'https://auth.deriv.com/oauth2/token',
  REDIRECT_URI: window.location.origin + '/callback',
  SCOPE:        'trade account_manage',

  // IB revenue-share tracking — embedded in signup flow
  IB_TOKEN:     '6D203A32-6635-4783-BB11-1296C141843C',
  UTM_CAMPAIGN: 'dynamicworks',
  UTM_MEDIUM:   'affiliate',
  UTM_SOURCE:   'CU83616',

  // ── Internal helpers ──────────────────────────────

  async _pkce() {
    const arr = crypto.getRandomValues(new Uint8Array(64));
    const verifier = Array.from(arr)
      .map(v => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'[v % 66])
      .join('');
    const buf = await crypto.subtle.digest(
      'SHA-256', new TextEncoder().encode(verifier)
    );
    const challenge = btoa(String.fromCharCode(...new Uint8Array(buf)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return { verifier, challenge };
  },

  _state() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // ── Public methods ────────────────────────────────

  /** Called by "Log In" buttons */
  async login() {
    const { verifier, challenge } = await this._pkce();
    const state = this._state();
    sessionStorage.setItem('pkce_verifier',       verifier);
    sessionStorage.setItem('oauth_state',         state);
    sessionStorage.setItem('post_auth_redirect',  '/trader');

    const p = new URLSearchParams({
      response_type:         'code',
      client_id:             this.CLIENT_ID,
      redirect_uri:          this.REDIRECT_URI,
      scope:                 this.SCOPE,
      state,
      code_challenge:        challenge,
      code_challenge_method: 'S256'
    });
    window.location.href = `${this.AUTH_URL}?${p}`;
  },

  /** Called by "Sign Up / Create Account" buttons.
      Uses prompt=registration + IB affiliate params so the
      signup is tracked to your IB account AND the user is
      redirected back here automatically after registering. */
  async signup() {
    const { verifier, challenge } = await this._pkce();
    const state = this._state();
    sessionStorage.setItem('pkce_verifier',       verifier);
    sessionStorage.setItem('oauth_state',         state);
    sessionStorage.setItem('post_auth_redirect',  '/trader');

    const p = new URLSearchParams({
      response_type:         'code',
      client_id:             this.CLIENT_ID,
      redirect_uri:          this.REDIRECT_URI,
      scope:                 this.SCOPE,
      state,
      code_challenge:        challenge,
      code_challenge_method: 'S256',
      prompt:                'registration',
      t:                     this.IB_TOKEN,   // affiliate tracking token
      utm_campaign:          this.UTM_CAMPAIGN,
      utm_medium:            this.UTM_MEDIUM,
      utm_source:            this.UTM_SOURCE
    });
    window.location.href = `${this.AUTH_URL}?${p}`;
  },

  /** Called automatically on callback/index.html load */
  async handleCallback() {
    const statusEl = document.getElementById('status');
    const retryEl  = document.getElementById('retry');
    const setStatus = msg => { if (statusEl) statusEl.textContent = msg; };

    const params = new URLSearchParams(window.location.search);
    const code   = params.get('code');
    const state  = params.get('state');
    const errP   = params.get('error');

    // Deriv returned an error
    if (errP) {
      setStatus('Login failed: ' + (params.get('error_description') || errP));
      if (retryEl) retryEl.style.display = 'inline-block';
      return;
    }

    // CSRF check
    const savedState = sessionStorage.getItem('oauth_state');
    if (!state || state !== savedState) {
      setStatus('Security check failed — please try logging in again.');
      if (retryEl) retryEl.style.display = 'inline-block';
      return;
    }

    const verifier = sessionStorage.getItem('pkce_verifier');
    sessionStorage.removeItem('pkce_verifier');
    sessionStorage.removeItem('oauth_state');

    setStatus('Signing you in…');

    try {
      const resp = await fetch(this.TOKEN_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams({
          grant_type:    'authorization_code',
          client_id:     this.CLIENT_ID,
          code,
          code_verifier: verifier,
          redirect_uri:  this.REDIRECT_URI
        })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error_description || `Token exchange failed (${resp.status})`);
      }

      const data = await resp.json();

      // Store session
      sessionStorage.setItem('mt_access_token',  data.access_token);
      sessionStorage.setItem('mt_token_expires', Date.now() + (data.expires_in || 3600) * 1000);

      // Redirect into the app
      const dest = sessionStorage.getItem('post_auth_redirect') || '/trader';
      sessionStorage.removeItem('post_auth_redirect');
      window.location.href = dest;

    } catch (e) {
      setStatus('Could not complete sign-in: ' + e.message);
      if (retryEl) retryEl.style.display = 'inline-block';
    }
  },

  /** Returns the stored access token if still valid, else null */
  getToken() {
    const token   = sessionStorage.getItem('mt_access_token');
    const expires = parseInt(sessionStorage.getItem('mt_token_expires') || '0', 10);
    if (!token || Date.now() > expires) return null;
    return token;
  },

  /** Clear session and return to home */
  logout() {
    sessionStorage.removeItem('mt_access_token');
    sessionStorage.removeItem('mt_token_expires');
    window.location.href = '/';
  }
};
