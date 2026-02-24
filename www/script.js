const state = {
  quranReady: false,
  surahs: [],
  flatAyahs: [],
  speed: 28, // px/s for reading auto-scroll
  readFontSize: 28,
  listenFontSize: 28,
  themeMode: "auto", // normal | night | auto
  recitationMode: "ayah", // ayah | surah
  currentView: "home",
  read: {
    started: false,
    running: false,
    rafId: null,
    lastTs: 0,
    velocity: 0,
    smoothedDelta: 0,
  },
  ramadan: {
    started: false,
    running: false,
    rafId: null,
    lastTs: 0,
    velocity: 0,
    smoothedDelta: 0,
    currentJuz: 1,
    allowedJuzByDate: 0,
    highestCompletedJuz: 0,
    juzCompleted: false,
    progressHijriYear: 0,
  },
  listen: {
    started: false,
    running: false,
    ayahIndex: 0,
    reciter: "Yasser_Ad-Dussary_128kbps",
    consecutiveFailures: 0,
    transitionInProgress: false,
    playMode: "ayah", // ayah | surah
    currentSurahNumber: 1,
    initialSurahNumber: 1,
    startAyahInSurah: 1,
    lastScrolledAyahInSurah: 0,
    surahResumeAttempts: 0,
    surahRatios: [],
    surahTimingsMs: [],
    usesExactTimings: false,
    timingsCache: {},
    preloadToken: 0,
    preloadedIndex: -1,
    preloadedUrl: "",
    preloadedSource: "unknown",
  },
  quranSource: "unknown", // local | online
  audioSource: "unknown", // local | online
  downloads: {
    quranInProgress: false,
    reciterInProgress: false,
    reciterCancelRequested: false,
    reciterAbortController: null,
  },
  offlineAudioIndex: {
    reciters: new Set(),
    ayahsByReciter: new Map(),
  },
};

function createAudioPlayer() {
  const player = new Audio();
  player.preload = "auto";
  return player;
}

let activePlayer = createAudioPlayer();
let bufferPlayer = createAudioPlayer();
let surahRecoveryTimer = null;

const homeView = document.getElementById("homeView");
const readView = document.getElementById("readView");
const listenView = document.getElementById("listenView");
const ramadanView = document.getElementById("ramadanView");
const readBtn = document.getElementById("readBtn");
const readListenBtn = document.getElementById("readListenBtn");
const ramadanBtn = document.getElementById("ramadanBtn");
const ramadanDecor = document.getElementById("ramadanDecor");
const homeGreeting = document.querySelector(".home-greeting");
const homeSettingsBtn = document.getElementById("homeSettingsBtn");
const backHomeFromReadBtn = document.getElementById("backHomeFromReadBtn");
const backHomeFromListenBtn = document.getElementById("backHomeFromListenBtn");
const backHomeFromRamadanBtn = document.getElementById("backHomeFromRamadanBtn");
const readSettingsBtn = document.getElementById("readSettingsBtn");
const listenSettingsBtn = document.getElementById("listenSettingsBtn");
const ramadanSettingsBtn = document.getElementById("ramadanSettingsBtn");

const settingsDialog = document.getElementById("settingsDialog");
const speedSettingRow = document.getElementById("speedSettingRow");
const fontSettingRow = document.getElementById("fontSettingRow");
const recitationModeSettingRow = document.getElementById("recitationModeSettingRow");
const listenSelectionsSettingsSection = document.getElementById("listenSelectionsSettingsSection");
const speedRange = document.getElementById("speedRange");
const fontRange = document.getElementById("fontRange");
const themeModeSelect = document.getElementById("themeModeSelect");
const recitationModeSelect = document.getElementById("recitationModeSelect");
const recitationModeBadge = document.getElementById("recitationModeBadge");
const reciterSelect = document.getElementById("reciterSelect");
const listenSurahSelect = document.getElementById("listenSurahSelect");
const listenAyahInput = document.getElementById("listenAyahInput");
const listenAyahSelectOffline = document.getElementById("listenAyahSelectOffline");

const readStatusText = document.getElementById("readStatusText");
const readReaderArea = document.getElementById("readReaderArea");
const readAyahList = document.getElementById("readAyahList");
const readStartBtn = document.getElementById("readStartBtn");
const readStopBtn = document.getElementById("readStopBtn");
const readContinueBtn = document.getElementById("readContinueBtn");
const readResetBtn = document.getElementById("readResetBtn");
const readSurahSettingRow = document.getElementById("readSurahSettingRow");
const readAyahSettingRow = document.getElementById("readAyahSettingRow");
const readSurahSelect = document.getElementById("readSurahSelect");
const readAyahInput = document.getElementById("readAyahInput");

const ramadanInfoBadge = document.getElementById("ramadanInfoBadge");
const ramadanStatusText = document.getElementById("ramadanStatusText");
const ramadanReaderArea = document.getElementById("ramadanReaderArea");
const ramadanAyahList = document.getElementById("ramadanAyahList");
const ramadanStartBtn = document.getElementById("ramadanStartBtn");
const ramadanStopBtn = document.getElementById("ramadanStopBtn");
const ramadanContinueBtn = document.getElementById("ramadanContinueBtn");
const ramadanResetBtn = document.getElementById("ramadanResetBtn");
const ramadanNextJuzBtn = document.getElementById("ramadanNextJuzBtn");

const listenStatusText = document.getElementById("listenStatusText");
const listenReaderArea = document.getElementById("listenReaderArea");
const listenAyahList = document.getElementById("listenAyahList");
const listenStartBtn = document.getElementById("listenStartBtn");
const listenStopBtn = document.getElementById("listenStopBtn");
const listenContinueBtn = document.getElementById("listenContinueBtn");
const listenResetBtn = document.getElementById("listenResetBtn");

const THEME_STORAGE_KEY = "quran-theme-mode";
const RECITATION_MODE_STORAGE_KEY = "quran-recitation-mode";
const READ_SELECTION_STORAGE_KEY = "quran-read-selection-v1";
const RAMADAN_PROGRESS_STORAGE_KEY = "quran-ramadan-progress-v1";
const QURAN_JSON_STORAGE_KEY = "quran-uthmani-offline-json-v2";
const OFFLINE_CACHE_NAME = "quran-offline-v2";
const OFFLINE_QURAN_JSON_URL = "./offline-data/quran-uthmani.json";
const QURAN_API_URL = "https://raw.githubusercontent.com/onattech/QuranJSON/master/ayahobject.json";
const RECITER_AUDIO_PREFIX = "https://everyayah.com/data/";
const DEFAULT_TOAST_DURATION_MS = 2000;
const IMPORTANT_TOAST_DURATION_MS = 4000;
const PERIODIC_MAINTENANCE_MS = 5 * 60 * 1000;
const systemThemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
const downloadQuranBtn = document.getElementById("downloadQuranBtn");
const downloadReciterBtn = document.getElementById("downloadReciterBtn");
const offlineReciterSelect = document.getElementById("offlineReciterSelect");
const openStorageManagerBtn = document.getElementById("openStorageManagerBtn");
const openOfflineLogBtn = document.getElementById("openOfflineLogBtn");
const offlineSettingsSection = document.getElementById("offlineSettingsSection");
const reciterOfflineSettingRow = document.getElementById("reciterOfflineSettingRow");
const offlineStartSurahSelect = document.getElementById("offlineStartSurahSelect");
const offlineEndSurahSelect = document.getElementById("offlineEndSurahSelect");
const offlineDownloadStatus = document.getElementById("offlineDownloadStatus");
const storageManagerDialog = document.getElementById("storageManagerDialog");
const deleteQuranDataChk = document.getElementById("deleteQuranDataChk");
const deleteReciterDataChk = document.getElementById("deleteReciterDataChk");
const deleteQuranDataMeta = document.getElementById("deleteQuranDataMeta");
const deleteReciterDataMeta = document.getElementById("deleteReciterDataMeta");
const deleteSelectedDataBtn = document.getElementById("deleteSelectedDataBtn");
const offlineLogDialog = document.getElementById("offlineLogDialog");
const offlineLogSummary = document.getElementById("offlineLogSummary");
const offlineLogReciterFilter = document.getElementById("offlineLogReciterFilter");
const offlineLogReciters = document.getElementById("offlineLogReciters");
const offlineLogSurahs = document.getElementById("offlineLogSurahs");
const offlineLogAyahs = document.getElementById("offlineLogAyahs");
const toastContainer = document.getElementById("toastContainer");
const settingsToastContainer = document.getElementById("settingsToastContainer");
const downloadProgressBox = document.getElementById("downloadProgressBox");
const downloadProgressTitle = document.getElementById("downloadProgressTitle");
const downloadProgressPercent = document.getElementById("downloadProgressPercent");
const downloadProgressBar = document.getElementById("downloadProgressBar");
const downloadProgressMeta = document.getElementById("downloadProgressMeta");
const managedDialogs = [settingsDialog, storageManagerDialog, offlineLogDialog].filter(Boolean);

let toastQueue = [];
let isToastActive = false;
let ramadanDayTimer = null;

const RAMADAN_JUZ_STARTS = [
  { surah: 1, ayah: 1 },
  { surah: 2, ayah: 142 },
  { surah: 2, ayah: 253 },
  { surah: 3, ayah: 93 },
  { surah: 4, ayah: 24 },
  { surah: 4, ayah: 148 },
  { surah: 5, ayah: 82 },
  { surah: 6, ayah: 111 },
  { surah: 7, ayah: 88 },
  { surah: 8, ayah: 41 },
  { surah: 9, ayah: 93 },
  { surah: 11, ayah: 6 },
  { surah: 12, ayah: 53 },
  { surah: 15, ayah: 1 },
  { surah: 17, ayah: 1 },
  { surah: 18, ayah: 75 },
  { surah: 21, ayah: 1 },
  { surah: 23, ayah: 1 },
  { surah: 25, ayah: 21 },
  { surah: 27, ayah: 56 },
  { surah: 29, ayah: 46 },
  { surah: 33, ayah: 31 },
  { surah: 36, ayah: 28 },
  { surah: 39, ayah: 32 },
  { surah: 41, ayah: 47 },
  { surah: 46, ayah: 1 },
  { surah: 51, ayah: 31 },
  { surah: 58, ayah: 1 },
  { surah: 67, ayah: 1 },
  { surah: 78, ayah: 1 },
];

function safeAddEventListener(element, eventName, handler) {
  if (!element) return;
  element.addEventListener(eventName, handler);
}

function getEffectiveTheme(mode) {
  if (mode === "night") return "night";
  if (mode === "normal") return "normal";
  return systemThemeMediaQuery.matches ? "night" : "normal";
}

function applyTheme(mode) {
  const effectiveTheme = getEffectiveTheme(mode);
  state.themeMode = mode;
  document.documentElement.dataset.theme = effectiveTheme;
}

function loadThemeMode() {
  try {
    const storedMode = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedMode === "normal" || storedMode === "night" || storedMode === "auto") {
      return storedMode;
    }
  } catch (_error) {
    // Ignore storage failures and keep default mode.
  }
  return "auto";
}

function saveThemeMode(mode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch (_error) {
    // Ignore storage failures.
  }
}

function initThemeMode() {
  const initialMode = loadThemeMode();
  applyTheme(initialMode);
  if (themeModeSelect) {
    themeModeSelect.value = initialMode;
  }
}

function loadRecitationMode() {
  try {
    const storedMode = localStorage.getItem(RECITATION_MODE_STORAGE_KEY);
    if (storedMode === "ayah") {
      return storedMode;
    }
  } catch (_error) {
    // Ignore storage failures and keep default mode.
  }
  return "ayah";
}

function saveRecitationMode(mode) {
  try {
    localStorage.setItem(RECITATION_MODE_STORAGE_KEY, mode);
  } catch (_error) {
    // Ignore storage failures.
  }
}

function initRecitationMode() {
  const initialMode = loadRecitationMode();
  state.recitationMode = initialMode;
  state.listen.playMode = initialMode;
  if (recitationModeSelect) {
    const surahModeOption = recitationModeSelect.querySelector('option[value="surah"]');
    if (surahModeOption) {
      surahModeOption.disabled = true;
    }
        recitationModeSelect.value = initialMode;
  }
  updateRecitationModeBadge();
}

function updateRecitationModeBadge() {
  if (!recitationModeBadge) return;
  const label = state.recitationMode === "surah" ? "سورة كاملة" : "آية-آية";
  recitationModeBadge.textContent = `نمط القراءة: ${label}`;
}

function setOfflineStatus(message, isError = false) {
  if (!offlineDownloadStatus) return;
  if (!message) {
    offlineDownloadStatus.textContent = "";
    offlineDownloadStatus.classList.add("hidden");
    offlineDownloadStatus.dataset.error = "0";
    return;
  }
  offlineDownloadStatus.textContent = message;
  offlineDownloadStatus.classList.remove("hidden");
  offlineDownloadStatus.dataset.error = isError ? "1" : "0";
}

function createToastElement(message, type) {
  const toast = document.createElement("div");
  toast.className = "toast";
  if (type === "success") toast.classList.add("success");
  if (type === "error") toast.classList.add("error");
  toast.textContent = message;
  return toast;
}

function shouldUseSettingsToastContainer() {
  return Boolean(settingsDialog?.open && settingsToastContainer);
}

function getToastDurationByType(type) {
  if (type === "error" || type === "warning") return IMPORTANT_TOAST_DURATION_MS;
  return DEFAULT_TOAST_DURATION_MS;
}

function processToastQueue() {
  if (isToastActive || toastQueue.length === 0) return;

  const nextToast = toastQueue.shift();
  const container = shouldUseSettingsToastContainer() ? settingsToastContainer : toastContainer;
  if (!container) {
    isToastActive = false;
    window.setTimeout(processToastQueue, 0);
    return;
  }

  isToastActive = true;
  const toast = createToastElement(nextToast.message, nextToast.type);
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  window.setTimeout(() => {
    toast.classList.remove("show");
    window.setTimeout(() => {
      toast.remove();
      isToastActive = false;
      processToastQueue();
    }, 220);
  }, nextToast.durationMs);
}

function showToast(message, type = "info") {
  if (!message) return;
  toastQueue.push({
    message,
    type,
    durationMs: getToastDurationByType(type),
  });
  processToastQueue();
}

function blockIfOffline(actionText) {
  if (navigator.onLine) return false;
  const message = `ممنوع ${actionText} بدون اتصال بالإنترنت.`;
  setOfflineStatus(message, true);
  showToast(message, "error", 3600);
  return true;
}

function setOfflineButtonsDisabled(disabled) {
  if (downloadQuranBtn) downloadQuranBtn.disabled = disabled;
  if (downloadReciterBtn) {
    downloadReciterBtn.disabled = disabled && !state.downloads.reciterInProgress;
  }
  if (openStorageManagerBtn) openStorageManagerBtn.disabled = disabled;
  if (openOfflineLogBtn) openOfflineLogBtn.disabled = disabled;
  if (offlineStartSurahSelect) offlineStartSurahSelect.disabled = disabled;
  if (offlineEndSurahSelect) offlineEndSurahSelect.disabled = disabled;
}

