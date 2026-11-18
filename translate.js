/* translate.js — 翻译页
 *
 * 约束（红线）：
 *   1. 端点只有 Index-Translate 免费公共网关，硬编码，不提供绕过开关；
 *   2. 不在本地生成译文——失败就报错，不给「猜一个」的退路；
 *   3. 法语分词用规则（词典最长匹配 + 词形），不靠模型。
 */
(function () {
  "use strict";

  var ZF = window.ZF || [];
  var HV = window.HV || {};

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function t(k, v) { return window.I18N ? window.I18N.t(k, v) : k; }

  // ---------- 设定 ----------
  var CFG_KEY = "hanfr.ai.cfg";
  var DEF = {
    base: "https://index-translate.bilibili.com/v1",
    model: "Index-Translate-35B-A3B",
    key: "EMPTY"
  };

  function loadCfg() {
    var c = {};
    try { c = JSON.parse(localStorage.getItem(CFG_KEY) || "{}") || {}; } catch (e) { c = {}; }
    var base = c.base || DEF.base;
    // 端点硬约束：非白名单一律回落到默认
    if (String(base).indexOf("index-translate.bilibili.com") < 0) base = DEF.base;
    return { base: base, model: c.model || DEF.model, key: c.key || DEF.key };
  }
  function saveCfg(c) {
    try { localStorage.setItem(CFG_KEY, JSON.stringify(c)); } catch (e) {}
  }

  var st = { view: "dict", dir: "zh2fr", script: "hans", busy: false, out: "", lang: "" };
  try {
    var d = localStorage.getItem("hanfr.ai.dir");
    var sc = localStorage.getItem("hanfr.ai.script");
    if (d === "zh2fr" || d === "fr2zh") st.dir = d;
    if (sc === "hans" || sc === "hant") st.script = sc;
  } catch (e) {}

  function saveOpts() {
    try {
      localStorage.setItem("hanfr.ai.dir", st.dir);
      localStorage.setItem("hanfr.ai.script", st.script);
    } catch (e) {}
  }

  // ---------- 分词 ----------
  // 中文：后向最大匹配（词表即词库）
  var CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/;

  function segZh(text) {
    var out = [], i = 0, n = text.length;
    while (i < n) {
      var ch = text.charAt(i);
      if (!CJK.test(ch)) {
        var j = i;
        while (j < n && !CJK.test(text.charAt(j))) j++;
        out.push({ t: text.slice(i, j), w: false });
        i = j;
        continue;
      }
      var hit = "", len = 1;
      var maxL = Math.min(7, n - i);
      for (var L = maxL; L >= 2; L--) {
        var cand = text.substr(i, L);
        if (HV.bySimp && (HV.bySimp.has(cand) || (HV.byTrad && HV.byTrad.has(cand)))) {
          hit = cand; len = L; break;
        }
      }
      if (!hit) { hit = ch; len = 1; }
      out.push({ t: hit, w: true });
      i += len;
    }
    return out;
  }

  // 法语：词典最长匹配（1-4 词），保标点
  function segFr(text) {
    var re = /[\p{L}\p{N}]+/gu, toks = [], last = 0, m;
    while ((m = re.exec(text))) {
      toks.push({ gap: text.slice(last, m.index), word: m[0] });
      last = m.index + m[0].length;
    }
    var tail = text.slice(last);
    var n = toks.length;
    if (!n) return [{ lead: "", t: text, w: false }];

    // 建立局部词表：词典里出现过的 1-4 词组合
    var lex = frLexicon();

    var best = new Array(n + 1);
    best[n] = { score: 0, len: 0 };
    for (var i = n - 1; i >= 0; i--) {
      var cand = { score: -1 + best[i + 1].score, len: 1 };
      var maxL = Math.min(4, n - i);
      for (var L = 2; L <= maxL; L++) {
        var key = toks[i].word.toLowerCase();
        for (var x = 1; x < L; x++) key += " " + toks[i + x].word.toLowerCase();
        if (lex.has(key)) {
          var s = L * 3 + best[i + L].score;
          if (s > cand.score) cand = { score: s, len: L };
        }
      }
      best[i] = cand;
    }

    var out = [], k = 0;
    while (k < n) {
      var L2 = best[k].len;
      var surface = toks[k].word, lookup = toks[k].word;
      for (var y = 1; y < L2; y++) {
        surface += toks[k + y].gap + toks[k + y].word;
        lookup += " " + toks[k + y].word;
      }
      out.push({ lead: toks[k].gap, t: surface, lookup: lookup, w: true });
      k += L2;
    }
    if (tail) out.push({ lead: "", t: tail, w: false });
    return out;
  }

  var _frLex = null;
  function frLexicon() {
    if (_frLex) return _frLex;
    _frLex = new Set();
    var byFr = HV.byFr;
    if (byFr) {
      byFr.forEach(function (_arr, k) { _frLex.add(k); });
    }
    return _frLex;
  }

  HV.segZh = segZh;
  HV.segFr = segFr;

  function renderTokens(text, lang) {
    var toks = lang === "fr" ? segFr(text) : segZh(text);
    var html = [];
    for (var i = 0; i < toks.length; i++) {
      var tk = toks[i];
      var lead = tk.lead ? esc(tk.lead) : "";
      if (tk.w) {
        var attr = lang === "fr"
          ? 'data-t="' + esc(tk.lookup || tk.t) + '"'
          : 'data-zh="' + esc(tk.t) + '"';
        html.push(lead + '<span class="tok ' + (lang === "fr" ? "frt" : "zt") + '" ' +
          attr + ">" + esc(tk.t) + "</span>");
      } else {
        html.push(lead + esc(tk.t));
      }
    }
    return html.join("");
  }

  // ---------- 提示词 ----------
  function promptFor(text) {
    if (st.dir === "zh2fr") {
      return "请将以下中文文本翻译为法语，输出地道自然的现代法语表达，直接输出翻译结果，不要进行任何解释。\n\n" + text;
    }
    var tgt = st.script === "hant"
      ? "繁體中文（必须全部使用繁體字，不要出现简体字）"
      : "简体中文（全部使用简体字）";
    return "请将以下法语文本翻译为" + tgt + "，直接输出翻译结果，不要进行任何解释。\n\n" + text;
  }

  // ---------- API ----------
  function callApi(text) {
    var cfg = loadCfg();
    var url = cfg.base.replace(/\/+$/, "") + "/chat/completions";
    var ctrl = new AbortController();
    var to = setTimeout(function () { ctrl.abort(); }, 120000);

    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + (cfg.key || "EMPTY")
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: "user", content: promptFor(text) }],
        temperature: 0.1,
        max_tokens: 2048,
        stream: false
      }),
      signal: ctrl.signal
    }).then(function (res) {
      clearTimeout(to);
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error("HTTP " + res.status + " — " + String(t).slice(0, 160));
        });
      }
      return res.json();
    }).then(function (j) {
      var c = j && j.choices && j.choices[0];
      var s = c && (c.message ? c.message.content : c.text);
      if (!s || !String(s).trim()) throw new Error("服务回应为空");
      return String(s).trim();
    });
  }

  // ---------- 离线逐词对照 ----------
  function glossOf(i) {
    var s = (HV.senses ? HV.senses(ZF[i])[0] : "") || "";
    return s.split(/[，,；;：:]/)[0].trim();
  }

  function offlineTranslate(text) {
    var out = [];
    if (st.dir === "zh2fr") {
      segZh(text).forEach(function (tk) {
        if (!tk.w) { out.push(tk.t); return; }
        var i = HV.bySimp && HV.bySimp.has(tk.t) ? HV.bySimp.get(tk.t)
              : (HV.byTrad && HV.byTrad.has(tk.t) ? HV.byTrad.get(tk.t) : -1);
        out.push(i > -1 ? (glossOf(i) || tk.t) : tk.t);
      });
      return out.join(" ").replace(/\s+/g, " ").trim();
    }
    segFr(text).forEach(function (tk) {
      if (!tk.w) { out.push(tk.t); return; }
      var arr = HV.byFr && HV.byFr.get(String(tk.lookup || tk.t).toLowerCase());
      out.push(arr && arr.length ? ZF[arr[0]][1] : tk.t);
    });
    return out.join("").replace(/\s+/g, " ").trim();
  }

  // ---------- 视图 ----------
  var tabs = $("tabs"), dictView = $("dictView"), aiView = $("aiView");
  var dictBar = $("dictBar"), aiBar = $("aiBar"), countEl = $("count");
  var VIEW_KEY = "hanfr.ui.view";

  function footer() {
    countEl.textContent = st.view === "ai"
      ? t("foot_ai", { n: ZF.length.toLocaleString() })
      : t("foot_count", { n: ZF.length.toLocaleString() });
  }

  function setView(v) {
    st.view = v;
    try { localStorage.setItem(VIEW_KEY, v); } catch (e) {}
    dictView.hidden = v !== "dict";
    aiView.hidden = v !== "ai";
    dictBar.hidden = v !== "dict";
    aiBar.hidden = v !== "ai";
    Array.prototype.forEach.call(tabs.querySelectorAll(".tab"), function (b) {
      b.classList.toggle("on", b.getAttribute("data-view") === v);
    });
    if (v === "ai") { aiHistSync(); }
    footer();
  }

  Array.prototype.forEach.call(tabs.querySelectorAll(".tab"), function (b) {
    b.addEventListener("click", function () { setView(b.getAttribute("data-view")); });
  });

  // ---------- 方向 ----------
  var dirSeg = $("dirSeg"), scriptSeg = $("scriptSeg"), src = $("src");

  function refreshDir() {
    src.placeholder = t(st.dir === "zh2fr" ? "ai_src_ph_zh2fr" : "ai_src_ph_fr2zh");
    src.classList.toggle("fr", st.dir === "fr2zh");
    scriptSeg.hidden = st.dir !== "fr2zh";
  }

  Array.prototype.forEach.call(dirSeg.querySelectorAll("button"), function (b) {
    b.addEventListener("click", function () {
      st.dir = b.getAttribute("data-dir");
      Array.prototype.forEach.call(dirSeg.querySelectorAll("button"), function (x) {
        x.classList.toggle("on", x === b);
      });
      saveOpts(); clearOut(); refreshDir();
    });
  });
  Array.prototype.forEach.call(scriptSeg.querySelectorAll("button"), function (b) {
    b.addEventListener("click", function () {
      st.script = b.getAttribute("data-script");
      Array.prototype.forEach.call(scriptSeg.querySelectorAll("button"), function (x) {
        x.classList.toggle("on", x === b);
      });
      saveOpts(); clearOut(); refreshDir();
    });
  });
  Array.prototype.forEach.call(dirSeg.querySelectorAll("button"), function (x) {
    x.classList.toggle("on", x.getAttribute("data-dir") === st.dir);
  });
  Array.prototype.forEach.call(scriptSeg.querySelectorAll("button"), function (x) {
    x.classList.toggle("on", x.getAttribute("data-script") === st.script);
  });
  refreshDir();

  // ---------- 翻译流程 ----------
  var goBtn = $("go"), errBox = $("err"), errMsg = $("errMsg"), outEl = $("out");
  var tokensEl = $("tokens"), outLabel = $("outLabel"), outMeta = $("outMeta");

  function clearOut() {
    outEl.hidden = true;
    errBox.hidden = true;
    st.out = "";
  }
  function showErr(msg, raw) {
    errMsg.innerHTML = esc(msg) +
      (raw ? '<div style="opacity:.6;font-size:10.5px;margin-top:6px">' + esc(raw) + "</div>" : "");
    errBox.hidden = false;
  }

  function renderOut(text, lang, meta) {
    st.out = text;
    st.lang = lang;
    outLabel.textContent = lang === "fr"
      ? t("ai_out_fr")
      : (st.script === "hant" ? t("ai_out_zh_hant") : t("ai_out_zh"));
    outMeta.textContent = meta || "";
    tokensEl.className = "tokline " + (lang === "fr" ? "fr" : "zh");
    tokensEl.innerHTML = renderTokens(text, lang);
    outEl.hidden = false;
  }

  function run() {
    var text = src.value.trim();
    if (!text || st.busy) return;
    st.busy = true;
    goBtn.disabled = true;
    goBtn.textContent = t("ai_busy");
    errBox.hidden = true;

    var t0 = Date.now();
    callApi(text).then(function (out) {
      var ms = Date.now() - t0;
      var lang = st.dir === "zh2fr" ? "fr" : "zh";
      var meta = "Index-Translate · " + (ms / 1000).toFixed(1) + "s";
      renderOut(out, lang, meta);
      aiHistPush({ src: text, dir: st.dir, script: st.script, out: out, lang: lang, meta: meta, ts: Date.now() });
    }).catch(function (e) {
      var m = String(e && e.message || e);
      if (e && e.name === "AbortError") m = t("ai_err_timeout");
      showErr(t("ai_err_title", { msg: m }), t("ai_err_hint"));
      outEl.hidden = true;
    }).then(function () {
      st.busy = false;
      goBtn.disabled = false;
      goBtn.textContent = t("ai_go");
    });
  }

  goBtn.addEventListener("click", run);
  src.addEventListener("input", function () {
    var n = src.value.length;
    $("srcCount").textContent = n ? n : "0";
    $("clearSrc").hidden = !n;
    if (n > 3000) $("srcCount").textContent = t("ai_len_warn", { n: n });
    aiHistSync();
  });
  src.addEventListener("keydown", function (ev) {
    if ((ev.metaKey || ev.ctrlKey) && ev.key === "Enter") { ev.preventDefault(); run(); }
  });
  $("clearSrc").addEventListener("click", function () {
    src.value = "";
    $("srcCount").textContent = "0";
    $("clearSrc").hidden = true;
    clearOut(); src.focus(); aiHistSync();
  });
  $("sample").addEventListener("click", function () {
    src.value = st.dir === "fr2zh"
      ? "Nous sommes allés au parc hier après-midi."
      : (st.script === "hant" ? "他昨天沒來上班，因為發燒了。" : "他昨天没来上班，因为发烧了。");
    $("srcCount").textContent = src.value.length;
    $("clearSrc").hidden = false;
    src.focus();
  });
  $("again").addEventListener("click", run);

  $("copy").addEventListener("click", function () {
    var out = st.out;
    var done = function () {
      var b = $("copy");
      b.textContent = t("ai_copied");
      setTimeout(function () { b.textContent = t("ai_copy"); }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(out).then(done, fallback);
    } else { fallback(); }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = out;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  });

  $("offline").addEventListener("click", function () {
    var text = src.value.trim();
    if (!text) return;
    var lang = st.dir === "zh2fr" ? "fr" : "zh";
    var outText = offlineTranslate(text);
    renderOut(outText, lang, t("ai_out_offline"));
    aiHistPush({ src: text, dir: st.dir, script: st.script, out: outText, lang: lang, meta: t("ai_out_offline"), ts: Date.now() });
    var tip = document.querySelector("#out .tip");
    if (tip) tip.textContent = t("ai_out_offline");
    errBox.hidden = true;
  });

  $("toCfg").addEventListener("click", function () {
    $("cfg").open = true;
    $("cfg").scrollIntoView({ behavior: "smooth", block: "center" });
  });

  // ---------- 设置面板 ----------
  function fillCfg() {
    var c = loadCfg();
    $("cfgBase").value = c.base;
    $("cfgModel").value = c.model;
    $("cfgKey").value = c.key;
  }
  fillCfg();
  $("cfgSave").addEventListener("click", function () {
    saveCfg({
      base: $("cfgBase").value.trim() || DEF.base,
      model: $("cfgModel").value.trim() || DEF.model,
      key: $("cfgKey").value.trim() || DEF.key
    });
    $("cfgSave").textContent = t("ai_cfg_saved");
    setTimeout(function () { $("cfgSave").textContent = t("ai_cfg_save"); }, 1200);
  });
  $("cfgReset").addEventListener("click", function () {
    saveCfg(DEF);
    fillCfg();
  });

  // ---------- 弹窗 ----------
  var pop = $("pop");

  function popFr(w) {
    var key = String(w || "").toLowerCase().trim();
    var arr = (HV.byFr && HV.byFr.get(key)) || null;
    var h = '<div class="pop-head"><span class="pop-badge">français</span>' +
      '<button type="button" class="pop-x">&times;</button></div>' +
      '<div class="pop-fr">' + esc(w) + "</div>";

    if (arr && arr.length) {
      var e = ZF[arr[0]];
      var ss = HV.senses(e), ips = HV.ipas(e);
      var ip = "";
      for (var k = 0; k < ss.length; k++) {
        if ((HV.frKey(ss[k]) || "") === key && ips[k]) { ip = ips[k]; break; }
      }
      h += '<div class="pop-ipa">' + (ip ? "/" + esc(ip) + "/" : '<span class="ipa pending">' + esc(t("ipa_pending")) + "</span>") + "</div>";
      h += '<div class="pop-gloss"><span class="zh">' + esc(e[1]) + "</span>" +
        (e[2] ? '<span class="py">' + esc(e[2]) + "</span>" : "") + "</div>";
      h += '<div class="pop-actions"><button type="button" data-open="' + arr[0] + '">' +
        esc(t("detail_more")) + "</button></div>";
    } else {
      h += '<div class="pop-none">' + esc(t("pop_miss", { w: w })) + "</div>";
    }
    return h;
  }

  function popZh(w) {
    var i = HV.bySimp && HV.bySimp.has(w) ? HV.bySimp.get(w)
          : (HV.byTrad && HV.byTrad.has(w) ? HV.byTrad.get(w) : -1);
    var h = '<div class="pop-head"><span class="pop-badge">中文</span>' +
      '<button type="button" class="pop-x">&times;</button></div>' +
      '<div class="pop-fr">' + esc(w) + "</div>";
    if (i < 0) {
      return h + '<div class="pop-none">' + esc(t("pop_miss", { w: w })) + "</div>";
    }
    var e = ZF[i], ss = HV.senses(e), ips = HV.ipas(e);
    h += '<div class="pop-gloss">';
    ss.slice(0, 2).forEach(function (s, k) {
      h += '<div><span class="zh">' + esc(s) + "</span>" +
        (ips[k] ? '<span class="py">/' + esc(ips[k]) + "/</span>" : "") + "</div>";
    });
    h += "</div>";
    h += '<div class="pop-actions"><button type="button" data-open="' + i + '">' +
      esc(t("detail_more")) + "</button></div>";
    return h;
  }

  function placePop(el) {
    if (window.matchMedia("(max-width:520px) and (hover:none)").matches) return;
    var r = el.getBoundingClientRect();
    pop.style.visibility = "hidden";
    pop.hidden = false;
    var pw = pop.offsetWidth, ph = pop.offsetHeight;
    var left = Math.max(8, Math.min(r.left + r.width / 2 - pw / 2, window.innerWidth - pw - 8));
    var top = r.bottom + 9;
    if (top + ph > window.innerHeight - 10) top = Math.max(56, r.top - ph - 9);
    pop.style.left = Math.round(left) + "px";
    pop.style.top = Math.round(top) + "px";
    pop.style.visibility = "";
  }

  var curTok = null, hoverTimer = null, hideTimer = null;

  function showPop(el) {
    var isFr = el.classList.contains("frt");
    var word = isFr ? el.getAttribute("data-t") : el.getAttribute("data-zh");
    if (!word) return;
    pop.innerHTML = isFr ? popFr(word) : popZh(word);
    if (curTok && curTok !== el) curTok.classList.remove("on");
    curTok = el;
    el.classList.add("on");
    pop.hidden = false;
    placePop(el);
  }

  function hidePop() {
    if (curTok) curTok.classList.remove("on");
    curTok = null;
    pop.hidden = true;
  }

  document.addEventListener("pointerover", function (ev) {
    if (ev.pointerType && ev.pointerType !== "mouse") return;
    var el = ev.target.closest(".tok");
    if (!el) return;
    clearTimeout(hideTimer);
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(function () { showPop(el); }, 110);
  });
  document.addEventListener("pointerout", function (ev) {
    if (ev.pointerType && ev.pointerType !== "mouse") return;
    if (!ev.target.closest(".tok")) return;
    clearTimeout(hoverTimer);
    hideTimer = setTimeout(hidePop, 150);
  });
  document.addEventListener("click", function (ev) {
    var el = ev.target.closest(".tok");
    if (!el) return;
    if (curTok === el && !pop.hidden) { hidePop(); return; }
    showPop(el);
  });
  pop.addEventListener("click", function (ev) {
    if (ev.target.closest(".pop-x")) { hidePop(); return; }
    var f = ev.target.closest("[data-open]");
    if (!f) return;
    var i = +f.getAttribute("data-open");
    hidePop();
    if (HV.detail) HV.detail(i);
  });
  document.addEventListener("click", function (ev) {
    if (pop.hidden) return;
    if (ev.target.closest("#pop") || ev.target.closest(".tok") || ev.target === src) return;
    hidePop();
  });
  window.addEventListener("scroll", hidePop, { passive: true });
  window.addEventListener("resize", hidePop);
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") hidePop(); });

  // ---------- 翻译记录 ----------
  var AIH_KEY = "hanfr.hist.ai";
  var histAiBox = $("histAi");

  function aiHistLoad() {
    try { return JSON.parse(localStorage.getItem(AIH_KEY) || "[]") || []; } catch (e) { return []; }
  }
  function aiHistSave(list) {
    try { localStorage.setItem(AIH_KEY, JSON.stringify(list.slice(0, 30))); } catch (e) {}
  }
  function aiHistPush(entry) {
    var list = aiHistLoad().filter(function (x) { return !(x.src === entry.src && x.dir === entry.dir); });
    list.unshift(entry);
    aiHistSave(list);
    aiHistSync();
  }
  function aiHistSync() {
    if (!histAiBox) return;
    var empty = !src.value.trim();
    histAiBox.hidden = !empty || !aiHistLoad().length;
    if (!histAiBox.hidden) aiHistRender();
  }
  function aiHistRender() {
    var list = aiHistLoad();
    var h = '<div class="hist-head"><span>' + esc(t("hist_ai")) + "</span>" +
      '<button type="button" class="linky" data-hclear>' + esc(t("hist_clear")) + "</button></div>";
    list.slice(0, 20).forEach(function (x, idx) {
      var time = "";
      try {
        var d2 = new Date(x.ts || 0);
        time = ("0" + d2.getHours()).slice(-2) + ":" + ("0" + d2.getMinutes()).slice(-2);
      } catch (e) {}
      h += '<button type="button" class="hist-item chip" data-hi="' + idx + '">' +
        esc(x.src.length > 60 ? x.src.slice(0, 60) + "…" : x.src) +
        (time ? " · " + time : "") + "</button>";
    });
    histAiBox.innerHTML = h;
  }
  function aiHistRestore(idx) {
    var x = aiHistLoad()[idx];
    if (!x) return;
    st.dir = x.dir === "fr2zh" ? "fr2zh" : "zh2fr";
    st.script = x.script === "hant" ? "hant" : "hans";
    Array.prototype.forEach.call(dirSeg.querySelectorAll("button"), function (b) {
      b.classList.toggle("on", b.getAttribute("data-dir") === st.dir);
    });
    Array.prototype.forEach.call(scriptSeg.querySelectorAll("button"), function (b) {
      b.classList.toggle("on", b.getAttribute("data-script") === st.script);
    });
    saveOpts(); refreshDir();
    src.value = x.src;
    $("srcCount").textContent = x.src.length;
    $("clearSrc").hidden = false;
    errBox.hidden = true;
    renderOut(x.out, x.lang || (x.dir === "zh2fr" ? "fr" : "zh"), x.meta || "");
    src.focus();
    aiHistSync();
  }
  if (histAiBox) {
    histAiBox.addEventListener("click", function (ev) {
      var c = ev.target.closest("[data-hclear]");
      if (c) { aiHistSave([]); aiHistSync(); return; }
      var item = ev.target.closest("[data-hi]");
      if (!item) return;
      aiHistRestore(+item.getAttribute("data-hi"));
    });
  }

  // ---------- 初始化 ----------
  document.addEventListener("langchange", function () {
    refreshDir();
    footer();
    aiHistSync();
    goBtn.textContent = st.busy ? t("ai_busy") : t("ai_go");
  });

  var qs = new URLSearchParams(location.search);
  var wantView = qs.get("view");
  if (wantView !== "ai" && wantView !== "dict") {
    try { wantView = localStorage.getItem(VIEW_KEY) || ""; } catch (e) { wantView = ""; }
  }
  if (wantView === "ai") {
    setView("ai");
    if (qs.get("q")) {
      src.value = qs.get("q");
      $("srcCount").textContent = src.value.length;
      $("clearSrc").hidden = false;
    }
    if (qs.get("go") === "1") setTimeout(run, 60);
  } else {
    setView("dict");
    footer();
  }
})();