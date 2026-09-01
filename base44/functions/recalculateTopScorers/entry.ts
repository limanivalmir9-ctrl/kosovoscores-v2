import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const competition_id = body?.competition_id;

    if (!competition_id) {
      return Response.json({ error: 'competition_id mungon' }, { status: 400 });
    }

    const sr = base44.asServiceRole;

    // 1. Të gjitha ndeshjet e përfunduara të kësaj lige
    const [ftMatches, orMatches] = await Promise.all([
      sr.entities.Match.filter({ competition_id, status: 'full_time' }, null, 500),
      sr.entities.Match.filter({ competition_id, status: 'official_result' }, null, 500),
    ]);
    const matches = [...ftMatches, ...orMatches];
    const matchIds = new Set(matches.map(m => m.id));

    if (matchIds.size === 0) {
      // Asnjë ndeshje e mbaruar — fshi të gjithë golashënuesit auto-të-gjeneruar të kësaj lige
      const existing = await sr.entities.TopScorer.filter({ competition_id }, '-goals', 1000);
      const auto = existing.filter(s => s.player_id);
      for (const s of auto) await sr.entities.TopScorer.delete(s.id);
      return Response.json({ ok: true, updated: 0, deleted: auto.length });
    }

    // 2. Ngjarjet e golave për këto ndeshje
    const allEvents = await sr.entities.MatchEvent.filter({}, null, 5000);
    const goalEvents = allEvents.filter(e =>
      matchIds.has(e.match_id) &&
      (e.type === 'goal' || e.type === 'penalty_goal')
    );

    // 3. Numëro golat sipas player_id
    const counts = {};
    for (const e of goalEvents) {
      const pid = e.player_id;
      if (!pid) continue;
      if (!counts[pid]) counts[pid] = { player_id: pid, player_name: e.player_name || '', goals: 0 };
      counts[pid].goals += 1;
      if (!counts[pid].player_name && e.player_name) counts[pid].player_name = e.player_name;
    }

    // 4. Klubet & lojtarët për plotësim të photos/club
    const [allClubs, allPlayers] = await Promise.all([
      sr.entities.Club.list(null, 500),
      sr.entities.Player.list(null, 2000),
    ]);
    const clubById = {};
    for (const c of allClubs) clubById[c.id] = c;
    const playerByEntityId = {};
    for (const p of allPlayers) playerByEntityId[p.id] = p;

    // 5. TopScorer ekzistues për këtë ligë
    const existing = await sr.entities.TopScorer.filter({ competition_id }, '-goals', 1000);
    const existingByPid = {};
    const manual = []; // pa player_id (të krijuara manualisht)
    for (const s of existing) {
      if (s.player_id) existingByPid[s.player_id] = s;
      else manual.push(s);
    }

    let updated = 0;
    let created = 0;

    // 6. Upsert për çdo lojtar me gola
    for (const pid of Object.keys(counts)) {
      const c = counts[pid];
      const player = playerByEntityId[pid];
      const club = player?.club_id ? clubById[player.club_id] : null;

      const payload = {
        competition_id,
        player_id: pid,
        player_name: c.player_name || player?.name || '',
        goals: c.goals,
      };
      // Plotëso foto/club vetëm nëse mungojnë (ruaj vlerat manuale)
      if (player?.photo) payload.photo = player.photo;
      if (club?.name) payload.club_name = club.name;
      if (club?.logo) payload.club_logo = club.logo;

      if (existingByPid[pid]) {
        const ex = existingByPid[pid];
        const patch = { goals: c.goals, player_name: payload.player_name || ex.player_name };
        if (!ex.photo && payload.photo) patch.photo = payload.photo;
        if (!ex.club_name && payload.club_name) patch.club_name = payload.club_name;
        if (!ex.club_logo && payload.club_logo) patch.club_logo = payload.club_logo;
        await sr.entities.TopScorer.update(ex.id, patch);
        updated++;
      } else {
        await sr.entities.TopScorer.create(payload);
        created++;
      }
    }

    // 7. Fshi rekordet auto (me player_id) që tani kanë 0 gola
    let deleted = 0;
    for (const s of existing) {
      if (!s.player_id) continue; // mos prek rekordet manuale
      if (!counts[s.player_id]) {
        await sr.entities.TopScorer.delete(s.id);
        deleted++;
      }
    }

    return Response.json({ ok: true, updated, created, deleted, totalScorers: Object.keys(counts).length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});