function syncReciterDownloadButton() {
  if (!downloadReciterBtn) return;
  downloadReciterBtn.textContent = state.downloads.reciterInProgress
    ? "إيقاف تحميل صوت القارئ"
    : "تحميل صوت القارئ";
}

function getOfflineReciterForDownload() {
  const selected = offlineReciterSelect?.value;
  if (selected) return selected;
  return state.listen.reciter;
}

function getReciterDisplayName(reciterCode) {
  const optionFromListen = [...(reciterSelect?.options || [])].find(
    (option) => option.value === reciterCode
  );
  if (optionFromListen?.textContent) return optionFromListen.textContent.trim();

  const optionFromOffline = [...(offlineReciterSelect?.options || [])].find(
    (option) => option.value === reciterCode
  );
  if (optionFromOffline?.textContent) return optionFromOffline.textContent.trim();

  return reciterCode;
}

function getSurahDisplayName(surahNumber) {
  const surah = state.surahs.find((item) => item.number === surahNumber);
  return surah?.name || `سورة ${surahNumber}`;
}

function populateReadSurahSelect() {
  if (!readSurahSelect) return;
  readSurahSelect.innerHTML = '<option value="">من البداية</option>';
  for (const surah of state.surahs) {
    const option = document.createElement("option");
    option.value = String(surah.number);
    option.textContent = `${surah.number}. ${surah.name}`;
    readSurahSelect.appendChild(option);
  }
}

function updateReadAyahInputLimits() {
  if (!readAyahInput || !readSurahSelect) return;
  const surahNumber = Number(readSurahSelect.value || 0);
  if (!surahNumber) {
    readAyahInput.value = "";
    readAyahInput.placeholder = "1";
    readAyahInput.removeAttribute("max");
    return;
  }
  const surah = state.surahs.find((item) => item.number === surahNumber);
  const maxAyah = surah?.ayahs?.length || 1;
  readAyahInput.max = String(maxAyah);
  readAyahInput.placeholder = `1 - ${maxAyah}`;
  const selectedAyah = Number(readAyahInput.value || 1);
  const safeAyah = Number.isFinite(selectedAyah) ? Math.max(1, Math.min(maxAyah, selectedAyah)) : 1;
  readAyahInput.value = String(safeAyah);
}

function saveReadSelectionToStorage(surahNumber, ayahNumber) {
  try {
    localStorage.setItem(
      READ_SELECTION_STORAGE_KEY,
      JSON.stringify({ surahNumber, ayahNumber })
    );
  } catch (_error) {
    // Ignore storage write failures.
  }
}

function loadReadSelectionFromStorage() {
  try {
    const raw = localStorage.getItem(READ_SELECTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const surahNumber = Number(parsed?.surahNumber || 0);
    const ayahNumber = Number(parsed?.ayahNumber || 1);
    if (!Number.isFinite(surahNumber) || surahNumber < 0 || surahNumber > 114) return null;
    if (!Number.isFinite(ayahNumber) || ayahNumber < 1) return null;
    return { surahNumber, ayahNumber };
  } catch (_error) {
    return null;
  }
}

function applyReadSelection(surahNumber, ayahNumber, behavior = "auto") {
  if (!readReaderArea || !readAyahList) return;
  if (!surahNumber) {
    readReaderArea.scrollTo({ top: 0, behavior });
    saveReadSelectionToStorage(0, 1);
    return;
  }

  const targetIndex = getFlatIndexForSurahAyah(surahNumber, ayahNumber);
  if (targetIndex < 0) return;
  const targetAyah = readAyahList.querySelector(`[data-ayah-index="${targetIndex}"]`);
  if (!targetAyah) return;
  scrollElementIntoReaderArea(readReaderArea, targetAyah, behavior);
  saveReadSelectionToStorage(surahNumber, ayahNumber);
}

function getIslamicDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-u-ca-islamic", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
  const parts = formatter.formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    day: Number(byType.day || 0),
    month: Number(byType.month || 0),
    year: Number(byType.year || 0),
  };
}

function getAllowedJuzByDate(date = new Date()) {
  const islamic = getIslamicDateParts(date);
  if (islamic.month < 9) return 0;
  if (islamic.month > 9) return 30;
  return Math.max(1, Math.min(30, islamic.day));
}

function isRamadanMonth(date = new Date()) {
  return getIslamicDateParts(date).month === 9;
}

function getSeasonalState(date = new Date()) {
  const islamic = getIslamicDateParts(date);
  const inRamadan = islamic.month === 9;
  const inEidFitr = islamic.month === 10 && islamic.day >= 1 && islamic.day <= 3;
  const inEidAdha = islamic.month === 12 && islamic.day >= 10 && islamic.day <= 13;

  if (inRamadan) {
    return {
      kind: "ramadan",
      inRamadan: true,
      shouldShowDecor: true,
      homeGreetingText: "كل عام وانتم بخير رمضان مبارك على الجميع",
      homeGreetingTitle: "",
      ramadanButtonTitle: "",
      decorFilter: "",
    };
  }

  if (inEidFitr) {
    return {
      kind: "eid-fitr",
      inRamadan: false,
      shouldShowDecor: true,
      homeGreetingText: "كل عام وانتم بخير عيد الفطر مبارك علينا وعليكم",
      homeGreetingTitle: "عيد الفطر المبارك",
      ramadanButtonTitle: "متاح فقط في شهر رمضان",
      decorFilter: "hue-rotate(18deg) saturate(1.25)",
    };
  }

  if (inEidAdha) {
    return {
      kind: "eid-adha",
      inRamadan: false,
      shouldShowDecor: true,
      homeGreetingText: "كل عام وانتم بخير عيد اضحى مبارك علينا وعليكم",
      homeGreetingTitle: "عيد الأضحى المبارك",
      ramadanButtonTitle: "متاح فقط في شهر رمضان",
      decorFilter: "hue-rotate(-14deg) saturate(1.35)",
    };
  }

  return {
    kind: "default",
    inRamadan: false,
    shouldShowDecor: false,
    homeGreetingText: "كل عام وانتم بخير رمضان مبارك على الجميع",
    homeGreetingTitle: "",
    ramadanButtonTitle: "متاح فقط في شهر رمضان",
    decorFilter: "",
  };
}

function getRamadanProgressFromStorage() {
  try {
    const raw = localStorage.getItem(RAMADAN_PROGRESS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const highestCompletedJuz = Number(parsed?.highestCompletedJuz || 0);
    const currentJuz = Number(parsed?.currentJuz || 1);
    const scrollTop = Number(parsed?.scrollTop || 0);
    const hijriYear = Number(parsed?.hijriYear || 0);
    return {
      highestCompletedJuz: Math.max(0, Math.min(30, highestCompletedJuz)),
      currentJuz: Math.max(1, Math.min(30, currentJuz)),
      scrollTop: Number.isFinite(scrollTop) ? Math.max(0, scrollTop) : 0,
      hijriYear: Number.isFinite(hijriYear) ? Math.max(0, hijriYear) : 0,
    };
  } catch (_error) {
    return null;
  }
}

function saveRamadanProgressToStorage() {
  try {
    if (!state.ramadan.progressHijriYear) {
      state.ramadan.progressHijriYear = getIslamicDateParts().year;
    }
    localStorage.setItem(
      RAMADAN_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        highestCompletedJuz: state.ramadan.highestCompletedJuz,
        currentJuz: state.ramadan.currentJuz,
        scrollTop: ramadanReaderArea?.scrollTop || 0,
        hijriYear: state.ramadan.progressHijriYear,
      })
    );
  } catch (_error) {
    // Ignore storage write failures.
  }
}

function resetRamadanProgressForYear(hijriYear) {
  state.ramadan.highestCompletedJuz = 0;
  state.ramadan.currentJuz = 1;
  state.ramadan.juzCompleted = false;
  state.ramadan.progressHijriYear = hijriYear;
  saveRamadanProgressToStorage();
}

function syncRamadanButtonAvailability() {
  if (!ramadanBtn) return;
  const islamic = getIslamicDateParts();
  const seasonal = getSeasonalState();
  const inRamadan = seasonal.inRamadan;
  ramadanBtn.disabled = !inRamadan;
  ramadanBtn.title = inRamadan ? "" : seasonal.ramadanButtonTitle;
  document.body.classList.toggle("ramadan-season", seasonal.shouldShowDecor);
  document.body.classList.toggle("eid-fitr-season", seasonal.kind === "eid-fitr");
  document.body.classList.toggle("eid-adha-season", seasonal.kind === "eid-adha");
  if (homeGreeting) {
    homeGreeting.textContent = seasonal.homeGreetingText;
    homeGreeting.title = seasonal.homeGreetingTitle;
  }
  if (ramadanDecor) {
    ramadanDecor.classList.toggle("hidden", !seasonal.shouldShowDecor);
    ramadanDecor.style.filter = seasonal.decorFilter || "";
  }

  if (!inRamadan && state.currentView === "ramadan") {
    backToHome();
    showToast("انتهى رمضان. سيتم تفعيل الختمة تلقائيًا عند بداية رمضان القادم.");
  }

  if (inRamadan) {
    const stored = getRamadanProgressFromStorage();
    if (!stored || stored.hijriYear !== islamic.year) {
      resetRamadanProgressForYear(islamic.year);
    }
  }
}

function getJuzBoundaries(juzNumber) {
  if (juzNumber < 1 || juzNumber > 30) return null;
  const startInfo = RAMADAN_JUZ_STARTS[juzNumber - 1];
  const nextInfo = juzNumber < 30 ? RAMADAN_JUZ_STARTS[juzNumber] : null;
  const startIndex = getFlatIndexForSurahAyah(startInfo.surah, startInfo.ayah);
  const endIndex = nextInfo
    ? getFlatIndexForSurahAyah(nextInfo.surah, nextInfo.ayah) - 1
    : state.flatAyahs.length - 1;
  if (startIndex < 0 || endIndex < startIndex) return null;
  return { startIndex, endIndex, startInfo };
}

