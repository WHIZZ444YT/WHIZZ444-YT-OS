(() => {
  "use strict";
  const playbooks = [];
  function add(id, title, category, attribution, summary, market, timeframe, concepts, rules, examples, tutorials) {
    playbooks.push({id, title, category, attribution, summary, market, timeframe, concepts: concepts.split(" "), rules, examples, tutorials, videoIds: tutorials.map(item => item[0])});
  }

  add("P01", "ICT 2022 Mentorship setup", "Setup", "Original ICT lesson", "Study the sequence from a liquidity raid through displacement to a retracement into a fair value gap.", "NQ or ES", "15-minute context and 1–5-minute execution", "C04 C08 C09 C16",
    ["Mark a prior extreme and a confirmed opposing swing before the raid.", "After the raid, wait for displacement through that swing. Mark the resulting three-candle FVG and observe the first return.", "Record the raid extreme as structural invalidation before entering.", "Name an opposing liquidity objective that remains available.", "Skip if the structure shift is missing or the objective has already traded.", "Expire the idea at structural invalidation or the end of the planned session."],
    ["Price sweeps a prior low, breaks a confirmed short-term high, then returns to a bullish FVG.", "A gap appears after a sweep, but price has yet to break the reference swing.", "Price reaches the objective before the first retracement."],
    [["Bkt8B3kLATQ","Watch the original 2022 mentorship lesson"],["PePk1V0Q4QQ","Compare displacement, MSS and FVGs"]]);

  add("P02", "Silver Bullet", "Time-based setup", "Original ICT lesson", "Look for a qualifying imbalance and a draw on liquidity during a specific New York time window.", "NQ or ES", "1–5-minute chart during a selected window", "C05 C16 C27 C28 C29",
    ["Choose 03:00–04:00, 10:00–11:00 or 14:00–15:00 America/New_York and mark a plausible liquidity objective.", "Observe directional displacement and a qualifying FVG. Record whether its retracement occurs inside the selected window.", "Mark the swing whose breach would defeat the entry premise.", "Use a preselected liquidity objective beyond the entry.", "Skip an unconfirmed direction, a filled objective or a window without a qualifying return.", "Cancel an unfilled practice entry at the window close."],
    ["A 10:18 displacement toward a prior high leaves a bullish FVG; price retests it at 10:24.", "The retracement appears at 11:04 in the exercise using the 10:00 window.", "The hour closes without an eligible imbalance."],
    [["tRq1hyGGtl4","Watch the original Silver Bullet lesson"]]);

  add("P03", "Judas Swing", "Session reversal", "Original forex lesson · futures adaptation", "Track an early session excursion beyond a range and the evidence for delivery in the opposite direction.", "Original forex context; NQ/ES adaptation", "15-minute range and 1–5-minute confirmation", "C04 C08 C26 C27 C30",
    ["Mark the earlier range, the chosen session and its opening reference.", "Wait for the early excursion, a return inside the range and a confirmed displacement away.", "Record the excursion extreme as the invalidation point.", "Use the opposite range boundary or the next labeled liquidity level.", "Skip if the range was selected after seeing the outcome.", "Expire at a renewed move beyond the excursion extreme or session end."],
    ["An early run above the premarked range reverses, breaks a swing low and retraces.", "Price extends above the range and holds there.", "The session remains entirely inside its earlier range."],
    [["xJMbva8SjzE","Watch ICT explain the Judas Swing"]]);

  add("P04", "Turtle Soup-style failed breakout", "Reversal setup", "Lab adaptation of ICT chart examples", "Test a failed breakout with an explicit close-back-inside rule.", "NQ examples; ES practice", "5-minute reference and 1-minute confirmation", "C03 C04 C06 C31",
    ["Choose the prior extreme and define the reclaim before viewing the next bar.", "Observe a run beyond that level followed by a completed close back inside. Log an entry on the next eligible retest.", "Invalidate beyond the failed breakout extreme.", "Select an inside-range swing or the opposite boundary.", "Skip sustained acceptance beyond the extreme.", "Cancel the retest if price invalidates or the selected session ends."],
    ["Price breaches yesterday's low, closes back above it and retests from above.", "A wick approaches the prior low without trading through it.", "Price reclaims but leaves without a retest."],
    [["PFUe6OKmKuk","Study the NQ Turtle Soup short"],["r3E1WQcx2-c","Compare the NQ premarket example"]]);

  add("P05", "Optimal Trade Entry", "Entry technique", "Original ICT lesson", "Frame a retracement in the context of a previously selected impulse and directional objective.", "Original forex material; NQ/ES practice", "15-minute swing and 1–5-minute trigger", "C11 C12 C13 C15",
    ["Select a completed impulse leg with a clear origin, terminus and objective.", "Measure the leg and wait for the 62–79 percent retracement area. Require a completed lower-timeframe shift toward the objective in this exercise.", "Invalidate if the impulse origin is breached.", "Use the prior impulse extreme as the first reference objective.", "Skip if the anchors change after the return or bias is undefined.", "Expire after invalidation, objective touch or the session close."],
    ["A bullish impulse retraces around 70 percent, holds its origin and produces the required shift.", "The retracement breaches the bullish impulse origin.", "Price expands directly without reaching the retracement area."],
    [["Cg0-CFJOJvg","Watch the original OTE primer"]]);

  add("P06", "Unicorn", "Entry technique", "Creator explanation of ICT concepts", "Find the price intersection between a qualifying breaker and a fair value gap.", "NQ or ES", "5-minute structure and 1-minute entry", "C16 C21 C22",
    ["Independently mark the breaker and the three-candle FVG.", "Record their common price interval and wait for a first return with a close away in the planned direction.", "Invalidate if price closes through the far boundary chosen before the return.", "Select the next opposing liquidity level.", "Skip if the two zones share no eligible price area.", "Expire at invalidation or when the objective trades first."],
    ["A bearish breaker overlaps a bearish FVG and price retests their shared interval.", "A valid breaker is separated from the FVG by several ticks.", "Both zones qualify but the retest occurs after the objective is reached."],
    [["rXMVPUZPw4A","Watch the Unicorn model lesson"],["75S4vwD4P1U","Review the breaker prerequisite"]]);

  add("P07", "Inversion FVG entry", "Entry technique", "Creator interpretation", "Study a failed FVG that price subsequently tests from the opposite side.", "NQ or ES", "15-minute context and 1–5-minute execution", "C16 C17 C45",
    ["Identify the original FVG and its boundaries before the breach.", "Wait for a close beyond the far boundary and a retest from the opposite side with rejection.", "Record invalidation across the retest swing.", "Select the next liquidity pool in the new direction.", "Skip a wick-only breach or a retest from the original side.", "Expire if price reclaims the zone, hits the objective or ends the session."],
    ["Price closes through a bullish FVG, returns from below and rejects it.", "A wick enters the original FVG and the candle closes back above it.", "The gap inverts, then price reaches the sell-side objective immediately."],
    [["FKTBkTzsmUA","Watch the inversion FVG lesson"],["UIGZtoGGPH4","See Dhesi's applied chart walkthrough"]]);

  add("P08", "Market Maker Buy Model", "Broader model", "Original ICT lesson", "Map first-side delivery toward sell-side liquidity, then assess the bullish reversal and subsequent delivery.", "NQ or ES", "Hourly context and 5-minute execution", "C46 C47 C48 C49 C50",
    ["Mark original consolidation, sell-side objective and a prospective bullish reversal area.", "Following the sell-side run, require a bullish shift. Choose a specific retracement trigger before entry.", "Invalidate at a breach of the selected reversal low.", "Trace liquidity objectives back toward the original consolidation.", "Skip if first-side delivery or reversal evidence is missing.", "Expire at invalidation or completion of the mapped model."],
    ["A sell-side run into a higher-timeframe area gives way to bullish displacement and a qualifying retracement.", "A bounce inside the original range is labeled a completed buy model.", "A reversal develops but the selected entry technique never triggers."],
    [["iKsIbUblSWM","Watch ICT's Market Maker Models"],["ShlccbF9jUA","Study the buy and sell model phases"]]);

  add("P09", "Market Maker Sell Model", "Broader model", "Original ICT lesson", "Map first-side delivery toward buy-side liquidity and the transition into bearish delivery.", "NQ or ES", "Hourly context and 5-minute execution", "C46 C47 C48 C49 C50",
    ["Identify consolidation, a buy-side objective and potential bearish reversal area.", "After a buy-side run, require bearish displacement through a confirmed swing. Select an eligible retracement.", "Invalidate at a breach of the selected reversal high.", "Trace sell-side objectives toward the original consolidation.", "Skip if price continues delivering higher without a bearish shift.", "Expire at invalidation or completion of the mapped model."],
    ["Price takes buy-side liquidity, shifts down and retests a bearish imbalance.", "A short is tagged solely because price reached an old high.", "Bearish delivery begins without the chosen retracement entry."],
    [["iKsIbUblSWM","Watch ICT's Market Maker Models"],["Ibw4saRtYMk","Compare the advanced MMXM lesson"]]);

  add("P10", "One Shot One Kill", "Charter Price Action Model 9", "Original ICT lesson", "Study a planned weekly trade idea, then compare the original model with ICT's separate setup review.", "Original model and review; NQ/ES adaptation", "Weekly context, daily refinement and intraday execution", "C05 C32 C36 C37 C44",
    ["Before the week, map the likely objective, directional premise and an area of interest.", "For this exercise, wait for price to reach the planned area and confirm displacement on the execution timeframe before a retracement.", "Record the swing and price that invalidate the weekly thesis.", "Use the weekly objective selected during preparation.", "Skip when the higher-timeframe thesis is unclear or the planned objective already traded.", "Expire the practice plan at thesis failure or the end of its specified week."],
    ["A prewritten bullish weekly thesis reaches its discount area, then gives the planned intraday trigger.", "The supposed weekly objective is added after the trade closes.", "The weekly target trades before price reaches the planned entry area."],
    [["twIPoG2TZ1o","Watch ICT Charter Model 9"],["zq4hz_XiTRE","Study the One Shot One Kill review"]]);

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function link(label, href) {
    const node = element("a", label);
    node.href = href;
    return node;
  }

  function renderPlaybooks(root, id, query = "") {
    root.replaceChildren();
    const item = playbooks.find(entry => entry.id === id);
    if (!item) {
      const search = String(query || "").trim().toLowerCase();
      const matches = playbooks.filter(entry => [entry.id, entry.title, entry.category, entry.summary, ...entry.concepts].join(" ").toLowerCase().includes(search));
      root.append(element("h2", "Playbooks"), element("p", matches.length + " playbooks"));
      const cards = element("div", "", "grid lab-grid");
      for (const entry of matches) {
        const card = element("article", "", "card lab-card");
        const title = element("h3");
        title.append(link(entry.title, "?view=playbooks&id=" + entry.id));
        card.append(title, element("p", entry.category), element("p", entry.summary));
        cards.append(card);
      }
      root.append(cards);
      return;
    }
    root.append(link("All playbooks", "?view=playbooks"), element("h2", item.title), element("p", item.summary), element("p", item.category + " · " + item.attribution));
    const facts = element("dl");
    for (const [label, value] of [["Market",item.market],["Lab timeframes",item.timeframe]]) {
      facts.append(element("dt",label),element("dd",value));
    }
    root.append(facts,element("h3","Practice rules"),element("p","The following operational rules and timeframes specify the educational lab exercise. The linked lessons document the underlying model."));
    const rules = element("dl");
    ["Prerequisites","Entry trigger","Invalidation","Target","Skip conditions","Expiration"].forEach((label,i) => rules.append(element("dt",label),element("dd",item.rules[i])));
    root.append(rules,element("h3","Worked scenarios"),element("p","Illustrative educational scenarios for the selected market."));
    const examples = element("dl");
    ["Valid","Invalid","No trade"].forEach((label,i) => examples.append(element("dt",label),element("dd",item.examples[i])));
    root.append(examples,element("h3","Watch the lessons"));
    const resources = element("ol");
    for (const [videoId, purpose] of item.tutorials) {
      const row = element("li");
      row.append(link(purpose, "https://www.youtube.com/watch?v=" + videoId));
      resources.append(row);
    }
    root.append(resources,element("h3","Related concepts"));
    const related = element("ul");
    for (const concept of item.concepts) {
      const row = element("li");
      row.append(link("Study " + concept, "?view=learn&id=" + concept));
      related.append(row);
    }
    root.append(related);
  }
  window.ictPlaybooks = playbooks;
  window.renderPlaybooks = renderPlaybooks;
})();
