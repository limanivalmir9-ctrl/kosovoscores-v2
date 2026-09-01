import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Service-role proxy for news authors (sub-admins with the 'news' section).
// News writes are admin-only via RLS, and a restricted news author should not
// hold a super-admin token. This function validates the author's two access
// codes against an active SubAdmin whose allowed_sections includes 'news',
// then performs only news create/update/delete (with a field whitelist).
// Anything else is rejected — a news author can touch nothing but News.
const ALLOWED_FIELDS = ['title', 'content', 'image', 'published', 'season', 'archived'];

function pick(data) {
  const out = {};
  if (!data || typeof data !== 'object') return out;
  for (const k of ALLOWED_FIELDS) if (k in data) out[k] = data[k];
  return out;
}

export default async function newsAction(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { code1, code2, op } = body || {};
    if (!code1 || !code2 || !op) {
      return Response.json({ ok: false, error: 'code1, code2 and op required' }, { status: 400 });
    }
    const sr = base44.asServiceRole;

    // Validate author: active SubAdmin whose allowed_sections includes 'news'
    const subs = await sr.entities.SubAdmin.filter({ active: true });
    const author = (subs || []).find(s =>
      ((s.code1 === String(code1).trim() && s.code2 === String(code2).trim()) ||
       (s.code1 === String(code2).trim() && s.code2 === String(code1).trim())) &&
      s.code1 !== s.code2 &&
      Array.isArray(s.allowed_sections) && s.allowed_sections.includes('news')
    );
    if (!author) {
      return Response.json({ ok: false, error: 'Autorizim i pavlefshëm për lajme' }, { status: 403 });
    }

    if (op === 'create') {
      const created = await sr.entities.News.create({ ...pick(body.data), published: true });
      return Response.json({ ok: true, news: created });
    }
    if (op === 'update') {
      if (!body.id) return Response.json({ ok: false, error: 'id required' }, { status: 400 });
      await sr.entities.News.update(body.id, pick(body.data));
      return Response.json({ ok: true });
    }
    if (op === 'delete') {
      if (!body.id) return Response.json({ ok: false, error: 'id required' }, { status: 400 });
      await sr.entities.News.delete(body.id);
      return Response.json({ ok: true });
    }
    return Response.json({ ok: false, error: 'unknown op: ' + op }, { status: 400 });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}