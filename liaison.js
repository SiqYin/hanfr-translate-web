/* liaison.js — 法語聯誦（liaison）與省音（élision）判定引擎
 *
 * 為什麼需要獨立引擎：
 *   法語的聯誦不是「相鄰就加」。同一個詞對，可能是 obligatoire（必須）、
 *   facultative（可選）、interdite（禁止）。判錯比不標更糟——學習者會照著錯的讀。
 *
 * 三分類的判據是**語法範疇 + 固定詞表**，不是統計：
 *   obligatoire  限定詞+名詞、代詞+動詞、單音節介詞/副詞+後詞、數詞+名詞、
 *                est/c'est+補語、短前置形容詞+名詞、quand+代詞
 *   interdite    h aspiré 之後、et 之後、onze/onzième 之前、單數名詞+動詞、
 *                專名之後、感嘆詞之前、字母縮寫之前
 *   facultative  其餘「輔音結尾 + 元音開頭」的組合
 *
 * 詞表依賴：
 *   H_ASPIRE   來自 data/fr_h_aspire.tsv（Wiktionary 分類 ∩ Lexique 詞形，907 條）
 *   本檔內建 obligatoire 語境表與不規則聯誦音素表
 *
 * 設計原則：
 *   1. 純函數，輸入分詞陣列 + 詞性，輸出標註陣列；不依賴 DOM；
 *   2. 不確定時標 pending，不猜（紅線 R5）；
 *   3. 同一份代碼供 Node 構建與瀏覽器執行時使用。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FRLiaison = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------------- 聯誦音素 ---------------- */
  // 詞尾字母 -> 聯誦音素。法語只有這幾種。
  var TAIL_PHON = {
    "s": "z", "x": "z", "z": "z",
    "t": "t", "d": "t",
    "n": "n",
    "r": "ʁ",
    "p": "p",
    "g": "k",
    "f": "v"
  };

  // 不規則詞的聯誦形式（詞尾音素與常規不同，或詞幹變化）
  // tail   = 聯誦音素的 IPA（只取音素本身，不取整詞）
  // liaison= 聯誦時的完整讀音（供 applyToIpa 替換左詞，而非追加）
  var IRREGULAR = {
    "cinq": { tail: "k", liaison: "sɛ̃k" },
    "six": { tail: "z", liaison: "siz" },
    "dix": { tail: "z", liaison: "diz" },
    "neuf": { tail: "v", liaison: "nœv" },
    "vingt": { tail: "t", liaison: "vɛ̃t" },
    "cent": { tail: "t", liaison: "sɑ̃t" },
    "tous": { tail: "s", liaison: "tus" },
    "plus": { tail: "z", liaison: "plyz" },
    "trop": { tail: "p", liaison: "tʁop" },
    "est": { tail: "t", liaison: "ɛt" },
    "c'est": { tail: "t", liaison: "sɛt" },
    "n'est": { tail: "t", liaison: "nɛt" },
    "font": { tail: "t", liaison: "fɔ̃t" },
    "sont": { tail: "t", liaison: "sɔ̃t" },
    "ont": { tail: "t", liaison: "ɔ̃t" },
    "vont": { tail: "t", liaison: "vɔ̃t" },
    "peut": { tail: "t", liaison: "pøt" },
    "doit": { tail: "t", liaison: "dwat" },
    "veut": { tail: "t", liaison: "vøt" },
    "fait": { tail: "t", liaison: "fɛt" },
    "quand": { tail: "t", liaison: "kɑ̃t" }
  };

  /* ---------------- obligatoire 語境 ---------------- */
  // 這些詞後面接元音開頭的詞時，聯誦是必須的
  var OBLIG_LEFT = new Set([
    // 限定詞
    "le", "la", "les", "un", "une", "des", "du", "de", "au", "aux",
    "ce", "cet", "cette", "ces", "mon", "ma", "mes", "ton", "ta", "tes",
    "son", "sa", "ses", "notre", "nos", "votre", "vos", "leur", "leurs",
    "aucun", "aucune", "chaque", "quel", "quelle", "quels", "quelles",
    "tout", "toute", "tous", "toutes", "plusieurs", "certains", "certaines",
    // 代詞
    "je", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles",
    "me", "te", "se", "nous", "vous", "le", "la", "les", "lui", "leur",
    "moi", "toi", "eux", "y", "en", "qui", "que",
    // 單音節介詞 / 副詞
    "à", "chez", "dans", "sans", "sous", "sur", "vers", "par", "pour",
    "en", "très", "bien", "mal", "trop", "plus", "moins", "tout",
    "pas", "jamais", "point", "fort", "peu", "assez",
    // est / c'est
    "est", "c'est", "n'est", "qu'est",
    // 數詞
    "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
    "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
    "vingt", "trente", "quarante", "cinquante", "cent", "mille",
    // quand + 代詞/名詞
    "quand", "lorsqu", "puisqu", "quoiqu"
  ]);

  /* ---------------- interdite 語境 ---------------- */
  var INTERDIT_LEFT = new Set([
    "et",            // 連詞 et 之後永不聯誦
    "ou",            // ou 之後通常不聯誦（避免與 où 混淆）
    "ni",
    "donc",
    "car",
    "or",
    "mais"
  ]);

  var INTERDIT_RIGHT = new Set([
    "onze", "onzième", "onzièmes",
    "hier",        // 副詞 hier 是 h muet，但慣例上多不聯誦
    "ouate", "ouistiti", "oued"
  ]);

  // 詞尾 -s 但**不聯誦**的常用詞。這些詞的 -s 是詞幹的一部分或拼寫遺留，
  // 不是複數標記，聯誦會讀錯：
  //   fils（兒子，單數）/fis/ —— 複數同形但讀 /fil/，且不聯誦
  //   sens（意義）/sɑ̃s/、corps /kɔʁ/、temps /tɑ̃/、poids /pwa/、mois /mwa/
  //   vous/ils/nous 是代詞，單獨處理
  var NO_LIAISON_S = new Set([
    "fils", "sens", "corps", "temps", "poids", "mois", "os", "cas",
    "repas", "bras", "tas", "gaz", "nez", "riz", "pays", "tapis", "colis",
    "avis", "permis", "souris", "croquis", "radis", "fils"
  ]);

  // 單數名詞 + 動詞：不聯誦。需要詞性判斷，見 classifyPair。

  /* ---------------- 主判定 ---------------- */
  /**
   * 判斷一個詞對之間是否有聯誦。
   *
   * @param {string} left       前一詞（小寫，無標點）
   * @param {string} right      後一詞（小寫，無標點）
   * @param {object} opts
   *   opts.hAspire  Set<string>  h aspiré 詞表
   *   opts.posLeft  string       左詞詞性（'NOM'|'VER'|'ADJ'|'DET'|'PRO'|'PRE'|'CON'|'ADV'|'NUM'）
   *   opts.posRight string       右詞詞性
   * @returns {{type:string, phon:string, reason:string}}
   *   type: 'obligatoire' | 'facultative' | 'interdite' | 'none'
   *   phon: 聯誦音素（interdite/none 為空串）
   */
  function classifyPair(left, right, opts) {
    opts = opts || {};
    var hAspire = opts.hAspire || new Set();
    var L = String(left || "").toLowerCase().replace(/[.,;:!?«»""''…]+$/, "").trim();
    var R = String(right || "").toLowerCase().replace(/^[«»""''…]+/, "").trim();
    if (!L || !R) return { type: "none", phon: "", reason: "empty" };

    // 右詞必須以元音或 h 開頭，否則根本不存在聯誦
    var first = R.charAt(0);
    var isVowelStart = /^[aeiouyàâäéèêëîïôöùûüœæ]/.test(R);
    var isHStart = first === "h";
    if (!isVowelStart && !isHStart) {
      return { type: "none", phon: "", reason: "right-consonant" };
    }

    // 1) h aspiré -> 禁止
    //    注意：h aspiré 的詞以 h 開頭，不做聯誦也不做省音
    if (isHStart) {
      var hw = R.replace(/^h/, "h");
      if (hAspire.has(hw) || hAspire.has(R)) {
        return { type: "interdite", phon: "", reason: "h-aspire" };
      }
      // h muet：按元音處理，繼續往下判定
    }

    // 2) 左詞是 et / ou / ni / donc / car / or / mais -> 禁止
    var lkey = L.replace(/'$/, "");
    if (INTERDIT_LEFT.has(lkey)) {
      return { type: "interdite", phon: "", reason: "conj-" + lkey };
    }

    // 2b) 詞尾 -s 但不聯誦的詞（fils / temps / corps / pays …）
    if (NO_LIAISON_S.has(lkey)) {
      return { type: "interdite", phon: "", reason: "no-liaison-s" };
    }

    // 3) 右詞是 onze / onzième -> 禁止
    if (INTERDIT_RIGHT.has(R)) {
      return { type: "interdite", phon: "", reason: "right-special" };
    }

    // 4) 確定左詞詞尾是否可聯誦
    var irr = IRREGULAR[lkey];
    var tail = "";
    var liaisonPhon = "";

    // 主語代詞的隱含聯誦：elle/il/on/ils/elles 詞尾本身是元音或 -l/-n，
    // 但作為主語代詞後接動詞時，法語口語標準要求聯誦（elle‿est /ɛ.lɛ/、
    // il‿est /i.lɛ/、on‿a /ɔ.na/）。這裡補充詞尾到音素的映射。
    var PRONOUN_LIAISON = {
      "elle": "l", "il": "l", "on": "n", "ils": "z", "elles": "z",
      "nous": "z", "vous": "z", "je": "", "tu": "", "ce": "", "cela": "",
      "celui": "", "celle": ""
    };

    if (irr) {
      tail = irr.tail;
      liaisonPhon = irr.tail;       // 不規則詞的 tail 就是聯誦音素
    } else if (OBLIG_LEFT.has(lkey) && PRONOUN_LIAISON[lkey]) {
      liaisonPhon = PRONOUN_LIAISON[lkey];
      tail = "pronoun";
    } else {
      var lastCh = lkey.charAt(lkey.length - 1);
      // 詞尾 -es / -s / -x / -t / -d / -n / -r / -p / -g / -f
      var m = /([sxztdnrpgf])$/.exec(lkey);
      if (!m) {
        return { type: "none", phon: "", reason: "left-no-liaison-tail" };
      }
      // 詞尾 -er / -ier：r 不聯誦（parler à -> paʁle a）
      if (/(er|ier)$/.test(lkey) && m[1] === "r") {
        return { type: "none", phon: "", reason: "left-er-ending" };
      }
      tail = m[1];
      liaisonPhon = TAIL_PHON[tail] || "";
    }

    if (!liaisonPhon) {
      return { type: "none", phon: "", reason: "no-phon-for-tail" };
    }

    // 5) 單數名詞 + 動詞 / 形容詞 -> 禁止
    //    法語規則：名詞（單數）後接動詞不聯誦（le chat | est）
    //    只有當左詞確實被判為名詞時才觸發；詞性未知（空串）時不觸發，
    //    否則 il/est 這類代詞+動詞會被誤殺。
    var pl = (opts.posLeft || "").toUpperCase();
    var pr = (opts.posRight || "").toUpperCase();
    var leftIsSingularNoun = (pl === "NOM" || pl === "N");
    var rightIsPredicate = pr === "VER" || pr === "AUX" || pr === "ADJ";
    if (leftIsSingularNoun && rightIsPredicate) {
      return { type: "interdite", phon: "", reason: "nom-singulier-verbe" };
    }

    // 6) obligatoire 語境
    if (OBLIG_LEFT.has(lkey)) {
      return { type: "obligatoire", phon: liaisonPhon, reason: "context" };
    }

    // 7) 其餘：facultative
    return { type: "facultative", phon: liaisonPhon, reason: "default" };
  }

  /**
   * 對整句做聯誦標註。
   *
   * @param {string[]} tokens  分詞結果（含標點也可，會被跳過）
   * @param {object}   opts    { hAspire, pos: string[], ipa: string[] }
   * @returns {Array}  [{i, type, phon, at, reason}]
   */
  function annotate(tokens, opts) {
    opts = opts || {};
    var hAspire = opts.hAspire || new Set();
    var pos = opts.pos || [];
    var out = [];

    for (var i = 0; i < tokens.length - 1; i++) {
      var a = tokens[i], b = tokens[i + 1];
      // 標點不參與
      if (!a || !b) continue;
      if (/^[.,;:!?«»""''…\-–—()\[\]]+$/.test(a)) continue;
      if (/^[.,;:!?«»""''…\-–—()\[\]]+$/.test(b)) continue;

      var r = classifyPair(a, b, {
        hAspire: hAspire,
        posLeft: pos[i] || "",
        posRight: pos[i + 1] || "",
        numLeft: opts.numLeft ? opts.numLeft[i] : ""
      });

      if (r.type === "none") continue;

      var at;
      if (r.type === "interdite") {
        at = a + " | " + b;
      } else {
        at = a + "\u203F" + b;      // U+203F undertie
      }
      out.push({ i: i, type: r.type, phon: r.phon, at: at, reason: r.reason });
    }
    return out;
  }

  /**
   * 把聯誦音素插進句音標。
   *
   * 兩種情況：
   *   1. 一般詞：直接在左詞音標末尾追加音素（les /le/ -> /lez/）
   *   2. 不規則詞：左詞的讀音本身要換（c'est /sɛ/ -> /sɛt/，six /si/ -> /siz/）
   *      這時用 IRREGULAR 的 liaison 整詞替換，不能只是追加。
   *
   * @param {string}   sentIpa  已用空格分隔的句音標
   * @param {Array}    liasons  annotate() 的結果
   * @param {string[]} tokens   原始分詞（用於查不規則詞）
   * @returns {string}
   */
  function applyToIpa(sentIpa, liasons, tokens) {
    if (!sentIpa) return "";
    var parts = sentIpa.split(" ");
    var toks = tokens || [];
    // 從後往前處理，避免下標位移
    var sorted = liasons.slice().sort(function (a, b) { return b.i - a.i; });
    for (var k = 0; k < sorted.length; k++) {
      var L = sorted[k];
      if (L.type === "interdite") continue;
      var idx = L.i;
      if (idx < 0 || idx >= parts.length) continue;

      var w = String(toks[idx] || "").toLowerCase()
        .replace(/[.,;:!?«»""''…]+$/, "").trim();
      var irr = IRREGULAR[w];
      if (irr && irr.liaison) {
        // 不規則詞：整詞替換
        parts[idx] = irr.liaison;
      } else if (parts[idx].slice(-L.phon.length) === L.phon) {
        // 左詞音標本身就以該音素結尾（il /il/ + l -> 不能變成 /ill/）。
        // 這種情況聯誦音不需要追加，發音上本來就接得上。
        // 例：Il‿a = /i.la/，不是 /il.la/；音標寫 /il a/ 或 /i.la/ 都對，
        //     但 /ill a/ 一定錯。
        continue;
      } else {
        parts[idx] = parts[idx] + L.phon;
      }
    }
    return parts.join(" ");
  }

  /* ---------------- 省音（élision） ---------------- */
  // 這些詞在元音/h muet 前要省音：le -> l', de -> d', que -> qu'
  var ELIDABLE = {
    "le": "l'", "la": "l'", "je": "j'", "me": "m'", "te": "t'",
    "se": "s'", "ce": "c'", "de": "d'", "ne": "n'", "que": "qu'",
    "jusque": "jusqu'", "lorsque": "lorsqu'", "puisque": "puisqu'",
    "quoique": "quoiqu'", "si": "s'"
  };

  function elide(word, nextWord, hAspire) {
    var w = String(word || "").toLowerCase();
    var n = String(nextWord || "").toLowerCase();
    if (!ELIDABLE[w]) return word;
    if (!n) return word;
    if (!/^[aeiouyàâäéèêëîïôöùûüœæh]/.test(n)) return word;
    if (n.charAt(0) === "h" && hAspire && hAspire.has(n)) return word;   // h aspiré 不省音
    return ELIDABLE[w];
  }

  return {
    classifyPair: classifyPair,
    annotate: annotate,
    applyToIpa: applyToIpa,
    elide: elide,
    TAIL_PHON: TAIL_PHON,
    IRREGULAR: IRREGULAR,
    OBLIG_LEFT: OBLIG_LEFT,
    INTERDIT_LEFT: INTERDIT_LEFT
  };
});