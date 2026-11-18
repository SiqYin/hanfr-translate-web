/* i18n.js — 界面多语言（简体中文 / 繁體中文 / Français / English）
 *
 * 四套键位必须完全对齐（tools/check_i18n.js 会校验）。
 * 键名一律小写下划线，避免与既有代码风格冲突。
 */
(function () {
  "use strict";

  var DICT = {
    hans: {
      app_name: "汉法辞典",
      app_sub: "汉语 · 法语 · 音标与联诵",
      nav_dict: "查词",
      nav_ai: "翻译",

      search_ph: "输入中文词或法语词",
      search_clear: "清除",
      search_hint: "例：水 / livre / 学生 / maison",
      empty_title: "没有找到",
      empty_sub: "可以换个说法，或试试单字。",

      foot_count: "{n} 条词目",
      foot_count1: "{n} 条",
      foot_none: "0 条",
      foot_ai: "AI 翻译 · {n} 条词目可查",

      detail_pinyin: "拼音",
      detail_trad: "繁体",
      detail_ipa: "音标",
      detail_pos: "词性",
      detail_example: "例句",
      detail_more: "查看完整词条 ›",

      fam_starts: "以「{w}」开头",
      fam_contains: "包含「{w}」",

      fr_hero_label: "对应中文",
      vi_gloss_label: "释义",

      lia_title: "联诵",
      lia_obligatoire: "必须",
      lia_facultative: "可选",
      lia_interdite: "禁止",
      lia_none: "无联诵",
      ipa_pending: "待核",

      ai_dir_fr2zh: "法 → 中",
      ai_dir_zh2fr: "中 → 法",
      ai_script_hans: "简体",
      ai_script_hant: "繁体",
      ai_src_ph_zh2fr: "输入中文，译成法语…",
      ai_src_ph_fr2zh: "Entrez le français…（输入法语，译成中文）",
      ai_go: "翻译",
      ai_busy: "翻译中",
      ai_copy: "复制译文",
      ai_copied: "已复制",
      ai_again: "重新翻译",
      ai_sample: "示例",
      ai_clear: "清空",
      ai_out_fr: "法语",
      ai_out_zh: "简体中文",
      ai_out_zh_hant: "繁体中文",
      ai_tip: "鼠标移到任一个词上（手机点一下），可即时查词典释义。",
      ai_err_title: "翻译失败：{msg}",
      ai_err_hint: "请检查网络，或稍后重试。默认接 Index-Translate 免费公共接口。",
      ai_err_timeout: "请求超时，服务没有回应。",
      ai_offline: "改用词库逐词对照",
      ai_out_offline: "词库逐词对照 · 不是译文",
      ai_len_warn: "{n} 字（偏长）",

      ai_cfg: "翻译设置",
      ai_cfg_base: "服务地址",
      ai_cfg_model: "模型",
      ai_cfg_key: "API Key",
      ai_cfg_save: "保存",
      ai_cfg_saved: "已保存",
      ai_cfg_reset: "还原默认",
      ai_cfg_note: "默认接 Index-Translate 免费公共接口（兼容 OpenAI 协议）。本项目只允许使用该接口。",

      lang_label: "界面语言",
      theme_label: "外观",
      theme_light: "浅色",
      theme_dark: "深色",
      theme_auto: "跟随系统",

      hist_dict: "查词记录",
      hist_ai: "翻译记录",
      hist_clear: "清空",

      update_title: "发现新版本",
      update_msg: "已有新版本 {v}，是否前往下载？",
      update_download: "前往下载",
      update_later: "暂不下载",

      pop_lib: "词库",
      pop_miss: "词库未收录「{w}」。",
      pop_no_zh: "找不到这个词的中文对应。",
      pop_ipa_missing: "音标缺失，待核",
      "ipa_only_note": "词库未收录此词，以下为音标查询结果。",
      "ipa_missing_words": "以下词无音标：",
      "ipa_sentence_hint": "输入整句可查句音标与联诵",
      "conj_form": "变位形式",
      "conj_full": "「{w}」的完整变位表",
      "conj_loading": "正在加载变位数据…",
      "conj_inf": "不定式",
      "conj_ppres": "现在分词",
      "conj_ppasse": "过去分词",
      "conj_nonfinite": "非人称形式",
      "conj_lemma": "原型",
    },

    hant: {
      app_name: "漢法辭典",
      app_sub: "漢語 · 法語 · 音標與聯誦",
      nav_dict: "查詞",
      nav_ai: "翻譯",

      search_ph: "輸入中文詞或法語詞",
      search_clear: "清除",
      search_hint: "例：水 / livre / 學生 / maison",
      empty_title: "沒有找到",
      empty_sub: "可以換個說法，或試試單字。",

      foot_count: "{n} 條詞目",
      foot_count1: "{n} 條",
      foot_none: "0 條",
      foot_ai: "AI 翻譯 · {n} 條詞目可查",

      detail_pinyin: "拼音",
      detail_trad: "繁體",
      detail_ipa: "音標",
      detail_pos: "詞性",
      detail_example: "例句",
      detail_more: "查看完整詞條 ›",

      fam_starts: "以「{w}」開頭",
      fam_contains: "包含「{w}」",

      fr_hero_label: "對應中文",
      vi_gloss_label: "釋義",

      lia_title: "聯誦",
      lia_obligatoire: "必須",
      lia_facultative: "可選",
      lia_interdite: "禁止",
      lia_none: "無聯誦",
      ipa_pending: "待核",

      ai_dir_fr2zh: "法 → 中",
      ai_dir_zh2fr: "中 → 法",
      ai_script_hans: "簡體",
      ai_script_hant: "繁體",
      ai_src_ph_zh2fr: "輸入中文，譯成法語…",
      ai_src_ph_fr2zh: "Entrez le français…（輸入法語，譯成中文）",
      ai_go: "翻譯",
      ai_busy: "翻譯中",
      ai_copy: "複製譯文",
      ai_copied: "已複製",
      ai_again: "重新翻譯",
      ai_sample: "示例",
      ai_clear: "清空",
      ai_out_fr: "法語",
      ai_out_zh: "簡體中文",
      ai_out_zh_hant: "繁體中文",
      ai_tip: "滑鼠移到任一個詞上（手機點一下），可即時查詞典釋義。",
      ai_err_title: "翻譯失敗：{msg}",
      ai_err_hint: "請檢查網路，或稍後重試。預設接 Index-Translate 免費公共介面。",
      ai_err_timeout: "請求逾時，服務沒有回應。",
      ai_offline: "改用詞庫逐詞對照",
      ai_out_offline: "詞庫逐詞對照 · 不是譯文",
      ai_len_warn: "{n} 字（偏長）",

      ai_cfg: "翻譯設定",
      ai_cfg_base: "服務位址",
      ai_cfg_model: "模型",
      ai_cfg_key: "API Key",
      ai_cfg_save: "儲存",
      ai_cfg_saved: "已儲存",
      ai_cfg_reset: "還原預設",
      ai_cfg_note: "預設接 Index-Translate 免費公共介面（相容 OpenAI 協議）。本專案只允許使用該介面。",

      lang_label: "介面語言",
      theme_label: "外觀",
      theme_light: "淺色",
      theme_dark: "深色",
      theme_auto: "跟隨系統",

      hist_dict: "查詞記錄",
      hist_ai: "翻譯記錄",
      hist_clear: "清空",

      update_title: "發現新版本",
      update_msg: "已有新版本 {v}，是否前往下載？",
      update_download: "前往下載",
      update_later: "暫不下載",

      pop_lib: "詞庫",
      pop_miss: "詞庫未收錄「{w}」。",
      pop_no_zh: "找不到這個詞的中文對應。",
      pop_ipa_missing: "音標缺失，待核",
      "ipa_only_note": "詞庫未收錄此詞，以下為音標查詢結果。",
      "ipa_missing_words": "以下詞無音標：",
      "ipa_sentence_hint": "輸入整句可查句音標與聯誦",
      "conj_form": "變位形式",
      "conj_full": "「{w}」的完整變位表",
      "conj_loading": "正在載入變位資料…",
      "conj_inf": "不定式",
      "conj_ppres": "現在分詞",
      "conj_ppasse": "過去分詞",
      "conj_nonfinite": "非人稱形式",
      "conj_lemma": "原型",
    },

    fr: {
      app_name: "Dictionnaire chinois-français",
      app_sub: "Chinois · Français · API et liaison",
      nav_dict: "Dictionnaire",
      nav_ai: "Traduction",

      search_ph: "Mot chinois ou français",
      search_clear: "Effacer",
      search_hint: "ex. : 水 / livre / 学生 / maison",
      empty_title: "Aucun résultat",
      empty_sub: "Essayez une autre formulation, ou un seul caractère.",

      foot_count: "{n} entrées",
      foot_count1: "{n} résultats",
      foot_none: "0 résultat",
      foot_ai: "Traduction IA · {n} entrées consultables",

      detail_pinyin: "Pinyin",
      detail_trad: "Traditionnel",
      detail_ipa: "API",
      detail_pos: "Catégorie",
      detail_example: "Exemples",
      detail_more: "Voir l'article complet ›",

      fam_starts: "Commençant par « {w} »",
      fam_contains: "Contenant « {w} »",

      fr_hero_label: "Correspondance chinoise",
      vi_gloss_label: "Sens",

      lia_title: "Liaison",
      lia_obligatoire: "obligatoire",
      lia_facultative: "facultative",
      lia_interdite: "interdite",
      lia_none: "sans liaison",
      ipa_pending: "à vérifier",

      ai_dir_fr2zh: "FR → ZH",
      ai_dir_zh2fr: "ZH → FR",
      ai_script_hans: "Simplifié",
      ai_script_hant: "Traditionnel",
      ai_src_ph_zh2fr: "Saisissez le chinois, traduire en français…",
      ai_src_ph_fr2zh: "Entrez le français… (traduire en chinois)",
      ai_go: "Traduire",
      ai_busy: "Traduction…",
      ai_copy: "Copier",
      ai_copied: "Copié",
      ai_again: "Retraduire",
      ai_sample: "Exemple",
      ai_clear: "Effacer",
      ai_out_fr: "Français",
      ai_out_zh: "Chinois simplifié",
      ai_out_zh_hant: "Chinois traditionnel",
      ai_tip: "Survolez un mot (touchez sur mobile) pour consulter sa définition.",
      ai_err_title: "Échec de la traduction : {msg}",
      ai_err_hint: "Vérifiez le réseau ou réessayez plus tard. L'API publique gratuite Index-Translate est utilisée par défaut.",
      ai_err_timeout: "Délai dépassé, le service ne répond pas.",
      ai_offline: "Mot à mot depuis le dictionnaire",
      ai_out_offline: "Mot à mot · ce n'est pas une traduction",
      ai_len_warn: "{n} caractères (long)",

      ai_cfg: "Paramètres de traduction",
      ai_cfg_base: "Adresse du service",
      ai_cfg_model: "Modèle",
      ai_cfg_key: "Clé API",
      ai_cfg_save: "Enregistrer",
      ai_cfg_saved: "Enregistré",
      ai_cfg_reset: "Réinitialiser",
      ai_cfg_note: "L'API publique gratuite Index-Translate (compatible OpenAI) est utilisée par défaut. Seule cette API est autorisée.",

      lang_label: "Langue de l'interface",
      theme_label: "Apparence",
      theme_light: "Clair",
      theme_dark: "Sombre",
      theme_auto: "Système",

      hist_dict: "Recherches récentes",
      hist_ai: "Traductions récentes",
      hist_clear: "Effacer",

      update_title: "Nouvelle version disponible",
      update_msg: "La version {v} est disponible. Télécharger ?",
      update_download: "Télécharger",
      update_later: "Plus tard",

      pop_lib: "Dictionnaire",
      pop_miss: "« {w} » absent du dictionnaire.",
      pop_no_zh: "Aucune correspondance chinoise trouvée.",
      pop_ipa_missing: "API manquante, à vérifier",
      "ipa_only_note": "Mot absent du dictionnaire ; voici sa transcription phonétique.",
      "ipa_missing_words": "Sans transcription :",
      "ipa_sentence_hint": "Saisissez une phrase pour obtenir l'API et les liaisons",
      "conj_form": "forme conjuguée",
      "conj_full": "Tableau complet de « {w} »",
      "conj_loading": "Chargement des conjugaisons…",
      "conj_inf": "infinitif",
      "conj_ppres": "participe présent",
      "conj_ppasse": "participe passé",
      "conj_nonfinite": "formes non personnelles",
      "conj_lemma": "infinitif",
    },

    en: {
      app_name: "Chinese–French Dictionary",
      app_sub: "Chinese · French · IPA and liaison",
      nav_dict: "Dictionary",
      nav_ai: "Translate",

      search_ph: "Chinese or French word",
      search_clear: "Clear",
      search_hint: "e.g. 水 / livre / 学生 / maison",
      empty_title: "Not found",
      empty_sub: "Try another wording, or a single character.",

      foot_count: "{n} entries",
      foot_count1: "{n} results",
      foot_none: "0 results",
      foot_ai: "AI translation · {n} entries available",

      detail_pinyin: "Pinyin",
      detail_trad: "Traditional",
      detail_ipa: "IPA",
      detail_pos: "Part of speech",
      detail_example: "Examples",
      detail_more: "View full entry ›",

      fam_starts: "Starting with “{w}”",
      fam_contains: "Containing “{w}”",

      fr_hero_label: "Chinese equivalent",
      vi_gloss_label: "Senses",

      lia_title: "Liaison",
      lia_obligatoire: "required",
      lia_facultative: "optional",
      lia_interdite: "forbidden",
      lia_none: "no liaison",
      ipa_pending: "to verify",

      ai_dir_fr2zh: "FR → ZH",
      ai_dir_zh2fr: "ZH → FR",
      ai_script_hans: "Simplified",
      ai_script_hant: "Traditional",
      ai_src_ph_zh2fr: "Type Chinese, translate into French…",
      ai_src_ph_fr2zh: "Entrez le français… (translate into Chinese)",
      ai_go: "Translate",
      ai_busy: "Translating…",
      ai_copy: "Copy",
      ai_copied: "Copied",
      ai_again: "Translate again",
      ai_sample: "Sample",
      ai_clear: "Clear",
      ai_out_fr: "French",
      ai_out_zh: "Simplified Chinese",
      ai_out_zh_hant: "Traditional Chinese",
      ai_tip: "Hover a word (tap on mobile) to look it up in the dictionary.",
      ai_err_title: "Translation failed: {msg}",
      ai_err_hint: "Check your network or try again later. The free public Index-Translate API is used by default.",
      ai_err_timeout: "Request timed out, no response from the service.",
      ai_offline: "Word-by-word from dictionary",
      ai_out_offline: "Word-by-word · not a translation",
      ai_len_warn: "{n} characters (long)",

      ai_cfg: "Translation settings",
      ai_cfg_base: "Service URL",
      ai_cfg_model: "Model",
      ai_cfg_key: "API Key",
      ai_cfg_save: "Save",
      ai_cfg_saved: "Saved",
      ai_cfg_reset: "Reset",
      ai_cfg_note: "Uses the free public Index-Translate API (OpenAI-compatible) by default. Only this API is allowed.",

      lang_label: "Interface language",
      theme_label: "Appearance",
      theme_light: "Light",
      theme_dark: "Dark",
      theme_auto: "System",

      hist_dict: "Recent searches",
      hist_ai: "Recent translations",
      hist_clear: "Clear",

      update_title: "New version available",
      update_msg: "Version {v} is available. Download?",
      update_download: "Download",
      update_later: "Later",

      pop_lib: "Dictionary",
      pop_miss: "“{w}” is not in the dictionary.",
      pop_no_zh: "No Chinese equivalent found.",
      pop_ipa_missing: "IPA missing, to verify",
      ipa_only_note: "Not in the dictionary; phonetic transcription shown below.",
      ipa_missing_words: "No transcription for:",
      ipa_sentence_hint: "Enter a sentence to get IPA and liaisons",
      "conj_form": "conjugated form",
      "conj_full": "Full conjugation of “{w}”",
      "conj_loading": "Loading conjugation data…",
      "conj_inf": "infinitive",
      "conj_ppres": "present participle",
      "conj_ppasse": "past participle",
      "conj_nonfinite": "non-finite forms",
      "conj_lemma": "infinitive",
    }
  };

  var NAMES = {
    hans: "简体中文",
    hant: "繁體中文",
    fr: "Français",
    en: "English"
  };

  var LANG_ATTR = {
    hans: "zh-Hans", hant: "zh-Hant", fr: "fr", en: "en"
  };

  var KEY = "hanfr.ui.lang";
  var cur = "hans";

  function detect() {
    try {
      var saved = localStorage.getItem(KEY);
      if (saved && DICT[saved]) return saved;
    } catch (e) {}
    var nav = (navigator.language || "zh").toLowerCase();
    if (nav.indexOf("zh") === 0) {
      return (nav.indexOf("hant") > -1 || nav.indexOf("tw") > -1 ||
              nav.indexOf("hk") > -1 || nav.indexOf("mo") > -1) ? "hant" : "hans";
    }
    if (nav.indexOf("fr") === 0) return "fr";
    if (nav.indexOf("en") === 0) return "en";
    return "en";
  }

  function t(key, vars) {
    var s = (DICT[cur] && DICT[cur][key]) || (DICT.hans && DICT.hans[key]) || key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.replace(new RegExp("\\{" + k + "\\}", "g"), String(vars[k]));
      });
    }
    return s;
  }

  function apply() {
    document.documentElement.setAttribute("lang", LANG_ATTR[cur] || "zh-Hans");
    document.documentElement.setAttribute("data-lang", cur);

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph")));
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });

    var btn = document.getElementById("langBtn");
    if (btn) btn.textContent = NAMES[cur] || cur;
    var list = document.getElementById("langlist");
    if (list) {
      Array.prototype.forEach.call(list.children, function (b) {
        var on = b.getAttribute("data-lang") === cur;
        b.classList.toggle("on", on);
        b.setAttribute("aria-current", on ? "true" : "false");
      });
    }
  }

  function setLang(l) {
    if (!DICT[l]) return;
    cur = l;
    try { localStorage.setItem(KEY, l); } catch (e) {}
    apply();
    document.dispatchEvent(new CustomEvent("langchange", { detail: { lang: l } }));
  }

  function lang() { return cur; }

  cur = detect();

  window.I18N = {
    t: t, apply: apply, setLang: setLang, lang: lang,
    names: NAMES, langs: Object.keys(DICT), DICT: DICT
  };
  window.t = t;
})();