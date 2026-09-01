import { base44 } from '@/api/base44Client';

// Frontend helper for news authors (sub-admins with the 'news' section).
// News writes are admin-only via RLS; a restricted news author routes every
// mutation through the `newsAction` backend function (service role), validated
// by the two access codes the author logged in with. The function only allows
// news create/update/delete — nothing else — so the author is isolated to news.
export async function newsCreate(code1, code2, data) {
  const res = await base44.functions.invoke('newsAction', { code1, code2, op: 'create', data });
  const d = res.data;
  if (!d || !d.ok) throw new Error((d && d.error) || 'Gabim gjatë krijimit');
  return d.news;
}

export async function newsUpdate(code1, code2, id, data) {
  const res = await base44.functions.invoke('newsAction', { code1, code2, op: 'update', id, data });
  const d = res.data;
  if (!d || !d.ok) throw new Error((d && d.error) || 'Gabim gjatë përditësimit');
  return d;
}

export async function newsDelete(code1, code2, id) {
  const res = await base44.functions.invoke('newsAction', { code1, code2, op: 'delete', id });
  const d = res.data;
  if (!d || !d.ok) throw new Error((d && d.error) || 'Gabim gjatë fshirjes');
  return d;
}