function compressAyahNumbers(ayahNumbers) {
  const sorted = [...ayahNumbers].sort((a, b) => a - b);
  if (!sorted.length) return "";
  const ranges = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    if (current === end + 1) {
      end = current;
      continue;
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    start = current;
    end = current;
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join("، ");
}

function setOfflineLogSectionHtml(target, html) {
  if (!target) return;
  target.innerHTML = html;
}

function setOfflineLogSectionText(target, message) {
  if (!target) return;
  target.textContent = message;
}

function resetDownloadProgressUI() {
  if (!downloadProgressBox || !downloadProgressBar || !downloadProgressPercent || !downloadProgressMeta) {
    return;
  }
  downloadProgressBox.classList.add("hidden");
  downloadProgressBar.value = 0;
  downloadProgressPercent.textContent = "0%";
  downloadProgressMeta.textContent = "في انتظار البدء...";
  if (downloadProgressTitle) {
    downloadProgressTitle.textContent = "حالة التنزيل";
  }
}

function updateDownloadProgressUI(title, processed, total, metaText = "") {
  if (!downloadProgressBox || !downloadProgressBar || !downloadProgressPercent || !downloadProgressMeta) {
    return;
  }
  downloadProgressBox.classList.remove("hidden");
  if (downloadProgressTitle) downloadProgressTitle.textContent = title;
  const safeTotal = Math.max(1, total);
  const percent = Math.max(0, Math.min(100, Math.round((processed / safeTotal) * 100)));
  downloadProgressBar.value = percent;
  downloadProgressPercent.textContent = `${percent}%`;
  downloadProgressMeta.textContent = metaText || `${processed}/${total}`;
}

function hideDownloadProgressAfter(delayMs = 1400) {
  if (!downloadProgressBox) return;
  window.setTimeout(() => {
    if (state.downloads.quranInProgress || state.downloads.reciterInProgress) return;
    downloadProgressBox.classList.add("hidden");
  }, delayMs);
}

function buildSimpleListHtml(items) {
  if (!items.length) return '<p class="offline-log-empty">لا توجد بيانات محفوظة.</p>';
  return `<ul class="offline-log-list">${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function buildOfflineLogSectionHtml(items, sectionKey, initiallyVisible = 6) {
  if (!items.length) return '<p class="offline-log-empty">لا توجد بيانات محفوظة.</p>';
  if (items.length <= initiallyVisible) {
    return `<ul class="offline-log-list">${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
  }

  const initialItems = items.slice(0, initiallyVisible);
  const remainingItems = items.slice(initiallyVisible);
  return [
    `<ul class="offline-log-list">`,
    initialItems.map((item) => `<li>${item}</li>`).join(""),
    remainingItems.map((item) => `<li data-more-item="1" hidden>${item}</li>`).join(""),
    `</ul>`,
    `<button type="button" data-more-toggle="${sectionKey}" data-expanded="false">المزيد</button>`,
  ].join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function handleOfflineLogMoreToggle(event) {
  const button = event.target?.closest?.("button[data-more-toggle]");
  if (!button) return;
  const listRoot = button.parentElement;
  if (!listRoot) return;
  const hiddenItems = listRoot.querySelectorAll("li[data-more-item]");
  if (!hiddenItems.length) return;

  const isExpanded = button.dataset.expanded === "true";
  hiddenItems.forEach((item) => {
    item.hidden = isExpanded;
  });
  button.dataset.expanded = isExpanded ? "false" : "true";
  button.textContent = isExpanded ? "المزيد" : "إخفاء";
}

async function renderOfflineLogDialog() {
  setOfflineLogSectionText(offlineLogReciters, "جاري الفحص...");
  setOfflineLogSectionText(offlineLogSurahs, "جاري الفحص...");
  setOfflineLogSectionText(offlineLogAyahs, "جاري الفحص...");
  if (offlineLogSummary) offlineLogSummary.textContent = "جاري الفحص...";

  await rebuildOfflineAudioIndex();
  const reciters = [...state.offlineAudioIndex.reciters].sort();
  const selectedFilter = offlineLogReciterFilter?.value || "all";

  if (offlineLogReciterFilter) {
    const previous = selectedFilter;
    offlineLogReciterFilter.innerHTML = '<option value="all">كل القُرّاء</option>';
    for (const reciterCode of reciters) {
      const option = document.createElement("option");
      option.value = reciterCode;
      option.textContent = getReciterDisplayName(reciterCode);
      offlineLogReciterFilter.appendChild(option);
    }
    if ([...offlineLogReciterFilter.options].some((opt) => opt.value === previous)) {
      offlineLogReciterFilter.value = previous;
    }
  }

  const effectiveFilter = offlineLogReciterFilter?.value || "all";
  const visibleReciters =
    effectiveFilter === "all" ? reciters : reciters.filter((reciter) => reciter === effectiveFilter);

  const reciterItems = visibleReciters.map((reciterCode) => getReciterDisplayName(reciterCode));
  setOfflineLogSectionHtml(
    offlineLogReciters,
    buildOfflineLogSectionHtml(reciterItems.map((item) => escapeHtml(item)), "reciters", 4)
  );

  if (!visibleReciters.length) {
    setOfflineLogSectionHtml(
      offlineLogSurahs,
      '<p class="offline-log-empty">لا توجد سور محفوظة.</p>'
    );
    setOfflineLogSectionHtml(
      offlineLogAyahs,
      '<p class="offline-log-empty">لا توجد آيات محفوظة.</p>'
    );
    return;
  }

  const surahItems = [];
  const ayahItems = [];
  let totalSurahs = 0;
  let totalAyahs = 0;
  for (const reciterCode of visibleReciters) {
    const bySurah = state.offlineAudioIndex.ayahsByReciter.get(reciterCode) || new Map();
    const surahNumbers = [...bySurah.keys()].sort((a, b) => a - b);
    totalSurahs += surahNumbers.length;

    if (surahNumbers.length) {
      const namedSurahs = surahNumbers.map((number) => `${number}. ${getSurahDisplayName(number)}`);
      surahItems.push(
        `<strong>${escapeHtml(getReciterDisplayName(reciterCode))}:</strong> ${namedSurahs
          .map((item) => escapeHtml(item))
          .join(" | ")}`
      );
    }

    for (const surahNumber of surahNumbers) {
      const ayahSet = bySurah.get(surahNumber) || new Set();
      totalAyahs += ayahSet.size;
      const ayahRangeText = compressAyahNumbers(ayahSet);
      ayahItems.push(
        `<strong>${escapeHtml(getReciterDisplayName(reciterCode))}</strong> - ${surahNumber}. ${escapeHtml(
          getSurahDisplayName(surahNumber)
        )}: ${escapeHtml(ayahRangeText)}`
      );
    }
  }

  setOfflineLogSectionHtml(offlineLogSurahs, buildOfflineLogSectionHtml(surahItems, "surahs", 6));
  setOfflineLogSectionHtml(offlineLogAyahs, buildOfflineLogSectionHtml(ayahItems, "ayahs", 8));
  if (offlineLogSummary) {
    offlineLogSummary.textContent = `القُرّاء: ${visibleReciters.length} | السور: ${totalSurahs} | الآيات: ${totalAyahs}`;
  }
}

async function openOfflineLogDialog() {
  if (!offlineLogDialog) return;
  await renderOfflineLogDialog();
  showManagedDialog(offlineLogDialog);
}

async function getReciterCachedRequests() {
  try {
    const cache = await caches.open(OFFLINE_CACHE_NAME);
    const requests = await cache.keys();
    return requests.filter((request) => request.url.startsWith(RECITER_AUDIO_PREFIX));
  } catch (_error) {
    return [];
  }
}

function parseCachedAyahUrl(url) {
  const match = /^https:\/\/everyayah\.com\/data\/([^/]+)\/(\d{3})(\d{3})\.mp3$/i.exec(url);
  if (!match) return null;
  return {
    reciter: match[1],
    surahNumber: Number(match[2]),
    ayahNumber: Number(match[3]),
  };
}

async function rebuildOfflineAudioIndex() {
  const reciters = new Set();
  const ayahsByReciter = new Map();

  try {
    const cache = await caches.open(OFFLINE_CACHE_NAME);
    const requests = await cache.keys();
    for (const request of requests) {
      const parsed = parseCachedAyahUrl(request.url);
      if (!parsed) continue;

      reciters.add(parsed.reciter);
      if (!ayahsByReciter.has(parsed.reciter)) {
        ayahsByReciter.set(parsed.reciter, new Map());
      }
      const reciterMap = ayahsByReciter.get(parsed.reciter);
      if (!reciterMap.has(parsed.surahNumber)) {
        reciterMap.set(parsed.surahNumber, new Set());
      }
      reciterMap.get(parsed.surahNumber).add(parsed.ayahNumber);
    }
  } catch (_error) {
    // Ignore cache read failures and keep index empty.
  }

  state.offlineAudioIndex.reciters = reciters;
  state.offlineAudioIndex.ayahsByReciter = ayahsByReciter;
}

function getOfflineAyahSet(reciter, surahNumber) {
  const byReciter = state.offlineAudioIndex.ayahsByReciter.get(reciter);
  if (!byReciter) return new Set();
  return byReciter.get(surahNumber) || new Set();
}

function getLastSavedAyahPointForReciter(reciter) {
  const byReciter = state.offlineAudioIndex.ayahsByReciter.get(reciter);
  if (!byReciter || byReciter.size === 0) return null;

  const surahNumbers = [...byReciter.keys()].sort((a, b) => a - b);
  const lastSurah = surahNumbers[surahNumbers.length - 1];
  const ayahSet = byReciter.get(lastSurah);
  if (!ayahSet || ayahSet.size === 0) return null;

  const ayahs = [...ayahSet].sort((a, b) => a - b);
  return { surahNumber: lastSurah, ayahNumber: ayahs[ayahs.length - 1] };
}

function stopAtLastSavedPointIfNeeded() {
  if (navigator.onLine) return false;
  if (state.listen.playMode !== "ayah") return false;

  const currentAyah = state.flatAyahs[state.listen.ayahIndex];
  if (!currentAyah) return false;

  const lastPoint = getLastSavedAyahPointForReciter(state.listen.reciter);
  if (!lastPoint) return false;

  const reachedLastPoint =
    currentAyah.surahNumber === lastPoint.surahNumber &&
    currentAyah.ayahNumber === lastPoint.ayahNumber;
  if (!reachedLastPoint) return false;

  resetListenSession();
  showToast("تم الوصول إلى آخر سورة/آية محفوظة. تم إيقاف التشغيل وإعادة التعيين.", "success", 4200);
  return true;
}

function autoResetAfterListenFinished() {
  resetListenSession();
  listenStatusText.classList.remove("hidden");
  listenStatusText.textContent = "اكتملت التلاوة";
  showToast("اكتملت التلاوة", "success", 3600);
}

function isOfflineReciterAvailable(reciter) {
  return state.offlineAudioIndex.reciters.has(reciter);
}

function updateOfflineAyahSelector() {
  if (!listenAyahSelectOffline || !listenAyahInput || !listenSurahSelect) return;

  const isOffline = !navigator.onLine;
  listenAyahSelectOffline.classList.toggle("hidden", !isOffline);
  listenAyahInput.classList.toggle("hidden", isOffline);
  if (!isOffline) return;

  const surahNumber = Number(listenSurahSelect.value || 0);
  const ayahSet = getOfflineAyahSet(state.listen.reciter, surahNumber);
  const surah = state.surahs.find((item) => item.number === surahNumber);
  const maxAyah = surah?.ayahs?.length || 0;

  listenAyahSelectOffline.innerHTML = "";
  if (!surahNumber || !maxAyah) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "اختر سورة محفوظة";
    option.disabled = true;
    option.selected = true;
    listenAyahSelectOffline.appendChild(option);
    listenAyahSelectOffline.disabled = true;
    return;
  }

  let selectedValue = Number(listenAyahInput.value || 1);
  if (!Number.isFinite(selectedValue) || selectedValue < 1) selectedValue = 1;
  let hasSelectedAvailable = false;

  for (let i = 1; i <= maxAyah; i += 1) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = `الآية ${i}`;
    const available = ayahSet.has(i);
    option.disabled = !available;
    if (available && i === selectedValue) {
      option.selected = true;
      hasSelectedAvailable = true;
    }
    listenAyahSelectOffline.appendChild(option);
  }

  if (!hasSelectedAvailable) {
    const firstAvailable = [...ayahSet].sort((a, b) => a - b)[0] || 1;
    listenAyahSelectOffline.value = String(firstAvailable);
    listenAyahInput.value = String(firstAvailable);
  } else {
    listenAyahInput.value = String(selectedValue);
  }

  listenAyahSelectOffline.disabled = ayahSet.size === 0;
}

function updateOfflineListenAvailabilityUI() {
  const isOffline = !navigator.onLine;
  if (!reciterSelect || !listenSurahSelect || !listenAyahInput) return;

  for (const option of reciterSelect.options) {
    if (!option.value) continue;
    option.disabled = isOffline && !isOfflineReciterAvailable(option.value);
  }

  if (isOffline) {
    if (!isOfflineReciterAvailable(state.listen.reciter)) {
      const firstReciter = [...reciterSelect.options].find(
        (option) => option.value && !option.disabled
      );
      if (firstReciter) {
        reciterSelect.value = firstReciter.value;
        state.listen.reciter = firstReciter.value;
      }
    }

    for (const option of listenSurahSelect.options) {
      const surahNumber = Number(option.value || 0);
      if (!surahNumber) {
        option.disabled = true;
        continue;
      }
      option.disabled = getOfflineAyahSet(state.listen.reciter, surahNumber).size === 0;
    }

    const currentSurah = Number(listenSurahSelect.value || 0);
    if (!currentSurah || getOfflineAyahSet(state.listen.reciter, currentSurah).size === 0) {
      const firstSurah = [...listenSurahSelect.options].find(
        (option) => Number(option.value || 0) > 0 && !option.disabled
      );
      listenSurahSelect.value = firstSurah ? firstSurah.value : "";
    }
  } else {
    for (const option of reciterSelect.options) {
      option.disabled = false;
    }
    for (const option of listenSurahSelect.options) {
      option.disabled = false;
    }
  }

  updateAyahInputLimits();
  updateOfflineAyahSelector();
}

async function refreshOfflineListenAvailability() {
  await rebuildOfflineAudioIndex();
  updateOfflineListenAvailabilityUI();
}

async function refreshStorageManagerState() {
  if (
    !deleteQuranDataChk ||
    !deleteReciterDataChk ||
    !deleteQuranDataMeta ||
    !deleteReciterDataMeta ||
    !deleteSelectedDataBtn
  ) {
    return;
  }

  const hasQuranData = Boolean(loadQuranPayloadFromStorage());
  deleteQuranDataChk.checked = false;
  deleteQuranDataChk.disabled = !hasQuranData;
  deleteQuranDataMeta.textContent = hasQuranData ? "متوفر" : "غير متوفر";

  const reciterRequests = await getReciterCachedRequests();
  const reciterCount = reciterRequests.length;
  deleteReciterDataChk.checked = false;
  deleteReciterDataChk.disabled = reciterCount === 0;
  deleteReciterDataMeta.textContent = reciterCount > 0 ? `${reciterCount} ملف` : "غير متوفر";

  deleteSelectedDataBtn.disabled = !hasQuranData && reciterCount === 0;
}

function runPeriodicMaintenance() {
  try {
    // Self-heal corrupted stored Quran payload if browser extensions tamper with storage.
    const payload = loadQuranPayloadFromStorage();
    if (!payload) {
      localStorage.removeItem(QURAN_JSON_STORAGE_KEY);
    }
  } catch (_error) {
    localStorage.removeItem(QURAN_JSON_STORAGE_KEY);
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .getRegistration("./")
      .then((registration) => registration?.update())
      .catch(() => {});
  }

  syncRamadanButtonAvailability();
}

function lockBackgroundScroll() {
  if (document.body.classList.contains("dialog-open")) return;
  document.body.classList.add("dialog-open");
}

function unlockBackgroundScroll() {
  const anyDialogOpen = managedDialogs.some((dialog) => dialog?.open);
  if (anyDialogOpen) return;
  if (!document.body.classList.contains("dialog-open")) return;
  document.body.classList.remove("dialog-open");
}

function showManagedDialog(dialog) {
  if (!dialog) return;
  lockBackgroundScroll();
  dialog.showModal();
}

async function openStorageManagerDialog() {
  if (!storageManagerDialog) return;
  await refreshStorageManagerState();
  showManagedDialog(storageManagerDialog);
}

function normalizeQuranPayload(payload) {
  const surahs = payload?.data?.surahs || payload?.surahs;
  if (!Array.isArray(surahs) || surahs.length === 0) return null;
  return { surahs };
}

function saveQuranPayloadToStorage(payload) {
  const normalized = normalizeQuranPayload(payload);
  if (!normalized) return false;
  try {
    localStorage.setItem(QURAN_JSON_STORAGE_KEY, JSON.stringify(normalized));
    return true;
  } catch (_error) {
    return false;
  }
}

function loadQuranPayloadFromStorage() {
  try {
    const raw = localStorage.getItem(QURAN_JSON_STORAGE_KEY);
    if (!raw) return null;
    return normalizeQuranPayload(JSON.parse(raw));
  } catch (_error) {
    return null;
  }
}

function ensureOfflineSurahRangeOptions() {
  if (!offlineStartSurahSelect || !offlineEndSurahSelect) return;
  if (offlineStartSurahSelect.options.length > 0 && offlineEndSurahSelect.options.length > 0) return;
  for (let i = 1; i <= 114; i += 1) {
    const label = state.surahs.find((item) => item.number === i)?.name || `سورة ${i}`;
    const startOption = document.createElement("option");
    startOption.value = String(i);
    startOption.textContent = `${i}. ${label}`;
    offlineStartSurahSelect.appendChild(startOption);
    const endOption = document.createElement("option");
    endOption.value = String(i);
    endOption.textContent = `${i}. ${label}`;
    offlineEndSurahSelect.appendChild(endOption);
  }
  offlineStartSurahSelect.value = "1";
  offlineEndSurahSelect.value = "114";
}

function syncOfflineSurahRange(changed) {
  if (!offlineStartSurahSelect || !offlineEndSurahSelect) return;
  const start = Number(offlineStartSurahSelect.value || 1);
  const end = Number(offlineEndSurahSelect.value || 114);
  if (changed === "start" && start > end) {
    offlineEndSurahSelect.value = String(start);
  } else if (changed === "end" && end < start) {
    offlineStartSurahSelect.value = String(end);
  }
}

function getSurahBoundsFromSelection() {
  const start = Math.max(1, Math.min(114, Number(offlineStartSurahSelect?.value || 1)));
  const end = Math.max(1, Math.min(114, Number(offlineEndSurahSelect?.value || 114)));
  return { start: Math.min(start, end), end: Math.max(start, end) };
}

async function cacheSingleAudioTrack(cache, url, signal) {
  const existing = await cache.match(url);
  if (existing) return true;
  const response = await fetch(url, { signal });
  if (!response.ok) return false;
  await cache.put(url, response.clone());
  return true;
}

async function isAyahAvailableOffline(reciter, surahNumber, ayahNumber) {
  const onlineUrl = buildAudioOnlineUrl(reciter, surahNumber, ayahNumber);
  try {
    const cache = await caches.open(OFFLINE_CACHE_NAME);
    const cached = await cache.match(onlineUrl);
    if (cached) return true;
  } catch (_error) {
    // Ignore cache failures and continue checks.
  }

  const localUrl = buildAudioLocalUrl(reciter, surahNumber, ayahNumber);
  try {
    const response = await fetch(localUrl, { cache: "no-store" });
    return response.ok;
  } catch (_error) {
    return false;
  }
}

async function isSurahFileAvailableOffline(reciter, surahNumber) {
  const localSurahUrl = buildSurahAudioLocalUrl(reciter, surahNumber);
  try {
    const response = await fetch(localSurahUrl, { cache: "no-store" });
    return response.ok;
  } catch (_error) {
    return false;
  }
}

