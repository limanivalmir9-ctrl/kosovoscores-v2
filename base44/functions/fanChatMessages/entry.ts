import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    // SEND MESSAGE (general or match-specific via send_match)
    if (action === 'send' || action === 'send_match') {
      const { user_id, username, display_name, avatar_color, avatar_emoji, content, match_id, match_label } = body;
      if (!content || content.trim().length === 0) return Response.json({ error: 'Mesazhi është bosh' }, { status: 400 });
      if (content.length > 500) return Response.json({ error: 'Mesazhi është shumë i gjatë (max 500 karaktere)' }, { status: 400 });

      // Verify user exists and is not banned
      const users = await base44.asServiceRole.entities.FanChatUser.filter({ username });
      if (users.length === 0) return Response.json({ error: 'Përdoruesi nuk u gjet' }, { status: 404 });
      const user = users[0];
      if (user.is_banned) return Response.json({ error: 'Llogaria jote është pezulluar' }, { status: 403 });
      if (!user.is_verified) return Response.json({ error: 'Llogaria nuk është aktivizuar' }, { status: 403 });

      const msg = await base44.asServiceRole.entities.FanChatMessage.create({
        user_id,
        username,
        display_name,
        avatar_color,
        avatar_emoji,
        content: content.trim(),
        type: 'message',
        match_id: match_id || null,
        match_label: match_label || null,
        reactions: {},
        is_deleted: false,
      });

      // Update user message count
      await base44.asServiceRole.entities.FanChatUser.update(user.id, {
        total_messages: (user.total_messages || 0) + 1,
        last_seen: new Date().toISOString(),
      });

      return Response.json({ ok: true, message: msg });
    }

    // ADMIN ANNOUNCEMENT
    if (action === 'admin_announce') {
      const { content, match_id, match_label } = body;

      // Verify admin via base44 auth
      const adminUser = await base44.auth.me();
      if (!adminUser || adminUser.role !== 'admin') return Response.json({ error: 'Nuk ke leje' }, { status: 403 });

      const msgData = {
        user_id: 'admin',
        username: 'admin',
        display_name: '🛡️ KosovoScores Admin',
        avatar_color: '#1d4ed8',
        avatar_emoji: '🛡️',
        content: content.trim(),
        type: match_id ? 'match_poll' : 'admin_announcement',
        match_id: match_id || null,
        match_label: match_label || null,
        poll_votes: 0,
        poll_voter_ids: [],
        reactions: {},
        is_deleted: false,
      };

      const msg = await base44.asServiceRole.entities.FanChatMessage.create(msgData);
      return Response.json({ ok: true, message: msg });
    }

    // REACT TO MESSAGE
    if (action === 'react') {
      const { message_id, emoji, user_id } = body;
      const msgs = await base44.asServiceRole.entities.FanChatMessage.filter({ id: message_id });
      // Use direct get approach
      const allMsgs = await base44.asServiceRole.entities.FanChatMessage.list('-created_date', 200);
      const msg = allMsgs.find(m => m.id === message_id);
      if (!msg) return Response.json({ error: 'Mesazhi nuk u gjet' }, { status: 404 });

      const reactions = msg.reactions || {};
      reactions[emoji] = (reactions[emoji] || 0) + 1;

      await base44.asServiceRole.entities.FanChatMessage.update(message_id, { reactions });
      return Response.json({ ok: true });
    }

    // VOTE IN POLL
    if (action === 'poll_vote') {
      const { message_id, user_id } = body;
      const allMsgs = await base44.asServiceRole.entities.FanChatMessage.list('-created_date', 200);
      const msg = allMsgs.find(m => m.id === message_id);
      if (!msg) return Response.json({ error: 'Mesazhi nuk u gjet' }, { status: 404 });

      const voterIds = msg.poll_voter_ids || [];
      if (voterIds.includes(user_id)) return Response.json({ error: 'Ke votuar tashmë' }, { status: 409 });

      voterIds.push(user_id);
      await base44.asServiceRole.entities.FanChatMessage.update(message_id, {
        poll_votes: (msg.poll_votes || 0) + 1,
        poll_voter_ids: voterIds,
      });
      return Response.json({ ok: true });
    }

    // DELETE MESSAGE (admin)
    if (action === 'delete') {
      const { message_id } = body;
      const adminUser = await base44.auth.me();
      if (!adminUser || adminUser.role !== 'admin') return Response.json({ error: 'Nuk ke leje' }, { status: 403 });

      await base44.asServiceRole.entities.FanChatMessage.update(message_id, {
        is_deleted: true,
        deleted_by_admin: true,
        content: '[Mesazhi u fshi nga moderatori]',
      });
      return Response.json({ ok: true });
    }

    // BAN USER (admin)
    if (action === 'ban') {
      const { user_id: target_id, reason } = body;
      const adminUser = await base44.auth.me();
      if (!adminUser || adminUser.role !== 'admin') return Response.json({ error: 'Nuk ke leje' }, { status: 403 });

      await base44.asServiceRole.entities.FanChatUser.update(target_id, {
        is_banned: true,
        ban_reason: reason || 'shkelje e rregullave të komunitetit',
      });
      return Response.json({ ok: true });
    }

    // UNBAN USER (admin)
    if (action === 'unban') {
      const { user_id: target_id } = body;
      const adminUser = await base44.auth.me();
      if (!adminUser || adminUser.role !== 'admin') return Response.json({ error: 'Nuk ke leje' }, { status: 403 });

      await base44.asServiceRole.entities.FanChatUser.update(target_id, {
        is_banned: false,
        ban_reason: '',
      });
      return Response.json({ ok: true });
    }

    // APPROVE USER (admin)
    if (action === 'approve_user') {
      const { user_id: target_id } = body;
      const adminUser = await base44.auth.me();
      if (!adminUser || adminUser.role !== 'admin') return Response.json({ error: 'Nuk ke leje' }, { status: 403 });
      await base44.asServiceRole.entities.FanChatUser.update(target_id, {
        is_verified: true,
        verification_token: '',
      });
      return Response.json({ ok: true });
    }

    // SET ADMIN (admin) - toggle chat admin role
    if (action === 'set_chat_admin') {
      const { user_id: target_id, is_admin } = body;
      const adminUser = await base44.auth.me();
      if (!adminUser || adminUser.role !== 'admin') return Response.json({ error: 'Nuk ke leje' }, { status: 403 });
      await base44.asServiceRole.entities.FanChatUser.update(target_id, { is_admin });
      return Response.json({ ok: true });
    }

    // REPLY TO MESSAGE (admin chat moderators)
    if (action === 'reply') {
      const { reply_to_id, content, username, display_name, avatar_color, avatar_emoji, user_id } = body;
      if (!content?.trim()) return Response.json({ error: 'Mesazhi është bosh' }, { status: 400 });

      const users = await base44.asServiceRole.entities.FanChatUser.filter({ username });
      if (users.length === 0) return Response.json({ error: 'Përdoruesi nuk u gjet' }, { status: 404 });
      const user = users[0];
      if (user.is_banned) return Response.json({ error: 'Llogaria jote është pezulluar' }, { status: 403 });
      if (!user.is_verified) return Response.json({ error: 'Llogaria nuk është aktivizuar' }, { status: 403 });

      // Get the original message for context
      const allMsgs = await base44.asServiceRole.entities.FanChatMessage.list('-created_date', 200);
      const original = allMsgs.find(m => m.id === reply_to_id);

      const msg = await base44.asServiceRole.entities.FanChatMessage.create({
        user_id,
        username,
        display_name,
        avatar_color,
        avatar_emoji,
        content: content.trim(),
        type: 'message',
        reply_to_id: reply_to_id || null,
        reply_to_display_name: original?.display_name || null,
        reply_to_content: original?.content?.slice(0, 80) || null,
        reactions: {},
        is_deleted: false,
      });

      await base44.asServiceRole.entities.FanChatUser.update(user.id, {
        total_messages: (user.total_messages || 0) + 1,
        last_seen: new Date().toISOString(),
      });

      return Response.json({ ok: true, message: msg });
    }

    return Response.json({ error: 'Veprim i panjohur' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});