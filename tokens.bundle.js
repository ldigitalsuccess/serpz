// src/market-data.mjs
var numberOrNull = (value) => typeof value === "number" && Number.isFinite(value) ? value : null;
async function loadMarket(mint, fetcher = fetch) {
  if (typeof mint !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) throw Error("Invalid token address.");
  const response = await fetcher(`https://api.dexscreener.com/tokens/v1/solana/${encodeURIComponent(mint)}`);
  if (!response.ok) throw Error("Market data unavailable.");
  const pairs = await response.json();
  if (!Array.isArray(pairs)) throw Error("Market data unavailable.");
  const eligible = pairs.filter((p) => p?.chainId === "solana" && p?.baseToken?.address === mint && typeof p.pairAddress === "string");
  eligible.sort((a, b) => (numberOrNull(b.liquidity?.usd) ?? -1) - (numberOrNull(a.liquidity?.usd) ?? -1));
  const pair = eligible[0];
  if (!pair) return null;
  return { pairAddress: pair.pairAddress, dexId: pair.dexId ?? null, quoteSymbol: pair.quoteToken?.symbol ?? null, marketCap: numberOrNull(pair.marketCap), liquidityUsd: numberOrNull(pair.liquidity?.usd), buys24h: numberOrNull(pair.txns?.h24?.buys), sells24h: numberOrNull(pair.txns?.h24?.sells), volume24h: numberOrNull(pair.volume?.h24), priceUsd: pair.priceUsd ?? null, pairCreatedAt: numberOrNull(pair.pairCreatedAt) };
}
async function loadPaidOrders(mint, fetcher = fetch) {
  if (typeof mint !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) throw Error("Invalid token address.");
  const response = await fetcher(`https://api.dexscreener.com/orders/v1/solana/${encodeURIComponent(mint)}`);
  if (!response.ok) throw Error("Paid orders unavailable.");
  const orders = await response.json();
  if (!Array.isArray(orders)) throw Error("Paid orders unavailable.");
  if (!orders.length) return "No orders reported";
  const names = { tokenProfile: "Token profile", communityTakeover: "Community takeover", tokenAd: "Token ad", trendingBarAd: "Trending bar ad" };
  const statuses = /* @__PURE__ */ new Set(["processing", "cancelled", "on-hold", "approved", "rejected"]);
  return orders.filter((o) => names[o?.type] && statuses.has(o.status)).map((o) => `${names[o.type]} ${o.status}`).join(", ") || "Details unavailable";
}

// src/config.mjs
var metadataService = "https://serpz-launchpad-metadata.ldigitalsuccess.workers.dev";