async function validateOfflineListenSelection() {
  if (navigator.onLine) return { ok: true, message: "" };

  const { surahNumber, ayahNumber } = getSelectedSurahAyah();
  const reciter = state.listen.reciter;

  if (state.recitationMode === "surah") {
    const hasSurahFile = await isSurahFileAvailableOffline(reciter, surahNumber);
    if (hasSurahFile) return { ok: true, message: "" };

    const hasAyahFile = await isAyahAvailableOffline(reciter, surahNumber, ayahNumber);
    if (hasAyahFile) {
      return {
        ok: false,
        message:
          "هذا القارئ محفوظ بصيغة آية-آية فقط. اختر نمط آية-آية أو اختر سورة محفوظة بالكامل.",
      };
    }

    return {
      ok: false,
      message:
        "أنت غير متصل، والسورة/الآية المختارة غير محفوظة لهذا القارئ. اختر قارئًا أو سورة/آية محفوظة.",
    };
  }

  const hasSelectedAyah = await isAyahAvailableOffline(reciter, surahNumber, ayahNumber);
  if (hasSelectedAyah) return { ok: true, message: "" };

  return {
    ok: false,
    message:
      "أنت غير متصل، والآية المختارة غير محفوظة لهذا القارئ. اختر قارئًا أو سورة/آية محفوظة ثم أعد المحاولة.",
  };
}

async function downloadQuranOffline() {
  if (!downloadQuranBtn) return;
  if (blockIfOffline("التنزيل")) return;
  if (state.downloads.quranInProgress) {
    showToast("تنزيل القرآن قيد التنفيذ بالفعل.");
    return;
  }

  const alreadySaved = Boolean(loadQuranPayloadFromStorage());
  if (alreadySaved) {
    resetDownloadProgressUI();
    showToast("تم تنزيل القرآن مسبقًا", "success");
    return;
  }

  if (state.quranReady && Array.isArray(state.surahs) && state.surahs.length > 0) {
    const saved = saveQuranPayloadToStorage({ surahs: state.surahs });
    if (saved) {
      resetDownloadProgressUI();
      showToast("تم تنزيل القرآن بنجاح", "success");
      return;
    }
  }

  state.downloads.quranInProgress = true;
  setOfflineButtonsDisabled(true);
  setOfflineStatus("جاري تنزيل نص القرآن...");
  updateDownloadProgressUI("تنزيل القرآن", 0, 1, "جاري تنزيل الملف...");
  showToast("جاري تنزيل القرآن الكريم...");
  const quranDownloadStartMs = Date.now();
  try {
    const response = await fetch(QURAN_API_URL);
    if (!response.ok) throw new Error("Quran download failed");
    const payload = await response.json();
    const normalized = normalizeQuranPayload(payload);
    if (!normalized) throw new Error("Invalid Quran payload");
    const saved = saveQuranPayloadToStorage(normalized);
    if (!saved) throw new Error("Quran payload could not be saved");

    if (!state.quranReady) {
      state.surahs = normalized.surahs;
      state.quranReady = true;
      renderAyahLists();
    }
    ensureOfflineSurahRangeOptions();
    updateDownloadProgressUI("تنزيل القرآن", 1, 1, "اكتمل تنزيل الملف");
    const elapsedMs = Date.now() - quranDownloadStartMs;
    const minGapMs = 2400;
    const waitMs = Math.max(0, minGapMs - elapsedMs);
    if (waitMs > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, waitMs));
    }
    showToast("تم تنزيل القرآن بنجاح", "success");
    hideDownloadProgressAfter(1200);
  } catch (error) {
    console.error(error);
    setOfflineStatus("تعذر تنزيل القرآن. تأكد من اتصال الإنترنت", true);
    updateDownloadProgressUI("تنزيل القرآن", 0, 1, "فشل التنزيل");
    hideDownloadProgressAfter(1800);
    showToast("تعذر تنزيل القرآن الكريم", "error");
  } finally {
    state.downloads.quranInProgress = false;
    setOfflineButtonsDisabled(false);
  }
}

async function downloadSelectedReciterOffline() {
  if (!downloadReciterBtn) return;
  if (state.downloads.reciterInProgress) {
    state.downloads.reciterCancelRequested = true;
    state.downloads.reciterAbortController?.abort();
    showToast("جاري إيقاف تنزيل صوت القارئ...");
    return;
  }
  if (blockIfOffline("التنزيل")) return;
  if (!state.surahs.length) {
    setOfflineStatus("افتح القراءة مرة واحدة لتحميل بيانات السور أولًا", true);
    return;
  }
  const { start, end } = getSurahBoundsFromSelection();
  const selectedSurahs = state.surahs.filter(
    (surah) => surah.number >= start && surah.number <= end && Array.isArray(surah.ayahs)
  );
  if (!selectedSurahs.length) {
    setOfflineStatus("نطاق السور غير صالح للتنزيل", true);
    return;
  }

  const totalAyahs = selectedSurahs.reduce((sum, surah) => sum + surah.ayahs.length, 0);
  if (!totalAyahs) {
    setOfflineStatus("لا توجد آيات للتنزيل في هذا النطاق", true);
    return;
  }
  const targetReciter = getOfflineReciterForDownload();
  const hasAllSelectedSaved = selectedSurahs.every((surah) => {
    const savedAyahs = getOfflineAyahSet(targetReciter, surah.number);
    return surah.ayahs.every((ayah) => savedAyahs.has(ayah.numberInSurah));
  });
  if (hasAllSelectedSaved) {
    resetDownloadProgressUI();
    showToast("تم تنزيل القارئ مسبقًا لهذا النطاق", "success");
    return;
  }

  state.downloads.reciterInProgress = true;
  state.downloads.reciterCancelRequested = false;
  syncReciterDownloadButton();
  setOfflineButtonsDisabled(true);
  let downloaded = 0;
  let failed = 0;
  updateDownloadProgressUI("تنزيل صوت القارئ", 0, totalAyahs, "بدء التنزيل...");
  showToast("جاري تنزيل صوت القارئ...");
  const reciterDownloadStartMs = Date.now();

  try {
    const cache = await caches.open(OFFLINE_CACHE_NAME);
    let cancelled = false;
    outerLoop:
    for (const surah of selectedSurahs) {
      for (const ayah of surah.ayahs) {
        if (state.downloads.reciterCancelRequested) {
          cancelled = true;
          break outerLoop;
        }

        const url = buildAudioOnlineUrl(
          targetReciter,
          surah.number,
          ayah.numberInSurah
        );
        try {
          const controller = new AbortController();
          state.downloads.reciterAbortController = controller;
          const ok = await cacheSingleAudioTrack(cache, url, controller.signal);
          if (ok) downloaded += 1;
          else failed += 1;
        } catch (error) {
          if (state.downloads.reciterCancelRequested || error?.name === "AbortError") {
            cancelled = true;
            break outerLoop;
          }
          failed += 1;
        } finally {
          state.downloads.reciterAbortController = null;
        }

        const processed = downloaded + failed;
        updateDownloadProgressUI(
          "تنزيل صوت القارئ",
          processed,
          totalAyahs,
          `ناجح: ${downloaded} | فشل: ${failed}`
        );
       
      }
    }

    if (cancelled) {
      updateDownloadProgressUI(
        "تنزيل صوت القارئ",
        downloaded + failed,
        totalAyahs,
        "تم الإيقاف بواسطة المستخدم"
      );
      hideDownloadProgressAfter(1200);
      showToast("تم إيقاف تنزيل صوت القارئ");
    } else if (downloaded > 0 && failed === 0) {
      updateDownloadProgressUI("تنزيل صوت القارئ", totalAyahs, totalAyahs, "اكتمل التنزيل");
      const elapsedMs = Date.now() - reciterDownloadStartMs;
      const minGapMs = 2400;
      const waitMs = Math.max(0, minGapMs - elapsedMs);
      if (waitMs > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, waitMs));
      }
      showToast("اكتمل تنزيل القارئ بنجاح", "success");
      hideDownloadProgressAfter(1200);
    } else if (downloaded > 0) {
      setOfflineStatus(`اكتمل جزئيًا: تم تنزيل ${downloaded} آية وتعذر ${failed} آية.`, true);
      updateDownloadProgressUI("تنزيل صوت القارئ", downloaded + failed, totalAyahs, "اكتمل جزئيًا");
      hideDownloadProgressAfter(1800);
      showToast("اكتمل تنزيل القارئ جزئيًا", "error");
    } else {
      setOfflineStatus("تعذر تنزيل ملفات القارئ. تحقق من الإنترنت وحاول مجددًا", true);
      updateDownloadProgressUI("تنزيل صوت القارئ", 0, totalAyahs, "فشل التنزيل");
      hideDownloadProgressAfter(1800);
      showToast("تعذر تنزيل تلاوات القارئ", "error");
    }
  } finally {
    state.downloads.reciterAbortController = null;
    state.downloads.reciterCancelRequested = false;
    state.downloads.reciterInProgress = false;
    syncReciterDownloadButton();
    setOfflineButtonsDisabled(false);
    await refreshOfflineListenAvailability();
  }
}

async function deleteSelectedStoredData() {
  if (
    !deleteQuranDataChk ||
    !deleteReciterDataChk ||
    !deleteSelectedDataBtn ||
    !storageManagerDialog
  ) {
    return;
  }
  if (blockIfOffline("حذف البيانات")) return;

  if (!deleteQuranDataChk.checked && !deleteReciterDataChk.checked) {
    showToast("حدد بيانات للحذف أولًا", "error");
    return;
  }

  deleteSelectedDataBtn.disabled = true;
  setOfflineButtonsDisabled(true);
  try {
    let removedSomething = false;

    if (deleteQuranDataChk.checked) {
      localStorage.removeItem(QURAN_JSON_STORAGE_KEY);
      removedSomething = true;
    }

    if (deleteReciterDataChk.checked) {
      const cache = await caches.open(OFFLINE_CACHE_NAME);
      const reciterRequests = await getReciterCachedRequests();
      for (const request of reciterRequests) {
        await cache.delete(request);
      }
      removedSomething = removedSomething || reciterRequests.length > 0;
    }

    if (removedSomething) {
      showToast("تم حذف البيانات المحددة", "success");
    } else {
      showToast("لا توجد بيانات لحذفها");
    }
    storageManagerDialog.close();
  } catch (error) {
    console.error(error);
    showToast("تعذر حذف البيانات المحددة", "error");
  } finally {
    setOfflineButtonsDisabled(false);
    if (deleteSelectedDataBtn) deleteSelectedDataBtn.disabled = false;
    await refreshOfflineListenAvailability();
  }
}

function setVisibleView(viewName) {
  state.currentView = viewName;
  homeView.classList.toggle("active", viewName === "home");
  readView.classList.toggle("active", viewName === "read");
  listenView.classList.toggle("active", viewName === "listen");
  ramadanView.classList.toggle("active", viewName === "ramadan");
}

function updateReadControls(mode) {
  readStartBtn.classList.toggle("hidden", mode !== "initial");
  readStopBtn.classList.toggle("hidden", mode !== "running");
  readContinueBtn.classList.toggle("hidden", mode !== "paused");
  readResetBtn.classList.toggle("hidden", mode !== "paused");
}

function updateListenControls(mode) {
  listenStartBtn.classList.toggle("hidden", mode !== "initial");
  listenStopBtn.classList.toggle("hidden", mode !== "running");
  listenContinueBtn.classList.toggle("hidden", mode !== "paused");
  listenResetBtn.classList.toggle("hidden", mode !== "paused");
}

function ensureAyahsReadyForStart(target) {
  const status =
    target === "listen" ? listenStatusText : target === "ramadan" ? ramadanStatusText : readStatusText;
  const area = target === "listen" ? listenReaderArea : target === "ramadan" ? ramadanReaderArea : readReaderArea;
  const list = target === "listen" ? listenAyahList : target === "ramadan" ? ramadanAyahList : readAyahList;
  const hasAyahs = Boolean(list && list.querySelector(".ayah"));
  const hasData = state.quranReady && state.flatAyahs.length > 0 && hasAyahs;

  if (hasData && area?.classList.contains("hidden")) {
    area.classList.remove("hidden");
  }

  const isReady = hasData;

  if (isReady) return true;

  if (status) {
    status.classList.remove("hidden");
    status.textContent = "لا يمكن البدء الآن. انتظر حتى تحميل الآيات وظهورها.";
  }
  showToast("لا يمكن البدء قبل تحميل الآيات وظهورها.", "error", IMPORTANT_TOAST_DURATION_MS);
  return false;
}

function resetReadSession() {
  stopReadScroll();
  const saved = loadReadSelectionFromStorage();
  if (saved && saved.surahNumber) {
    applyReadSelection(saved.surahNumber, saved.ayahNumber, "auto");
  } else {
    readReaderArea.scrollTop = 0;
  }
  readStatusText.classList.add("hidden");
  state.read.started = false;
  updateReadControls("initial");
}

function toggleReadPlaybackByShortcut() {
  if (state.read.running) {
    stopReadScroll();
    updateReadControls("paused");
    return;
  }
  startReadScroll();
}

function toggleListenPlaybackByShortcut() {
  if (state.listen.running) {
    stopListenPlayback();
    updateListenControls("paused");
    return;
  }
  startListenPlayback();
}

function shouldIgnoreShortcut(event) {
  const target = event.target;
  const tag = target?.tagName?.toLowerCase();
  const isTypingField = tag === "input" || tag === "textarea" || tag === "select";
  if (isTypingField || target?.isContentEditable) return true;
  if (settingsDialog?.open || storageManagerDialog?.open || offlineLogDialog?.open) return true;
  return false;
}

function handlePlaybackShortcuts(event) {
  if (shouldIgnoreShortcut(event)) return;
  const key = event.key.toLowerCase();
  const inReadView = state.currentView === "read";
  const inRamadanView = state.currentView === "ramadan";
  const inListenView = state.currentView === "listen";
  if (!inReadView && !inRamadanView && !inListenView) return;

  if (key === " " || key === "spacebar") {
    event.preventDefault();
    if (inReadView) toggleReadPlaybackByShortcut();
    else if (inRamadanView) {
      if (state.ramadan.running) {
        stopRamadanScroll();
        updateRamadanControls("paused");
      } else {
        startRamadanScroll();
      }
    }
    else toggleListenPlaybackByShortcut();
    return;
  }

  if (key === "s") {
    if (inReadView && state.read.running) {
      stopReadScroll();
      updateReadControls("paused");
    } else if (inRamadanView && state.ramadan.running) {
      stopRamadanScroll();
      updateRamadanControls("paused");
    } else if (inListenView && state.listen.running) {
      stopListenPlayback();
      updateListenControls("paused");
    }
    return;
  }

  if (key === "c") {
    if (inReadView && !state.read.running && state.read.started) {
      startReadScroll();
    } else if (inRamadanView && !state.ramadan.running && state.ramadan.started) {
      startRamadanScroll();
    } else if (inListenView && !state.listen.running && state.listen.started) {
      startListenPlayback();
    }
    return;
  }

  if (key === "r") {
    if (inReadView) {
      resetReadSession();
    } else if (inRamadanView) {
      resetRamadanSession();
    } else if (inListenView) {
      resetListenSession();
    }
  }
}

