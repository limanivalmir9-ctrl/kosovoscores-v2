import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Simple hash function using Web Crypto API
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'ks_salt_2024');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

const AVATAR_COLORS = ['#e74c3c','#3498db','#2ecc71','#9b59b6','#f39c12','#1abc9c','#e67e22','#e91e63'];
const AVATAR_EMOJIS = ['⚽','🏆','🦁','🔥','⚡','🎯','🦅','💪','🌟','🎮','🏟️','👑'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    // REGISTER
    if (action === 'register') {
      const { username, display_name, email, password } = body;
      if (!username || !email || !password || !display_name) {
        return Response.json({ error: 'Të gjitha fushat janë të detyrueshme' }, { status: 400 });
      }

      // Check existing
      const existing = await base44.asServiceRole.entities.FanChatUser.filter({ username });
      if (existing.length > 0) return Response.json({ error: 'Ky username është i zënë' }, { status: 409 });

      const existingEmail = await base44.asServiceRole.entities.FanChatUser.filter({ email });
      if (existingEmail.length > 0) return Response.json({ error: 'Ky email është regjistruar tashmë' }, { status: 409 });

      const password_hash = await hashPassword(password);
      const verification_token = generateToken();
      const avatar_color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      const avatar_emoji = AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];

      const user = await base44.asServiceRole.entities.FanChatUser.create({
        username: username.toLowerCase().trim(),
        display_name: display_name.trim(),
        email: email.toLowerCase().trim(),
        password_hash,
        verification_token,
        avatar_color,
        avatar_emoji,
        is_verified: false,
        is_banned: false,
      });

      // Send verification email
      const appUrl = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || 'https://kosovoscores.com';
      const verifyUrl = `${appUrl}/fanchat?verify=${verification_token}`;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        from_name: 'KosovoScores FanChat',
        subject: '✅ Aktivizo llogarinë tënde – KosovoScores FanChat',
        body: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#f8f9fa;padding:32px;border-radius:12px;">
            <div style="text-align:center;margin-bottom:24px;">
              <h1 style="color:#1d4ed8;margin:0;">⚽ KosovoScores FanChat</h1>
            </div>
            <p style="font-size:16px;">Përshëndetje <strong>${display_name}</strong>!</p>
            <p>Faleminderit që u regjistrove në FanChat. Kliko butonin më poshtë për të aktivizuar llogarinë tënde:</p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${verifyUrl}" style="background:#1d4ed8;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;">
                ✅ Aktivizo Llogarinë
              </a>
            </div>
            <p style="font-size:13px;color:#666;">Nëse nuk regjistrove ti, injoro këtë email.</p>
          </div>
        `,
      });

      return Response.json({ ok: true, message: 'U regjistrove! Kontrollo emailin për aktivizim.' });
    }

    // VERIFY EMAIL — only marks email as confirmed, admin still needs to approve
    if (action === 'verify') {
      const { token } = body;
      const users = await base44.asServiceRole.entities.FanChatUser.filter({ verification_token: token });
      if (users.length === 0) return Response.json({ error: 'Token i pavlefshëm' }, { status: 404 });
      const user = users[0];
      await base44.asServiceRole.entities.FanChatUser.update(user.id, {
        email_verified: true,
        verification_token: '',
        // is_verified stays false until admin approves
      });
      return Response.json({ ok: true });
    }

    // LOGIN
    if (action === 'login') {
      const { username, password } = body;
      const users = await base44.asServiceRole.entities.FanChatUser.filter({ username: username.toLowerCase().trim() });
      if (users.length === 0) return Response.json({ error: 'Username ose fjalëkalim i gabuar' }, { status: 401 });
      const user = users[0];
      if (user.is_banned) return Response.json({ error: `Llogaria jote është pezulluar. Arsyeja: ${user.ban_reason || 'shkelje e rregullave'}` }, { status: 403 });
      const hash = await hashPassword(password);
      if (hash !== user.password_hash) return Response.json({ error: 'Username ose fjalëkalim i gabuar' }, { status: 401 });
      if (!user.email_verified && !user.is_verified) return Response.json({ error: 'Llogaria nuk është aktivizuar. Kontrollo emailin.' }, { status: 403 });
      if (!user.is_verified) return Response.json({ error: 'Llogaria është në pritje të aprovimit nga admini. Provo përsëri pas disa minutash.' }, { status: 403 });

      // Update last_seen
      await base44.asServiceRole.entities.FanChatUser.update(user.id, { last_seen: new Date().toISOString() });

      const { password_hash, verification_token, ...safeUser } = user;
      return Response.json({ ok: true, user: safeUser });
    }

    // FORGOT PASSWORD - send reset token
    if (action === 'forgot_password') {
      const { email } = body;
      if (!email) return Response.json({ error: 'Email-i është i detyrueshëm' }, { status: 400 });
      const users = await base44.asServiceRole.entities.FanChatUser.filter({ email: email.toLowerCase().trim() });
      if (users.length === 0) return Response.json({ ok: true }); // don't reveal if email exists
      const user = users[0];
      const reset_token = generateToken();
      await base44.asServiceRole.entities.FanChatUser.update(user.id, { verification_token: reset_token });
      const appUrl = req.headers.get('origin') || 'https://kosovoscores.com';
      const resetUrl = `${appUrl}/fanchat?reset=${reset_token}`;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        from_name: 'KosovoScores FanChat',
        subject: '🔑 Rivendos fjalëkalimin – KosovoScores FanChat',
        body: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#f8f9fa;padding:32px;border-radius:12px;">
            <h1 style="color:#1d4ed8;text-align:center;">⚽ KosovoScores FanChat</h1>
            <p>Përshëndetje <strong>${user.display_name}</strong>!</p>
            <p>Kemi marrë kërkesën për rivendosjen e fjalëkalimit. Kliko butonin më poshtë:</p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${resetUrl}" style="background:#1d4ed8;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;">
                🔑 Rivendos Fjalëkalimin
              </a>
            </div>
            <p style="font-size:13px;color:#666;">Nëse nuk e ke bërë këtë kërkesë, injoro këtë email.</p>
          </div>
        `,
      });
      return Response.json({ ok: true });
    }

    // RESET PASSWORD - set new password with token
    if (action === 'reset_password') {
      const { token, new_password } = body;
      if (!token || !new_password) return Response.json({ error: 'Token dhe fjalëkalimi janë të detyrueshëm' }, { status: 400 });
      if (new_password.length < 6) return Response.json({ error: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere' }, { status: 400 });
      const users = await base44.asServiceRole.entities.FanChatUser.filter({ verification_token: token });
      if (users.length === 0) return Response.json({ error: 'Token i pavlefshëm ose ka skaduar' }, { status: 404 });
      const user = users[0];
      const password_hash = await hashPassword(new_password);
      await base44.asServiceRole.entities.FanChatUser.update(user.id, { password_hash, verification_token: '' });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Veprim i panjohur' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});