import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    // Helper: check if caller is a Base44 admin (has valid session + admin role)
    const getAdminUser = async () => {
      try {
        const u = await base44.auth.me();
        return u?.role === 'admin' ? u : null;
      } catch (_) {
        return null;
      }
    };

    // Helper: check if request comes from an authenticated Base44 admin
    const isAdminRequest = async () => {
      const u = await getAdminUser();
      return !!u;
    };

    // SEND PRIVATE MESSAGE
    if (action === 'send') {
      const { scout_user_id, scout_username, scout_display_name, sender, content } = body;
      if (!content?.trim()) return Response.json({ error: 'Mesazhi është bosh' }, { status: 400 });
      if (!scout_user_id) return Response.json({ error: 'Scout ID mungon' }, { status: 400 });

      if (sender === 'admin') {
        const ok = await isAdminRequest();
        if (!ok) return Response.json({ error: 'Nuk ke leje admin' }, { status: 403 });
      } else if (sender === 'scout') {
        // Validate scout exists and is not banned using service role (no Base44 auth needed for fans)
        let scout = null;
        try {
          scout = await base44.asServiceRole.entities.FanChatUser.get(scout_user_id);
        } catch (_) {}
        if (!scout) return Response.json({ error: 'Përdoruesi nuk u gjet' }, { status: 404 });
        if (scout.is_banned) return Response.json({ error: 'Llogaria pezulluar' }, { status: 403 });
      } else {
        return Response.json({ error: 'Sender i panjohur' }, { status: 400 });
      }

      const msg = await base44.asServiceRole.entities.FanChatPrivateMessage.create({
        scout_user_id,
        scout_username: scout_username || '',
        scout_display_name: scout_display_name || scout_username || '',
        sender,
        content: content.trim(),
        read_by_scout: sender === 'admin' ? false : true,
      });

      return Response.json({ ok: true, message: msg });
    }

    // GET MESSAGES for a conversation
    if (action === 'get') {
      const { scout_user_id, viewer_user_id } = body;
      if (!scout_user_id) return Response.json({ error: 'Scout ID mungon' }, { status: 400 });

      const adminOk = await isAdminRequest();

      // Non-admin scouts can only read their own conversation
      if (!adminOk) {
        if (!viewer_user_id || viewer_user_id !== scout_user_id) {
          return Response.json({ error: 'Nuk ke leje' }, { status: 403 });
        }
      }

      const msgs = await base44.asServiceRole.entities.FanChatPrivateMessage.filter(
        { scout_user_id },
        'created_date',
        200
      );

      // Mark admin messages as read when scout views
      if (!adminOk) {
        const unread = msgs.filter(m => m.sender === 'admin' && !m.read_by_scout);
        if (unread.length > 0) {
          await Promise.all(unread.map(m =>
            base44.asServiceRole.entities.FanChatPrivateMessage.update(m.id, { read_by_scout: true })
          ));
        }
      }

      return Response.json({ ok: true, messages: msgs });
    }

    // LIST ALL CONVERSATIONS (admin only)
    if (action === 'list_conversations') {
      const ok = await isAdminRequest();
      if (!ok) return Response.json({ error: 'Nuk ke leje' }, { status: 403 });

      const allMsgs = await base44.asServiceRole.entities.FanChatPrivateMessage.list('-created_date', 500);

      const convMap = {};
      for (const m of allMsgs) {
        if (!convMap[m.scout_user_id]) {
          convMap[m.scout_user_id] = {
            scout_user_id: m.scout_user_id,
            scout_username: m.scout_username,
            scout_display_name: m.scout_display_name,
            last_message: m.content,
            last_message_date: m.created_date,
            unread_from_scout: 0,
          };
        }
        if (m.sender === 'scout' && !m.read_by_scout) {
          convMap[m.scout_user_id].unread_from_scout++;
        }
      }

      return Response.json({ ok: true, conversations: Object.values(convMap) });
    }

    // MARK READ (admin marks scout messages as read)
    if (action === 'mark_read') {
      const { scout_user_id } = body;
      const ok = await isAdminRequest();
      if (!ok) return Response.json({ error: 'Nuk ke leje' }, { status: 403 });

      const msgs = await base44.asServiceRole.entities.FanChatPrivateMessage.filter({ scout_user_id }, 'created_date', 200);
      const unread = msgs.filter(m => m.sender === 'scout' && !m.read_by_scout);
      await Promise.all(unread.map(m =>
        base44.asServiceRole.entities.FanChatPrivateMessage.update(m.id, { read_by_scout: true })
      ));

      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Veprim i panjohur' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});