/* app.js — 查词主逻辑
 *
 * 结构照汉南 app.js，法语侧的关键差异：
 *   1. 每条法语义项后面**必须**跟音标；缺失时显示「待核」角标，不省略；
 *   2. 例句给三行：中文 / 法语 / 法语音标，联诵单独标注；
 *   3. 法语侧支持免变音符号查询（eau / cafe -> café）。
 */
(function () {
  "use strict";

  var APP_VERSION = "1.0.1";

  var ZF = window.ZF || [];
  var FR2ZH = window.FR2ZH || {};
  var FRL = window.FRLiaison || null;

  var MAX_ROWS = 60;

  // ---------- 索引 ----------
  var bySimp = new Map(), byTrad = new Map();
  ZF.forEach(function (e, i) {
    if (!bySimp.has(e[1])) bySimp.set(e[1], i);
    if (!byTrad.has(e[0])) byTrad.set(e[0], i);
  });

  // 法语词 -> 词条索引（来自义项）
  var byFr = new Map();
  ZF.forEach(function (e, i) {
    (e[3] || "").split("；").forEach(function (s) {
      var k = frKey(s);
      if (!k) return;
      var arr = byFr.get(k);
      if (!arr) byFr.set(k, [i]);
      else if (arr[arr.length - 1] !== i && arr.length < 24) arr.push(i);
    });
  });

  function frKey(s) {
    return String(s || "").toLowerCase()
      .replace(/^(le |la |les |l'|un |une |des |du |d'|de )/, "")
      .replace(/[（(][^）)]*[）)]/g, " ")
      .replace(/[.,;:!?«»"'…\[\]]+$/, "")
      .replace(/\s+/g, " ").trim();
  }

  // 免变音符号索引
  var DEACC = {
    "à": "a", "â": "a", "ä": "a", "é": "e", "è": "e", "ê": "e", "ë": "e",
    "î": "i", "ï": "i", "ô": "o", "ö": "o", "ù": "u", "û": "u", "ü": "u",
    "ç": "c", "œ": "oe", "æ": "ae", "ÿ": "y", "ñ": "n"
  };
  function foldFr(s) {
    return String(s || "").toLowerCase().replace(/[àâäéèêëîïôöùûüçœæÿñ]/g, function (c) {
      return DEACC[c] || c;
    });
  }
  var byFold = new Map();
  byFr.forEach(function (arr, k) {
    var f = foldFr(k);
    if (!byFold.has(f)) byFold.set(f, arr);
  });

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function zhLen(s) {
    return String(s).length - (String(s).match(/[\uD800-\uDBFF]/g) || []).length;
  }
  function senses(e) {
    return (e[3] || "").split("；").filter(Boolean);
  }
  function ipas(e) {
    return (e[4] || "").split("；");
  }
  function poss(e) {
    return (e[5] || "").split("；");
  }

  // ---------- 音标渲染 ----------
  // 缺失音标不是「没有」，是「待核」——必须显式标出来，不能静默省略。
  //
  // 但在标「待核」之前，先试一次独立的音标词典（ipa.js，12.5 万词形）：
  // 词库条目的 IPA 来自 CFDICT 义项，很多词条义项里查不到；
  // 而音标词典覆盖整个 Lexique，能补上相当一部分。
  function ipaTag(ip, word) {
    if (!ip || !String(ip).trim()) {
      // 用词本身再查一次
      if (word && window.IPAQuery) {
        var fb = window.IPAQuery.wordIpa(word);
        if (fb) return '<span class="ipa">/' + esc(fb) + "/</span>";
      }
      return '<span class="ipa pending" title="' + esc(t("pop_ipa_missing")) + '">'
        + esc(t("ipa_pending")) + "</span>";
    }
    return '<span class="ipa">/' + esc(ip) + "/</span>";
  }

  // ---------- 中 → 法 ----------
  function searchZh(q) {
    var exact = [], rest = [];
    var i = bySimp.has(q) ? bySimp.get(q) : (byTrad.has(q) ? byTrad.get(q) : -1);
    if (i > -1) exact.push(i);
    for (var k = 0; k < ZF.length; k++) {
      if (k === i) continue;
      var s = ZF[k][1], tr = ZF[k][0];
      if (s.indexOf(q) === 0 || tr.indexOf(q) === 0) rest.push(k);
      else if (zhLen(s) <= 6 && (s.indexOf(q) > -1 || tr.indexOf(q) > -1)) rest.push(k);
      if (rest.length > 400) break;
    }
    rest.sort(function (a, b) { return zhLen(ZF[a][1]) - zhLen(ZF[b][1]); });
    return { exact: exact, rest: rest.slice(0, MAX_ROWS) };
  }

  // ---------- 法 → 中 ----------
  function searchFr(q) {
    var key = String(q || "").toLowerCase().trim().replace(/\s+/g, " ");
    if (!key) return { exact: [], starts: [], contains: [], gloss: null };
    var exact = [], starts = [], contains = [], seen = {};

    var order = FR2ZH[key] || [];
    var hit = byFr.get(key) || byFold.get(foldFr(key)) || [];
    hit.forEach(function (i) {
      if (seen[i]) return;
      seen[i] = 1;
      exact.push(i);
    });

    if (key.length >= 2) {
      byFr.forEach(function (arr, k) {
        if (k === key) return;
        if (k.indexOf(key) === 0) {
          arr.slice(0, 3).forEach(function (i) {
            if (!seen[i] && starts.length < 24) { seen[i] = 1; starts.push(i); }
          });
        } else if (k.indexOf(key) > -1) {
          arr.slice(0, 2).forEach(function (i) {
            if (!seen[i] && contains.length < 24) { seen[i] = 1; contains.push(i); }
          });
        }
      });
    }

    return { exact: exact, starts: starts, contains: contains, gloss: order };
  }

  // ---------- 渲染 ----------
  var resultsEl = document.getElementById("results");
  var emptyEl = document.getElementById("empty");
  var countEl = document.getElementById("count");
  var input = document.getElementById("q");
  var clearBtn = document.getElementById("clear");

  function heroCard(i) {
    var e = ZF[i];
    var ss = senses(e), ips = ipas(e), ps = poss(e);
    var tr = e[0] !== e[1] ? e[0] : "";

    var h = '<article class="hero" data-i="' + i + '">' +
      '<div class="hero-head">' +
        '<div class="hz">' + esc(e[1]) + "</div>" +
        '<div class="hz-side">' +
          '<div class="py">' + esc(e[2]) + "</div>" +
          (tr ? '<div class="trad">' + esc(tr) + "</div>" : "") +
        "</div>" +
      "</div>";

    h += '<div class="senses">';
    ss.forEach(function (s, k) {
      h += '<div class="sense">' +
        '<span class="num">' + (k + 1) + "</span>" +
        '<span class="body">' +
          '<span class="fr tok" data-t="' + esc(s) + '">' + esc(s) + "</span>" +
          ipaTag(ips[k] || "", s) +
          (ps[k] ? '<span class="pos">' + esc(ps[k]) + "</span>" : "") +
        "</span></div>";
    });
    h += "</div>";

    h += exampleBlock(e);
    h += familyBlock(e);
    return h + "</article>";
  }

  // 联诵符号渲染：underscore 太细，必须单独包一层加粗放大，否则看不见
  function renderIpaMarked(ipa) {
    if (!ipa) return "";
    var s = esc(ipa);
    // U+203F undertie -> 加粗红色小勾
    s = s.replace(/\u203F/g, '<span class="lia-mark">\u203F</span>');
    // 禁止联诵的竖线
    s = s.replace(/\s\|\s/g, ' <span class="lia-bar">|</span> ');
    return s;
  }

  // 例句：中文 / 法语 / 法语音标（联诵直接标在音标上）
  //
  // 单条例句存为 [zh, fr, ipa, liaisons, marked]；
  // 多条例句存为 [[...], [...]] —— 两种形态都要能渲染。
  function exampleBlock(e) {
    var ex = e[6];
    if (!ex || !ex.length) return "";
    var list = Array.isArray(ex[0]) ? ex : [ex];
    if (!list.length || !list[0][0]) return "";

    var h = '<div class="det-ex"><div class="det-ex-h">' + esc(t("detail_example")) +
      (list.length > 1 ? ' <span class="ex-n">' + list.length + "</span>" : "") + "</div>";

    list.forEach(function (one) {
      var zh = one[0];
      var fr = one[1] || "";
      var ipa = one[2] || "";
      var lia = one[3] || [];
      var marked = one[4] || null;
      var frShow = (marked && marked.fr) || fr;
      var ipaShow = (marked && marked.ipa) || "";

      h += '<div class="ex-item">';
      h += '<div class="ex-zh tokline zh">' + zhTokens(zh) + "</div>";
      h += '<div class="ex-fr tokline fr">' + frTokens(frShow) + "</div>";
      if (ipaShow || ipa) {
        h += '<div class="ex-ipa" lang="fr">/' + renderIpaMarked(ipaShow || ipa) + "/</div>";
      }
      h += liaisonLegend(lia);
      h += "</div>";
    });

    h += "</div>";
    return h;
  }

  // 联诵已标在音标上，这里只给一行紧凑图例说明哪几处、什么类型
  function liaisonLegend(lia) {
    if (!lia || !lia.length) return "";
    var ob = 0, fa = 0, inn = 0;
    lia.forEach(function (L) {
      if (L.type === "obligatoire") ob++;
      else if (L.type === "facultative") fa++;
      else if (L.type === "interdite") inn++;
    });
    var parts = [];
    if (ob) parts.push('<span class="lia-count ob">' + esc(t("lia_obligatoire")) + " " + ob + "</span>");
    if (fa) parts.push('<span class="lia-count fa">' + esc(t("lia_facultative")) + " " + fa + "</span>");
    if (inn) parts.push('<span class="lia-count in">' + esc(t("lia_interdite")) + " " + inn + "</span>");
    return '<div class="lia-legend"><span class="lia-h">' + esc(t("lia_title")) +
      "</span>" + parts.join("") + "</div>";
  }

  function zhTokens(text) {
    text = String(text || "");
    var seg = window.HV && window.HV.segZh;
    if (!seg) return esc(text);
    return seg(text).map(function (tk) {
      var lead = tk.lead ? esc(tk.lead) : "";
      if (tk.w) return lead + '<span class="tok zt" data-zh="' + esc(tk.t) + '">' + esc(tk.t) + "</span>";
      return lead + esc(tk.t);
    }).join("");
  }

  function frTokens(text) {
    text = String(text || "");
    return text.split(/(\s+)/).map(function (p) {
      if (!p || /^\s+$/.test(p)) return p;
      var m = p.match(/^(.+?)([.,;:!?«»""''…]*)$/);
      var core = m ? m[1] : p;
      var punct = m ? m[2] : "";
      if (!core) return esc(punct);
      return '<span class="tok frt" data-t="' + esc(core) + '">' + esc(core) + "</span>" + esc(punct);
    }).join("");
  }

  // 联诵标注：三类用不同样式，禁止的显示竖线
  function liaisonBlock(lia, fr) {
    if (!lia || !lia.length) return "";
    var h = '<div class="lia"><span class="lia-h">' + esc(t("lia_title")) + "</span>";
    lia.forEach(function (L) {
      var cls = L.type === "obligatoire" ? "ob" :
                L.type === "facultative" ? "fa" : "in";
      var label = t("lia_" + L.type);
      var at = String(L.at || "");
      h += '<span class="lia-item ' + cls + '" title="' + esc(label) + '">' +
        esc(at) + (L.phon ? ' <b>/' + esc(L.phon) + "/</b>" : "") +
        "</span>";
    });
    return h + "</div>";
  }

  function familyBlock(e) {
    var key = senses(e)[0];
    if (!key) return "";
    var rows = [], pool = byFr.get(frKey(key)) || [];
    pool.forEach(function (i) {
      if (i === ZF.indexOf(e) || rows.length >= 10) return;
      if (ZF[i][1].indexOf(e[1]) === 0) rows.push(i);
    });
    if (!rows.length) return "";
    var h = '<div class="fam"><div class="fam-title">' +
      esc(t("fam_starts", { w: e[1] })) + "</div>";
    rows.forEach(function (i) {
      var f = ZF[i];
      h += '<div class="fam-row" data-i="' + i + '">' +
        '<span class="fz">' + esc(f[1]) + "</span>" +
        '<span class="ff">' + esc(senses(f)[0] || "") + "</span>" +
        "</div>";
    });
    return h + "</div>";
  }

  function compactCard(i) {
    var e = ZF[i], ss = senses(e), ips = ipas(e);
    return '<article class="card" data-i="' + i + '">' +
      '<div class="row1">' +
        '<div class="hz-sm">' + esc(e[1]) + "</div>" +
        '<div class="word">' +
          '<div class="fr">' + esc(ss[0] || "") + "</div>" +
          '<div class="zh">' + esc(e[2]) + "</div>" +
        "</div>" +
        '<div class="ipa-r">' + (ips[0] ? "/" + esc(ips[0]) + "/" : '<span class="ipa pending">待核</span>') + "</div>" +
      "</div></article>";
  }

  // 法→中：以法语词为入口
  // 从词条里挑出「真正包含该法语词」的那一条义项，而不是无脑取首义项。
  // 例：词条「交」的义项有 ensemble / remettre / porter…，查 livre 时
  // 绝不能把 ensemble 当成 livre 的对应。
  function pickFrFor(e, key) {
    var k = frKey(key);
    var ss = senses(e);
    for (var i = 0; i < ss.length; i++) {
      var s = ss[i];
      if (frKey(s) === k) return s;
      if (frKey(s).indexOf(k) === 0) return s;
      if (new RegExp("(^|\\s)" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|\\s)").test(frKey(s))) return s;
    }
    return "";
  }

  function frHero(q) {
    var r = searchFr(q);
    if (!r.exact.length && !r.starts.length && !r.contains.length &&
        !(r.gloss && r.gloss.length)) return null;

    var h = '<article class="hero frhero">';
    h += '<div class="hero-head"><div class="hz fr-big">' + esc(q.trim()) + "</div>";
    // 音标：从命中词条里取该词自己的音标
    var ipa0 = "";
    if (r.exact.length) {
      var e0 = ZF[r.exact[0]];
      var k0 = frKey(q);
      var ss0 = senses(e0), ips0 = ipas(e0);
      for (var x = 0; x < ss0.length; x++) {
        if (frKey(ss0[x]) === k0 && ips0[x]) { ipa0 = ips0[x]; break; }
      }
    }
    h += '<div class="hz-side">' + ipaTag(ipa0, q) + "</div></div>";

    var gloss = r.gloss || [];
    if (gloss.length) {
      h += '<div class="answer"><span class="zh-big">' + esc(gloss[0]) + "</span>" +
        (bySimp.has(gloss[0]) ? '<span class="hz-meta"><span class="py">' +
          esc(ZF[bySimp.get(gloss[0])][2] || "") + "</span></span>" : "") +
        "</div>";
      if (gloss.length > 1) {
        h += '<div class="fam"><div class="fam-title">' + esc(t("fr_hero_label")) + "</div>";
        gloss.slice(1, 6).forEach(function (z) {
          var gi = bySimp.get(z);
          h += '<div class="fam-row"' + (gi != null ? ' data-i="' + gi + '"' : "") + ">" +
            '<span class="fz">' + esc(z) + "</span>" +
            (gi != null ? '<span class="ff">' + esc(ZF[gi][2] || "") + "</span>" : "") +
            "</div>";
        });
        h += "</div>";
      }
    } else if (r.exact.length) {
      var top = ZF[r.exact[0]];
      h += '<div class="answer"><span class="zh-big">' + esc(top[1]) + "</span>" +
        '<span class="hz-meta"><span class="py">' + esc(top[2]) + "</span></span></div>";
    }

    if (r.starts.length) {
      h += '<div class="fam"><div class="fam-title">' +
        esc(t("fam_starts", { w: r.key || q })) + "</div>";
      r.starts.slice(0, 12).forEach(function (i) {
        var f = ZF[i];
        // 只显示该法语词本身，不显示词条的首义项——
        // 「以 livre 开头」下面的条目，首义项往往是别的词（交 ensemble），
        // 直接摆出来会让人以为 livre 就是 ensemble。
        var hitFr = pickFrFor(f, r.key || q);
        h += '<div class="fam-row" data-i="' + i + '">' +
          '<span class="fz">' + esc(f[1]) + "</span>" +
          (hitFr ? '<span class="ff">' + esc(hitFr) + "</span>" : "") + "</div>";
      });
      h += "</div>";
    }
    if (r.contains.length) {
      h += '<div class="fam"><div class="fam-title">' +
        esc(t("fam_contains", { w: r.key || q })) + "</div>";
      r.contains.slice(0, 12).forEach(function (i) {
        var f = ZF[i];
        var hitFr = pickFrFor(f, r.key || q);
        h += '<div class="fam-row" data-i="' + i + '">' +
          '<span class="fz">' + esc(f[1]) + "</span>" +
          (hitFr ? '<span class="ff">' + esc(hitFr) + "</span>" : "") + "</div>";
      });
      h += "</div>";
    }
    return { html: h + "</article>",
             count: (gloss.length || 0) + r.starts.length + r.contains.length,
             top: r.exact[0] != null ? r.exact[0] : (r.starts[0] != null ? r.starts[0] : null) };
  }

  // 法语词的完整词条（弹窗用）
  function frDetail(q) {
    var h = frHero(q);
    if (!h) {
      openSheet('<div class="det-hz fr-big">' + esc(String(q).trim()) + "</div>" +
        '<div class="pop-none">' + esc(t("pop_miss", { w: q })) + "</div>");
      return;
    }
    var ex = h.top != null ? ZF[h.top][6] : null;
    openSheet(h.html + exampleBlock(ZF[h.top] || ["", "", "", "", "", "", ""]));
  }

  function render(q) {
    q = (q || "").trim();
    var histBox = document.getElementById("histDict");
    if (!q) {
      resultsEl.innerHTML = "";
      emptyEl.hidden = true;
      if (histBox) histRender(histBox);
      return;
    }
    if (histBox) histBox.hidden = true;

    var isCJK = /[\u3400-\u4dbf\u4e00-\u9fff]/.test(q);
    var html = "", n = 0;

    if (isCJK) {
      var r = searchZh(q);
      if (r.exact.length) { html += heroCard(r.exact[0]); n++; }
      r.rest.forEach(function (i) { html += compactCard(i); n++; });
    } else {
      // 法语输入：整句 -> 句音标；单词 -> 词条或直接音标
      var IQ = window.IPAQuery;
      var sent = IQ && IQ.looksLikeSentence(q);

      if (sent) {
        html += sentenceIpaCard(q);
        n = 1;
      } else {
        var h = frHero(q);
        if (h && h.html) { html += h.html; n = h.count || 1; }
        // 词库没有，但音标词典有 -> 也给结果（很多词 CFDICT 未收）
        if (!n) {
          var alone = wordIpaCard(q);
          if (alone) { html += alone; n = 1; }
        }
      }
    }

    resultsEl.innerHTML = html;
    emptyEl.hidden = n > 0;
    countEl.textContent = n ? t("foot_count1", { n: n }) : t("foot_none");
  }

  // ---------- 音标直查卡片 ----------
  // 词库未收录的法语词也能查音标（Lexique 12.5 万词形）
  function wordIpaCard(w) {
    var IQ = window.IPAQuery;
    if (!IQ) return "";
    var ip = IQ.wordIpa(w);
    if (!ip) return "";
    var h = '<article class="hero ipahero">' +
      '<div class="hero-head"><div class="hz fr-big">' + esc(w.trim()) + "</div>" +
      '<div class="hz-side"><span class="ipa">/' + esc(ip) + "/</span></div></div>";
    // 提示：词库未收录这个词，只给音标
    h += '<div class="ipa-note">' + esc(t("ipa_only_note")) + "</div>";
    h += "</article>";
    return h;
  }

  // 整句音标 + 联诵
  function sentenceIpaCard(text) {
    var IQ = window.IPAQuery;
    if (!IQ) return "";
    var r = IQ.sentenceIpa(text);

    var h = '<article class="hero ipahero">';
    h += '<div class="hero-head"><div class="hz fr-sent">' + esc(text.trim()) + "</div></div>";

    // 带联诵标记的音标（主显示）
    h += '<div class="sent-ipa" lang="fr">/' + renderIpaMarked(r.marked || r.ipa) + "/</div>";

    // 联诵统计
    if (r.liaisons && r.liaisons.length) {
      var ob = 0, fa = 0, inn = 0;
      r.liaisons.forEach(function (L) {
        if (L.type === "obligatoire") ob++;
        else if (L.type === "facultative") fa++;
        else if (L.type === "interdite") inn++;
      });
      var parts = [];
      if (ob) parts.push('<span class="lia-count ob">' + esc(t("lia_obligatoire")) + " " + ob + "</span>");
      if (fa) parts.push('<span class="lia-count fa">' + esc(t("lia_facultative")) + " " + fa + "</span>");
      if (inn) parts.push('<span class="lia-count in">' + esc(t("lia_interdite")) + " " + inn + "</span>");
      h += '<div class="lia-legend"><span class="lia-h">' + esc(t("lia_title")) + "</span>" +
        parts.join("") + "</div>";
    }

    // 查不到音标的词，显式列出来（不猜）
    if (r.missing && r.missing.length) {
      h += '<div class="ipa-missing">' + esc(t("ipa_missing_words")) +
        " " + r.missing.map(esc).join("、") + "</div>";
    }

    h += "</article>";
    return h;
  }

  // ---------- 弹窗 ----------
  var sheet = document.getElementById("sheet");
  var sheetBody = document.getElementById("sheet-body");

  function openSheet(html) {
    sheetBody.innerHTML = html;
    sheet.hidden = false;
    sheet.scrollTop = 0;
  }

  function detail(i) {
    var e = ZF[i];
    var ss = senses(e), ips = ipas(e), ps = poss(e);
    var h = '<div class="det-hz">' + esc(e[1]) + "</div>";
    h += '<div class="det-senses">';
    ss.forEach(function (s, k) {
      h += '<div class="det-sense"><span class="ds-fr">' + esc(s) + "</span>" +
        ipaTag(ips[k] || "", s) +
        (ps[k] ? '<span class="pos">' + esc(ps[k]) + "</span>" : "") + "</div>";
    });
    h += "</div>";
    h += exampleBlock(e);
    h += '<dl class="defs">' +
      '<div class="def"><dt>' + esc(t("detail_pinyin")) + "</dt><dd>" + esc(e[2]) + "</dd></div>" +
      (e[0] !== e[1] ? '<div class="def"><dt>' + esc(t("detail_trad")) + "</dt><dd>" + esc(e[0]) + "</dd></div>" : "") +
      "</dl>";
    openSheet(h);
  }

  // ---------- 查词记录 ----------
  var HIST_KEY = "hanfr.hist.dict";

  function histLoad() {
    try { return JSON.parse(localStorage.getItem(HIST_KEY) || "[]") || []; } catch (e) { return []; }
  }
  function histSave(list) {
    try { localStorage.setItem(HIST_KEY, JSON.stringify(list.slice(0, 40))); } catch (e) {}
  }
  function histRecord(q) {
    q = (q || "").trim();
    if (!q || q.length > 60) return;
    var list = histLoad().filter(function (x) { return x !== q; });
    list.unshift(q);
    histSave(list);
  }
  function histRender(box) {
    var list = histLoad();
    if (!list.length) { box.hidden = true; return; }
    var h = '<div class="hist-head"><span>' + esc(t("hist_dict")) + "</span>" +
      '<button type="button" class="linky" data-hclear>' + esc(t("hist_clear")) + "</button></div>" +
      '<div class="hist-chips">';
    list.slice(0, 24).forEach(function (w) {
      h += '<button type="button" class="chip" data-hw="' + esc(w) + '">' + esc(w) + "</button>";
    });
    box.innerHTML = h + "</div>";
    box.hidden = false;
  }

  var histBoxEl = document.getElementById("histDict");
  if (histBoxEl) {
    histBoxEl.addEventListener("click", function (ev) {
      var c = ev.target.closest("[data-hclear]");
      if (c) { histSave([]); histRender(histBoxEl); return; }
      var chip = ev.target.closest("[data-hw]");
      if (!chip) return;
      input.value = chip.getAttribute("data-hw");
      clearBtn.hidden = false;
      render(input.value);
    });
  }

  // ---------- 事件 ----------
  var timer = null, histTimer = null;
  input.addEventListener("input", function () {
    clearBtn.hidden = !input.value;
    clearTimeout(timer);
    timer = setTimeout(function () { render(input.value); }, 80);
    clearTimeout(histTimer);
    histTimer = setTimeout(function () { histRecord(input.value); }, 700);
  });
  input.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter") { clearTimeout(histTimer); histRecord(input.value); }
  });
  clearBtn.addEventListener("click", function () {
    input.value = ""; clearBtn.hidden = true; input.focus(); render("");
  });

  document.addEventListener("click", function (ev) {
    var el = ev.target.closest("[data-i]");
    if (!el) return;
    if (ev.target.closest(".tok")) return;      // 词内点击走弹窗，不跳词条
    detail(+el.getAttribute("data-i"));
  });

  document.getElementById("close").addEventListener("click", function () { sheet.hidden = true; });
  sheet.addEventListener("click", function (ev) { if (ev.target === sheet) sheet.hidden = true; });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") sheet.hidden = true;
    if (ev.key === "/" && document.activeElement !== input) { ev.preventDefault(); input.focus(); }
  });

  // ---------- 暴露给 translate.js ----------
  // 把 h aspiré 词表交给音标查询层，整句联诵判定要用
  if (window.IPAQuery && window.H_ASPIRE) {
    try {
      window.IPAQuery.setHAspire(new Set(window.H_ASPIRE.map(function (w) {
        return String(w).toLowerCase();
      })));
    } catch (e) {}
  }

  window.HV = {
    ZF: ZF, bySimp: bySimp, byTrad: byTrad, byFr: byFr,
    frKey: frKey, foldFr: foldFr, senses: senses, ipas: ipas,
    esc: esc, ipaTag: ipaTag, t: t,
    detail: detail, frDetail: frDetail, openSheet: openSheet,
    exampleBlock: exampleBlock, liaisonBlock: liaisonBlock,
    zhTokens: zhTokens, frTokens: frTokens,
    segZh: null, segFr: null
  };

  // ---------- 界面语言 ----------
  I18N.apply();
  document.title = t("app_name");
  var langBtn = document.getElementById("langBtn");
  var langDlg = document.getElementById("lang-dialog");
  if (langBtn && langDlg) {
    langBtn.addEventListener("click", function () { langDlg.hidden = false; });
    langDlg.addEventListener("click", function (ev) {
      if (ev.target === langDlg) { langDlg.hidden = true; return; }
      var lb = ev.target.closest("[data-lang]");
      if (!lb) return;
      var l = lb.getAttribute("data-lang");
      if (l && l !== I18N.lang()) {
        I18N.setLang(l);
        document.title = t("app_name");
        render(input.value);
      }
      langDlg.hidden = true;
    });
  }

  // ---------- 主题 ----------
  var THEME_KEY = "hanfr.ui.theme";
  var themeBtn = document.getElementById("themeBtn");
  var themeDlg = document.getElementById("theme-dialog");
  var mqDark = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function themePref() {
    try { return localStorage.getItem(THEME_KEY) || "auto"; } catch (e) { return "auto"; }
  }
  function applyTheme() {
    var pref = themePref();
    var dark = pref === "dark" || (pref === "auto" && mqDark && mqDark.matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    if (themeBtn) { themeBtn.setAttribute("data-mode", pref); themeBtn.title = t("theme_" + pref); }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#0d1520" : "#eef3f9");
    var list = document.getElementById("themelist");
    if (list) {
      Array.prototype.forEach.call(list.children, function (b) {
        var on = b.getAttribute("data-theme-opt") === pref;
        b.classList.toggle("on", on);
        b.setAttribute("aria-current", on ? "true" : "false");
      });
    }
  }
  var CYCLE = ["light", "dark", "auto"];
  if (themeBtn && themeDlg) {
    var pressTimer = null, longPressed = false;
    function cancelPress() { clearTimeout(pressTimer); pressTimer = null; }
    themeBtn.addEventListener("pointerdown", function (ev) {
      if (ev.pointerType === "mouse" && ev.button !== 0) return;
      longPressed = false; cancelPress();
      pressTimer = setTimeout(function () {
        longPressed = true; applyTheme(); themeDlg.hidden = false;
      }, 550);
    });
    themeBtn.addEventListener("pointerup", cancelPress);
    themeBtn.addEventListener("pointerleave", cancelPress);
    themeBtn.addEventListener("pointercancel", function () { longPressed = false; cancelPress(); });
    themeBtn.addEventListener("click", function () {
      if (longPressed) { longPressed = false; return; }
      var cur = themePref();
      var next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      applyTheme();
    });
    themeBtn.addEventListener("contextmenu", function (ev) {
      ev.preventDefault(); applyTheme(); themeDlg.hidden = false;
    });
    themeDlg.addEventListener("click", function (ev) {
      if (ev.target === themeDlg) { themeDlg.hidden = true; return; }
      var tb = ev.target.closest("[data-theme-opt]");
      if (!tb) return;
      try { localStorage.setItem(THEME_KEY, tb.getAttribute("data-theme-opt")); } catch (e) {}
      applyTheme();
      themeDlg.hidden = true;
    });
    applyTheme();
  }
  if (mqDark) {
    var onSys = function () { if (themePref() === "auto") applyTheme(); };
    if (mqDark.addEventListener) mqDark.addEventListener("change", onSys);
    else if (mqDark.addListener) mqDark.addListener(onSys);
  }
  document.addEventListener("langchange", function () { applyTheme(); render(input.value); });

  countEl.textContent = t("foot_count", { n: ZF.length.toLocaleString() });

  var pre = new URLSearchParams(location.search).get("q");
  if (pre) {
    input.value = pre; clearBtn.hidden = false; render(pre);
  }

  // ---------- 更新检测 ----------
  // 照汉南做法：启动后查 GitHub 最新 Release，比本机版本新才弹窗。
  // 网络失败或没有新版本时静默，不打扰用户。
  var APP_VERSION = (typeof window !== "undefined" && window.APP_VERSION) || "1.0.0";
  var META = window.LEX_META || {};
  var CUR_VER = META.version || APP_VERSION;
  var UPD_DISMISS = "hanfr.update.dismissed";

  function verNum(s) {
    var m = String(s || "").match(/(\d+)\.(\d+)\.(\d+)/);
    return m ? [+m[1], +m[2], +m[3]] : null;
  }
  function verNewer(a, b) {
    for (var i = 0; i < 3; i++) {
      if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
    }
    return false;
  }

  function checkUpdate() {
    fetch("https://api.github.com/repos/SiqYin/hanfr-translate/releases/latest")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.tag_name) return;
        var tag = d.tag_name.replace(/^v/i, "");
        var cur = verNum(CUR_VER), lat = verNum(tag);
        if (!cur || !lat || !verNewer(lat, cur)) return;
        try { if (localStorage.getItem(UPD_DISMISS) === d.tag_name) return; } catch (e) {}
        showUpdate(d.tag_name, d.html_url);
      })
      .catch(function () {});   // 离线或接口失败：静默
  }

  function showUpdate(tag, url) {
    var box = document.getElementById("update-dialog");
    if (!box) return;
    document.getElementById("upd-msg").textContent = t("update_msg", { v: tag });
    box.hidden = false;
    document.getElementById("upd-go").onclick = function () {
      window.open(url, "_blank");
      box.hidden = true;
    };
    document.getElementById("upd-later").onclick = function () {
      try { localStorage.setItem(UPD_DISMISS, tag); } catch (e) {}
      box.hidden = true;
    };
  }

  setTimeout(checkUpdate, 1500);
})();