// src/tokens-ui.mjs
var $ = (id) => document.getElementById(id);
var address = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
var money = (value) => typeof value === "number" ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value < 1 ? 8 : 2 }).format(value) : "\u2014";
var num = (value) => typeof value === "number" ? new Intl.NumberFormat("en-US").format(value) : "\u2014";
var safeImage = (url) => {
  try {
    const u = new URL(url);
    return u.origin === metadataService && u.pathname.startsWith("/image/") ? u.href : "";
  } catch {
    return "";
  }
};
function metric(label, value) {
  const el = document.createElement("div"), small = document.createElement("small"), strong = document.createElement("strong");
  el.className = "metric";
  small.textContent = label;
  strong.textContent = value;
  el.append(small, strong);
  return el;
}
function card(item) {
  const a = document.createElement("a");
  a.className = "token-card";
  a.href = `token.html?mint=${encodeURIComponent(item.mint)}`;
  const image = document.createElement("img");
  image.loading = "lazy";
  image.alt = `${item.metadata.name} token artwork`;
  image.src = safeImage(item.metadata.image);
  const h = document.createElement("h3");
  h.textContent = item.metadata.name;
  const p = document.createElement("p");
  p.textContent = `$${item.metadata.symbol} \xB7 ${item.mint.slice(0, 6)}\u2026${item.mint.slice(-4)}`;
  a.append(image, h, p);
  return a;
}
async function getDirectory() {
  const r = await fetch(`${metadataService}/launches`, { headers: { accept: "application/json" } });
  if (!r.ok) throw Error("The launch directory is temporarily unavailable.");
  const data = await r.json();
  if (!Array.isArray(data.tokens)) throw Error("The launch directory is temporarily unavailable.");
  return data.tokens.filter((x) => x && address.test(x.mint) && typeof x.metadata?.name === "string" && typeof x.metadata?.symbol === "string");
}
async function directory() {
  let entries;
  try {
    entries = await getDirectory();
  } catch (e) {
    $("directory-status").textContent = "The launch directory is temporarily unavailable.";
    return;
  }
  entries.sort((a, b) => (b.blockTime || 0) - (a.blockTime || 0));
  const render = () => {
    const q = $("search").value.trim().toLowerCase(), matches = entries.filter((x) => [x.mint, x.metadata.name, x.metadata.symbol].some((s) => s.toLowerCase().includes(q)));
    $("token-list").replaceChildren(...matches.map(card));
    $("directory-status").textContent = matches.length ? `${matches.length} verified ${matches.length === 1 ? "token" : "tokens"}` : q ? "No tokens match your search." : "No verified launches yet.";
  };
  $("search").addEventListener("input", render);
  render();
}
async function detail() {
  const mint = new URLSearchParams(location.search).get("mint");
  if (!mint || !address.test(mint)) {
    $("detail-status").textContent = "Invalid token address.";
    return;
  }
  let item;
  try {
    item = (await getDirectory()).find((x) => x.mint === mint);
  } catch (e) {
    $("detail-status").textContent = "The launch directory is temporarily unavailable.";
    return;
  }
  if (!item) {
    $("detail-status").textContent = "This token is not in the verified launch directory.";
    return;
  }
  $("detail").hidden = false;
  $("detail-status").hidden = true;
  $("token-image").src = safeImage(item.metadata.image);
  $("token-name").textContent = item.metadata.name;
  $("token-symbol").textContent = `$${item.metadata.symbol}`;
  $("token-address").textContent = mint;
  $("token-creator").textContent = item.creator ? `Creator: ${item.creator}` : "Creator address unavailable";
  $("token-description").textContent = item.metadata.description || "";
  for (const [field, label] of [["website", "TOKEN WEBSITE \u2197"], ["social", "TOKEN SOCIAL \u2197"]]) {
    try {
      const u = new URL(item.metadata[field]);
      if (u.protocol !== "https:") continue;
      const a = document.createElement("a");
      a.href = u.href;
      a.textContent = label;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      $("token-links").append(a);
    } catch {
    }
  }
  $("pump-link").href = `https://pump.fun/coin/${encodeURIComponent(mint)}`;
  $("x-search").href = `https://x.com/search?q=${encodeURIComponent(`(${mint} OR $${item.metadata.symbol})`)}&src=typed_query&f=live`;
  $("share").addEventListener("click", () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out $${item.metadata.symbol} on SERPZ
${mint}`)}&url=${encodeURIComponent(location.href)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  });
  const intelligence = ["All-time high", "Holder count", "Holder percentage", "Insiders", "Phishing", "Bundlers", "Top 10 holders", "Total tax", "Total fees", "Snipers", "Developer holdings", "Developer migrations", "Bubble chart"];
  $("intelligence-grid").replaceChildren(...intelligence.map((s) => metric(s, "\u2014")));
  const paid = metric("DEX Screener orders", "\u2014");
  $("intelligence-grid").append(paid);
  const refresh = async () => {
    loadPaidOrders(mint).then((value) => {
      paid.querySelector("strong").textContent = value;
    }).catch(() => {
      paid.querySelector("strong").textContent = "\u2014";
    });
    try {
      const m = await loadMarket(mint);
      if (!m) {
        $("market-status").textContent = "No market pair has been indexed yet.";
        return;
      }
      const grid = $("market-grid");
      grid.replaceChildren(metric("Market cap", money(m.marketCap)), metric("Liquidity", money(m.liquidityUsd)), metric("Price (USD)", m.priceUsd ? `$${m.priceUsd}` : "\u2014"), metric("Buys \xB7 24h", num(m.buys24h)), metric("Sells \xB7 24h", num(m.sells24h)), metric("Volume \xB7 24h", money(m.volume24h)), metric("Pool", `${m.dexId || "\u2014"} / ${m.quoteSymbol || "\u2014"}`));
      $("market-status").textContent = `DEX Screener data \xB7 updated ${(/* @__PURE__ */ new Date()).toLocaleTimeString()} \xB7 most liquid indexed pool`;
      if (!$("chart-wrap").querySelector("iframe") && address.test(m.pairAddress)) {
        const frame = document.createElement("iframe");
        frame.title = "Live token price chart from DEX Screener";
        frame.src = `https://dexscreener.com/solana/${encodeURIComponent(m.pairAddress)}?embed=1&theme=dark&info=0`;
        frame.loading = "lazy";
        $("chart-wrap").replaceChildren(frame);
      }
    } catch {
      $("market-status").textContent = "Market data is temporarily unavailable.";
    }
  };
  await refresh();
  setInterval(refresh, 3e4);
}
if ($("token-list")) directory();
if ($("detail-status")) detail();