function populateListenSurahSelect() {
  if (!listenSurahSelect) return;

  listenSurahSelect.innerHTML = '<option value="">من البداية</option>';
  for (const surah of state.surahs) {
    const option = document.createElement("option");
    option.value = String(surah.number);
    option.textContent = `${surah.number}. ${surah.name}`;
    listenSurahSelect.appendChild(option);
  }
}

function updateAyahInputLimits() {
  const surahNumber = Number(listenSurahSelect?.value || 0);
  if (!surahNumber) {
    listenAyahInput.removeAttribute("max");
    listenAyahInput.placeholder = "1";
    return;
  }

  const surah = state.surahs.find((item) => item.number === surahNumber);
  const maxAyah = surah?.ayahs?.length || 1;
  listenAyahInput.max = String(maxAyah);
  listenAyahInput.placeholder = `1 - ${maxAyah}`;

  if (listenAyahInput.value) {
    const current = Number(listenAyahInput.value);
    if (!Number.isFinite(current) || current < 1) {
      listenAyahInput.value = "1";
    } else if (current > maxAyah) {
      listenAyahInput.value = String(maxAyah);
    }
  }

  if (!navigator.onLine) {
    updateOfflineAyahSelector();
  }
}

function getSelectedAyahNumber() {
  if (!navigator.onLine && listenAyahSelectOffline && !listenAyahSelectOffline.classList.contains("hidden")) {
    const offlineValue = Number(listenAyahSelectOffline.value || 1);
    if (Number.isFinite(offlineValue) && offlineValue > 0) return offlineValue;
  }
  const rawAyah = listenAyahInput?.value ? Number(listenAyahInput.value) : 1;
  return Number.isFinite(rawAyah) && rawAyah > 0 ? rawAyah : 1;
}

function getStartIndexFromSelection() {
  const surahNumber = Number(listenSurahSelect?.value || 0);
  if (!surahNumber) return 0;

  const surahIndex = state.surahs.findIndex((item) => item.number === surahNumber);
  if (surahIndex < 0) return 0;

  const selectedSurah = state.surahs[surahIndex];
  const maxAyah = selectedSurah.ayahs.length;
  const ayahNumber = Number.isFinite(getSelectedAyahNumber())
    ? Math.max(1, Math.min(maxAyah, getSelectedAyahNumber()))
    : 1;

  let startIndex = ayahNumber - 1;
  for (let i = 0; i < surahIndex; i += 1) {
    startIndex += state.surahs[i].ayahs.length;
  }

  return startIndex;
}

function getSelectedSurahAyah() {
  const surahNumber = Number(listenSurahSelect?.value || 1);
  const surah = state.surahs.find((item) => item.number === surahNumber);
  const maxAyah = surah?.ayahs?.length || 1;
  const ayahNumber = Number.isFinite(getSelectedAyahNumber())
    ? Math.max(1, Math.min(maxAyah, getSelectedAyahNumber()))
    : 1;
  return { surahNumber, ayahNumber };
}

function getSurahStartFlatIndex(surahNumber) {
  return state.flatAyahs.findIndex((item) => item.surahNumber === surahNumber);
}

function getFlatIndexForSurahAyah(surahNumber, ayahNumber) {
  return state.flatAyahs.findIndex(
    (item) => item.surahNumber === surahNumber && item.ayahNumber === ayahNumber
  );
}

function resetListenSelectionInputs() {
  if (listenSurahSelect) listenSurahSelect.value = "";
  if (listenAyahInput) listenAyahInput.value = "";
  if (listenAyahSelectOffline) listenAyahSelectOffline.innerHTML = "";
  updateAyahInputLimits();
}

function stopReadScroll() {
  state.read.running = false;
  if (state.read.rafId) {
    cancelAnimationFrame(state.read.rafId);
    state.read.rafId = null;
  }
  state.read.lastTs = 0;
  state.read.velocity = 0;
  state.read.smoothedDelta = 0;
}

function getSmoothReadSpeedPxPerSec() {
  const minInput = 10;
  const maxInput = 80;
  const clamped = Math.max(minInput, Math.min(maxInput, state.speed));
  const t = (clamped - minInput) / (maxInput - minInput);

  // Non-linear curve keeps slow values usable and high values fluid without jerk.
  return 6 + Math.pow(t, 1.65) * 210;
}

function readTick(ts) {
  if (!state.read.running) return;
  if (!state.read.lastTs) state.read.lastTs = ts;

  const rawDelta = (ts - state.read.lastTs) / 1000;
  state.read.lastTs = ts;
  const clampedDelta = Math.max(0, Math.min(rawDelta, 0.05));
  state.read.smoothedDelta = state.read.smoothedDelta
    ? state.read.smoothedDelta * 0.82 + clampedDelta * 0.18
    : clampedDelta;

  const targetVelocity = getSmoothReadSpeedPxPerSec();
  const velocityLerp = Math.min(1, state.read.smoothedDelta * 10);
  state.read.velocity += (targetVelocity - state.read.velocity) * velocityLerp;

  readReaderArea.scrollTop += state.read.velocity * state.read.smoothedDelta;

  const reachedEnd =
    readReaderArea.scrollTop + readReaderArea.clientHeight >= readReaderArea.scrollHeight - 2;
  if (reachedEnd) {
    stopReadScroll();
    updateReadControls("paused");
    readStatusText.classList.remove("hidden");
    readStatusText.textContent = "تم الوصول إلى نهاية سورة الناس.";
    return;
  }

  state.read.rafId = requestAnimationFrame(readTick);
}

function startReadScroll() {
  if (state.read.running) return;
  if (!ensureAyahsReadyForStart("read")) return;
  state.read.started = true;
  state.read.running = true;
  state.read.lastTs = 0;
  state.read.velocity = getSmoothReadSpeedPxPerSec();
  state.read.smoothedDelta = 0.016;
  readStatusText.classList.add("hidden");
  updateReadControls("running");
  state.read.rafId = requestAnimationFrame(readTick);
}

function updateRamadanControls(mode) {
  if (!ramadanStartBtn || !ramadanStopBtn || !ramadanContinueBtn || !ramadanResetBtn) return;
  ramadanStartBtn.classList.toggle("hidden", mode !== "initial");
  ramadanStopBtn.classList.toggle("hidden", mode !== "running");
  ramadanContinueBtn.classList.toggle("hidden", mode !== "paused" && mode !== "resume-only");
  ramadanResetBtn.classList.toggle("hidden", mode !== "paused" && mode !== "completed");
}

function stopRamadanScroll() {
  state.ramadan.running = false;
  if (state.ramadan.rafId) {
    cancelAnimationFrame(state.ramadan.rafId);
    state.ramadan.rafId = null;
  }
  state.ramadan.lastTs = 0;
  state.ramadan.velocity = 0;
  state.ramadan.smoothedDelta = 0;
}

function startRamadanScroll() {
  if (state.ramadan.running || state.ramadan.juzCompleted) return;
  if (!ensureAyahsReadyForStart("ramadan")) return;
  if (state.ramadan.currentJuz > state.ramadan.allowedJuzByDate) {
    if (ramadanStatusText) {
      ramadanStatusText.classList.remove("hidden");
      ramadanStatusText.textContent = "لا يمكن بدء الجزء القادم قبل موعده في رمضان.";
    }
    return;
  }
  state.ramadan.started = true;
  state.ramadan.running = true;
  state.ramadan.lastTs = 0;
  state.ramadan.velocity = getSmoothReadSpeedPxPerSec();
  state.ramadan.smoothedDelta = 0.016;
  if (ramadanStatusText) ramadanStatusText.classList.add("hidden");
  updateRamadanControls("running");
  state.ramadan.rafId = requestAnimationFrame(ramadanTick);
}

function ramadanTick(ts) {
  if (!state.ramadan.running || !ramadanReaderArea) return;
  if (!state.ramadan.lastTs) state.ramadan.lastTs = ts;

  const rawDelta = (ts - state.ramadan.lastTs) / 1000;
  state.ramadan.lastTs = ts;
  const clampedDelta = Math.max(0, Math.min(rawDelta, 0.05));
  state.ramadan.smoothedDelta = state.ramadan.smoothedDelta
    ? state.ramadan.smoothedDelta * 0.82 + clampedDelta * 0.18
    : clampedDelta;

  const targetVelocity = getSmoothReadSpeedPxPerSec();
  const velocityLerp = Math.min(1, state.ramadan.smoothedDelta * 10);
  state.ramadan.velocity += (targetVelocity - state.ramadan.velocity) * velocityLerp;

  ramadanReaderArea.scrollTop += state.ramadan.velocity * state.ramadan.smoothedDelta;
  saveRamadanProgressToStorage();

  const reachedEnd =
    ramadanReaderArea.scrollTop + ramadanReaderArea.clientHeight >= ramadanReaderArea.scrollHeight - 2;
  if (reachedEnd) {
    markCurrentJuzCompleted();
    return;
  }

  state.ramadan.rafId = requestAnimationFrame(ramadanTick);
}

function resetRamadanSession() {
  stopRamadanScroll();
  if (ramadanReaderArea) ramadanReaderArea.scrollTop = 0;
  state.ramadan.started = false;
  state.ramadan.juzCompleted = false;
  updateRamadanControls("initial");
  updateRamadanNextJuzButton();
  updateRamadanInfoAndStatus();
  saveRamadanProgressToStorage();
}

function markCurrentJuzCompleted() {
  if (state.ramadan.currentJuz > state.ramadan.allowedJuzByDate) return;
  stopRamadanScroll();
  state.ramadan.juzCompleted = true;
  state.ramadan.highestCompletedJuz = Math.max(
    state.ramadan.highestCompletedJuz,
    state.ramadan.currentJuz
  );
  saveRamadanProgressToStorage();
  updateRamadanControls("completed");
  updateRamadanNextJuzButton();
  updateRamadanInfoAndStatus();
}

function updateRamadanNextJuzButton() {
  if (!ramadanNextJuzBtn) return;
  const nextJuzRaw = state.ramadan.highestCompletedJuz + 1;
  const nextJuz = Math.min(30, nextJuzRaw);
  const hasNextJuz = nextJuzRaw <= 30;
  const hasCompletedCurrentJuz = state.ramadan.highestCompletedJuz >= state.ramadan.currentJuz;
  const canJumpNow =
    hasNextJuz &&
    hasCompletedCurrentJuz &&
    state.ramadan.currentJuz !== nextJuz &&
    nextJuz <= state.ramadan.allowedJuzByDate &&
    nextJuz <= 30;
  ramadanNextJuzBtn.classList.toggle("hidden", !canJumpNow);
  ramadanNextJuzBtn.textContent = hasNextJuz ? `انتقل للجزء ${nextJuz}` : "تم إكمال 30 جزءًا";
}

function updateRamadanInfoAndStatus() {
  if (!ramadanInfoBadge || !ramadanStatusText) return;
  const allowed = state.ramadan.allowedJuzByDate;
  const current = state.ramadan.currentJuz;
  const hasCompletedCurrentJuz = state.ramadan.highestCompletedJuz >= current;
  if (allowed === 0) {
    ramadanInfoBadge.textContent = "الخطة اليومية تظهر عند دخول رمضان";
    ramadanStatusText.classList.remove("hidden");
    ramadanStatusText.textContent = "لم يبدأ رمضان بعد. سيتم تفعيل الخطة تلقائيًا عند دخول الشهر.";
    return;
  }
  ramadanInfoBadge.textContent = `جزء اليوم المتاح: ${allowed} | الجزء الحالي: ${current}`;

  if (state.ramadan.highestCompletedJuz >= 30) {
    ramadanStatusText.classList.remove("hidden");
    ramadanStatusText.textContent = "ما شاء الله، الف مبرك الختمة في رمضان";
    return;
  }

  if (hasCompletedCurrentJuz) {
    const nextJuz = state.ramadan.highestCompletedJuz + 1;
    if (nextJuz <= allowed && nextJuz <= 30) {
      ramadanStatusText.classList.remove("hidden");
      ramadanStatusText.textContent = "الف مبرك أكملت الجزء الحالي, يمكنك الانتقال الآن للجزء التالي";
      return;
    }
    ramadanStatusText.classList.remove("hidden");
    ramadanStatusText.textContent = "الف مبروك أكملت الجزء الحالي, سيتم الانتقال للجزء التالي تلقائيًا عند دخول اليوم التالي";
    return;
  }

  ramadanStatusText.classList.add("hidden");
}

function renderRamadanJuz(juzNumber, savedScrollTop = 0) {
  if (!ramadanAyahList || !ramadanReaderArea) return;
  const boundaries = getJuzBoundaries(juzNumber);
  ramadanAyahList.innerHTML = "";
  if (!boundaries) {
    ramadanReaderArea.classList.add("hidden");
    ramadanStatusText.classList.remove("hidden");
    ramadanStatusText.textContent = "تعذر تحديد حدود هذا الجزء.";
    return;
  }

  let lastSurah = -1;
  for (let i = boundaries.startIndex; i <= boundaries.endIndex; i += 1) {
    const ayah = state.flatAyahs[i];
    if (!ayah) continue;
    if (ayah.surahNumber !== lastSurah) {
      lastSurah = ayah.surahNumber;
      const heading = document.createElement("h3");
      heading.className = "surah-title";
      heading.textContent = getSurahDisplayName(ayah.surahNumber);
      ramadanAyahList.appendChild(heading);
    }
    const p = document.createElement("p");
    p.className = "ayah";
    p.append(document.createTextNode(`${ayah.text} `));
    const ayahNumber = document.createElement("span");
    ayahNumber.className = "ayah-number";
    ayahNumber.textContent = `(${ayah.ayahNumber})`;
    p.appendChild(ayahNumber);
    ramadanAyahList.appendChild(p);
  }

  ramadanReaderArea.classList.remove("hidden");
  ramadanReaderArea.scrollTop = Math.max(0, savedScrollTop);
  requestAnimationFrame(() => {
    ramadanReaderArea.scrollTop = Math.max(0, savedScrollTop);
  });
}

function syncRamadanSchedule({ forceRender = false } = {}) {
  if (!state.quranReady || !state.flatAyahs.length) return;
  const allowed = getAllowedJuzByDate();
  state.ramadan.allowedJuzByDate = allowed;
  const previousJuz = state.ramadan.currentJuz;

  const nextUnfinished = Math.min(30, state.ramadan.highestCompletedJuz + 1);
  const hasFinishedAll = state.ramadan.highestCompletedJuz >= 30;
  if (hasFinishedAll) {
    state.ramadan.currentJuz = 30;
    state.ramadan.juzCompleted = true;
    updateRamadanNextJuzButton();
    updateRamadanInfoAndStatus();
    return;
  }

  const desiredCurrentJuz =
    allowed === 0
      ? 1
      : nextUnfinished <= allowed
        ? nextUnfinished
        : Math.max(1, Math.min(allowed, state.ramadan.highestCompletedJuz));

  const shouldAutoAdvanceByDate =
    state.ramadan.juzCompleted && nextUnfinished <= allowed && desiredCurrentJuz > previousJuz;

  state.ramadan.currentJuz = Math.max(1, Math.min(30, desiredCurrentJuz));

  if (shouldAutoAdvanceByDate) {
    state.ramadan.juzCompleted = false;
    resetRamadanSession();
    showToast(`حان وقت الجزء ${state.ramadan.currentJuz}، تم الانتقال تلقائيًا.`, "success");
  } else {
    state.ramadan.juzCompleted = state.ramadan.highestCompletedJuz >= state.ramadan.currentJuz;
  }

  if (forceRender || previousJuz !== state.ramadan.currentJuz) {
    renderRamadanJuz(state.ramadan.currentJuz, 0);
  }
  updateRamadanNextJuzButton();
  updateRamadanInfoAndStatus();
  saveRamadanProgressToStorage();
}

