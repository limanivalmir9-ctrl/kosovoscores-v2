import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support two callers:
    //   1. Direct HTTP call: { match_id, home_team, away_team, competition_name, stadium }
    //   2. Entity-update automation: { event, data, old_data, payload_too_large }
    let match_id = body?.match_id;
    let home_team = body?.home_team;
    let away_team = body?.away_team;
    let competition_name = body?.competition_name;
    let stadium = body?.stadium;

    if (!match_id && body?.data) {
      const m = body.data;
      match_id = m.id;
      home_team = home_team || m.home_team_name;
      away_team = away_team || m.away_team_name;
      competition_name = competition_name || m.competition_name;
      stadium = stadium || m.stadium;
    }

    // If the automation payload was too large (data omitted), fetch the match by id.
    if (!match_id && body?.event?.entity_id) {
      try {
        const m = await base44.asServiceRole.entities.Match.get(body.event.entity_id);
        match_id = m?.id;
        home_team = home_team || m?.home_team_name;
        away_team = away_team || m?.away_team_name;
        competition_name = competition_name || m?.competition_name;
        stadium = stadium || m?.stadium;
      } catch (_) { /* ignore — handled below */ }
    }

    if (!match_id) {
      return Response.json({ error: 'Match ID mungon' }, { status: 400 });
    }

    const webhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL');
    if (!webhookUrl) {
      return Response.json({ error: 'Discord Webhook nuk u konfigurua' }, { status: 500 });
    }

    // Construct message for Discord
    const message = {
      content: `🔴 **LIVE** — ${home_team} vs ${away_team}`,
      embeds: [
        {
          title: `${home_team} vs ${away_team}`,
          description: `**${competition_name}** • ${stadium || 'Stadium i panjohur'}`,
          color: 16711680, // Red for live
          fields: [
            {
              name: '⚽ Ndeshja ka filluar',
              value: 'Shiko live përditësimet në aplikacionin tonë!',
              inline: false,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    // Send to Discord webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const error = await response.text();
      return Response.json(
        { error: `Discord dërgim dështoi: ${error}` },
        { status: response.status }
      );
    }

    return Response.json({ ok: true, message: 'Njoftim dërguar në Discord' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});