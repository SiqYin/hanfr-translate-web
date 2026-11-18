/* conj_query.js — 变位查询层
 *
 * 需求：输入变位形式（mangeais），查出原型（manger）并说明这是什么变位
 *       （未完成过去时 · 第一/第二人称单数）。
 *
 * 为什么按需加载：
 *   conj.js（4.2 MB）+ form_index.js（10.6 MB）合计约 15 MB。
 *   首屏已有 39 MB，再加 15 MB 会明显拖慢。
 *   所以两个文件都做成「用到才加载」：
 *     用户查一个查不到的词 -> 触发加载 -> 加载后重查。
 *
 * 加载器用 <script> 注入，兼容 file://（Android/Electron）与 http。
 */
(function () {
  "use strict";

  var loaded = { conj: false, idx: false };
  var loading = { conj: null, idx: null };
  var waiters = [];

  var TENSE_ZH = window.CONJ_TENSE_ZH || {
    "présent": "现在时", "imparfait": "未完成过去时",
    "passé simple": "简单过去时", "futur": "简单将来时",
    "conditionnel": "条件式现在时", "subjonctif": "虚拟式现在时",
    "impératif": "命令式", "不定式": "不定式",
    "现在分词": "现在分词", "过去分词": "过去分词"
  };
  var PERSON_ZH = window.CONJ_PERSON_ZH || {
    "1s": "第一人称单数", "2s": "第二人称单数", "3s": "第三人称单数",
    "1p": "第一人称复数", "2p": "第二人称复数", "3p": "第三人称复数"
  };

  function loadScript(file, key, cb) {
    if (loaded[key]) return cb(true);
    if (loading[key]) {
      waiting[key].push(cb);
      return;
    }
    loading[key] = true;
    waiting[key] = [cb];

    var s = document.createElement("script");
    s.src = file;
    s.async = true;
    s.onload = function () {
      loaded[key] = true;
      loading[key] = null;
      var q = waiting[key] || [];
      waiting[key] = [];
      q.forEach(function (f) { try { f(true); } catch (e) {} });
    };
    s.onerror = function () {
      loading[key] = null;
      var q = waiting[key] || [];
      waiting[key] = [];
      q.forEach(function (f) { try { f(false); } catch (e) {} });
    };
    document.head.appendChild(s);
  }
  var waiting = { conj: [], idx: [] };

  /** 确保变位数据已加载 */
  function ensure(cb) {
    var needIdx = !loaded.idx;
    var needConj = !loaded.conj;
    if (!needIdx && !needConj) return cb(true);
    var left = (needIdx ? 1 : 0) + (needConj ? 1 : 0);
    var okAny = false;
    function done(ok) {
      if (ok) okAny = true;
      if (--left === 0) cb(okAny || (loaded.idx && loaded.conj));
    }
    if (needIdx) loadScript("form_index.js", "idx", done);
    if (needConj) loadScript("conj.js", "conj", done);
  }

  /** 查一个形式是否是变位形式。
   *  @returns {Array|null} [[lemma, tense, person], ...] 或 null
   */
  function lookup(form) {
    var k = String(form || "").toLowerCase().trim();
    if (!k) return null;
    var idx = window.FORMIDX;
    if (!idx) return null;
    return idx[k] || null;
  }

  /** 取某个动词的完整变位表 */
  function table(lemma) {
    var c = window.CONJ;
    if (!c) return null;
    return c[String(lemma || "").toLowerCase()] || null;
  }

  /** 中文描述，如「未完成过去时 · 第一/第二人称单数」 */
  function describe(tense, person) {
    var tn = TENSE_ZH[tense] || tense;
    if (!person) return tn;
    var parts = String(person).split("/").map(function (p) {
      return PERSON_ZH[p] || p;
    });
    // 1s/2s -> 第一人称单数、第二人称单数；合并同类词
    if (parts.length > 1) {
      // 简化：若都是「第X人称单数」，写成「第一/第二人称单数」
      var m = parts.map(function (s) { return s.match(/^第(.+)人称(单数|复数)$/); });
      if (m.every(Boolean) && m.every(function (x) { return x[2] === m[0][2]; })) {
        return tn + " · 第" + m.map(function (x) { return x[1]; }).join("/") +
          "人称" + m[0][2];
      }
    }
    return tn + " · " + parts.join("、");
  }

  window.ConjQuery = {
    ensure: ensure,
    lookup: lookup,
    table: table,
    describe: describe,
    hasIndex: function () { return !!window.FORMIDX; },
    hasConj: function () { return !!window.CONJ; },
    TENSE_ZH: TENSE_ZH,
    PERSON_ZH: PERSON_ZH
  };
})();