async function openRamadanView() {
  if (!isRamadanMonth()) {
    showToast("الختمة في رمضان متاحة فقط خلال شهر رمضان.", "error");
    setVisibleView("home");
    return;
  }
  pauseEverything();
  setVisibleView("ramadan");
  const loaded = await ensureQuranLoaded("ramadan");
  if (!loaded) return;

  const currentHijriYear = getIslamicDateParts().year;
  const stored = getRamadanProgressFromStorage();
  let restoredScrollTop = 0;
  if (stored && stored.hijriYear === currentHijriYear) {
    state.ramadan.highestCompletedJuz = stored.highestCompletedJuz;
    state.ramadan.currentJuz = Math.min(
      30,
      Math.max(stored.highestCompletedJuz + 1, stored.currentJuz)
    );
    state.ramadan.progressHijriYear = stored.hijriYear;
    restoredScrollTop = stored.scrollTop || 0;
  } else {
    state.ramadan.highestCompletedJuz = 0;
    state.ramadan.currentJuz = 1;
    state.ramadan.progressHijriYear = currentHijriYear;
    saveRamadanProgressToStorage();
  }
  state.ramadan.juzCompleted = state.ramadan.highestCompletedJuz >= state.ramadan.currentJuz;

  syncRamadanSchedule({ forceRender: false });
  renderRamadanJuz(state.ramadan.currentJuz, restoredScrollTop);
  const shouldShowResumeOnly =
    !state.ramadan.juzCompleted && state.ramadan.started && !state.ramadan.running;
  if (state.ramadan.juzCompleted) {
    updateRamadanControls("completed");
  } else if (shouldShowResumeOnly) {
    updateRamadanControls("resume-only");
  } else {
    updateRamadanControls("initial");
  }

  if (ramadanDayTimer) clearInterval(ramadanDayTimer);
  ramadanDayTimer = window.setInterval(() => {
    if (state.currentView !== "ramadan") return;
    syncRamadanSchedule();
  }, 60 * 1000);
}

function moveToNextRamadanJuz() {
  stopRamadanScroll();
  const nextJuz = state.ramadan.highestCompletedJuz + 1;
  if (nextJuz > state.ramadan.allowedJuzByDate || nextJuz > 30) {
    updateRamadanNextJuzButton();
    return;
  }
  state.ramadan.currentJuz = nextJuz;
  state.ramadan.juzCompleted = false;
  state.ramadan.started = false;
  if (ramadanReaderArea) ramadanReaderArea.scrollTop = 0;
  renderRamadanJuz(nextJuz, 0);
  requestAnimationFrame(() => {
    if (ramadanReaderArea) ramadanReaderArea.scrollTop = 0;
  });
  updateRamadanControls("initial");
  updateRamadanNextJuzButton();
  updateRamadanInfoAndStatus();
  saveRamadanProgressToStorage();
}

function highlightListenAyah(index) {
  const previous = listenAyahList.querySelector(".ayah.active-ayah");
  if (previous) previous.classList.remove("active-ayah");

  const current = listenAyahList.querySelector(`[data-ayah-index="${index}"]`);
  if (!current) return;

  current.classList.add("active-ayah");
  scrollElementIntoReaderArea(listenReaderArea, current, "smooth");
}

function scrollElementIntoReaderArea(readerArea, targetElement, behavior = "smooth") {
  if (!readerArea || !targetElement) return;
  const targetTop =
    targetElement.offsetTop - readerArea.clientHeight / 2 + targetElement.clientHeight / 2;
  const maxTop = Math.max(0, readerArea.scrollHeight - readerArea.clientHeight);
  const clampedTop = Math.max(0, Math.min(maxTop, targetTop));
  readerArea.scrollTo({ top: clampedTop, behavior });
}

function buildAudioLocalUrl(reciterFolder, surahNumber, ayahNumber) {
  const s = String(surahNumber).padStart(3, "0");
  const a = String(ayahNumber).padStart(3, "0");
  return `./offline-data/audio/${reciterFolder}/${s}${a}.mp3`;
}

function buildAudioOnlineUrl(reciterFolder, surahNumber, ayahNumber) {
  const s = String(surahNumber).padStart(3, "0");
  const a = String(ayahNumber).padStart(3, "0");
  return `https://everyayah.com/data/${reciterFolder}/${s}${a}.mp3`;
}

function buildSurahAudioLocalUrl(reciterFolder, surahNumber) {
  const s = String(surahNumber).padStart(3, "0");
  let surahReciterFolder = reciterFolder;
  if (reciterFolder === "Yasser_Ad-Dussary_128kbps") {
    surahReciterFolder = "Yasser_Ad-Dussary";
  } else if (reciterFolder === "MaherAlMuaiqly128kbps") {
    surahReciterFolder = "koonoz_blogspot_com_Maher";
  }
  return `./offline-data/audio-surah/${surahReciterFolder}/${s}.mp3`;
}

function buildSurahAudioOnlineUrl(reciterFolder, surahNumber) {
  const s = String(surahNumber).padStart(3, "0");
  return `https://everyayah.com/data/${reciterFolder}/${s}.mp3`;
}

function getSurahAudioCandidates(reciterFolder, surahNumber) {
  const localUrl = buildSurahAudioLocalUrl(reciterFolder, surahNumber);
  const onlineUrl = buildSurahAudioOnlineUrl(reciterFolder, surahNumber);

  if (!navigator.onLine) return [localUrl];
  if (state.audioSource === "local") return [localUrl, onlineUrl];
  if (state.audioSource === "online") return [onlineUrl, localUrl];
  return [localUrl, onlineUrl];
}

function getTimingReciterFolders(reciterFolder) {
  if (reciterFolder === "Yasser_Ad-Dussary_128kbps") {
    return ["Yasser_Ad-Dussary_128kbps", "Yasser_Ad-Dussary"];
  }
  if (reciterFolder === "MaherAlMuaiqly128kbps") {
    return ["MaherAlMuaiqly128kbps", "Maher_AlMuaiqly_128kbps"];
  }
  return [reciterFolder];
}

async function loadSurahTimingsMs(surahNumber) {
  const s = String(surahNumber).padStart(3, "0");
  const candidates = getTimingReciterFolders(state.listen.reciter);

  for (const folder of candidates) {
    const cacheKey = `${folder}-${surahNumber}`;
    if (state.listen.timingsCache[cacheKey]) {
      return state.listen.timingsCache[cacheKey];
    }

    try {
      const response = await fetch(`./offline-data/timings/${folder}/${s}.txt`);
      if (!response.ok) continue;
      const content = await response.text();
      const timings = content
        .split(/\r?\n/)
        .map((line) => Number(line.trim()))
        .filter((value) => Number.isFinite(value) && value > 0);
      if (!timings.length) continue;

      state.listen.timingsCache[cacheKey] = timings;
      return timings;
    } catch (_error) {
      // Try next folder candidate.
    }
  }

  return [];
}

function buildSurahRatios(surahNumber) {
  const surah = state.surahs.find((item) => item.number === surahNumber);
  if (!surah || !Array.isArray(surah.ayahs) || surah.ayahs.length === 0) return [];

  // Weighted by ayah text length for practical seeking/highlighting in surah files.
  const weights = surah.ayahs.map((ayah) => {
    const textLength = (ayah.text || "").replace(/\s+/g, "").length;
    return Math.max(8, textLength);
  });
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (!total) return [];

  const ratios = [0];
  let cumulative = 0;
  for (const weight of weights) {
    cumulative += weight;
    ratios.push(cumulative / total);
  }
  ratios[ratios.length - 1] = 1;
  return ratios;
}

function getAyahNumberFromSurahTime(surahNumber, currentTime, duration) {
  if (Array.isArray(state.listen.surahTimingsMs) && state.listen.surahTimingsMs.length > 0) {
    const currentMs = Math.max(0, Math.floor(currentTime * 1000));
    const timings = state.listen.surahTimingsMs;
    let left = 0;
    let right = timings.length - 1;
    let answer = timings.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (currentMs <= timings[mid]) {
        answer = mid;
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }
    return answer + 1;
  }

  if (!Number.isFinite(duration) || duration <= 0) return 1;
  if (!state.listen.surahRatios.length) {
    state.listen.surahRatios = buildSurahRatios(surahNumber);
  }
  const ratios = state.listen.surahRatios;
  if (!ratios.length) return 1;

  const ratio = Math.max(0, Math.min(1, currentTime / duration));
  for (let i = 1; i < ratios.length; i += 1) {
    if (ratio < ratios[i]) return i;
  }
  return ratios.length - 1;
}

function seekSurahToAyah(surahNumber, ayahNumber) {
  if (Array.isArray(state.listen.surahTimingsMs) && state.listen.surahTimingsMs.length > 0) {
    const timings = state.listen.surahTimingsMs;
    const safeAyah = Math.max(1, Math.min(ayahNumber, timings.length));
    const startMs = safeAyah <= 1 ? 0 : timings[safeAyah - 2];
    activePlayer.currentTime = startMs / 1000;
    return;
  }

  if (!Number.isFinite(activePlayer.duration) || activePlayer.duration <= 0) return;
  if (!state.listen.surahRatios.length) {
    state.listen.surahRatios = buildSurahRatios(surahNumber);
  }
  const ratios = state.listen.surahRatios;
  if (!ratios.length) return;

  const safeAyah = Math.max(1, Math.min(ayahNumber, ratios.length - 1));
  const target = activePlayer.duration * ratios[safeAyah - 1];
  activePlayer.currentTime = Math.max(0, Math.min(activePlayer.duration - 0.05, target));
}

function stopListenPlayback() {
  state.listen.running = false;
  state.listen.consecutiveFailures = 0;
  state.listen.transitionInProgress = false;
  state.listen.surahResumeAttempts = 0;
  if (surahRecoveryTimer) {
    clearTimeout(surahRecoveryTimer);
    surahRecoveryTimer = null;
  }
  activePlayer.pause();
  bufferPlayer.pause();
}

function resetPreloadState() {
  state.listen.preloadToken += 1;
  state.listen.preloadedIndex = -1;
  state.listen.preloadedUrl = "";
  state.listen.preloadedSource = "unknown";
  state.listen.transitionInProgress = false;
  bufferPlayer.pause();
  bufferPlayer.removeAttribute("src");
}

function swapAudioPlayers() {
  const temp = activePlayer;
  activePlayer = bufferPlayer;
  bufferPlayer = temp;
  bindActiveEndedHandler();
}

function bindActiveEndedHandler() {
  activePlayer.onended = () => {
    if (!state.listen.running || state.listen.transitionInProgress) return;
    if (state.listen.playMode === "surah") {
      moveToNextSurahAndContinue();
      return;
    }
    moveToNextAyahAndContinue();
  };
  activePlayer.onplaying = () => {
    if (surahRecoveryTimer) {
      clearTimeout(surahRecoveryTimer);
      surahRecoveryTimer = null;
    }
  };
  activePlayer.onpause = () => {
    if (!state.listen.running || state.listen.playMode !== "surah" || activePlayer.ended) return;
    queueSurahResume();
  };
  activePlayer.onwaiting = () => {
    if (!state.listen.running || state.listen.playMode !== "surah") return;
    queueSurahResume();
  };
  activePlayer.onstalled = () => {
    if (!state.listen.running || state.listen.playMode !== "surah") return;
    queueSurahResume();
  };
  activePlayer.ontimeupdate = () => {
    if (!state.listen.running) return;
    if (state.listen.playMode !== "surah") return;
    const currentAyah = getAyahNumberFromSurahTime(
      state.listen.currentSurahNumber,
      activePlayer.currentTime,
      activePlayer.duration
    );
    if (currentAyah <= state.listen.lastScrolledAyahInSurah) return;

    state.listen.lastScrolledAyahInSurah = currentAyah;
    const flatIndex = getFlatIndexForSurahAyah(state.listen.currentSurahNumber, currentAyah);
    if (flatIndex < 0) return;

    const ayahElement = listenAyahList.querySelector(`[data-ayah-index="${flatIndex}"]`);
    if (!ayahElement) return;
    scrollElementIntoReaderArea(listenReaderArea, ayahElement, "smooth");
  };
  bufferPlayer.onended = null;
  bufferPlayer.ontimeupdate = null;
  bufferPlayer.onpause = null;
  bufferPlayer.onwaiting = null;
  bufferPlayer.onstalled = null;
  bufferPlayer.onplaying = null;
}

function queueSurahResume() {
  if (surahRecoveryTimer) return;
  surahRecoveryTimer = setTimeout(() => {
    surahRecoveryTimer = null;
    attemptSurahResume();
  }, 350);
}

async function attemptSurahResume() {
  if (!state.listen.running || state.listen.playMode !== "surah" || activePlayer.ended) return;
  const resumeAt = Number.isFinite(activePlayer.currentTime) ? activePlayer.currentTime : 0;

  try {
    await activePlayer.play();
    state.listen.surahResumeAttempts = 0;
    return;
  } catch (_error) {
    // Try hard recovery below.
  }

  state.listen.surahResumeAttempts += 1;
  const maxAttempts = 8;
  if (state.listen.surahResumeAttempts > maxAttempts) {
    updateListenControls("paused");
    state.listen.running = false;
    listenStatusText.classList.remove("hidden");
    listenStatusText.textContent = "توقف الصوت مؤقتًا. اضغط استمرار للمتابعة.";
    return;
  }

  try {
    await hardReloadSurahFromPosition(resumeAt);
    state.listen.surahResumeAttempts = 0;
  } catch (_error) {
    queueSurahResume();
  }
}

function hardReloadSurahFromPosition(resumeAtSeconds) {
  return new Promise((resolve, reject) => {
    const src = activePlayer.currentSrc || activePlayer.src;
    if (!src) {
      reject(new Error("No source to reload"));
      return;
    }

    const cleanup = () => {
      activePlayer.removeEventListener("loadedmetadata", onReady);
      activePlayer.removeEventListener("error", onError);
    };

    const onError = () => {
      cleanup();
      reject(new Error("Reload failed"));
    };

    const onReady = () => {
      cleanup();
      try {
        if (Number.isFinite(activePlayer.duration) && activePlayer.duration > 0) {
          activePlayer.currentTime = Math.max(0, Math.min(activePlayer.duration - 0.2, resumeAtSeconds));
        }
      } catch (_error) {
        // Ignore seek errors and try play anyway.
      }

      activePlayer.play().then(resolve).catch(reject);
    };

    activePlayer.addEventListener("loadedmetadata", onReady, { once: true });
    activePlayer.addEventListener("error", onError, { once: true });
    activePlayer.pause();
    activePlayer.src = "";
    activePlayer.src = src;
    activePlayer.load();
  });
}

