/* ICT Lab's canonical resource registry. Use lesson-specific link text and rank on the referring card. */
(() => {
  const rows = [
  [
    "g3oDYq4P9ZE",
    "TTrades",
    "ICT Daily Bias - The Only Video You Will Ever Need!",
    "watch page title",
    []
  ],
  [
    "75S4vwD4P1U",
    "TTrades",
    "Breaker Blocks Simplified - ICT Concepts",
    "watch page title",
    []
  ],
  [
    "9AL41xON3hA",
    "TTrades",
    "The Only Trading Strategy You Need For 2026",
    "catalog metadata",
    []
  ],
  [
    "QmGJFxfSHxM",
    "TTrades",
    "Daily bias and filtering trading days",
    "descriptive fallback",
    []
  ],
  [
    "U8xH2dEgH5A",
    "TTrades",
    "Liquidity: Buyside & Sellside - ICT Concepts",
    "watch page title",
    []
  ],
  [
    "Njs-eRpeP9Q",
    "TTrades",
    "What is Liquidity? - ICT Concepts",
    "watch page title",
    [
      238
    ]
  ],
  [
    "MmvC4rsmmcM",
    "TTrades",
    "Draw on Liquidity (DOL) - ICT Concepts",
    "catalog metadata",
    []
  ],
  [
    "YESqIoA7Wyg",
    "TTrades",
    "Important Liquidity Levels - Draw On Liquidity - ICT",
    "catalog metadata",
    [
      95,
      161,
      298
    ]
  ],
  [
    "sgAnVR6RSDg",
    "TTrades",
    "Understanding Market Structure For Trading",
    "catalog metadata",
    []
  ],
  [
    "_94CPMjWi9E",
    "TTrades",
    "Market Structure Shift - ICT Concepts",
    "watch page title",
    []
  ],
  [
    "1oco9lesido",
    "TTrades",
    "What is Displacement? - ICT Concepts",
    "catalog metadata",
    []
  ],
  [
    "PePk1V0Q4QQ",
    "TTrades",
    "Intro to Market Structure Shifts, Fair Value Gaps, and Displacement - ICT Concepts",
    "watch page title",
    []
  ],
  [
    "yb3Te7tiGRk",
    "TTrades",
    "Understanding Dealing Ranges in Trading (Get Better Risk Reward)",
    "catalog metadata",
    []
  ],
  [
    "CAuN4tvLInQ",
    "TTrades",
    "Choosing Dealing Ranges & Displacement Ranges - ICT Concepts",
    "watch page title",
    []
  ],
  [
    "Gu7FjYYcKhI",
    "TTrades",
    "Discount & Premium - ICT Concepts",
    "catalog metadata",
    []
  ],
  [
    "mwmWNCTEYtY",
    "TTrades",
    "Internal & External Liquidity Model - ICT Concepts",
    "watch page title",
    []
  ],
  [
    "ZVUDpCyvxfQ",
    "TTrades",
    "Understanding Fair Value Gaps (FVG) - ICT Concepts",
    "watch page title",
    []
  ],
  [
    "FKTBkTzsmUA",
    "TTrades",
    "How To Actually Trade Inversion Fair Value Gaps (IFVG)",
    "catalog metadata",
    []
  ],
  [
    "NqSbvqDKML0",
    "TTrades",
    "The Only Points of Interest That Actually Matter For Trading",
    "catalog metadata",
    []
  ],
  [
    "DMUiDBnTYc8",
    "TTrades",
    "Order Blocks Simplified - ICT Concepts",
    "watch page title",
    []
  ],
  [
    "bbWPoajy2MY",
    "TTrades",
    "Mitigation Blocks Simplified - ICT Concepts",
    "watch page title",
    []
  ],
  [
    "9PKJ0U1gl4g",
    "TTrades",
    "Propulsion Blocks Simplified - ICT Concepts",
    "catalog metadata",
    []
  ],
  [
    "MPeeE55rNOw",
    "TTrades",
    "ICT Killzones & Indicator Settings",
    "watch page title",
    []
  ],
  [
    "iEaMbuFZb24",
    "TTrades",
    "Trade Like TTrades - Top Down Analysis",
    "catalog metadata",
    []
  ],
  [
    "4WCiIyCiBrQ",
    "TTrades",
    "ICT Daily Profile - Seek & Destroy",
    "catalog metadata",
    [
      495
    ]
  ],
  [
    "caaS6_Q7O78",
    "TTrades",
    "Next Day Model - Fractal Way To Get Bias For Trading",
    "catalog metadata",
    []
  ],
  [
    "27S9gjgcSlI",
    "TTrades",
    "SMT Divergence - ICT Concepts",
    "watch page title",
    []
  ],
  [
    "Ibw4saRtYMk",
    "TTrades",
    "The MMXM Trader | Advanced ICT MMXM Lesson (Everything You Need To Know)",
    "watch page title",
    []
  ],
  [
    "rXMVPUZPw4A",
    "TTrades",
    "Breaker Block & FVG Entry Model - ICT Concepts",
    "watch page title",
    []
  ],
  [
    "MvD7fQQ0szE",
    "TTrades",
    "Backtesting Simplified - A Clear Step-by-Step Approach",
    "catalog metadata",
    [
      1194
    ]
  ],
  [
    "0OjlQ91TZiU",
    "TTrades",
    "Position Sizing For Trading - Futures & Forex",
    "catalog metadata",
    []
  ],
  [
    "LZZAaILYNyI",
    "TTrades",
    "Stop Losses, Placement & Trailing - ICT Concepts",
    "catalog metadata",
    []
  ],
  [
    "wrIZ7CAuFCc",
    "TTrades",
    "How To Journal Everyday For Trading",
    "watch page title",
    []
  ],
  [
    "Bkt8B3kLATQ",
    "The Inner Circle Trader",
    "2022 ICT Mentorship Episode 6",
    "watch page title",
    []
  ],
  [
    "tRq1hyGGtl4",
    "The Inner Circle Trader",
    "2023 ICT Mentorship - ICT Silver Bullet Time Based Trading Model",
    "watch page title",
    []
  ],
  [
    "iKsIbUblSWM",
    "The Inner Circle Trader",
    "ICT Mentorship 2023 - Market Maker Models",
    "watch page title",
    []
  ],
  [
    "Cg0-CFJOJvg",
    "The Inner Circle Trader",
    "OTE Primer - Intro To ICT Optimal Trade Entry",
    "watch page title",
    []
  ],
  [
    "sfRO5LrTgTA",
    "The Inner Circle Trader",
    "ICT Mentorship 2023 - Advanced Gap Theory Introduction",
    "watch page title",
    []
  ],
  [
    "_j_youagfes",
    "The Inner Circle Trader",
    "ICT Forex Price Action Lesson - Order Flow & Volume Imbalances",
    "catalog metadata",
    []
  ],
  [
    "oALYX0HCSYw",
    "The Inner Circle Trader",
    "ICT Mentorship Core Content - Month 04 - ICT Rejection Block",
    "watch page title",
    []
  ],
  [
    "JA0mLNJeytY",
    "The Inner Circle Trader",
    "ICT Forex - Implementing The Asian Range",
    "watch page title",
    []
  ],
  [
    "ley5HZs4bUM",
    "The Inner Circle Trader",
    "ICT Forex - The ICT Asian Killzone",
    "catalog metadata",
    []
  ],
  [
    "G8OEsUAoIWE",
    "The Inner Circle Trader",
    "ICT Forex - The ICT London Killzone",
    "watch page title",
    []
  ],
  [
    "plNN9n7nrxc",
    "The Inner Circle Trader",
    "ICT Forex - The ICT New York Killzone",
    "watch page title",
    []
  ],
  [
    "iZLXnNiZm_s",
    "The Inner Circle Trader",
    "2022 ICT Mentorship Episode 9",
    "watch page title",
    []
  ],
  [
    "kmVXVJE08eQ",
    "The Inner Circle Trader",
    "2022 ICT Mentorship Episode 21",
    "catalog metadata",
    []
  ],
  [
    "nI1AMOC1pro",
    "The Inner Circle Trader",
    "ICT Mentorship Core Content - Month 08 - Central Bank Dealers Range",
    "catalog metadata",
    []
  ],
  [
    "-M-RAtxB-bE",
    "The Inner Circle Trader",
    "ICT 2024 Mentorship | NDOGs & Tape Reading | September 24, 2024",
    "catalog metadata",
    []
  ],
  [
    "g8bhZReDK-Q",
    "The Inner Circle Trader",
    "Institutional Market Structure & Standard Deviations With Buyside Liquidity",
    "watch page title",
    []
  ],
  [
    "xJMbva8SjzE",
    "The Inner Circle Trader",
    "ICT Forex - Understanding The ICT Judas Swing",
    "watch page title",
    []
  ],
  [
    "PFUe6OKmKuk",
    "The Inner Circle Trader",
    "June 24, 2024 NQ Turtle Soup Short",
    "catalog metadata",
    []
  ],
  [
    "r3E1WQcx2-c",
    "The Inner Circle Trader",
    "January 21, 2025 - Live Execution | NQ PreMarket Turtle Soup Short",
    "catalog metadata",
    []
  ],
  [
    "twIPoG2TZ1o",
    "The Inner Circle Trader",
    "ICT Charter Price Action Model 9 - One Shot One Kill",
    "watch page title",
    []
  ],
  [
    "zq4hz_XiTRE",
    "The Inner Circle Trader",
    "One Shot - One Kill Trade Setup Review",
    "catalog metadata",
    []
  ],
  [
    "WKKnlIIkBTk",
    "The Inner Circle Trader",
    "NWOG - New Week Opening Gap",
    "watch page title",
    []
  ],
  [
    "zqzf874CJA0",
    "JadeCap",
    "ICT Liquidity Explained in 22 Minutes",
    "watch page title",
    []
  ],
  [
    "OIS41B24HGM",
    "JadeCap",
    "One ICT Trading Strategy for Life | Full Free Course",
    "watch page title",
    []
  ],
  [
    "qYdj6ncWNxc",
    "JadeCap",
    "How I Got Funded $3,000,000+ In Futures Using ICT | Full Breakdown",
    "catalog metadata",
    []
  ],
  [
    "4XOHXoputX0",
    "AM",
    "Using Daily Profiles to Confirm a Bias (And More)",
    "watch page title",
    []
  ],
  [
    "bWAKrdIbyoQ",
    "AM",
    "How I Mechanically Confirm Daily Bias (Using Daily Profiles)",
    "catalog metadata",
    []
  ],
  [
    "8EkwGnZz-Lk",
    "DodgysDD",
    "The ICT Trading Strategy That Has Worked FOREVER",
    "catalog metadata",
    []
  ],
  [
    "pDuYfau3qmI",
    "DodgysDD",
    "How I made $6,969 in ONE DAY Trading My BEST ICT Strategy",
    "catalog metadata",
    []
  ],
  [
    "9OiCH9vhCIA",
    "Zeussy",
    "Markets Move Based On Their Schedule",
    "catalog metadata",
    []
  ],
  [
    "6SGzWB8X7dI",
    "Justin Werlein",
    "What is Liquidity? - How to Trade ICT Concepts",
    "catalog metadata",
    []
  ],
  [
    "0rZ8Vfq-xgk",
    "Justin Werlein",
    "ICT POWER OF 3 (SUPER SIMPLE!) | HOW TO TRADE ICT",
    "catalog metadata",
    []
  ],
  [
    "0s8pp5YaRHk",
    "Ali Khan",
    "This A+ ICT Strategy is ALL You Need | (Step By Step)",
    "catalog metadata",
    []
  ],
  [
    "MPR0twSaRp4",
    "Ali Khan",
    "Beginners Guide To ICT Trading (What you NEED to know)",
    "catalog metadata",
    []
  ],
  [
    "Bi6D75jHnZM",
    "Kimmel Trading",
    "How to become PROFITABLE WITH ICT (Step-by-Step)",
    "catalog metadata",
    []
  ],
  [
    "oRDC-JMMJns",
    "Kimmel Trading",
    "Most useful ICT concepts",
    "catalog metadata",
    []
  ],
  [
    "ShlccbF9jUA",
    "flux trades",
    "HOW TO TRADE MMXM | ICT Concepts",
    "catalog metadata",
    []
  ],
  [
    "QMNL9SMYUR4",
    "flux trades",
    "MMXM Entry Techniques for Every Phase | ICT Concepts",
    "catalog metadata",
    []
  ],
  [
    "8OX-mcSHWhg",
    "Chart Fanatics",
    "Worlds BEST Prop Firm Trader Reveals SIMPLE Trading Strategy - Jadecap (Full Breakdown)",
    "watch page title",
    []
  ],
  [
    "UIGZtoGGPH4",
    "Chart Fanatics",
    "If You Only Watch One ICT Trading Video, Make It This (LIVE Trading)",
    "catalog metadata",
    [
      364,
      1306,
      1989
    ]
  ],
  [
    "PZDWQgtqt2I",
    "Chart Fanatics",
    "This SIMPLE ICT Futures Trading Strategy Made Her Over $100,000 - Tanja Trades (Copy This)",
    "catalog metadata",
    []
  ],
  [
    "IB-fyWI5j8w",
    "Chart Fanatics",
    "TAKE This EASY ICT Trading Strategy For Prop Firms (INSANE Entries)",
    "catalog metadata",
    []
  ],
  [
    "-kGVL93XfyE",
    "Chart Fanatics",
    "Trading LIVE With The World’s #1 Prop Firm Scalper ($2.5M+ Payouts)",
    "catalog metadata",
    [
      536,
      1305,
      2832
    ]
  ],
  [
    "dQuHz6Vadow",
    "Chart Fanatics",
    "How To Get The BEST Trade Entries Using ICT Concepts 👀",
    "catalog metadata",
    []
  ],
  [
    "w42kzZb9oYY",
    "Words of Rizdom",
    "Worlds Best ICT Trader BREAKS World Record Prop Firm Payout - JadeCap",
    "watch page title",
    [
      1090,
      5136,
      5522
    ]
  ],
  [
    "9j1jttkm4s8",
    "Words of Rizdom",
    "ICT Roundtable: NBB Trader, JadeCapFX, Ali khan ICT, Kimmel Trading | WOR Podcast EP.100",
    "catalog metadata",
    [
      948,
      1752,
      2739,
      4861
    ]
  ],
  [
    "rxPPBj29kFg",
    "Words of Rizdom",
    "NBB Trader Part II: This ICT Strategy Will Change Everything! | WOR Podcast - EP.118",
    "catalog metadata",
    []
  ],
  [
    "LF1VTFohH0U",
    "Words of Rizdom",
    "Best ICT Trader: He Exposes Why 90% of SMC Traders FAIL!",
    "catalog metadata",
    []
  ],
  [
    "nY1NaXsFDQM",
    "Words of Rizdom Clips",
    "Ali Khan ICT interview excerpt",
    "descriptive fallback",
    []
  ]
];
  const registry = Object.create(null);
  for (const [id, uploader, label, titleSource, chapterSeconds] of rows) {
    if (registry[id] || !/^[\w-]{11}$/.test(id)) throw new Error("Invalid video catalog entry " + id);
    const role = /Chart Fanatics|Words of Rizdom/.test(uploader) ? "Podcast"
      : uploader === "The Inner Circle Trader" ? "Original ICT"
      : ["pDuYfau3qmI","qYdj6ncWNxc"].includes(id) ? "Chart Example" : "Creator Explanation";
    registry[id] = Object.freeze({
      id, url: "https://www.youtube.com/watch?v=" + id, title: label,
      publishedTitle: titleSource === "descriptive fallback" ? null : label,
      titleSource, uploader, language: "en", role,
      checkedDate: "2026-11-21", availability: titleSource === "watch page title" ? "Watch page indexed" : "Playback unconfirmed",
      chapterSeconds: Object.freeze(chapterSeconds),
      coverageNote: "Playback and embedding availability can vary by region."
    });
  }
  window.ictVideos = Object.freeze(registry);
})();
