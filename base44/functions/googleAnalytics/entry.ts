import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Numeric Property ID from GA4 Admin → Property Settings (not the G-XXXXXXX measurement ID)
const GA_PROPERTY_ID = '538877989';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('google_analytics');

    // Fetch daily active users (last 30 days) and league page views
    const body = {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
      ],
      dimensions: [
        { name: 'date' },
        { name: 'pagePath' },
      ],
      dimensionFilter: {
        orGroup: {
          expressions: [
            {
              filter: {
                fieldName: 'pagePath',
                stringFilter: { matchType: 'EXACT', value: '/' },
              },
            },
            {
              filter: {
                fieldName: 'pagePath',
                stringFilter: { matchType: 'BEGINS_WITH', value: '/ligat' },
              },
            },
          ],
        },
      },
      orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
      limit: 500,
    };

    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${GA_PROPERTY_ID}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: err }, { status: res.status });
    }

    const data = await res.json();

    // Process rows into daily active users and league page views per day
    const dailyUsers = {};
    const leagueViews = {};

    (data.rows || []).forEach((row) => {
      const date = row.dimensionValues[0].value; // YYYYMMDD
      const path = row.dimensionValues[1].value;
      const users = parseInt(row.metricValues[0].value || '0');
      const views = parseInt(row.metricValues[1].value || '0');

      // Format date as YYYY-MM-DD
      const d = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;

      if (!dailyUsers[d]) dailyUsers[d] = 0;
      dailyUsers[d] += users;

      if (path.startsWith('/ligat')) {
        if (!leagueViews[d]) leagueViews[d] = 0;
        leagueViews[d] += views;
      }
    });

    const dates = [...new Set([...Object.keys(dailyUsers), ...Object.keys(leagueViews)])].sort();

    const result = dates.map((d) => ({
      date: d,
      activeUsers: dailyUsers[d] || 0,
      leaguePageViews: leagueViews[d] || 0,
    }));

    return Response.json({ data: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});