function moveToNextAyahAndContinue() {
  if (state.listen.transitionInProgress) return;
  if (stopAtLastSavedPointIfNeeded()) return;
  state.listen.transitionInProgress = true;
  state.listen.ayahIndex += 1;

  playCurrentListenAyah().finally(() => {
    state.listen.transitionInProgress = false;
  });
}

function moveToNextSurahAndContinue() {
  if (state.listen.transitionInProgress) return;
  state.listen.transitionInProgress = true;
  state.listen.currentSurahNumber += 1;
  state.listen.startAyahInSurah = 1;
  state.listen.lastScrolledAyahInSurah = 0;
  state.listen.surahTimingsMs = [];
  state.listen.surahRatios = [];

  playCurrentSurah().finally(() => {
    state.listen.transitionInProgress = false;
  });
}

function getAudioCandidatesForAyah(ayahObj) {
  const localUrl = buildAudioLocalUrl(
    state.listen.reciter,
    ayahObj.surahNumber,
    ayahObj.ayahNumber
  );
  const onlineUrl = buildAudioOnlineUrl(
    state.listen.reciter,
    ayahObj.surahNumber,
    ayahObj.ayahNumber
  );

  if (!navigator.onLine) return [localUrl];
  if (state.audioSource === "local") return [localUrl, onlineUrl];
  if (state.audioSource === "online") return [onlineUrl, localUrl];
  return [localUrl, onlineUrl];
}

function preloadAudioSource(src, token) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Preload timeout"));
    }, 10000);

    const onReady = () => {
      cleanup();
      if (token !== state.listen.preloadToken) {
        reject(new Error("Stale preload"));
        return;
      }
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("Preload failed"));
    };

    const cleanup = () => {
      clearTimeout(timeoutId);
      bufferPlayer.removeEventListener("canplay", onReady);
      bufferPlayer.removeEventListener("error", onError);
    };

    bufferPlayer.addEventListener("canplay", onReady, { once: true });
    bufferPlayer.addEventListener("error", onError, { once: true });
    bufferPlayer.src = src;
    bufferPlayer.load();
  });
}

async function primeNextListenAyah() {
  const nextIndex = state.listen.ayahIndex + 1;
  const nextAyah = state.flatAyahs[nextIndex];
  if (!nextAyah) {
    state.listen.preloadedIndex = -1;
    state.listen.preloadedUrl = "";
    state.listen.preloadedSource = "unknown";
    return;
  }

  const token = state.listen.preloadToken + 1;
  state.listen.preloadToken = token;

  const candidates = getAudioCandidatesForAyah(nextAyah);
  for (const src of candidates) {
    try {
      await preloadAudioSource(src, token);
      if (token !== state.listen.preloadToken) return;

      state.listen.preloadedIndex = nextIndex;
      state.listen.preloadedUrl = src;
      state.listen.preloadedSource = src.startsWith("./offline-data/") ? "local" : "online";
      return;
    } catch (_error) {
      // Try next source.
    }
  }

  if (token === state.listen.preloadToken) {
    state.listen.preloadedIndex = -1;
    state.listen.preloadedUrl = "";
    state.listen.preloadedSource = "unknown";
  }
}

async function playCurrentListenAyah() {
  if (!state.listen.running) return;
  if (state.listen.playMode === "surah") {
    await playCurrentSurah();
    return;
  }

  const ayahObj = state.flatAyahs[state.listen.ayahIndex];
  if (!ayahObj) {
    autoResetAfterListenFinished();
    return;
  }

  highlightListenAyah(state.listen.ayahIndex);
  listenStatusText.classList.add("hidden");
  const hasPreloadedCurrent =
    state.listen.preloadedIndex === state.listen.ayahIndex && state.listen.preloadedUrl;

  if (hasPreloadedCurrent) {
    swapAudioPlayers();
    try {
      await activePlayer.play();
      state.audioSource = state.listen.preloadedSource;
      state.listen.preloadedIndex = -1;
      state.listen.preloadedUrl = "";
      state.listen.preloadedSource = "unknown";
      primeNextListenAyah();
      return;
    } catch (_error) {
      // Fall through to direct source playback.
    }
  }

  const sources = getAudioCandidatesForAyah(ayahObj);

  let started = false;
  for (const src of sources) {
    try {
      await playAudioSource(src);
      const sourceType = hasPreloadedCurrent
        ? state.listen.preloadedSource
        : src.startsWith("./offline-data/")
          ? "local"
          : "online";
      state.audioSource = sourceType;
      state.listen.preloadedIndex = -1;
      state.listen.preloadedUrl = "";
      state.listen.preloadedSource = "unknown";
      state.listen.consecutiveFailures = 0;
      primeNextListenAyah();
      started = true;
      break;
    } catch (_error) {
      // Try next source.
    }
  }

  if (!started) {
    state.listen.consecutiveFailures += 1;
    const maxFailures = 25;
    const hasNextAyah = state.listen.ayahIndex < state.flatAyahs.length - 1;

    if (hasNextAyah && state.listen.consecutiveFailures <= maxFailures) {
      state.listen.ayahIndex += 1;
      resetPreloadState();
      await playCurrentListenAyah();
      return;
    }

    stopListenPlayback();
    updateListenControls("paused");
    listenStatusText.classList.remove("hidden");
    listenStatusText.textContent = "تعذر تشغيل التلاوة لعدة آيات متتالية.";
  }
}

async function playCurrentSurah() {
  if (!state.listen.running) return;

  if (state.listen.currentSurahNumber > 114) {
    autoResetAfterListenFinished();
    return;
  }

  const startAyah =
    state.listen.currentSurahNumber === state.listen.initialSurahNumber
      ? state.listen.startAyahInSurah
      : 1;
  const startIndex = getFlatIndexForSurahAyah(state.listen.currentSurahNumber, startAyah);
  const previous = listenAyahList.querySelector(".ayah.active-ayah");
  if (previous) previous.classList.remove("active-ayah");
  if (startIndex >= 0) {
    state.listen.ayahIndex = startIndex;
    const startElement = listenAyahList.querySelector(`[data-ayah-index="${startIndex}"]`);
    if (startElement) {
      scrollElementIntoReaderArea(listenReaderArea, startElement, "auto");
    }
  }
  state.listen.lastScrolledAyahInSurah = Math.max(1, startAyah);
  state.listen.surahTimingsMs = await loadSurahTimingsMs(state.listen.currentSurahNumber);
  state.listen.usesExactTimings = state.listen.surahTimingsMs.length > 0;
  state.listen.surahRatios = buildSurahRatios(state.listen.currentSurahNumber);
  listenStatusText.classList.add("hidden");

  const sources = getSurahAudioCandidates(state.listen.reciter, state.listen.currentSurahNumber);
  let started = false;
  for (const src of sources) {
    try {
      await playAudioSource(src);
      if (startAyah > 1) {
        // Seek within surah file and keep continuous-surah mode.
        seekSurahToAyah(state.listen.currentSurahNumber, startAyah);
        await activePlayer.play().catch(() => {});
        state.listen.startAyahInSurah = 1;
      }
      state.audioSource = src.startsWith("./offline-data/") ? "local" : "online";
      started = true;
      break;
    } catch (_error) {
      // Try next source.
    }
  }

  if (!started) {
    // Skip missing surah files automatically.
    state.listen.currentSurahNumber += 1;
    state.listen.startAyahInSurah = 1;
    state.listen.surahRatios = [];
    await playCurrentSurah();
  }
}

function playAudioSource(src) {
  return new Promise((resolve, reject) => {
    const onPlaying = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("Audio source failed"));
    };

    const cleanup = () => {
      activePlayer.removeEventListener("playing", onPlaying);
      activePlayer.removeEventListener("error", onError);
    };

    activePlayer.addEventListener("playing", onPlaying, { once: true });
    activePlayer.addEventListener("error", onError, { once: true });
    activePlayer.src = src;

    activePlayer.play().catch((error) => {
      cleanup();
      reject(error);
    });
  });
}

async function startListenPlayback() {
  if (!ensureAyahsReadyForStart("listen")) return;
  if (
    state.listen.started &&
    activePlayer.src &&
    activePlayer.paused &&
    activePlayer.currentTime > 0 &&
    !activePlayer.ended
  ) {
    state.listen.running = true;
    updateListenControls("running");
    activePlayer.play().catch(() => {
      updateListenControls("paused");
      state.listen.running = false;
    });
    return;
  }

  if (!state.listen.started) {
    const offlineValidation = await validateOfflineListenSelection();
    if (!offlineValidation.ok) {
      state.listen.running = false;
      updateListenControls("initial");
      listenStatusText.classList.remove("hidden");
      listenStatusText.textContent = offlineValidation.message;
      showToast(offlineValidation.message, "error", 4200);
      return;
    }

    const { surahNumber, ayahNumber } = getSelectedSurahAyah();
    state.listen.playMode = state.recitationMode;
    state.listen.currentSurahNumber = surahNumber;
    state.listen.initialSurahNumber = surahNumber;
    state.listen.startAyahInSurah = ayahNumber;
    state.listen.surahRatios = [];
    state.listen.ayahIndex = getStartIndexFromSelection();
    resetPreloadState();
    const previous = listenAyahList.querySelector(".ayah.active-ayah");
    if (previous) previous.classList.remove("active-ayah");
    if (state.listen.playMode === "surah") {
      const surahStart = getSurahStartFlatIndex(surahNumber);
      if (surahStart >= 0) state.listen.ayahIndex = surahStart;
      listenReaderArea.scrollTop = 0;
    }
  }

  state.listen.started = true;
  state.listen.running = true;
  state.listen.consecutiveFailures = 0;
  state.listen.transitionInProgress = false;
  updateListenControls("running");
  playCurrentListenAyah();
}

function applyReaderStyle() {
  readAyahList.style.fontSize = `${state.readFontSize}px`;
  listenAyahList.style.fontSize = `${state.listenFontSize}px`;
  if (ramadanAyahList) {
    ramadanAyahList.style.fontSize = `${state.readFontSize}px`;
  }
}

function buildAyahElement(ayah, flatIndex) {
  const p = document.createElement("p");
  p.className = "ayah";
  p.dataset.ayahIndex = String(flatIndex);
  p.append(document.createTextNode(`${ayah.text} `));
  const ayahNumber = document.createElement("span");
  ayahNumber.className = "ayah-number";
  ayahNumber.textContent = `(${ayah.numberInSurah})`;
  p.appendChild(ayahNumber);
  return p;
}

function renderAyahLists() {
  readAyahList.innerHTML = "";
  listenAyahList.innerHTML = "";
  state.flatAyahs = [];

  let flatIndex = 0;
  for (const surah of state.surahs) {
    const readHeading = document.createElement("h3");
    readHeading.className = "surah-title";
    readHeading.textContent = ` ${surah.name}`;
    readAyahList.appendChild(readHeading);

    const listenHeading = document.createElement("h3");
    listenHeading.className = "surah-title";
    listenHeading.textContent = ` ${surah.name}`;
    listenAyahList.appendChild(listenHeading);

    for (const ayah of surah.ayahs) {
      const flatAyah = {
        surahNumber: surah.number,
        ayahNumber: ayah.numberInSurah,
        text: ayah.text,
      };
      state.flatAyahs.push(flatAyah);

      readAyahList.appendChild(buildAyahElement(ayah, flatIndex));
      listenAyahList.appendChild(buildAyahElement(ayah, flatIndex));
      flatIndex += 1;
    }
  }

  applyReaderStyle();
  populateListenSurahSelect();
  populateReadSurahSelect();
  updateAyahInputLimits();
  const readSelection = loadReadSelectionFromStorage();
  if (readSelection) {
    if (readSurahSelect) {
      readSurahSelect.value = readSelection.surahNumber ? String(readSelection.surahNumber) : "";
    }
    if (readAyahInput) {
      readAyahInput.value = String(readSelection.ayahNumber || 1);
    }
    updateReadAyahInputLimits();
    applyReadSelection(readSelection.surahNumber, readSelection.ayahNumber, "auto");
  } else {
    updateReadAyahInputLimits();
  }
  refreshOfflineListenAvailability();
}

async function ensureQuranLoaded(target) {
  if (state.quranReady) {
    readStatusText.classList.add("hidden");
    listenStatusText.classList.add("hidden");
    if (ramadanStatusText) ramadanStatusText.classList.add("hidden");
    readReaderArea.classList.remove("hidden");
    listenReaderArea.classList.remove("hidden");
    if (ramadanReaderArea) ramadanReaderArea.classList.remove("hidden");
    return true;
  }

  const status =
    target === "listen" ? listenStatusText : target === "ramadan" ? ramadanStatusText : readStatusText;
  const area = target === "listen" ? listenReaderArea : target === "ramadan" ? ramadanReaderArea : readReaderArea;
  status.classList.remove("hidden");
  status.textContent = "جاري تحميل القرآن الكريم...";
  area.classList.add("hidden");

  try {
    let data = null;
    let loadSource = "unknown";

    const cachedPayload = loadQuranPayloadFromStorage();
    if (cachedPayload) {
      data = cachedPayload;
      loadSource = "local";
    } else {
      try {
        const offlineResponse = await fetch(OFFLINE_QURAN_JSON_URL, { cache: "no-store" });
        if (offlineResponse.ok) {
          data = await offlineResponse.json();
          loadSource = "local";
        }
      } catch (_offlineError) {
        // Continue to online fallback.
      }

      if (!data) {
        try {
          const onlineResponse = await fetch(QURAN_API_URL, { cache: "no-store" });
          if (!onlineResponse.ok) throw new Error(`online source failed: ${onlineResponse.status}`);
          data = await onlineResponse.json();
          loadSource = "online";
        } catch (onlineError) {
          const message = String(onlineError?.message || "");
          const isLikelyNetworkError =
            onlineError instanceof TypeError || message.includes("Failed to fetch");
          if (!navigator.onLine || isLikelyNetworkError) {
            throw new Error("network unavailable");
          }
          throw onlineError;
        }
      }
    }

    const surahs = data?.data?.surahs || data?.surahs;
    if (!Array.isArray(surahs) || surahs.length === 0) {
      throw new Error("invalid quran payload");
    }

    state.surahs = surahs;
    state.quranReady = true;
    state.quranSource = loadSource;
    saveQuranPayloadToStorage({ surahs });
    renderAyahLists();

    readStatusText.classList.add("hidden");
    listenStatusText.classList.add("hidden");
    if (ramadanStatusText) ramadanStatusText.classList.add("hidden");
    readReaderArea.classList.remove("hidden");
    listenReaderArea.classList.remove("hidden");
    if (ramadanReaderArea) ramadanReaderArea.classList.remove("hidden");
    return true;
  } catch (error) {
    const message = String(error?.message || "");
    if (message.includes("network unavailable")) {
      status.textContent = "تعذر الوصول للإنترنت. يمكنك تنزيل القرآن من الإعدادات أو المحاولة لاحقًا.";
    } else if (message.includes("invalid quran payload")) {
      status.textContent = "تم تحميل بيانات غير صالحة للآيات. حاول مرة أخرى.";
    } else {
      status.textContent = "تعذر تحميل الآيات. حمّل القرآن من الإعدادات أو تأكد من اتصال الإنترنت.";
    }
    console.error(error);
    return false;
  }
}

