import { storage } from "./storage";

export async function seedDatabase() {
  const hasData = await storage.hasData();
  if (hasData) return;

  const snapshot = await storage.createSnapshot({
    snapshotDate: "2026-02-01",
    totalScore: 81,
    regime: "Neutral / Balanced",
    regimeSubtitle: "Leaning Fragile",
    interpretation: "The Macro Pulse Score of 81 indicates a neutral macro environment with increasing fragility. The score has declined 11 points over the past year, primarily driven by weakening business cycle and persistent monetary tightness. While inflation metrics remain stable, sentiment and volatility conditions limit aggressive risk positioning.",
    vsYesterday: -1,
    vs3mAvg: -4,
    vs1yAvg: -7,
    oneYearAgoScore: 92,
  });

  const trendData = [
    { month: "Feb 2025", score: 92, sortOrder: 0 },
    { month: "Mar"     , score: 90, sortOrder: 1 },
    { month: "Apr"     , score: 89, sortOrder: 2 },
    { month: "May"     , score: 87, sortOrder: 3 },
    { month: "Jun"     , score: 85, sortOrder: 4 },
    { month: "Jul"     , score: 84, sortOrder: 5 },
    { month: "Aug"     , score: 86, sortOrder: 6 },
    { month: "Sep"     , score: 83, sortOrder: 7 },
    { month: "Oct"     , score: 82, sortOrder: 8 },
    { month: "Nov"     , score: 80, sortOrder: 9 },
    { month: "Dec"     , score: 78, sortOrder: 10 },
    { month: "Jan 2026", score: 82, sortOrder: 11 },
    { month: "Feb 2026", score: 81, sortOrder: 12 },
  ];

  for (const tp of trendData) {
    await storage.createTrendPoint({ snapshotId: snapshot.id, ...tp });
  }

  const blocksData = [
    {
      name: "Rates & Central Bank Policy",
      score: 13,
      summary: "Tight monetary conditions remain restrictive.",
      sortOrder: 0,
      metrics: [
        { name: "Fed Funds Rate Level"      , score: 3, interpretation: "Elevated, acting as a headwind to growth."      , isTopDriver: 0 },
        { name: "Last Rate Change Direction", score: 3, interpretation: "Hold/Mild cuts expected, restrictive real rate.", isTopDriver: 0 },
        { name: "Forward Guidance Tone"     , score: 2, interpretation: "Cautious, data-dependent stance."               , isTopDriver: 1 },
        { name: "Yield Curve (2Y–10Y)"      , score: 1, interpretation: "Inversion persists, signaling late-cycle risks.", isTopDriver: 1 },
        { name: "Balance Sheet (QE/QT)"     , score: 2, interpretation: "QT ongoing, liquidity drain."                   , isTopDriver: 0 },
        { name: "Real Interest Rate"        , score: 2, interpretation: "Positive and restrictive."                      , isTopDriver: 0 },
      ],
    },
    {
      name: "Inflation & Labour Market",
      score: 17,
      summary: "Disinflation trend stabilizing as labor supply normalizes.",
      sortOrder: 1,
      metrics: [
        { name: "CPI YoY", score: 3, interpretation: "Disinflation trend stabilizing.", isTopDriver: 0 },
        { name: "Core CPI Trend", score: 3, interpretation: "Sticky services inflation remains.", isTopDriver: 0 },
        { name: "Unemployment Rate", score: 3, interpretation: "Trending slightly higher but sub-4.5%.", isTopDriver: 0 },
        { name: "NFP Surprise", score: 2, interpretation: "Mild downside surprises appearing.", isTopDriver: 1 },
        { name: "Wage Growth", score: 3, interpretation: "Moderating, relieving corporate margin pressure.", isTopDriver: 0 },
        { name: "Participation Rate", score: 3, interpretation: "Stable labor supply.", isTopDriver: 1 },
      ],
    },
    {
      name: "Sentiment & Volatility",
      score: 12,
      summary: "Elevated baseline volatility with defensive positioning.",
      sortOrder: 2,
      metrics: [
        { name: "VIX", score: 2, interpretation: "Elevated baseline, nervous market.", isTopDriver: 1 },
        { name: "Put/Call Ratio", score: 2, interpretation: "Defensive positioning increasing.", isTopDriver: 1 },
        { name: "AAII Spread", score: 2, interpretation: "Retail skepticism prominent.", isTopDriver: 0 },
        { name: "Fear & Greed Index", score: 2, interpretation: "Leaning towards fear.", isTopDriver: 0 },
        { name: "Market Breadth", score: 2, interpretation: "Deteriorating participation.", isTopDriver: 0 },
        { name: "VVIX", score: 2, interpretation: "Options volatility premium elevated.", isTopDriver: 0 },
      ],
    },
    {
      name: "Commodities & Global Flow",
      score: 15,
      summary: "Safe-haven flows support gold amidst industrial weakness.",
      sortOrder: 3,
      metrics: [
        { name: "Oil (WTI)", score: 3, interpretation: "Rangebound, demand concerns vs supply risk.", isTopDriver: 0 },
        { name: "Gold", score: 3, interpretation: "Supported by central bank buying and risk-aversion.", isTopDriver: 0 },
        { name: "DXY", score: 2, interpretation: "Dollar strength acting as a global tightening force.", isTopDriver: 0 },
        { name: "Copper", score: 2, interpretation: "Weakness signaling industrial slowdown.", isTopDriver: 1 },
        { name: "Global PMI", score: 3, interpretation: "Stabilizing at low levels.", isTopDriver: 0 },
        { name: "Treasury Liquidity", score: 2, interpretation: "Friction in sovereign debt markets.", isTopDriver: 1 },
      ],
    },
    {
      name: "Business Cycle & Rotation",
      score: 12,
      summary: "Late-cycle indicators show persistent contraction.",
      sortOrder: 4,
      metrics: [
        { name: "ISM PMI", score: 2, interpretation: "Contractionary territory.", isTopDriver: 1 },
        { name: "LEI Trend", score: 2, interpretation: "Consistent negative streak.", isTopDriver: 1 },
        { name: "Small vs Large Caps", score: 2, interpretation: "Large cap dominance continues, narrow leadership.", isTopDriver: 0 },
        { name: "Growth vs Value", score: 2, interpretation: "Choppy rotation amidst rate uncertainty.", isTopDriver: 0 },
        { name: "High Yield Spread", score: 2, interpretation: "Widening, credit stress emerging.", isTopDriver: 0 },
        { name: "IPO Activity", score: 2, interpretation: "Subdued primary market.", isTopDriver: 0 },
      ],
    },
    {
      name: "Narrative & Political Risk",
      score: 12,
      summary: "Geopolitical friction acting as structural headwind.",
      sortOrder: 5,
      metrics: [
        { name: "China–US Tension Index", score: 2, interpretation: "Persistent structural friction.", isTopDriver: 0 },
        { name: "Geopolitical Risk Index", score: 2, interpretation: "Elevated regional conflicts.", isTopDriver: 0 },
        { name: "Sanctions Activity", score: 2, interpretation: "Increasing fragmentation of trade.", isTopDriver: 1 },
        { name: "Media Fear Index", score: 2, interpretation: "Recession narrative peaking.", isTopDriver: 0 },
        { name: "Policy Conflict Indicator", score: 2, interpretation: "Fiscal vs Monetary dominance clash.", isTopDriver: 1 },
        { name: "Global Easing/Tightening", score: 2, interpretation: "Asynchronous central bank actions.", isTopDriver: 0 },
      ],
    },
  ];

  for (const blockData of blocksData) {
    const block = await storage.createBlock({
      snapshotId: snapshot.id,
      name: blockData.name,
      score: blockData.score,
      maxScore: 20,
      summary: blockData.summary,
      sortOrder: blockData.sortOrder,
    });

    for (let i = 0; i < blockData.metrics.length; i++) {
      const m = blockData.metrics[i];
      await storage.createMetric({
        blockId: block.id,
        name: m.name,
        domain: blockData.name,
        score: m.score,
        maxScore: 5,
        interpretation: m.interpretation,
        isTopDriver: m.isTopDriver,
        sortOrder: i,
      });
    }
  }

  console.log("Database seeded successfully.");
}
