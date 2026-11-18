/* ipa.js 的查询层 —— 输入法语词或整句，直接出音标
 *
 * 为什么要单独一层：
 *   用户可能输入单词（maison）、带变体的词（cœur / eleve / CEUR）、
 *   或一整句（Nous sommes allés au parc.）。三种都要能出音标，
 *   整句还要把联诵标进音标里。
 *
 * 变体兼容（国际法语词典通行做法）：
 *   œ ⇄ oe      cœur = coeur
 *   æ ⇄ ae
 *   é è ê ë ⇄ e   élève = eleve
 *   ç ⇄ c         français = francais
 *   ù û ü ⇄ u
 *   大小写不敏感
 *
 * 本文件只做「查词 -> 音标」，不含界面。被 app.js / translate.js 调用。
 */
(function () {
  "use strict";

  var IPA = window.IPA || {};
  var FOLD = window.IPA_FOLD || {};
  var FRL = window.FRLiaison || null;

  var hAspire = null;

  // ---------- 变体折叠 ----------
  function fold(s) {
    var x = String(s || "").toLowerCase();
    x = x.replace(/œ/g, "oe").replace(/æ/g, "ae");
    // 去变音符号（NFD + 去掉组合记号）
    if (x.normalize) {
      x = x.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    } else {
      var map = {
        "à": "a", "â": "a", "ä": "a", "á": "a", "ã": "a",
        "é": "e", "è": "e", "ê": "e", "ë": "e",
        "î": "i", "ï": "i", "í": "i",
        "ô": "o", "ö": "o", "ó": "o", "õ": "o",
        "ù": "u", "û": "u", "ü": "u", "ú": "u",
        "ç": "c", "ÿ": "y", "ñ": "n"
      };
      x = x.replace(/[àâäáãéèêëîïíôöóõùûüúçÿñ]/g, function (c) {
        return map[c] || c;
      });
    }
    return x;
  }

  // ---------- 单词音标 ----------
  function wordIpa(w) {
    if (!w) return "";
    var key = String(w).toLowerCase().trim();
    if (!key) return "";

    // 1. 直接命中
    if (IPA[key]) return IPA[key];

    // 2. 折叠命中
    var fk = fold(key);
    var cached = FOLD[fk];
    if (cached) {
      // 折叠表可能对应多个正字法词形（élève / élevé 都折叠成 eleve）。
      // 优先选：① 与输入完全相同的 ② 第一个
      var list = Array.isArray(cached) ? cached : [cached];
      if (list.indexOf(key) > -1 && IPA[key]) return IPA[key];
      for (var ci = 0; ci < list.length; ci++) {
        if (IPA[list[ci]]) return IPA[list[ci]];
      }
    }

    // 3. oe / œ 互换再试
    if (key.indexOf("œ") > -1) {
      var k2 = key.replace(/œ/g, "oe");
      if (IPA[k2]) return IPA[k2];
      if (FOLD[fold(k2)] && IPA[FOLD[fold(k2)]]) return IPA[FOLD[fold(k2)]];
    }
    if (key.indexOf("oe") > -1) {
      var k3 = key.replace(/oe/g, "œ");
      if (IPA[k3]) return IPA[k3];
    }

    // 4. 已折叠的输入（使用者输的是 eleve / francais）：
    //    反查折疊表，逐個候選試音標
    var direct = FOLD[fk];
    if (direct) {
      var dlist = Array.isArray(direct) ? direct : [direct];
      for (var di = 0; di < dlist.length; di++) {
        if (IPA[dlist[di]]) return IPA[dlist[di]];
      }
    }

    // 5. 省音缩合：l'eau -> l + o
    var el = key.match(/^([dljmnstcçq]|qu)'(.+)$/);
    if (el) {
      var tail = wordIpa(el[2]);
      if (tail) return el[1] + tail;
    }

    // 6. 连字符复合词：逐段转换后连写（法语音标里复合词不分段）
    if (key.indexOf("-") > -1) {
      var parts = key.split("-").filter(Boolean);
      var joined = "";
      for (var i = 0; i < parts.length; i++) {
        var p = wordIpa(parts[i]);
        if (!p) { joined = ""; break; }
        joined += p;
      }
      if (joined) return joined;
    }

    // 7. 复数 / 阴性回落
    if (key.length > 2 && key.slice(-1) === "s") {
      var s1 = wordIpa(key.slice(0, -1));
      if (s1) return s1;
    }
    if (key.length > 3 && key.slice(-2) === "es") {
      var s2 = wordIpa(key.slice(0, -2));
      if (s2) return s2;
    }

    return "";
  }

  // ---------- 加载 h aspiré（联诵判定用）----------
  function setHAspire(set) {
    hAspire = set;
  }
  function getHAspire() {
    return hAspire || new Set();
  }

  // ---------- 整句音标 ----------
  var PUNCT_RE = /^[.,;:!?«»""''…\-–—()\[\]«»‹›"]+$/;

  function tokenize(text) {
    // 保留标点为独立 token，便于联诵判定跳过
    var out = [];
    var re = /([A-Za-zÀ-ÿŒœÆæ']+(?:-[A-Za-zÀ-ÿŒœÆæ']+)*)|([^\sA-Za-zÀ-ÿŒœÆæ']+)/g;
    var m;
    while ((m = re.exec(text))) {
      if (m[1]) out.push(m[1]);
      else if (m[2]) {
        // 标点可能连在一起，拆成单个
        for (var i = 0; i < m[2].length; i++) out.push(m[2][i]);
      }
    }
    return out;
  }

  /**
   * 整句音标 + 联诵内联标注
   *
   * @param {string} text  法语句子
   * @returns {{ipa:string, marked:string, tokens:string[], liaisons:Array,
   *            missing:string[], ok:boolean}}
   *   ipa     纯音标（不含 ‿）
   *   marked  带联诵标记的音标（‿ 与 |）
   *   missing 查不到音标的词（用于提示「待核」）
   */
  function sentenceIpa(text) {
    var s = String(text || "").trim();
    if (!s) {
      return { ipa: "", marked: "", tokens: [], liaisons: [], missing: [], ok: false };
    }

    var toks = tokenize(s);
    var ipas = [];
    var missing = [];

    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (PUNCT_RE.test(t)) {
        ipas.push(t);
        continue;
      }
      var ip = wordIpa(t);
      if (ip) {
        ipas.push(ip);
      } else {
        ipas.push("?");
        missing.push(t);
      }
    }

    var plain = [];
    for (var k = 0; k < ipas.length; k++) {
      if (PUNCT_RE.test(ipas[k])) {
        // 标点：直接贴在前面，不留空格
        if (plain.length) plain[plain.length - 1] += ipas[k];
        else plain.push(ipas[k]);
      } else {
        plain.push(ipas[k]);
      }
    }
    var ipaPlain = plain.join(" ").replace(/\s+([.,;:!?])/g, "$1").trim();

    // 联诵
    var lia = [];
    if (FRL && FRL.annotate) {
      try {
        lia = FRL.annotate(toks, { hAspire: getHAspire() });
      } catch (e) {
        lia = [];
      }
    }

    var marked = markInput(toks, ipaPlain, lia);

    return {
      ipa: ipaPlain,
      marked: marked,
      tokens: toks,
      liaisons: lia,
      missing: missing,
      ok: missing.length === 0
    };
  }

  /**
   * 把联诵标记插进音标。
   *
   * 只能按「实词序号」对齐——音标里保留标点，但位置不一定与 token 一一对应
   * （尤其是「?」占位或复合标点）。对不齐时宁可不标，也不错标。
   */
  function markInput(toks, ipaPlain, liaisons) {
    if (!ipaPlain || !liaisons || !liaisons.length) return ipaPlain;

    // 音标按 token 顺序重建（与 sentenceIpa 的拼接逻辑保持一致）
    var parts = [];
    var tokPos = [];       // 每个 token 在 parts 里的下标（标点合并到前一个）
    var gapText = ipaPlain;
    // 简化：直接用 token 数量切分不可靠，改为重新拼
    // 这里复用与上面一致的规则：标点并入前一个元素
    var ipas = [];
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (PUNCT_RE.test(t)) {
        if (ipas.length) ipas[ipas.length - 1].txt += t;
        continue;
      }
      var ip = wordIpa(t) || "?";
      ipas.push({ txt: ip, tok: i });
    }

    // 实词序号 -> ipas 下标
    var byTok = {};
    for (var j = 0; j < ipas.length; j++) byTok[ipas[j].tok] = j;

    for (var n = liaisons.length - 1; n >= 0; n--) {
      var L = liaisons[n];
      var j0 = byTok[L.i];
      if (j0 == null) continue;
      var leftTxt = String(toks[L.i] || "");
      var rightTxt = String(toks[L.i + 1] || "");
      if (PUNCT_RE.test(leftTxt) || PUNCT_RE.test(rightTxt)) continue;

      if (L.type === "interdite") {
        ipas[j0].txt += " |";
      } else {
        // 关键：联诵音素要真的并进左词末尾，不是只加个符号。
        //   les /le/ + amis /ami/ -> /lez‿ami/
        //   不能写成 /le‿ami/（少了 z）
        var ph = L.phon || "";
        if (ph && ipas[j0].txt.slice(-ph.length) !== ph) {
          ipas[j0].txt += ph;
        }
        ipas[j0].txt += "\u203F";
      }
    }

    var outStr = "";
    for (var q = 0; q < ipas.length; q++) {
      outStr += (q ? " " : "") + ipas[q].txt;
    }
    outStr = outStr.replace(/\u203F /g, "\u203F").replace(/ \u203F/g, "\u203F");
    outStr = outStr.replace(/\s+([.,;:!?])/g, "$1");
    return outStr.trim();
  }

  /**
   * 判断输入更像「法语词」还是「法语句子」
   */
  function looksLikeSentence(text) {
    var s = String(text || "").trim();
    if (!s) return false;
    if (/[\u3400-\u4dbf\u4e00-\u9fff]/.test(s)) return false;   // 含中文：不是法语
    var words = s.split(/\s+/).filter(Boolean);
    if (words.length >= 2) return true;
    if (/[.!?;:]$/.test(s)) return true;
    return false;
  }

  window.IPAQuery = {
    fold: fold,
    wordIpa: wordIpa,
    sentenceIpa: sentenceIpa,
    tokenize: tokenize,
    looksLikeSentence: looksLikeSentence,
    setHAspire: setHAspire,
    size: function () { return Object.keys(IPA).length; }
  };
})();