function pauseEverything() {
  if (state.read.running) {
    stopReadScroll();
    if (state.read.started) updateReadControls("paused");
  }
  if (state.ramadan.running) {
    stopRamadanScroll();
    if (state.ramadan.started) updateRamadanControls("paused");
    saveRamadanProgressToStorage();
  }
  if (state.listen.running) {
    stopListenPlayback();
    if (state.listen.started) updateListenControls("paused");
  }
}

async function openReadView() {
  pauseEverything();
  setVisibleView("read");
  const loaded = await ensureQuranLoaded("read");
  if (!loaded) return;

  state.read.started = false;
  const saved = loadReadSelectionFromStorage();
  if (saved) {
    applyReadSelection(saved.surahNumber, saved.ayahNumber, "auto");
  } else {
    readReaderArea.scrollTop = 0;
  }
  readStatusText.classList.add("hidden");
  updateReadControls("initial");
}

async function openListenView() {
  pauseEverything();
  setVisibleView("listen");
  const loaded = await ensureQuranLoaded("listen");
  if (!loaded) return;

  state.listen.started = false;
  state.listen.ayahIndex = 0;
  state.listen.consecutiveFailures = 0;
  state.listen.playMode = state.recitationMode;
  state.listen.currentSurahNumber = 1;
  state.listen.initialSurahNumber = 1;
  state.listen.startAyahInSurah = 1;
  state.listen.lastScrolledAyahInSurah = 0;
  state.listen.surahResumeAttempts = 0;
  state.listen.surahTimingsMs = [];
  state.listen.usesExactTimings = false;
  state.listen.surahRatios = [];
  const previous = listenAyahList.querySelector(".ayah.active-ayah");
  if (previous) previous.classList.remove("active-ayah");
  listenReaderArea.scrollTop = 0;
  listenStatusText.classList.add("hidden");
  resetPreloadState();
  updateListenControls("initial");
  await refreshOfflineListenAvailability();
}

function resetListenSession(options = {}) {
  const { keepSelection = false } = options;
  stopListenPlayback();
  state.listen.ayahIndex = 0;
  state.listen.started = false;
  state.listen.consecutiveFailures = 0;
  state.listen.playMode = state.recitationMode;
  state.listen.currentSurahNumber = 1;
  state.listen.initialSurahNumber = 1;
  state.listen.startAyahInSurah = 1;
  state.listen.lastScrolledAyahInSurah = 0;
  state.listen.surahResumeAttempts = 0;
  state.listen.surahTimingsMs = [];
  state.listen.usesExactTimings = false;
  state.listen.surahRatios = [];
  state.listen.transitionInProgress = false;
  const previous = listenAyahList.querySelector(".ayah.active-ayah");
  if (previous) previous.classList.remove("active-ayah");
  listenReaderArea.scrollTop = 0;
  listenStatusText.classList.add("hidden");
  resetPreloadState();
  if (!keepSelection) {
    resetListenSelectionInputs();
  }
  updateListenControls("initial");
}

function backToHome() {
  if (state.currentView === "listen") {
    resetListenSelectionInputs();
  } else if (state.currentView === "ramadan") {
    saveRamadanProgressToStorage();
  }
  pauseEverything();
  if (ramadanDayTimer) {
    clearInterval(ramadanDayTimer);
    ramadanDayTimer = null;
  }
  setVisibleView("home");
}

function openSettingsDialog() {
  pauseEverything();
  if (speedSettingRow) {
    speedSettingRow.classList.toggle(
      "hidden",
      state.currentView !== "read" && state.currentView !== "ramadan"
    );
  }
  if (fontSettingRow) {
    fontSettingRow.classList.toggle(
      "hidden",
      state.currentView !== "read" && state.currentView !== "listen" && state.currentView !== "ramadan"
    );
  }
  if (readSurahSettingRow) {
    readSurahSettingRow.classList.toggle("hidden", state.currentView !== "read");
  }
  if (readAyahSettingRow) {
    readAyahSettingRow.classList.toggle("hidden", state.currentView !== "read");
  }
  if (recitationModeSettingRow) {
    recitationModeSettingRow.classList.toggle("hidden", state.currentView !== "listen");
  }
  if (listenSelectionsSettingsSection) {
    listenSelectionsSettingsSection.classList.toggle("hidden", state.currentView !== "listen");
  }
  if (offlineSettingsSection) {
    offlineSettingsSection.classList.toggle("hidden", state.currentView !== "home");
  }
  if (reciterOfflineSettingRow) {
    reciterOfflineSettingRow.classList.toggle("hidden", state.currentView !== "home");
  }
  if (offlineReciterSelect && !offlineReciterSelect.value) {
    offlineReciterSelect.value = state.listen.reciter;
  }
  if (fontRange) {
    if (state.currentView === "read") {
      fontRange.value = String(state.readFontSize);
    } else if (state.currentView === "listen") {
      fontRange.value = String(state.listenFontSize);
    } else if (state.currentView === "ramadan") {
      fontRange.value = String(state.readFontSize);
    }
  }
  if (state.currentView === "read") {
    const savedReadSelection = loadReadSelectionFromStorage();
    if (savedReadSelection && readSurahSelect && readAyahInput) {
      readSurahSelect.value = savedReadSelection.surahNumber
        ? String(savedReadSelection.surahNumber)
        : "";
      readAyahInput.value = String(savedReadSelection.ayahNumber || 1);
    }
    updateReadAyahInputLimits();
  }
  ensureOfflineSurahRangeOptions();
  setOfflineStatus("");
  resetDownloadProgressUI();
  showManagedDialog(settingsDialog);
}

managedDialogs.forEach((dialog) => {
  dialog.addEventListener("close", unlockBackgroundScroll);
  dialog.addEventListener("cancel", () => {
    window.setTimeout(unlockBackgroundScroll, 0);
  });
});

safeAddEventListener(readBtn, "click", openReadView);
safeAddEventListener(readListenBtn, "click", openListenView);
safeAddEventListener(ramadanBtn, "click", openRamadanView);
safeAddEventListener(homeSettingsBtn, "click", openSettingsDialog);
safeAddEventListener(backHomeFromReadBtn, "click", backToHome);
safeAddEventListener(backHomeFromListenBtn, "click", backToHome);
safeAddEventListener(backHomeFromRamadanBtn, "click", backToHome);
safeAddEventListener(readSettingsBtn, "click", openSettingsDialog);
safeAddEventListener(listenSettingsBtn, "click", openSettingsDialog);
safeAddEventListener(ramadanSettingsBtn, "click", openSettingsDialog);

safeAddEventListener(readStartBtn, "click", startReadScroll);
safeAddEventListener(readStopBtn, "click", () => {
  stopReadScroll();
  updateReadControls("paused");
});
safeAddEventListener(readContinueBtn, "click", startReadScroll);
safeAddEventListener(readResetBtn, "click", () => {
  resetReadSession();
});

safeAddEventListener(ramadanStartBtn, "click", startRamadanScroll);
safeAddEventListener(ramadanStopBtn, "click", () => {
  stopRamadanScroll();
  updateRamadanControls("paused");
  saveRamadanProgressToStorage();
});
safeAddEventListener(ramadanContinueBtn, "click", startRamadanScroll);
safeAddEventListener(ramadanResetBtn, "click", resetRamadanSession);
safeAddEventListener(ramadanNextJuzBtn, "click", moveToNextRamadanJuz);

safeAddEventListener(listenStartBtn, "click", startListenPlayback);
safeAddEventListener(listenStopBtn, "click", () => {
  stopListenPlayback();
  updateListenControls("paused");
});
safeAddEventListener(listenContinueBtn, "click", startListenPlayback);
safeAddEventListener(listenResetBtn, "click", () => {
  resetListenSession();
});

safeAddEventListener(reciterSelect, "change", (event) => {
  state.listen.reciter = event.target.value;
  resetListenSession();
  updateOfflineListenAvailabilityUI();
  showToast("تمت إعادة تعيين التشغيل بعد تغيير القارئ.");
});

safeAddEventListener(listenSurahSelect, "change", () => {
  updateAyahInputLimits();
  resetListenSession({ keepSelection: true });
  updateOfflineListenAvailabilityUI();
  showToast("تمت إعادة تعيين التشغيل بعد تغيير السورة.");
});

safeAddEventListener(listenAyahInput, "input", () => {
  const minAyah = 1;
  const maxAyah = Number(listenAyahInput.max || 99999);
  const current = Number(listenAyahInput.value);
  if (!listenAyahInput.value) return;

  if (!Number.isFinite(current) || current < minAyah) {
    listenAyahInput.value = String(minAyah);
    return;
  }
  if (current > maxAyah) {
    listenAyahInput.value = String(maxAyah);
  }
});

safeAddEventListener(listenAyahInput, "change", () => {
  resetListenSession({ keepSelection: true });
  updateOfflineListenAvailabilityUI();
  showToast("تمت إعادة تعيين التشغيل بعد تغيير رقم الآية.");
});

safeAddEventListener(listenAyahSelectOffline, "change", () => {
  if (listenAyahInput && listenAyahSelectOffline?.value) {
    listenAyahInput.value = listenAyahSelectOffline.value;
  }
  resetListenSession({ keepSelection: true });
  updateOfflineListenAvailabilityUI();
  showToast("تمت إعادة تعيين التشغيل بعد تغيير رقم الآية.");
});

safeAddEventListener(readSurahSelect, "change", () => {
  updateReadAyahInputLimits();
  applyReadSelection(Number(readSurahSelect.value || 0), Number(readAyahInput?.value || 1), "auto");
  resetReadSession();
});

safeAddEventListener(readAyahInput, "input", () => {
  const maxAyah = Number(readAyahInput.max || 99999);
  const current = Number(readAyahInput.value);
  if (!readAyahInput.value) return;
  if (!Number.isFinite(current) || current < 1) {
    readAyahInput.value = "1";
    return;
  }
  if (current > maxAyah) {
    readAyahInput.value = String(maxAyah);
  }
});

safeAddEventListener(readAyahInput, "change", () => {
  updateReadAyahInputLimits();
  applyReadSelection(Number(readSurahSelect?.value || 0), Number(readAyahInput.value || 1), "auto");
  resetReadSession();
});

safeAddEventListener(ramadanReaderArea, "scroll", () => {
  if (state.currentView !== "ramadan") return;
  const reachedEnd =
    ramadanReaderArea.scrollTop + ramadanReaderArea.clientHeight >= ramadanReaderArea.scrollHeight - 2;
  if (reachedEnd && !state.ramadan.juzCompleted) {
    markCurrentJuzCompleted();
    return;
  }
  saveRamadanProgressToStorage();
});

safeAddEventListener(speedRange, "input", (event) => {
  state.speed = Number(event.target.value);
});

safeAddEventListener(fontRange, "input", (event) => {
  const nextSize = Number(event.target.value);
  if (state.currentView === "listen") {
    state.listenFontSize = nextSize;
  } else {
    state.readFontSize = nextSize;
  }
  applyReaderStyle();
  if (ramadanAyahList) {
    ramadanAyahList.style.fontSize = `${state.readFontSize}px`;
  }
});

if (themeModeSelect) {
  themeModeSelect.addEventListener("change", (event) => {
    const selectedMode = event.target.value;
    if (selectedMode !== "normal" && selectedMode !== "night" && selectedMode !== "auto") return;
    applyTheme(selectedMode);
    saveThemeMode(selectedMode);
  });
}

if (recitationModeSelect) {
  recitationModeSelect.addEventListener("change", (event) => {
    const selectedMode = event.target.value;
    if (selectedMode !== "ayah") {
      recitationModeSelect.value = "ayah";
      return;
    }
    
    state.recitationMode = selectedMode;
    state.listen.playMode = selectedMode;
    saveRecitationMode(selectedMode);
    updateRecitationModeBadge();

    if (selectedMode === "surah") {
      const activeAyah = listenAyahList.querySelector(".ayah.active-ayah");
      if (activeAyah) activeAyah.classList.remove("active-ayah");
    }

    resetListenSession();
    showToast("تمت إعادة تعيين التشغيل بعد تغيير نمط القراءة.");
  });
}

safeAddEventListener(offlineStartSurahSelect, "change", () => {
  syncOfflineSurahRange("start");
});

safeAddEventListener(offlineEndSurahSelect, "change", () => {
  syncOfflineSurahRange("end");
});

safeAddEventListener(downloadQuranBtn, "click", downloadQuranOffline);
safeAddEventListener(downloadReciterBtn, "click", downloadSelectedReciterOffline);
safeAddEventListener(openStorageManagerBtn, "click", openStorageManagerDialog);
safeAddEventListener(openOfflineLogBtn, "click", openOfflineLogDialog);
safeAddEventListener(offlineLogDialog, "click", handleOfflineLogMoreToggle);
safeAddEventListener(deleteSelectedDataBtn, "click", deleteSelectedStoredData);
safeAddEventListener(offlineLogReciterFilter, "change", renderOfflineLogDialog);
safeAddEventListener(offlineReciterSelect, "change", () => {
  showToast("تم تحديد القارئ الذي سيتم تنزيل صوته.");
});
safeAddEventListener(document, "keydown", handlePlaybackShortcuts);

systemThemeMediaQuery.addEventListener("change", () => {
  if (state.themeMode !== "auto") return;
  applyTheme("auto");
});

window.addEventListener("online", () => {
  updateOfflineListenAvailabilityUI();
  showToast("تم الاتصال بالإنترنت.");
});

window.addEventListener("offline", async () => {
  await refreshOfflineListenAvailability();
  showToast("أنت الآن بدون إنترنت. الخيارات غير المحفوظة أصبحت غير متاحة.");
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    syncRamadanButtonAvailability();
    return;
  }
  // Keep recitation playing in background; pause only visual auto-scroll view.
  if (state.currentView === "read" && state.read.running) {
    stopReadScroll();
    updateReadControls("paused");
  } else if (state.currentView === "ramadan" && state.ramadan.running) {
    stopRamadanScroll();
    updateRamadanControls("paused");
    saveRamadanProgressToStorage();
  }
});

if ("serviceWorker" in navigator) {
  let reloadedForServiceWorker = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadedForServiceWorker) return;
    reloadedForServiceWorker = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then((registration) => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              worker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      })
      .catch((error) => {
        console.error("Service worker registration failed:", error);
      });
  });
}

bindActiveEndedHandler();
updateReadControls("initial");
updateRamadanControls("initial");
updateListenControls("initial");
syncReciterDownloadButton();
initThemeMode();
initRecitationMode();
refreshOfflineListenAvailability();
syncRamadanButtonAvailability();

window.addEventListener("error", () => {
  showToast("حدث خطأ غير متوقع وتمت محاولة الإصلاح.", "error");
});

window.addEventListener("unhandledrejection", () => {
  showToast("حدث تعارض مؤقت وتمت إعادة المحاولة تلقائيًا.", "error");
});

runPeriodicMaintenance();
window.setInterval(runPeriodicMaintenance, PERIODIC_MAINTENANCE_MS);
