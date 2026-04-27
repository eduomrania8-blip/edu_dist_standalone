// Data Store
let DATA = {
    schools: [],
    supervisors: [],
    wishes: [],
    guidance: [],
    final: [],
    activeUser: null
};

// Authentication & Security
const ADMIN_PASSWORD = 'admin2026'; // يمكن تغييره من هنا
let isAdminAuthenticated = sessionStorage.getItem('adminAuth') === 'true';

// Default Configuration
const CONFIG = {
    defaultSheetId: localStorage.getItem('sheetId') || '1CuCtGc5uCx-6F-gtSY5gdmbmMOsJQscS_VQhP2QRSw8',
    defaultGasUrl: localStorage.getItem('gasUrl') || 'https://script.google.com/macros/s/AKfycbwy8C1vCejq2UoRnSE-WZMiwpDJTHE9-E9qMu4011xsJLUraHtOQs4j5hvnONZp7Sc3Pw/exec'
};

// Initialize UI with defaults
window.addEventListener('DOMContentLoaded', async () => {
    const sheetInput = document.getElementById('sheetId');
    const gasInput = document.getElementById('gasUrl');
    if (sheetInput) sheetInput.value = CONFIG.defaultSheetId;
    if (gasInput) gasInput.value = CONFIG.defaultGasUrl;

    // 1. Try Loading from Local Cache First (Instant Load)
    try {
        const cached = localStorage.getItem('cachedData');
        if (cached) {
            const parsed = JSON.parse(cached);
            DATA = parsed;
            console.log("Loaded data from cache:", DATA);

            // Restore Settings from Cache
            if (DATA.settings) {
                parseSettings(DATA.settings);
                if (typeof loadSettingsToUI === 'function') loadSettingsToUI();
            }

            updateDashboard();
            initLoginFilters();
            renderAdminTable(); // Render tables from cache
        }
    } catch (e) {
        console.error("Error loading cache:", e);
    }

    // 2. Automatic Background Sync
    if (CONFIG.defaultSheetId && CONFIG.defaultGasUrl) {
        console.log("Starting automatic background sync...");
        // Use fetchAllData if loadDataFromServer is just a wrapper or undefined in this scope
        if (typeof fetchAllData === 'function') {
            await fetchAllData(true); // Silent mode
        } else if (typeof loadDataFromServer === 'function') {
            await loadDataFromServer(CONFIG.defaultSheetId);
        }
    }
});

// --- Navigation ---

function navigate(tab) {
    // Check admin authentication
    if (tab === 'admin' && !isAdminAuthenticated) {
        showAdminLogin();
        return;
    }

    document.getElementById('view-supervisor').classList.toggle('hidden', tab !== 'supervisor');
    document.getElementById('view-admin').classList.toggle('hidden', tab !== 'admin');

    document.getElementById('nav-supervisor').classList.toggle('tab-active', tab === 'supervisor');
    document.getElementById('nav-admin').classList.toggle('tab-active', tab === 'admin');

    document.getElementById('nav-supervisor').classList.toggle('text-slate-400', tab !== 'supervisor');
    document.getElementById('nav-admin').classList.toggle('text-slate-400', tab !== 'admin');

    if (tab === 'supervisor') {
        // Reset to login screen if coming back
        document.getElementById('view-supervisor').children[0].classList.remove('hidden');
        document.getElementById('wishesSection').classList.add('hidden');
        DATA.activeUser = null;

        // Auto-load filters if we have data
        if (DATA.supervisors.length > 0) {
            initLoginFilters();
        } else {
            // If No data, maybe try to sync automatically from defaults
            const sheetId = document.getElementById('sheetId').value || CONFIG.defaultSheetId;
            if (sheetId) syncAllData();
        }
    }
}

// --- Admin Authentication ---
function showAdminLogin() {
    const modal = document.getElementById('adminLoginModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('adminPasswordInput').value = '';
        document.getElementById('adminPasswordInput').focus();
    }
}

function verifyAdminLogin() {
    const password = document.getElementById('adminPasswordInput').value.trim();

    if (password === ADMIN_PASSWORD) {
        isAdminAuthenticated = true;
        sessionStorage.setItem('adminAuth', 'true');
        document.getElementById('adminLoginModal').classList.add('hidden');
        navigate('admin');
        showToast('مرحباً بك في لوحة الإدارة', '✅');
    } else {
        showToast('كلمة المرور غير صحيحة', '❌');
        document.getElementById('adminPasswordInput').value = '';
    }
}

function adminLogout() {
    isAdminAuthenticated = false;
    sessionStorage.removeItem('adminAuth');
    navigate('supervisor');
    showToast('تم تسجيل الخروج من لوحة الإدارة', 'ℹ️');
}

// (Redundant switchAdminTab removed - Unified version implemented below)


// --- Data Fetching ---

async function fetchAllData(silent = false) {
    if (!silent) toggleLoader(true, "جاري تحميل البيانات...");
    const gasUrl = document.getElementById('gasUrl')?.value || localStorage.getItem('gasUrl');

    if (!gasUrl) {
        if (!silent) toggleLoader(false);
        if (!silent) showToast("يرجى إدخال رابط Google Apps Script", "error");
        return;
    }

    try {
        const response = await fetch(`${gasUrl}?action=getAll`);
        const result = await response.json();

        if (result.status === 'success') {
            DATA.schools = result.data.schools || [];
            DATA.supervisors = result.data.supervisors || [];
            DATA.guidance = result.data.guidance || [];

            // Load Settings if available
            if (result.data.settings && result.data.settings.length > 0) {
                parseSettings(result.data.settings);
                DATA.settings = result.data.settings; // Save raw settings to DATA for caching
            }

            // Sync with local storage
            localStorage.setItem('cachedData', JSON.stringify(DATA));

            updateStats();
            renderAdminTable();
            if (typeof loadSettingsToUI === 'function') loadSettingsToUI(); // Ensure UI is updated
            if (!silent) showToast("تم تحديث البيانات بنجاح", "success");
        } else {
            if (!silent) showToast("فشل في جلب البيانات", "error");
        }
    } catch (error) {
        console.error(error);
        if (!silent) showToast("حدث خطأ في الاتصال", "error");
    } finally {
        if (!silent) toggleLoader(false);
    }
}

function formatPhone(val) {
    if (val === undefined || val === null) return '';
    let s = String(val).trim();
    // If it's a mobile number missing the leading zero (10 digits starting with 1 in Egypt)
    if (s.length === 10 && (s.startsWith('1') || s.startsWith('2') || s.startsWith('5'))) {
        if (/^\d+$/.test(s)) return '0' + s;
    }
    return s;
}

function parseSettings(settingsArr) {
    if (!settingsArr || !Array.isArray(settingsArr)) return;
    const map = {};
    const normalizeKey = (k) => String(k || '').trim().replace(/[\s_\-\.]/g, '').toLowerCase();

    settingsArr.forEach(row => {
        let k, v;
        if (Array.isArray(row)) {
            // New format: [Label, Value, Key]
            // We prioritize row[2] (Technical Key) as the absolute identifier
            if (row.length >= 3 && row[2]) {
                k = row[2];
                v = row[1];
            } else if (row.length >= 2) {
                k = row[0];
                v = row[1];
            }
        } else if (typeof row === 'object') {
            const keys = Object.keys(row);
            const keyProp = keys.find(p => normalizeKey(p) === 'key');
            const valProp = keys.find(p => normalizeKey(p) === 'value');

            k = keyProp ? row[keyProp] : Object.values(row)[0];
            v = valProp ? row[valProp] : (row.Value !== undefined ? row.Value : row.value);
            if (!v && v !== 0 && keys.length > 1) v = Object.values(row)[1];
        }
        if (k) map[normalizeKey(k)] = v;
    });

    if (Object.keys(map).length === 0) return;

    const setIfMatch = (targetKey, setter) => {
        const norm = normalizeKey(targetKey);
        if (map[norm] !== undefined) setter(map[norm]);
    };

    setIfMatch('governorate', v => SETTINGS.governorate = String(v || '').trim());
    setIfMatch('directorate', v => SETTINGS.directorate = String(v || '').trim());
    setIfMatch('academicYear', v => SETTINGS.academicYear = String(v || '').trim());
    setIfMatch('semester', v => SETTINGS.semester = String(v || '').trim());

    setIfMatch('officials_gm_name', v => SETTINGS.officials.gm.name = String(v || '').trim());
    setIfMatch('officials_gm_title', v => SETTINGS.officials.gm.title = String(v || '').trim());
    setIfMatch('officials_gm_phone', v => SETTINGS.officials.gm.phone = formatPhone(v));

    setIfMatch('officials_deputy_name', v => SETTINGS.officials.deputy.name = String(v || '').trim());
    setIfMatch('officials_deputy_title', v => SETTINGS.officials.deputy.title = String(v || '').trim());
    setIfMatch('officials_deputy_phone', v => SETTINGS.officials.deputy.phone = formatPhone(v));

    setIfMatch('officials_security_name', v => SETTINGS.officials.security.name = String(v || '').trim());
    setIfMatch('officials_security_title', v => SETTINGS.officials.security.title = String(v || '').trim());
    setIfMatch('officials_security_phone', v => SETTINGS.officials.security.phone = formatPhone(v));

    setIfMatch('officials_mgr_primary', v => SETTINGS.officials.managers.primary = String(v || '').trim());
    setIfMatch('officials_mgr_primary_phone', v => SETTINGS.officials.managers.primaryPhone = formatPhone(v));

    setIfMatch('officials_mgr_prep', v => SETTINGS.officials.managers.prep = String(v || '').trim());
    setIfMatch('officials_mgr_prep_phone', v => SETTINGS.officials.managers.prepPhone = formatPhone(v));

    setIfMatch('officials_mgr_sec', v => SETTINGS.officials.managers.secondary = String(v || '').trim());
    setIfMatch('officials_mgr_sec_phone', v => SETTINGS.officials.managers.secondaryPhone = formatPhone(v));

    if (typeof loadSettingsToUI === 'function') loadSettingsToUI();
}

function loadSettingsToUI() {
    if (!document.getElementById('set_governorate')) return;

    document.getElementById('set_governorate').value = SETTINGS.governorate || '';
    document.getElementById('set_directorate').value = SETTINGS.directorate || '';
    document.getElementById('set_year').value = SETTINGS.academicYear || '';
    document.getElementById('set_semester').value = SETTINGS.semester || '';

    document.getElementById('set_gm_name').value = SETTINGS.officials.gm.name || '';
    document.getElementById('set_gm_title').value = SETTINGS.officials.gm.title || '';
    document.getElementById('set_gm_phone').value = SETTINGS.officials.gm.phone || '';

    document.getElementById('set_deputy_name').value = SETTINGS.officials.deputy.name || '';
    document.getElementById('set_deputy_title').value = SETTINGS.officials.deputy.title || '';
    document.getElementById('set_deputy_phone').value = SETTINGS.officials.deputy.phone || '';

    document.getElementById('set_security_name').value = SETTINGS.officials.security.name || '';
    document.getElementById('set_security_title').value = SETTINGS.officials.security.title || '';
    document.getElementById('set_security_phone').value = SETTINGS.officials.security.phone || '';

    document.getElementById('set_mgr_primary').value = SETTINGS.officials.managers.primary || '';
    document.getElementById('set_mgr_primary_phone').value = SETTINGS.officials.managers.primaryPhone || '';

    document.getElementById('set_mgr_prep').value = SETTINGS.officials.managers.prep || '';
    document.getElementById('set_mgr_prep_phone').value = SETTINGS.officials.managers.prepPhone || '';

    document.getElementById('set_mgr_sec').value = SETTINGS.officials.managers.secondary || '';
    document.getElementById('set_mgr_sec_phone').value = SETTINGS.officials.managers.secondaryPhone || '';
}

async function saveSettings() {
    const gasUrl = document.getElementById('gasUrl')?.value || localStorage.getItem('gasUrl');
    if (!gasUrl) return showToast("يرجى إدخال رابط Google Apps Script", "error");

    // Robust Triplets: [Label (Column A), Value (Column B), TechnicalKey (Column C)]
    const settingsTriplets = [
        ["المحافظة", document.getElementById('set_governorate').value, "governorate"],
        ["الإدارة التعليمية", document.getElementById('set_directorate').value, "directorate"],
        ["العام الدراسي", document.getElementById('set_year').value, "academicYear"],
        ["الفصل الدراسي", document.getElementById('set_semester').value, "semester"],

        ["اسم مدير عام الإدارة", document.getElementById('set_gm_name').value, "officials_gm_name"],
        ["لقب مدير عام الإدارة", document.getElementById('set_gm_title').value, "officials_gm_title"],
        ["هاتف مدير عام الإدارة", document.getElementById('set_gm_phone').value, "officials_gm_phone"],

        ["اسم وكيل الإدارة", document.getElementById('set_deputy_name').value, "officials_deputy_name"],
        ["لقب وكيل الإدارة", document.getElementById('set_deputy_title').value, "officials_deputy_title"],
        ["هاتف وكيل الإدارة", document.getElementById('set_deputy_phone').value, "officials_deputy_phone"],

        ["اسم مسؤول أمن الإدارة", document.getElementById('set_security_name').value, "officials_security_name"],
        ["لقب مسؤول أمن الإدارة", document.getElementById('set_security_title').value, "officials_security_title"],
        ["هاتف مسؤول أمن الإدارة", document.getElementById('set_security_phone').value, "officials_security_phone"],

        ["مدير التعليم الابتدائي", document.getElementById('set_mgr_primary').value, "officials_mgr_primary"],
        ["هاتف مدير الابتدائي", document.getElementById('set_mgr_primary_phone').value, "officials_mgr_primary_phone"],

        ["مدير التعليم الإعدادي", document.getElementById('set_mgr_prep').value, "officials_mgr_prep"],
        ["هاتف مدير الإعدادي", document.getElementById('set_mgr_prep_phone').value, "officials_mgr_prep_phone"],

        ["مدير التعليم الثانوي", document.getElementById('set_mgr_sec').value, "officials_mgr_sec"],
        ["هاتف مدير الثانوي", document.getElementById('set_mgr_sec_phone').value, "officials_mgr_sec_phone"]
    ];

    try {
        toggleLoader(true, "جاري حفظ الإعدادات...");
        const response = await fetch(gasUrl, {
            method: 'POST',
            body: JSON.stringify({
                type: 'settings',
                settings: settingsTriplets
            })
        });

        const result = await response.json();
        if (result.status === 'success') {
            showToast("تم حفظ الإعدادات بنجاح ✅", "success");
            // Force re-fetch to sync with the new three-column structure
            await fetchAllData(true);
        } else {
            showToast("فشل في حفظ الإعدادات ❌", "error");
        }
    } catch (error) {
        console.error(error);
        showToast("خطأ في الاتصال بالخادم", "error");
    } finally {
        toggleLoader(false);
    }
}

function getVal(obj, key) {
    if (!obj) return '';
    // Normalize: remove all spaces, underscores, dashes, dots, and convert to lowercase
    const normalize = (s) => String(s).replace(/[\s_\-\.]/g, '').toLowerCase();
    const target = normalize(key);
    const foundKey = Object.keys(obj).find(k => normalize(k) === target);
    return foundKey ? obj[foundKey] : '';
}

function getGuidanceName(guidCode) {
    if (!guidCode) return '-';
    const sCode = String(guidCode).trim();
    const guidObj = DATA.guidance.find(g =>
        String(getVal(g, 'كود التوجيه')).trim() === sCode ||
        String(getVal(g, 'التوجيه')).trim() === sCode ||
        String(getVal(g, 'اسم التوجيه')).trim() === sCode
    );
    if (!guidObj) return guidCode;
    const name = getVal(guidObj, 'التوجيه') || getVal(guidObj, 'اسم التوجيه');
    return name ? `${name} (${sCode})` : sCode;
}

// --- Supervisor Availability Check ---
function isSupervisorAvailable(supervisor) {
    const status = (getVal(supervisor, 'الحالة') ||
        getVal(supervisor, 'متاح') ||
        getVal(supervisor, 'نشط') ||
        'متاح').trim().toLowerCase();
    return status !== 'غير متاح' && status !== 'غير نشط' && status !== '0';
}

async function fetchCSV(sheetId, tabName) {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
    try {
        const response = await fetch(url);
        const text = await response.text();

        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}`, isPrivate: response.status === 403 };
        }

        if (text.includes("<!DOCTYPE html>")) {
            return { success: false, error: "Private/Login Required", isPrivate: true };
        }

        if (text.length < 5) {
            return { success: false, error: "Empty Response", isPrivate: false };
        }

        return new Promise(resolve => {
            Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                complete: results => {
                    resolve({ success: true, data: results.data, columns: results.meta.fields });
                }
            });
        });
    } catch (e) {
        console.error(`Error fetching ${tabName}:`, e);
        return { success: false, error: e.message, isPrivate: false };
    }
}

async function loadDataFromServer(sheetId) {
    const gasUrl = document.getElementById('gasUrl').value.trim();
    const logEl = document.getElementById('syncLog');
    if (logEl) logEl.innerHTML = '';

    const log = (msg, type = 'info') => {
        console.log(`[Sync] ${msg}`);
        if (logEl) {
            const span = document.createElement('div');
            span.className = `text-[10px] py-1 border-b border-white/5 ${type === 'error' ? 'text-rose-400' : type === 'warn' ? 'text-amber-400' : type === 'success' ? 'text-emerald-400' : 'text-slate-400'}`;
            span.innerText = `> ${msg}`;
            logEl.appendChild(span);
        }
    };

    if (!gasUrl) {
        log("خطأ: رابط GAS Web App غير موجود. لا يمكن المزامنة بدون الرابط.", "error");
        showToast("يرجى إدخال رابط GAS أولاً", "⚠️");
        return false;
    }

    log("بدء الاتصال بـ Google Apps Script...", "info");
    toggleLoader(true, "جاري استيراد البيانات من الشيت...");

    try {
        const fetchUrl = `${gasUrl}${gasUrl.includes('?') ? '&' : '?'}action=fetch`;
        const response = await fetch(fetchUrl);

        if (!response.ok) {
            throw new Error(`تعذر الاتصال بالخادم (${response.status})`);
        }

        const result = await response.json();

        if (result.status === "success") {
            const d = result.data;
            DATA.schools = d.schools || [];
            DATA.supervisors = d.supervisors || [];
            DATA.guidance = d.guidance || [];
            DATA.wishes = d.wishes || [];
            DATA.mandatory = d.mandatory || [];

            if (DATA.mandatory.length > 0) {
                DATA.mandatory.forEach(m => {
                    const sCode = String(getVal(m, 'كود المدرسة')).trim();
                    const supName = getVal(m, 'الموجه المكلّف');
                    const school = DATA.schools.find(s => String(getVal(s, 'كود المدرسة')).trim() === sCode);
                    if (school) school._mandatorySup = supName;
                });
                log(`تم استعادة ${DATA.mandatory.length} تكليف إجباري`, "success");
            }

            // Restore Final Distribution Results
            if (d.finalResults && d.finalResults.length > 0) {
                DATA.final = DATA.schools.map(s => {
                    const sCode = String(getVal(s, 'كود المدرسة')).trim();
                    const result = d.finalResults.find(r => String(getVal(r, 'كود المدرسة')).trim() === sCode);
                    if (result) {
                        return {
                            ...s,
                            finalSup: result['اسم الموجه'],
                            finalSupCode: result['كود الموجه'],
                            method: result['آلية التوزيع'] || 'محفوظ',
                            // Restore guidance name if missing in school original data
                            'التوجيه': getVal(s, 'التوجيه') || getVal(s, 'كود التوجيه') || result['التوجيه']
                        };
                    }
                    return { ...s };
                });
                log(`تم استعادة توزيع ${d.finalResults.length} مدرسة من الشيت`, "success");
                renderAdminTable();
                updateDashboard();
            } else {
                DATA.final = []; // Reset if no results found
            }

            log(`تم الاتصال بنجاح بملف: ${result.sheetName}`, "success");
            log(`المدارس: ${DATA.schools.length}`, "info");
            log(`الموجهين: ${DATA.supervisors.length}`, "info");

            initLoginFilters(); // Populate login dropdowns after sync

            if (DATA.schools.length === 0) {
                log("تنبيه: لم يتم العثور على أي مدارس في الملف.", "warn");
                showToast("ملف المدارس فارغ أو غير موجود", "⚠️");
            }

            return true;
        } else {
            log(`خطأ من الخادم: ${result.message}`, "error");
            showToast("فشلت المزامنة: " + result.message, "❌");
            return false;
        }
    } catch (error) {
        log(`خطأ فني: ${error.message}`, "error");
        log("تأكد من تحديث الكود في GAS وإعادة نشره (Deploy).", "warn");
        showToast("خطأ في الاتصال بالخادم", "❌");
        return false;
    } finally {
        toggleLoader(false);
    }
}

// Explicitly expose functions to window scope for HTML triggers
window.syncAllData = syncAllData;
window.runDistribution = runDistribution;
window.saveMandatoryAssignments = saveMandatoryAssignments;
window.switchAdminTab = switchAdminTab;
window.renderManagementTable = renderManagementTable;
window.openAddModal = openAddModal;
window.editRecord = editRecord;
window.deleteRecord = deleteRecord;
window.saveMgmtRecord = saveMgmtRecord;
window.closeModal = closeModal;
window.manualOverride = manualOverride;

async function syncAllData() {
    console.log("Starting syncAllData...");
    let sheetId = document.getElementById('sheetId').value.trim();
    const gasUrl = document.getElementById('gasUrl').value.trim();

    if (sheetId.includes('/d/')) {
        const match = sheetId.match(/\/d\/(.*?)(\/|$)/);
        if (match) sheetId = match[1];
    }

    if (!sheetId) return showToast("يرجى إدخال معرف الملف أولاً", "⚠️");

    localStorage.setItem('sheetId', sheetId);
    localStorage.setItem('gasUrl', gasUrl);

    toggleLoader(true);

    try {
        const success = await loadDataFromServer(sheetId);
        if (success) {
            renderMandatoryTable();
            // runDistribution(); // Don't auto-run on sync, let user decide based on data
            updateDashboard();
            switchAdminTab('results');
            showToast(`تم مزامنة البيانات بنجاح`, "✅");
        }
    } catch (error) {
        console.error("Sync Error:", error);
        showToast("خطأ في المزامنة: " + error.message, "❌");
    } finally {
        toggleLoader(false);
    }
}

// --- Distribution Logic ---

function updateSchoolMandatory(schoolId, supName) {
    const school = DATA.schools.find(s => getVal(s, 'كود المدرسة') == schoolId);
    if (school) {
        school._mandatorySup = supName || null;
        console.log(`[Mandatory] Set ${schoolId} to ${supName}`);
    }
}

function runDistribution() {
    // Password Protection
    const pass = prompt("⚠️ تنبيه: إعادة التوزيع ستقوم بتغيير التسكين الحالي.\n\nالرجاء إدخال كلمة مرور المسؤول للمتابعة:", "");
    if (pass !== "123456") {
        if (pass !== null) showToast("كلمة المرور غير صحيحة ❌", "error");
        return;
    }

    console.log("Triggering runDistribution...");
    try {
        if (!DATA.schools || DATA.schools.length === 0) {
            showToast("لا توجد بيانات مدارس! يرجى المزامنة أولاً.", "⚠️");
            return;
        }

        const logBatch = [];
        const log = (msg) => {
            console.log(msg);
            logBatch.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
        };

        log("=== بدء التحليل المتقدم (Advanced Distribution Analysis) ===");

        const activeSups = DATA.supervisors.filter(sup => isSupervisorAvailable(sup));
        log(`الموجهين النشطين المتاحين: ${activeSups.length}`);

        if (activeSups.length === 0) {
            log("تنبيه: لا يوجد موجهين نشطين!. تأكد من ضبط حالة الموجهين.");
        }

        const supervisorLoad = {};
        const supervisorStageLoad = {};
        const supervisorTypeLoad = {};

        activeSups.forEach(s => {
            const code = String(getVal(s, 'كود الموجه')).trim();
            supervisorLoad[code] = 0;
            supervisorStageLoad[code] = {};
            supervisorTypeLoad[code] = {};
        });

        const LOAD_LIMIT = 1;

        function incrementLoad(supCode, stage, type) {
            if (!supCode || supervisorLoad[supCode] === undefined) return;
            supervisorLoad[supCode]++;
            if (stage) supervisorStageLoad[supCode][stage] = (supervisorStageLoad[supCode][stage] || 0) + 1;
            if (type) supervisorTypeLoad[supCode][type] = (supervisorTypeLoad[supCode][type] || 0) + 1;
        }

        // Pass 1: Mandatory & Persistent Locks
        DATA.final = DATA.schools.map(s => {
            const schoolId = String(getVal(s, 'كود المدرسة')).trim();
            const existing = (DATA.final && DATA.final.length > 0) ? DATA.final.find(f => String(getVal(f, 'كود المدرسة')).trim() === schoolId) : null;

            // Priority 1: Admin manual lock
            if (existing && existing.method === 'تعديل إداري') {
                if (existing.finalSupCode) incrementLoad(existing.finalSupCode, getVal(s, 'المرحلة'), getVal(s, 'النوعية'));
                return existing;
            }

            // Priority 2: Mandatory (التكليفات الإجبارية)
            if (s._mandatorySup) {
                const ms = activeSups.find(sup => getVal(sup, 'اسم الموجه') == s._mandatorySup);
                if (ms) {
                    const msCode = String(getVal(ms, 'كود الموجه')).trim();
                    incrementLoad(msCode, getVal(s, 'المرحلة'), getVal(s, 'النوعية'));

                    // Backfill Guidance
                    const sCopy = { ...s, finalSup: s._mandatorySup, finalSupCode: msCode, method: 'تكليف إداري (إجباري)' };
                    if (!getVal(s, 'كود التوجيه') && !getVal(s, 'التوجيه')) {
                        sCopy['كود التوجيه'] = getVal(ms, 'كود التوجيه');
                    }
                    return sCopy;
                }
            }

            // Priority 3: Fixed Column in Schools Sheet
            const sheetSupCode = String(getVal(s, 'كود الموجه')).trim();
            const isValidCode = sheetSupCode && !['0', '-', 'undefined', 'null', ''].includes(sheetSupCode);

            if (isValidCode && supervisorLoad[sheetSupCode] !== undefined) {
                const sheetSup = activeSups.find(sup => String(getVal(sup, 'كود الموجه')).trim() === sheetSupCode);
                if (sheetSup && supervisorLoad[sheetSupCode] < LOAD_LIMIT) {
                    incrementLoad(sheetSupCode, getVal(s, 'المرحلة'), getVal(s, 'النوعية'));

                    // Backfill Guidance
                    const sCopy = { ...s, finalSup: getVal(sheetSup, 'اسم الموجه'), finalSupCode: sheetSupCode, method: 'تكليف إداري (الملف)' };
                    if (!getVal(s, 'كود التوجيه') && !getVal(s, 'التوجيه')) {
                        sCopy['كود التوجيه'] = getVal(sheetSup, 'كود التوجيه');
                    }
                    return sCopy;
                }
            }

            return { ...s, finalSup: null, finalSupCode: '', method: 'تلقائي' };
        });

        log(`تم تثبيت التكليفات الإجبارية واليدوية. المدارس المتبقية: ${DATA.final.filter(f => !f.finalSup).length}`);

        // Pass 2: Wishes (Latest per supervisor)
        const latestWishes = {};
        if (DATA.wishes && DATA.wishes.length > 0) {
            DATA.wishes.forEach(w => {
                // Priority: Detection by name, then fallback by index (0 or 1 for code)
                const code = String(getVal(w, 'كود الموجه') || Object.values(w)[0] || Object.values(w)[1] || '').trim();
                if (code && supervisorLoad[code] !== undefined) latestWishes[code] = w;
            });
        }

        log(`تم تحليل رغبات ${Object.keys(latestWishes).length} موجهين.`);
        log(`جاري تطبيق الرغبات (بحد أقصى مدرسة واحدة لكل موجه)...`);

        for (let pass = 1; pass <= 4; pass++) {
            log(`--- معالجة [الرغبة ${pass}] لجميع الموجهين المتاحين ---`);
            const shuffledSups = [...activeSups].sort(() => Math.random() - 0.5);

            shuffledSups.forEach(sup => {
                const supCode = String(getVal(sup, 'كود الموجه')).trim();
                const supName = getVal(sup, 'اسم الموجه');
                const logWish = latestWishes[supCode];

                if (!logWish) return;

                // Diagnostic: Skip if supervisor already has a school
                if (supervisorLoad[supCode] >= LOAD_LIMIT) {
                    if (pass === 1) log(`ℹ️ الموجه "${supName}" تخطى الرغبات لأنه مكلف مسبقاً (إجباري أو من ملف المدارس)`);
                    return;
                }

                // Try header-based then index-based (Indices: flexible based on code position)
                const wishSchoolId = String(
                    getVal(logWish, `رغبة ${pass}`) || getVal(logWish, `رغبة${pass}`) ||
                    getVal(logWish, `wish ${pass}`) || getVal(logWish, `wish${pass}`) ||
                    getVal(logWish, `الرغبة ${pass}`) ||
                    Object.values(logWish)[pass + 1] || Object.values(logWish)[pass + 2]
                ).trim();

                if (wishSchoolId && wishSchoolId !== 'undefined' && wishSchoolId !== '') {
                    const school = DATA.final.find(f => String(getVal(f, 'كود المدرسة')).trim() === wishSchoolId);

                    if (!school) {
                        log(`⚠️ [رغبة ${pass}] الموجه "${supName}" طلب كود مدرسة غير موجود: ${wishSchoolId}`);
                    } else if (school.finalSup) {
                        // Only log if they haven't been assigned anything yet
                        log(`🚫 [رغبة ${pass}] الموجه "${supName}" طلب "${getVal(school, 'اسم المدرسة')}" ولكنها مشغولة بـ "${school.finalSup}"`);
                    } else {
                        school.finalSup = getVal(sup, 'اسم الموجه');
                        school.finalSupCode = supCode;
                        school.method = `رغبة ${pass}`;
                        incrementLoad(supCode, getVal(school, 'المرحلة'), getVal(school, 'النوعية'));

                        // Backfill Guidance
                        if (!getVal(school, 'كود التوجيه') && !getVal(school, 'التوجيه')) {
                            school['كود التوجيه'] = getVal(sup, 'كود التوجيه');
                        }

                        log(`✅ [رغبة ${pass}] تخصيص مدرسة "${getVal(school, 'اسم المدرسة')}" لـ "${school.finalSup}"`);
                    }
                }
            });
        }

        // Pre-calc Guidance Populations (for Small Dept Bias)
        const guidancePop = {};
        activeSups.forEach(s => {
            const g = String(getVal(s, 'كود التوجيه') || getVal(s, 'التوجيه') || '0').trim();
            guidancePop[g] = (guidancePop[g] || 0) + 1;
        });

        // Pass 3: Smart Balanced Distribution
        const pendingSchools = DATA.final.filter(f => !f.finalSup).sort(() => Math.random() - 0.5);
        log(`بدء التوزيع الموازي للمدارس المتبقية (${pendingSchools.length} مدرسة)...`);

        pendingSchools.forEach(school => {
            const guidCode = String(getVal(school, 'كود التوجيه')).trim();
            const stage = getVal(school, 'المرحلة');
            const type = getVal(school, 'النوعية');

            function calculateFairnessScore(sup) {
                const code = String(getVal(sup, 'كود الموجه')).trim();
                const totalLoad = supervisorLoad[code];
                if (totalLoad >= LOAD_LIMIT) return Infinity;

                const stageLoad = supervisorStageLoad[code][stage] || 0;
                const typeLoad = supervisorTypeLoad[code][type] || 0;

                const supGuid = String(getVal(sup, 'كود التوجيه') || getVal(sup, 'التوجيه') || '0').trim();
                const isSpecialtyMatch = supGuid === guidCode;

                // General Balanced Scoring
                let score = (totalLoad * 500) + (stageLoad * 50) + (typeLoad * 25);
                if (!isSpecialtyMatch) score += 2000; // Priority to specialty match

                return score + (Math.random() * 50); // General jitter
            }

            const candidates = activeSups
                .map(sup => ({ sup, score: calculateFairnessScore(sup) }))
                .filter(c => c.score !== Infinity)
                .sort((a, b) => a.score - b.score);

            const best = candidates[0];
            if (best) {
                const code = String(getVal(best.sup, 'كود الموجه')).trim();
                school.finalSup = getVal(best.sup, 'اسم الموجه');
                school.finalSupCode = code;
                school.method = best.score < 2000 ? 'توزيع ذكي (تخصص)' : 'توزيع ذكي (عام)';
                incrementLoad(code, stage, type);

                // Backfill Guidance
                if (!getVal(school, 'كود التوجيه') && !getVal(school, 'التوجيه')) {
                    school['كود التوجيه'] = getVal(best.sup, 'كود التوجيه');
                }
            }
        });

        log("=== اكتمل التوزيع بنجاح ===");

        // Display Sync Log
        const syncLog = document.getElementById('syncLog');
        if (syncLog) {
            syncLog.innerHTML = `<div class="p-3 text-[10px] space-y-1">${logBatch.reverse().join('<br>')}</div>` + syncLog.innerHTML;
            document.getElementById('syncLogContainer')?.classList.remove('hidden');
        }

        renderAdminTable();
        updateDashboard();

        // Switch to results view
        switchAdminTab('results');

        // Auto-save to sheet
        autoSaveDistribution();

    } catch (e) {
        console.error("Distribution Error:", e);
        showToast("حدث خطأ أثناء التوزيع: " + e.message, "❌");
    }
}
// --- Admin Features ---

function manualOverride(schoolId, supName) {
    const row = DATA.final.find(s => getVal(s, 'كود المدرسة') == schoolId);
    if (!row) return;

    if (supName) {
        // Check for conflict
        const existingAssignment = DATA.final.find(s => s.finalSup === supName && getVal(s, 'كود المدرسة') != schoolId);
        if (existingAssignment) {
            const confirmMsg = `⚠️ تنبيه: هذه الموجه (${supName}) مسكن بالفعل في مدرسة:\n"${getVal(existingAssignment, 'اسم المدرسة')}"\n\nهل تريد نقله لهذه المدرسة وإلغاء المدرسة السابقة؟`;
            if (!confirm(confirmMsg)) {
                renderAdminTable(); // Reset select
                return;
            }
            // Clear previous assignment
            existingAssignment.finalSup = null;
            existingAssignment.finalSupCode = null;
            existingAssignment.method = 'تعديل إداري (نقل)';
        }
    }

    if (!supName) {
        row.finalSup = null;
        row.finalSupCode = null;
        row.method = 'تعديل إداري (إلغاء)';
    } else {
        // Lookup supervisor details
        const supObj = DATA.supervisors.find(su => getVal(su, 'اسم الموجه') === supName);
        row.finalSup = supName;
        row.finalSupCode = supObj ? getVal(supObj, 'كود الموجه') : '';
        row.method = 'تعديل إداري';

        // Auto-fix guidance if missing from school
        if (!getVal(row, 'كود التوجيه') && !getVal(row, 'التوجيه') && supObj) {
            const supGuidCode = getVal(supObj, 'كود التوجيه');
            // We create a temporary property or update existing if possible
            if (supGuidCode) row['كود التوجيه'] = supGuidCode;
        }
    }

    updateDashboard();
    renderAdminTable();
    showToast("تم تحديث الجدول .. جاري الحفظ", "✍️");
    autoSaveDistribution();
}

// ... (Functions in between)

// (Redundant renderAdminTable removed - Checkbox-enabled version implemented below)


async function autoSaveDistribution() {
    const results = DATA.final.map(row => ({
        supName: row.finalSup || '',
        supCode: row.finalSupCode || '',
        guidance: getGuidanceName(getVal(row, 'كود التوجيه') || getVal(row, 'التوجيه') || getVal(row, 'الإدارة')),
        schoolName: getVal(row, 'اسم المدرسة'),
        schoolCode: getVal(row, 'كود المدرسة'),
        stage: getVal(row, 'المرحلة')
    }));

    try {
        const gasUrl = document.getElementById('gasUrl').value;
        if (!gasUrl) return;

        // Use 'no-cors' mode but with correct payload structure
        // Note: 'no-cors' prevents reading response, but POST works.
        const payload = {
            type: 'saveResults', // Match code.gs
            results: results
        };

        await fetch(gasUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        showToast("تم حفظ التوزيع في الشيت بنجاح", "💾");
    } catch (e) {
        console.error(e);
        showToast("فشل الحفظ التلقائي", "❌");
    }
}

function updateSchoolMandatory(schoolId, supName) {
    const sId = String(schoolId).trim();
    const school = DATA.schools.find(s => String(getVal(s, 'كود المدرسة')).trim() === sId);
    if (school) {
        school._mandatorySup = supName || null;
        console.log(`[Mandatory] Set ${sId} to ${supName}`);
        renderMandatoryTable(); // Update others to hide this sup
    }
}

function applyBulkMandatory() {
    const bulkSup = document.getElementById('bulkSupSelect').value;
    if (!bulkSup) return showToast("يرجى اختيار موجه أولاً", "⚠️");

    const search = document.getElementById('mandatorySearch').value.toLowerCase();
    const stage = document.getElementById('man-filter-stage').value;
    const type = document.getElementById('man-filter-type').value;
    const guid = document.getElementById('man-filter-guid').value;

    const filtered = DATA.schools.filter(s => {
        const matchesSearch = getVal(s, 'اسم المدرسة').toLowerCase().includes(search);
        const matchesStage = !stage || getVal(s, 'المرحلة') === stage;
        const matchesType = !type || getVal(s, 'النوعية') === type;
        const matchesGuid = !guid || getVal(s, 'كود التوجيه') == guid || getVal(s, 'التوجيه') == guid;
        return matchesSearch && matchesStage && matchesType && matchesGuid;
    });

    if (filtered.length === 0) return showToast("لا توجد مدارس مطابقة للتصفية", "⚠️");

    // Check if supervisor is already assigned to a school NOT in this filtered set
    const alreadyAssignedElsewhere = DATA.schools.some(s => s._mandatorySup === bulkSup && !filtered.includes(s));
    if (alreadyAssignedElsewhere) {
        return showToast("هذا الموجه مسكّن بالفعل في مدرسة أخرى خارج نافذة البحث الحالية", "❌");
    }

    filtered.forEach(s => { s._mandatorySup = bulkSup; });
    showToast(`تم تخصيص ${bulkSup} لـ ${filtered.length} مدرسة`, "✅");
    renderMandatoryTable();
}

function renderMandatoryTable() {
    const body = document.getElementById('mandatoryBody');
    if (!body) return;

    // 1. Extract and Populate Filters for Admin
    const stages = [...new Set(DATA.schools.map(s => getVal(s, 'المرحلة')).filter(Boolean))].sort();
    const types = [...new Set(DATA.schools.map(s => getVal(s, 'النوعية')).filter(Boolean))].sort();
    const guids = [...new Set(DATA.schools.map(s => getVal(s, 'كود التوجيه')).filter(Boolean))].sort();

    const fStage = document.getElementById('man-filter-stage');
    const fType = document.getElementById('man-filter-type');
    const fGuid = document.getElementById('man-filter-guid');

    if (fStage && fStage.options.length <= 1) stages.forEach(s => fStage.add(new Option(s, s)));
    if (fType && fType.options.length <= 1) types.forEach(t => fType.add(new Option(t, t)));
    if (fGuid && fGuid.options.length <= 1) {
        guids.forEach(g => {
            const name = (DATA.guidance.find(gx => getVal(gx, 'كود التوجيه') == g))?.['التوجيه'] || g;
            fGuid.add(new Option(name, g));
        });
    }

    const search = document.getElementById('mandatorySearch').value.toLowerCase();
    const selStage = fStage?.value || '';
    const selType = fType?.value || '';
    const selGuid = fGuid?.value || '';

    // 2. Filter schools
    const filtered = DATA.schools.filter(s => {
        const matchesSearch = getVal(s, 'اسم المدرسة').toLowerCase().includes(search);
        const matchesStage = !selStage || getVal(s, 'المرحلة') === selStage;
        const matchesType = !selType || getVal(s, 'النوعية') === selType;
        const matchesGuid = !selGuid || getVal(s, 'كود التوجيه') == selGuid || getVal(s, 'التوجيه') == selGuid;
        return matchesSearch && matchesStage && matchesType && matchesGuid;
    });

    // Track already assigned mandatory supervisors across ALL schools
    const assignedSups = new Set(DATA.schools.map(s => s._mandatorySup).filter(Boolean));

    const bulkSelect = document.getElementById('bulkSupSelect');
    if (bulkSelect) {
        const currentVal = bulkSelect.value;
        const activeSups = DATA.supervisors.filter(sup => isSupervisorAvailable(sup));

        bulkSelect.innerHTML = '<option value="">اختر الموجه لتطبيقه على الكل...</option>' +
            activeSups.map(sup => {
                const name = getVal(sup, 'اسم الموجه');
                const isAssigned = assignedSups.has(name);
                return `<option value="${name}" ${isAssigned ? 'disabled' : ''}>${name} ${isAssigned ? '(مسكّن حالياً)' : ''}</option>`;
            }).join('');
        bulkSelect.value = currentVal;
    }

    body.innerHTML = filtered.map(s => {
        const schoolId = getVal(s, 'كود المدرسة');
        const guidCode = getVal(s, 'كود التوجيه') || getVal(s, 'التوجيه') || getVal(s, 'الإدارة');
        const guidName = getGuidanceName(guidCode);
        const currentSelection = s._mandatorySup || '';

        return `
        <tr class="hover:bg-white/5 transition-colors border-b border-white/5">
            <td class="px-6 py-4 font-bold text-sm text-slate-200">${getVal(s, 'اسم المدرسة')}</td>
            <td class="px-6 py-4 text-xs text-indigo-300">${getVal(s, 'المرحلة')}</td>
            <td class="px-6 py-4 text-xs text-emerald-300">${getVal(s, 'النوعية')}</td>
            <td class="px-6 py-4 text-xs text-slate-400 font-mono">${guidName}</td>
            <td class="px-6 py-4">
                <select id="man-${schoolId}"
                        onchange="updateSchoolMandatory('${schoolId}', this.value)"
                        class="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs w-full focus:border-indigo-500 outline-none transition-all">
                    <option value="">توزيع تلقائي</option>
                    ${DATA.supervisors
                .filter(sup => {
                    const status = (getVal(sup, 'الحالة') || getVal(sup, 'نشط') || 'نشط').trim();
                    return status !== 'غير نشط' && status !== '0';
                })
                .map(sup => {
                    const name = getVal(sup, 'اسم الموجه');
                    const isAssignedElsewhere = assignedSups.has(name) && name !== currentSelection;
                    if (isAssignedElsewhere) return '';
                    return `<option value="${name}" ${currentSelection === name ? 'selected' : ''}>${name}</option>`;
                }).join('')}
                </select>
            </td>
        </tr>
        `;
    }).join('');
}

function renderAdminTable() {
    const body = document.getElementById('resultBody');
    if (!body) return;

    if (!DATA.final || DATA.final.length === 0) {
        body.innerHTML = '<tr><td colspan="7" class="px-8 py-8 text-center text-slate-500">لا توجد نتائج للتوزيع بعد. يرجى الضغط على زر "توزيع وإصلاح" لبدء العملية.</td></tr>';
        return;
    }

    body.innerHTML = DATA.final.map(s => {
        const schoolCode = getVal(s, 'كود المدرسة');

        // Try multiple headers for school's guidance code
        let guidCode = getVal(s, 'كود التوجيه') || getVal(s, 'التوجيه') || getVal(s, 'الإدارة') || getVal(s, 'الادارة');

        // Fallback: Use assigned supervisor's guidance code if school info is missing
        if (!guidCode && s.finalSupCode) {
            const assignedSup = DATA.supervisors.find(sx => getVal(sx, 'كود التوجيه') == s.finalSupCode);
            if (assignedSup) guidCode = getVal(assignedSup, 'كود التوجيه') || getVal(assignedSup, 'التوجيه');
        }

        const gName = getGuidanceName(guidCode);

        // Get supervisor status
        let statusBadge = '<span class="text-slate-500 text-xs">غير محدد</span>';
        if (s.finalSupCode) {
            const sup = DATA.supervisors.find(sx => String(getVal(sx, 'كود الموجه')).trim() == s.finalSupCode);
            if (sup) {
                const isAvailable = isSupervisorAvailable(sup);
                statusBadge = isAvailable
                    ? '<span class="text-xs px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full font-bold">✅ نشط</span>'
                    : '<span class="text-xs px-3 py-1 bg-red-500/20 text-red-400 rounded-full font-bold">❌ غير نشط</span>';
            }
        }
        const method = s.method || 'تلقائي';

        let badgeStyle = "bg-slate-800 text-slate-400";
        if (method.includes('إجباري') || method.includes('الملف')) badgeStyle = "bg-rose-500/20 text-rose-400 border border-rose-500/30";
        else if (method.includes('رغبة')) badgeStyle = "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold";
        else if (method.includes('تعديل')) badgeStyle = "bg-amber-500/20 text-amber-400 border border-amber-500/30";

        return `
        <tr class="hover:bg-white/5 transition-colors">
            <td class="px-8 py-5 text-center">
                <input type="checkbox" class="letter-checkbox w-4 h-4 rounded border-white/10 bg-slate-800 text-indigo-600 focus:ring-indigo-500" data-code="${schoolCode}">
            </td>
            <td class="px-8 py-5 font-bold">${getVal(s, 'اسم المدرسة')}</td>
            <td class="px-8 py-5">
                <select onchange="manualOverride('${schoolCode}', this.value)" 
                        class="bg-slate-900 border border-white/10 rounded-lg px-3 py-1 text-sm w-full">
                    <option value="">غير مسكن</option>
                    ${DATA.supervisors
                .filter(sup => {
                    const status = (getVal(sup, 'الحالة') || getVal(sup, 'نشط') || 'نشط').trim();
                    return status !== 'غير نشط' && status !== '0';
                })
                .map(sup => {
                    const supName = getVal(sup, 'اسم الموجه');
                    return `<option value="${supName}" ${s.finalSup === supName ? 'selected' : ''}>${supName}</option>`;
                }).join('')}
                </select>
            </td>
            <td class="px-8 py-5 text-slate-400 font-mono text-xs">${gName}</td>
            <td class="px-8 py-5 text-indigo-300 text-xs">${getVal(s, 'المرحلة')}</td>
            <td class="px-8 py-5 text-[10px] font-bold">
                <span class="px-2 py-1 rounded ${badgeStyle}">${method}</span>
            </td>
            <td class="px-8 py-5 text-center">
                <button onclick="generateIndividualLetters('${schoolCode}')" 
                        class="p-2 hover:bg-white/10 rounded-lg text-amber-500" title="طباعة الخطاب">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                </button>
            </td>
        </tr>
        `;
    }).join('');
}

function toggleSelectAllLetters() {
    const parent = document.getElementById('selectAllLetters');
    const checkboxes = document.querySelectorAll('.letter-checkbox');
    checkboxes.forEach(cb => cb.checked = parent.checked);
}

function renderRawData(type) {
    const titleEl = document.getElementById('rawTitle');
    const bodyEl = document.getElementById('rawBody');
    if (!titleEl || !bodyEl) return;

    let data = DATA[type] || [];

    // Update button styles
    const buttons = document.querySelectorAll('#admin-view-raw button');
    buttons.forEach(btn => {
        const isTarget = (type === 'schools' && btn.innerText.includes('المدارس')) ||
            (type === 'supervisors' && btn.innerText.includes('الموجهين')) ||
            (type === 'guidance' && btn.innerText.includes('التوجيه'));
        btn.classList.toggle('bg-indigo-600', isTarget);
        btn.classList.toggle('bg-slate-800', !isTarget);
    });

    if (data.length === 0) {
        titleEl.innerHTML = `<tr><th class="px-6 py-4">لا توجد بيانات متاحة</th></tr>`;
        bodyEl.innerHTML = `<tr><td class="px-6 py-4 text-center">يرجى الضغط على "مزامنة" أولاً أو التأكد من أسماء الصفحات في الشيت</td></tr>`;
        return;
    }

    const headers = Object.keys(data[0]);
    titleEl.innerHTML = `<tr>${headers.map(h => `<th class="px-6 py-4 border-b border-white/10 text-indigo-400 whitespace-nowrap">${h}</th>`).join('')}</tr>`;

    bodyEl.innerHTML = data.map(row => `
        <tr class="hover:bg-white/5 transition-colors">
            ${headers.map(h => `<td class="px-6 py-4 border-b border-white/5 whitespace-nowrap">${row[h] || '-'}</td>`).join('')}
        </tr>
    `).join('');
}

function updateDashboard() {
    const schools = DATA.schools.length;
    const assigned = DATA.final.filter(s => s.finalSup).length;
    const active = DATA.supervisors.filter(sup => getVal(sup, 'الحالة') !== 'غير نشط').length;

    const elements = {
        statSchools: schools,
        statSupervisors: `${active} / ${DATA.supervisors.length}`,
        statCoverage: schools > 0 ? Math.round((assigned / schools) * 100) + '%' : '0%',
        statWishes: DATA.wishes.length
    };

    for (let id in elements) {
        const el = document.getElementById(id);
        if (el) el.innerText = elements[id];
    }
}

// --- Supervisor Features ---

// --- Supervisor Login & Filters ---

function initLoginFilters(forceSync = false) {
    if (forceSync) return syncAllData();

    const guidSelect = document.getElementById('loginGuidance');
    if (!guidSelect) return;

    // Reset
    guidSelect.innerHTML = '<option value="">اختر التوجيه الخاص بك...</option>';

    // Get unique guidance from supervisors or guidance sheet
    const guids = [...new Set(DATA.supervisors.map(s => getVal(s, 'كود التوجيه')).filter(Boolean))].sort();

    guids.forEach(g => {
        const guidObj = DATA.guidance.find(gx => getVal(gx, 'كود التوجيه') == g);

        // Try multiple headers for name
        let name = '';
        if (guidObj) {
            name = getVal(guidObj, 'التوجيه') ||
                getVal(guidObj, 'اسم التوجيه') ||
                getVal(guidObj, 'الإدارة') ||
                getVal(guidObj, 'الادارة') ||
                getVal(guidObj, 'guidance');
        }

        const displayName = name ? name : `توجيه (${g})`;
        guidSelect.add(new Option(displayName, g));
    });

    const list = document.getElementById('supervisorList');
    if (list) list.innerHTML = '';
}

function updateLoginSupervisorList() {
    const guidCode = document.getElementById('loginGuidance').value;
    const list = document.getElementById('supervisorList');
    const input = document.getElementById('loginSupervisorInput');
    if (!list || !input) return;

    list.innerHTML = '';
    input.value = ''; // Clear previous selection

    if (!guidCode) return;

    const filtered = DATA.supervisors.filter(s => getVal(s, 'كود التوجيه') == guidCode);
    filtered.forEach(s => {
        const option = document.createElement('option');
        option.value = getVal(s, 'اسم الموجه');
        list.appendChild(option);
    });
}

async function handleLogin() {
    const nameInput = document.getElementById('loginSupervisorInput').value.trim();
    if (!nameInput) return showToast("يرجى اختيار أو كتابة اسم الموجه", "⚠️");

    // Lookup supervisor by name
    const sup = DATA.supervisors.find(s => getVal(s, 'اسم الموجه').trim() === nameInput);
    if (!sup) return showToast("الاسم غير موجود في قائمة التوجيه المختار", "❌");

    const code = getVal(sup, 'كود الموجه');
    DATA.activeUser = sup;
    currentSupervisor = sup; // Sync for new helpers
    const name = getVal(sup, 'اسم الموجه');
    const guidCode = getVal(sup, 'كود التوجيه');
    const guidObj = DATA.guidance.find(g => getVal(g, 'كود التوجيه') == guidCode);

    document.getElementById('supHello').innerText = `أهلاً بك، أ/ ${name}`;
    document.getElementById('supGuidance').innerText = `التوجيه: ${getVal(guidObj, 'التوجيه') || guidCode}`;
    document.getElementById('supSpecialty').innerText = getVal(DATA.activeUser, 'النوعية') || 'عام';

    // 1. Render selects first (so options exist)
    renderSchoolSelects();

    // 2. Load existing wishes if any
    loadExistingWishes(code);

    document.getElementById('view-supervisor').children[0].classList.add('hidden');
    document.getElementById('wishesSection').classList.remove('hidden');

    // 3. Check for Assignment & Update Mobile UI
    checkSupervisorAssignment();

    // 4. Update labels for accordions
    setTimeout(() => {
        [1, 2, 3, 4].forEach(i => updateWishLabel(i));
    }, 100);
}

function switchAdminTab(tabId) {
    // 1. Update Navigation Buttons
    ['sync', 'data', 'status', 'mandatory', 'results', 'raw', 'settings'].forEach(t => {
        const btn = document.getElementById(`admin-tab-${t}`);
        if (btn) {
            if (t === tabId) {
                btn.classList.remove('bg-slate-800', 'text-slate-400');
                btn.classList.add('bg-indigo-600', 'text-white', 'tab-active');
            } else {
                btn.classList.remove('bg-indigo-600', 'text-white', 'tab-active');
                btn.classList.add('bg-slate-800', 'text-slate-400');
            }
        }
    });

    // 2. Hide All Admin Views
    document.querySelectorAll('[id^="admin-view-"]').forEach(el => el.classList.add('hidden'));

    // 3. Show Selected View
    const target = document.getElementById(`admin-view-${tabId}`);
    if (target) target.classList.remove('hidden');

    // 4. Trigger Tab-specific Logic
    if (tabId === 'status') {
        renderStatusTable();
    } else if (tabId === 'data') {
        renderManagementTable('schools');
    } else if (tabId === 'results') {
        renderAdminTable();
    } else if (tabId === 'mandatory') {
        renderMandatoryTable();
    } else if (tabId === 'settings') {
        loadSettingsToUI();
    }
}

function loadExistingWishes(supCode) {
    const sCode = String(supCode).trim();
    const lastWish = [...DATA.wishes].reverse().find(w => String(getVal(w, 'كود الموجه')).trim() === sCode);

    if (lastWish) {
        for (let i = 1; i <= 4; i++) {
            const el = document.getElementById(`wish${i}`);
            if (el) {
                // Try multiple variants for header
                const val = getVal(lastWish, `رغبة ${i}`) ||
                    getVal(lastWish, `رغبة${i}`) ||
                    getVal(lastWish, `wish ${i}`) ||
                    getVal(lastWish, `wish${i}`) ||
                    getVal(lastWish, `الرغبة ${i}`);
                if (val) el.value = val;
            }
        }
        showToast("تم استعادة رغباتك السابقة من السجلات", "✅");
    }
}

// Validate wishes to ensure no duplicates
function validateWishes() {
    const wishes = [];
    const duplicates = new Set();

    // Collect all selected wishes
    for (let i = 1; i <= 4; i++) {
        const select = document.getElementById(`wish${i}`);
        if (select && select.value) {
            const value = select.value.trim();
            if (wishes.includes(value)) {
                duplicates.add(value);
            }
            wishes.push(value);
        }
    }

    // Update UI for each wish slot
    for (let i = 1; i <= 4; i++) {
        const select = document.getElementById(`wish${i}`);
        if (!select) continue;

        const parentDiv = select.closest('.bg-white\/5');
        if (!parentDiv) continue;

        // Remove existing warning if any
        const existingWarning = parentDiv.querySelector('.duplicate-warning');
        if (existingWarning) existingWarning.remove();

        // Check if current selection is a duplicate
        if (select.value && duplicates.has(select.value)) {
            select.classList.add('border-rose-500', 'border-2');
            select.classList.remove('border-white/5');

            // Add warning message
            const warning = document.createElement('div');
            warning.className = 'duplicate-warning text-rose-400 text-xs font-bold flex items-center gap-2 mt-2 animate-pulse';
            warning.innerHTML = '⚠️ تم اختيار هذه المدرسة مسبقاً في رغبة أخرى';
            parentDiv.appendChild(warning);
        } else {
            select.classList.remove('border-rose-500', 'border-2');
            if (!select.classList.contains('border-white/5')) {
                select.classList.add('border-white/5');
            }
        }
    }

    // Enable/disable submit button based on duplicates
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        if (duplicates.size > 0) {
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
            submitBtn.classList.remove('hover:bg-emerald-700');
        } else {
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            submitBtn.classList.add('hover:bg-emerald-700');
        }
    }

    return duplicates.size === 0;
}

function renderSchoolSelects(specificSlot = null) {
    const slots = specificSlot ? [specificSlot] : [1, 2, 3, 4];
    const userGuidance = getVal(DATA.activeUser, 'كود التوجيه');

    // 1. Extract unique stages and types from DATA.schools for the filters
    const stages = [...new Set(DATA.schools.map(s => getVal(s, 'المرحلة')).filter(Boolean))].sort();
    const types = [...new Set(DATA.schools.map(s => getVal(s, 'النوعية')).filter(Boolean))].sort();

    slots.forEach(slot => {
        const stageFilter = document.getElementById(`filter-stage-${slot}`);
        const typeFilter = document.getElementById(`filter-type-${slot}`);
        const select = document.getElementById(`wish${slot}`);

        if (!select) return;

        const currentVal = select.value; // Store current selection

        // Populate filters if they are empty
        if (stageFilter && stageFilter.options.length <= 1) {
            stages.forEach(st => stageFilter.add(new Option(st, st)));
        }
        if (typeFilter && typeFilter.options.length <= 1) {
            types.forEach(ty => typeFilter.add(new Option(ty, ty)));
        }

        const selectedStage = stageFilter ? stageFilter.value : '';
        const selectedType = typeFilter ? typeFilter.value : '';

        // Filter schools based on selection
        const filteredSchools = DATA.schools.filter(s => {
            const matchesStage = !selectedStage || getVal(s, 'المرحلة') === selectedStage;
            const matchesType = !selectedType || getVal(s, 'النوعية') === selectedType;
            return matchesStage && matchesType;
        });

        const options = filteredSchools.map(s => {
            const isMatch = getVal(s, 'كود التوجيه') == userGuidance;
            return `<option value="${getVal(s, 'كود المدرسة')}">${isMatch ? '⭐ ' : ''} ${getVal(s, 'اسم المدرسة')}</option>`;
        }).join('');

        select.innerHTML = `<option value="">اختر مدرسة (${filteredSchools.length})...</option>${options}`;
        if (currentVal) select.value = currentVal; // Restore if possible

        // Add onchange event to validate wishes
        select.onchange = () => validateWishes();
    });

    // Run validation after rendering
    setTimeout(() => validateWishes(), 100);
}

async function submitWishes() {
    const gasUrl = document.getElementById('gasUrl').value;
    if (!gasUrl) return showToast("لم يتم إعداد رابط الاستقبال", "⚠️");

    // Validate wishes before submission
    if (!validateWishes()) {
        return showToast("يوجد تكرار في الرغبات! يرجى اختيار مدارس مختلفة", "⚠️");
    }

    const payload = {
        type: 'wish',
        supCode: getVal(DATA.activeUser, 'كود الموجه'),
        supName: getVal(DATA.activeUser, 'اسم الموجه'),
        guidanceCode: getVal(DATA.activeUser, 'كود التوجيه'),
        wish1: document.getElementById('wish1').value,
        wish2: document.getElementById('wish2').value,
        wish3: document.getElementById('wish3').value,
        wish4: document.getElementById('wish4').value
    };

    if (!payload.wish1) return showToast("يجب اختيار الرغبة الأولى", "⚠️");

    toggleLoader(true, "جاري الحفظ...");
    try {
        await fetch(gasUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        showToast("تم الحفظ بنجاح", "✅");
        setTimeout(() => location.reload(), 2000);
    } catch (e) {
        showToast("خطأ في الاتصال", "❌");
    } finally {
        toggleLoader(false);
    }
}

// --- Diagnostic Feature ---

async function quickAddRecord(type) {
    const gasUrl = document.getElementById('gasUrl').value;
    if (!gasUrl) return showToast("رابط الاستقبال غير موجود", "⚠️");

    let payload = { type: type };
    if (type === 'school') {
        payload.schoolName = document.getElementById('newSchoolName').value;
        payload.schoolCode = document.getElementById('newSchoolCode').value;
        payload.guidanceCode = ''; // Default empty for quick add
        payload.stage = '';
    } else if (type === 'supervisor') {
        payload.supName = document.getElementById('newSupName').value;
        payload.supCode = document.getElementById('newSupCode').value;
        payload.guidanceCode = '';
        payload.status = 'نشط';
    } else if (type === 'guidance') {
        payload.guidanceName = document.getElementById('newGuidName').value;
        payload.guidanceCode = document.getElementById('newGuidCode').value;
    }

    toggleLoader(true, "جاري الإرسال...");
    try {
        await fetch(gasUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        showToast("تم إرسال الطلب. تحقق من الشيت", "✅");
    } catch (e) {
        showToast("فشل الاتصال", "❌");
    } finally {
        toggleLoader(false);
    }
}

// --- Utils ---

function toggleLoader(show, msg = "جاري معالجة البيانات...") {
    const loader = document.getElementById('globalLoader');
    const text = document.getElementById('loaderText');
    if (text) text.innerText = msg;
    if (loader) loader.classList.toggle('hidden', !show);
}

function showToast(msg, icon) {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toastMsg');
    const iconEl = document.getElementById('toastIcon');
    if (msgEl) msgEl.innerText = msg;
    if (iconEl) iconEl.innerText = icon;

    toast.classList.remove('translate-y-10', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        toast.classList.remove('translate-y-0', 'opacity-100');
    }, 4000);
}

async function saveMandatoryAssignments() {
    const gasUrl = document.getElementById('gasUrl').value;
    if (!gasUrl) return showToast("يرجى إدخال رابط GAS", "⚠️");

    const assignments = [];
    DATA.schools.forEach(s => {
        const schoolId = String(getVal(s, 'كود المدرسة')).trim();
        const mSup = s._mandatorySup; // Supervisor Name
        if (mSup) {
            // Lookup sup full info
            const supObj = DATA.supervisors.find(sx => getVal(sx, 'اسم الموجه') === mSup);
            const supCode = supObj ? getVal(supObj, 'كود الموجه') : '';
            const guidCode = supObj ? getVal(supObj, 'كود التوجيه') : '';

            assignments.push({
                schoolCode: schoolId,
                schoolName: getVal(s, 'اسم المدرسة'),
                supName: mSup,
                supCode: supCode,
                guidanceCode: guidCode
            });
        }
    });

    if (assignments.length === 0) return showToast("لا يوجد تكليفات لحفظها", "ℹ️");

    toggleLoader(true, "جاري حفظ التكليفات في الشيت...");
    try {
        const response = await fetch(gasUrl, {
            method: 'POST',
            body: JSON.stringify({ type: 'saveMandatory', assignments: assignments })
        });
        showToast("تم حفظ التكليفات بنجاح", "✅");
    } catch (e) {
        showToast("خطأ في الحفظ: تأكد من إعدادات GAS", "❌");
        console.error(e);
    } finally {
        toggleLoader(false);
    }
}

async function pushResultsToSheet() {
    const gasUrl = document.getElementById('gasUrl').value;
    if (!gasUrl) return showToast("يرجى إدخال رابط GAS", "⚠️");
    if (DATA.final.length === 0) return showToast("لا توجد نتائج لتصديرها", "⚠️");

    toggleLoader(true, "جاري تصدير النتائج النهائية للشيت...");

    const resultsPayload = DATA.final.map(s => {
        // Shared logic for guidance detection
        let gCode = getVal(s, 'كود التوجيه') || getVal(s, 'التوجيه') || getVal(s, 'الإدارة') || getVal(s, 'الادارة');
        if (!gCode && s.finalSupCode) {
            const assignedSup = DATA.supervisors.find(sx => getVal(sx, 'كود الموجه') == s.finalSupCode);
            if (assignedSup) gCode = getVal(assignedSup, 'كود التوجيه') || getVal(assignedSup, 'التوجيه');
        }
        const gName = getGuidanceName(gCode);

        return {
            supName: s.finalSup || '-',
            supCode: s.finalSupCode || '-',
            guidance: gName, // Store the name for clarity in the sheet
            schoolName: getVal(s, 'اسم المدرسة'),
            schoolCode: getVal(s, 'كود المدرسة'),
            stage: getVal(s, 'المرحلة') || '-',
            method: s.method || 'تلقائي'
        };
    });

    try {
        await fetch(gasUrl, {
            method: 'POST',
            body: JSON.stringify({ type: 'saveResults', results: resultsPayload })
        });
        showToast("تم تصدير النتائج بنجاح إلى شيت 'النتائج النهائية'", "✅");
    } catch (e) {
        showToast("فشلت عملية التصدير", "❌");
        console.error(e);
    } finally {
        toggleLoader(false);
    }
}

function filterMandatoryTable() {
    const val = document.getElementById('mandatorySearch').value.toLowerCase();
    const rows = document.getElementById('mandatoryBody').getElementsByTagName('tr');
    for (let row of rows) row.style.display = row.innerText.toLowerCase().includes(val) ? '' : 'none';
}

function filterAdminTable() {
    const val = document.getElementById('adminSearch').value.toLowerCase();
    const rows = document.getElementById('resultBody').getElementsByTagName('tr');
    for (let row of rows) row.style.display = row.innerText.toLowerCase().includes(val) ? '' : 'none';
}

function exportResults() {
    const csvData = Papa.unparse(DATA.final.map(s => {
        let gCode = getVal(s, 'كود التوجيه') || getVal(s, 'التوجيه') || getVal(s, 'الإدارة');
        if (!gCode && s.finalSupCode) {
            const assignedSup = DATA.supervisors.find(sx => getVal(sx, 'كود الموجه') == s.finalSupCode);
            if (assignedSup) gCode = getVal(assignedSup, 'كود التوجيه') || getVal(assignedSup, 'التوجيه');
        }
        const gObj = DATA.guidance.find(go => getVal(go, 'كود التوجيه') == gCode || getVal(go, 'التوجيه') == gCode);
        const gName = gObj ? (getVal(gObj, 'التوجيه') || getVal(gObj, 'اسم التوجيه')) : (gCode || '-');

        return {
            'اسم المدرسة': getVal(s, 'اسم المدرسة'),
            'كود المدرسة': getVal(s, 'كود المدرسة'),
            'التوجيه': gName,
            'الموجه المسكن': s.finalSup || '-',
            'كود الموجه': s.finalSupCode || '-',
            'المرحلة': getVal(s, 'المرحلة'),
            'النوعية': getVal(s, 'النوعية'),
            'آلية التوزيع': s.method
        };
    }));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- Global Settings & Reports ---

// Default Settings
let SETTINGS = {
    governorate: "محافظة الجيزة",
    directorate: "إدارة العمرانية التعليمية",
    academicYear: "2025/2026",
    semester: "نصف العام",
    officials: {
        gm: { name: "", title: "مدير عام الإدارة", phone: "" },
        deputy: { name: "غادة سليمان", title: "وكيل الإدارة", phone: "" },
        security: { name: "أ / وجيه عبد العال", title: "مسئول أمن الإدارة", phone: "" },
        managers: {
            primary: "أ / هشام محمود كامل",
            primaryPhone: "",
            prep: "أ / داليا عمر",
            prepPhone: "",
            secondary: "أ / أحلام محمد",
            secondaryPhone: ""
        }
    }
};

// Legacy Support (Mapping SETTINGS to OFFICIALS structure used in reports)
const OFFICIALS = {
    get gm() { return { name: SETTINGS.officials.gm.name, title: SETTINGS.officials.gm.title, phone: SETTINGS.officials.gm.phone }; },
    get deputy() { return { name: SETTINGS.officials.deputy.name, title: SETTINGS.officials.deputy.title, phone: SETTINGS.officials.deputy.phone }; },
    get security() { return { name: SETTINGS.officials.security.name, title: SETTINGS.officials.security.title, phone: SETTINGS.officials.security.phone }; },
    get managers() {
        return [
            { stage: "المرحلة الابتدائية", name: SETTINGS.officials.managers.primary, phone: SETTINGS.officials.managers.primaryPhone },
            { stage: "المرحلة الإعدادية", name: SETTINGS.officials.managers.prep, phone: SETTINGS.officials.managers.prepPhone },
            { stage: "المرحلة الثانوية", name: SETTINGS.officials.managers.secondary, phone: SETTINGS.officials.managers.secondaryPhone }
        ];
    }
};

const PRINT_STYLES = `
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
    <style>
        @page { size: A4; margin: 0.5cm; }
        body { 
            font-family: 'Cairo', sans-serif; 
            direction: rtl; 
            padding: 0; 
            margin: 0; 
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
            background: white;
        }
        .report-page { 
            page-break-after: always; 
            break-inside: avoid;
            min-height: 290mm; 
            padding: 15mm; 
            box-sizing: border-box;
            position: relative;
        }
        .report-header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
        .report-title-box { text-align: center; border: 2px solid #000; padding: 5px; border-radius: 8px; font-weight: bold; background: #f8f9fa; }
        
        /* High Quality Font Rendering for Print */
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        h1, h2, h3, p, span, div, li, td, th { color: #000 !important; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #f2f2f2 !important; border: 1px solid #000; padding: 8px; font-size: 11px; }
        td { border: 1px solid #000; padding: 6px; font-size: 11px; text-align: center; }
        tr { page-break-inside: avoid; break-inside: avoid; }

        @media screen {
            body { background: #f1f5f9; padding: 40px; }
            .report-page { 
                width: 210mm; 
                margin: 0 auto 30px auto; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                border: 1px solid #e2e8f0;
                border-radius: 4px;
            }
        }
    </style>
`;

function triggerPrint(win) {
    if (win.document.fonts) {
        win.document.fonts.ready.then(() => {
            setTimeout(() => {
                win.print();
            }, 800);
        });
    } else {
        win.onload = () => {
            setTimeout(() => {
                win.print();
            }, 1000);
        };
    }
}
function generateOfficialGeneralReport() {
    // 1. Group DATA.final by Guidance
    const grouped = {};
    DATA.final.forEach(s => {
        let gCode = getVal(s, 'كود التوجيه') || getVal(s, 'التوجيه') || getVal(s, 'الإدارة');
        if (!gCode && s.finalSupCode) {
            const assignedSup = DATA.supervisors.find(sx => getVal(sx, 'كود الموجه') == s.finalSupCode);
            if (assignedSup) gCode = getVal(assignedSup, 'كود التوجيه') || getVal(assignedSup, 'التوجيه');
        }
        const guidName = getGuidanceName(gCode);
        if (!grouped[guidName]) grouped[guidName] = [];
        grouped[guidName].push(s);
    });

    // 2. Build HTML for each group as a separate page
    let fullHtml = Object.entries(grouped).map(([guidName, schools]) => {
        let rowsHtml = schools.map((s, index) => {
            const sup = DATA.supervisors.find(su => getVal(su, 'كود الموجه') == s.finalSupCode);
            const phone = sup ? (getVal(sup, 'تليفون الموجه') || getVal(sup, 'التليفون') || '-') : '-';
            // Arabic numerals
            const arabicNum = String(index + 1).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
            return `
                <tr>
                    <td>${arabicNum}</td>
                    <td style="text-align:right">${getVal(s, 'اسم المدرسة')}</td>
                    <td>${s.finalSup || '-'}</td>
                    <td>${phone}</td>
                    <td></td>
                </tr>
            `;
        }).join('');

        return `
            <div class="report-page page-break">
                <div class="report-header">
                    <div style="text-align:right">
                        <p style="font-weight:900; font-size:14px;">محافظة الجيزة</p>
                        <p style="font-weight:900; font-size:14px;">إدارة العمرانية التعليمية</p>
                        <p style="font-size:11px; margin-top:3px;">تاريخ: ${new Date().toLocaleDateString('ar-EG')}</p>
                    </div>
                    <div class="report-title-box" style="flex:1; margin:0 15px;">
                        <div style="font-weight:900; font-size:16px;">كشف توزيع الموجهين المقيمين</div>
                        <div style="font-size:13px; margin-top:3px; font-weight:normal;">لمتابعة امتحانات نصف العام 2025/2026م</div>
                    </div>
                     <div style="text-align:left">
                        <div style="width:70px; height:70px; border:2px solid #000; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:10px; background:#f8f9fa;">
                             <img src="logo.png" style="width:100%; height:100%; object-fit:contain;" alt="شعار الإدارة" />
                        </div>
                        <p style="font-size:9px; margin-top:4px; font-weight:bold;">لجنة الإدارة</p>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin:15px 0; padding:8px; background:#f8f9fa; border:1.5px solid #000;">
                    <div style="font-weight:900; font-size:1.2rem;">📋 توجيه: ${guidName}</div>
                    <div style="font-size:0.85rem;">عدد المدارس: ${schools.length}</div>
                </div>
                
                <table class="official-table">
                    <thead>
                        <tr style="background:#e9ecef;">
                            <th style="width:50px; font-weight:900;">م</th>
                            <th style="text-align:right; font-weight:900;">اسم المدرسة</th>
                            <th style="width:180px; font-weight:900;">اسم الموجه المقيم</th>
                            <th style="width:120px; font-weight:900;">رقم التليفون</th>
                            <th style="width:120px; font-weight:900;">توقيع الموجه</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <div style="margin-top:25px; display:flex; justify-content:space-between; align-items:flex-start;">
                    <div style="border:1.5px solid #000; padding:8px 15px; font-size:11px;">
                        <p style="margin-bottom:3px;"><strong>ملاحظات هامة:</strong></p>
                        <p style="margin:2px 0;">• يُرجى الالتزام بالمدرسة المحددة</p>
                        <p style="margin:2px 0;">• التواصل الفوري مع غرفة العمليات</p>
                    </div>
                    <div class="signature-block" style="text-align:center; min-width:200px;">
                        <p style="font-weight:bold; margin-bottom:5px;">يعتمد،،</p>
                        <p style="font-weight:900; font-size:1.1rem; margin:3px 0;">مدير عام الإدارة</p>
                        <p style="font-weight:bold; font-size:1.05rem; margin-top:8px;">${OFFICIALS.gm.name}</p>
                        <p style="margin-top:30px; border-top:1px solid #000; padding-top:3px; font-size:10px;">التوقيع</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Use New Window Strategy for Robust Printing
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return showToast("يرجى السماح بالنوافذ المنبثقة للطباعة", "⚠️");

    printWindow.document.write(`<html><head><title>الكشف العام</title>${PRINT_STYLES}</head><body>${fullHtml}</body></html>`);
    printWindow.document.close();

    // Slight delay to ensure content renders then print
    triggerPrint(printWindow);
}

function generateIndividualLetters(specificSchoolCode = null) {
    let targetData = DATA.final.filter(s => s.finalSup);

    if (specificSchoolCode) {
        targetData = targetData.filter(s => String(getVal(s, 'كود المدرسة')).trim() === String(specificSchoolCode).trim());
    } else {
        // Multi-select logic
        const checkboxes = document.querySelectorAll('.letter-checkbox:checked');
        if (checkboxes.length > 0) {
            const selectedCodes = Array.from(checkboxes).map(cb => cb.getAttribute('data-code'));
            targetData = targetData.filter(s => selectedCodes.includes(String(getVal(s, 'كود المدرسة')).trim()));
        } else if (confirm("لم يتم اختيار أي مدارس. هل تريد طباعة جميع خطابات التكليف؟")) {
            // Proceed with all
        } else {
            return;
        }
    }

    if (targetData.length === 0) {
        return showToast("لا توجد بيانات للطباعة", "⚠️");
    }

    let fullHtml = targetData.map((s, idx) => {
        const sup = DATA.supervisors.find(su => getVal(su, 'كود الموجه') == s.finalSupCode);

        // Robust Guidance Code Resolution
        let guidCode = getVal(s, 'كود التوجيه') || getVal(s, 'التوجيه') || getVal(s, 'الإدارة') || getVal(s, 'الادارة');

        // Fallback: If school has no guidance info, try to get it from the assigned supervisor
        if (!guidCode && s.finalSupCode) {
            const assignedSup = DATA.supervisors.find(sx => getVal(sx, 'كود الموجه') == s.finalSupCode);
            if (assignedSup) guidCode = getVal(assignedSup, 'كود التوجيه') || getVal(assignedSup, 'التوجيه');
        }

        const guidName = getGuidanceName(guidCode);

        return `
        <div class="report-page page-break">
            <div class="report-header">
                <div style="text-align:right">
                    <p style="font-size:12px; font-weight:900;">محافظة الجيزة</p>
                    <p style="font-size:11px; font-weight:900;">إدارة العمرانية التعليمية</p>
                    <p style="font-size:9px; margin-top:4px; color:#555;">التاريخ: ${new Date().toLocaleDateString('ar-EG')}</p>
                </div>
                <div class="report-title-box" style="font-size:15px; padding:8px 15px; flex:1; margin:0 10px;">
                    <div style="font-weight:900; margin-bottom:5px;">✉️ خطاب تكليف الموجه المقيم</div>
                    <div style="font-size:13px; font-weight:normal;">لمتابعة امتحانات النقل | نصف العام 2025 / 2026</div>
                </div>
                <div style="text-align:left">
                    <div style="width:80px; height:80px; border:2.5px solid #000; display:flex; align-items:center; justify-content:center; background:#f8f9fa;">
                        <img src="logo.png" style="width:100%; height:100%; object-fit:contain;" alt="شعار الإدارة">
                    </div>
                    <p style="font-size:8px; margin-top:3px; font-weight:bold; text-align:center;">لجنة الإدارة</p>
                </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:4px; margin-top:5px;">
                <div style="border:1.5px solid #000; padding:4px 10px; font-size:12px; display:flex; justify-content:space-between; align-items:center;">
                    <span>${OFFICIALS.gm.name} ( مدير عام الإدارة )</span>
                    <span dir="ltr">${OFFICIALS.gm.phone}</span>
                </div>
                <div style="border:1.5px solid #000; padding:4px 10px; font-size:12px; display:flex; justify-content:space-between; align-items:center;">
                    <span>${OFFICIALS.deputy.name} ( ${OFFICIALS.deputy.title} )</span>
                    <span dir="ltr">${OFFICIALS.deputy.phone}</span>
                </div>
                <div style="border:1.5px solid #000; padding:4px 10px; font-size:12px; display:flex; justify-content:space-between; align-items:center;">
                    <span>${OFFICIALS.security.name} ( مسئول أمن الإدارة )</span>
                    <span dir="ltr">${OFFICIALS.security.phone}</span>
                </div>
            </div>

            <div style="margin:5px 0; border:1.5px solid #000; padding:5px; position:relative;">
                <p style="font-weight:bold; margin-bottom:5px; font-size:11px;">السيد / <span style="border-bottom:1px dashed #000; padding:0 10px;">${s.finalSup}</span> &nbsp;&nbsp; توجيه: <span style="border-bottom:1px dashed #000; padding:0 10px;">${guidName}</span></p>
                <p style="text-align:center; font-weight:bold; margin:5px 0; font-size:11px;">تم تكليفكم لمتابعة امتحانات نصف العام 2025 / 2026 لصفوف النقل بمدرسة :</p>
                
                <div style="display:flex; justify-content:center; gap:10px; margin:2px 0;">
                    <div style="border:2px solid #000; padding:4px 15px; font-size:1rem; font-weight:900; min-width:150px; text-align:center; background:#f9f9f9;">
                        ${getVal(s, 'اسم المدرسة')}
                    </div>
                </div>
                <p style="text-align:center; font-weight:bold; text-decoration:underline; font-size:10px;">وحسب مواعيد جدول امتحانات الصفوف الموجودة بالمدرسة</p>
            </div>

            <p style="text-align:right; font-weight:bold; margin-top:2px; font-size:11px;">ويراعى الالتزام بما يلى :</p>
            <ol class="instructions-list official-font-size" dir="rtl" style="margin-right:20px; margin-bottom:2px; font-size:11px; line-height:1.3;">
                <li>التزام الموجه المقيم بتواجده مع مدير المدرسة لاستلام مظاريف الأسئلة من المطبعة السرية وتأمين سرية الامتحانات.</li>
                <li>الالتزام بالحضور قبل فتح مظاريف الأسئلة بوقت كاف مع مدير المدرسة ومسئوليته حتى التسليم إلى الكنترول.</li>
                <li>التواجد بالمدرسة قبل بدء الامتحان بوقت كاف للتأكد من استيفاء جميع الإجراءات المتصلة بالامتحان وقبل فتح مظاريف الأسئلة مع مدير المدرسة ومسئوليته حتى التسليم إلى الكنترول.</li>
                <li>الالتزام بجدول الامتحان كما هو وارد من الإدارة التعليمية وعدم مخالفته مطلقا.</li>
                <li>عمل تقرير يومي عن سير الامتحان مرفق به نسخة من اسئلة المواد التي تم تأدية الامتحان فيها في ذات اليوم وكذلك نسخة من الإملاء لمادة اللغة العربية ونسخة من اسئلة الاستماع للغة الانجليزية بعد انتهاء الامتحانات.</li>
                <li>عمل تقرير شامل في نهاية الامتحانات عن سير الامتحان بالمدرسة وتسليم التقارير اليومية والتقرير الشامل للمراحل في آخر يوم من أيام الامتحان لكل مرحلة.</li>
                <li>الالتزام بخروج الطلاب آخر الوقت وعدم مغادرة المدرسة إلا بعد خروج آخر طالب ومتابعة ذلك مع مدير المدرسة ومراقبي الأدوار.</li>
                <li>التواصل مع غرفة العمليات بالإدارة على الفور في حال حدوث مخالفة أو أي عارض ذو شأن أثناء سير الامتحان اليومي أو في حال وجود زائر من خارج الإدارة سواء من المديرية التعليمية أو الوزارة حيث أن ذلك سيتم تدوينه في التقرير اليومي للإدارة.</li>
            </ol>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:8px;">
                 <div style="text-align:right; font-size:11px; padding-right:5px;">
                    <p style="font-weight:bold; text-decoration:underline; margin-bottom:4px;">توقيع الموجه</p>
                    <p style="margin-bottom:2px;">الاسم : ..........................................</p>
                    <p style="margin-bottom:2px;">الوظيفة : .......................................</p>
                    <p style="margin-bottom:2px;">رقم التليفون : .................................</p>
                    <p style="margin-bottom:2px;">التوقيع : ........................................</p>
                </div>

                <div style="border:1.5px solid #000; padding:0;">
                    <div style="background:#e9ecef; color:#000; text-align:center; font-weight:900; padding:3px; font-size:10px; border-bottom:1.5px solid #000;">جدول تليفونات مديرى المراحل</div>
                    <div style="font-size:10px; padding:2px;">
                        ${OFFICIALS.managers.map(m => `
                            <div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding:1px;">
                                <span>${m.stage}</span>
                                <strong>${m.name}</strong>
                                <span dir="ltr">${m.phone}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div style="margin-top:15px; display:flex; justify-content:space-between; align-items:flex-end;">
                <div style="text-align:center; width:200px;">
                    <p style="font-weight:bold;">يعتمد،، الموجه الأول</p>
                    <p style="margin-top:25px;">................................</p>
                </div>
                <div style="text-align:center; width:200px;">
                    <p style="font-weight:bold;">وكيل الإدارة</p>
                    <br>
                    <p style="font-weight:bold; font-size:1.1rem;">${OFFICIALS.deputy.name}</p>
                </div>
                <div style="text-align:center; width:200px;">
                    <p style="font-weight:bold;">مدير عام الإدارة</p>
                    <br>
                    <p style="font-weight:bold; font-size:1.1rem;">${OFFICIALS.gm.name}</p>
                </div>
            </div>
        </div>
        `;
    }).join('');

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return showToast("يرجى السماح بالنوافذ المنبثقة", "⚠️");

    printWindow.document.write(`<html><head><title>خطابات التكليف</title>${PRINT_STYLES}</head><body>${fullHtml}</body></html>`);
    printWindow.document.close();
    triggerPrint(printWindow);
}

function generateCategorizedReport() {
    // 1. Filter Assigned Schools
    const assignments = DATA.final.filter(s => s.finalSup);
    if (assignments.length === 0) return showToast("لا توجد توزيعات لعرضها", "⚠️");

    // 2. Define Groups
    const groups = {
        'P_OFF': { label: 'توزيع الموجهين المقيمين - المرحلة الابتدائية (رسمي)', schools: [] },
        'E_OFF': { label: 'توزيع الموجهين المقيمين - المرحلة الإعدادية (رسمي)', schools: [] },
        'S_OFF': { label: 'توزيع الموجهين المقيمين - المرحلة الثانوية (رسمي)', schools: [] },
        'PVT': { label: 'توزيع الموجهين المقيمين - المدارس الخاصة والدولية', schools: [] }
    };

    assignments.forEach(s => {
        const stage = (getVal(s, 'المرحلة') || '').trim();
        const rawType = (getVal(s, 'النوعية') || '').trim();

        // Official Schools: officially defined as containing 'رسمي' or 'رسمى' or 'ثقافي' or 'ثقافى'
        const isOfficial = rawType.includes('رسمي') || rawType.includes('رسمى') || rawType.includes('ثقافي') || rawType.includes('ثقافى');

        if (!isOfficial) {
            groups.PVT.schools.push(s);
        } else {
            // Stage matching with priority (Primary > Prep > Secondary)
            if (stage.includes('ابتدائ')) groups.P_OFF.schools.push(s);
            else if (stage.includes('اعداد')) groups.E_OFF.schools.push(s);
            else if (stage.includes('ثانو')) groups.S_OFF.schools.push(s);
            else groups.P_OFF.schools.push(s); // Fallback
        }
    });

    // 3. Generate HTML per Page
    const fullHtml = Object.values(groups).filter(g => g.schools.length > 0).map(group => {
        // Sort within group: Type then Name
        group.schools.sort((a, b) => {
            const tA = getVal(a, 'النوعية') || '';
            const tB = getVal(b, 'النوعية') || '';
            if (tA !== tB) return tA.localeCompare(tB, 'ar');
            return String(getVal(a, 'اسم المدرسة')).localeCompare(String(getVal(b, 'اسم المدرسة')), 'ar');
        });

        const rowsHtml = group.schools.map((s, idx) => {
            const sup = DATA.supervisors.find(su => getVal(su, 'كود الموجه') == s.finalSupCode);
            const phone = sup ? (getVal(sup, 'تليفون الموجه') || getVal(sup, 'التليفون') || '-') : '-';
            return `
                <tr>
                    <td>${idx + 1}</td>
                    <td style="text-align:right">
                        ${getVal(s, 'اسم المدرسة')}
                        <div style="font-size:8px; color:#666;">(${getVal(s, 'النوعية')})</div>
                    </td>
                    <td>${s.finalSup || '-'}</td>
                    <td dir="ltr" style="text-align:center;">${phone}</td>
                </tr>
            `;
        }).join('');

        return `
            <div class="report-page page-break">
                <div class="report-header">
                    <div style="text-align:right">
                        <p style="font-weight:900; font-size:14px;">محافظة الجيزة</p>
                        <p style="font-weight:900; font-size:14px;">إدارة العمرانية التعليمية</p>
                        <p style="font-size:11px; margin-top:3px;">تاريخ: ${new Date().toLocaleDateString('ar-EG')}</p>
                    </div>
                    <div class="report-title-box" style="flex:1; margin:0 15px;">
                        <div style="font-weight:900; font-size:16px;">${group.label}</div>
                    </div>
                    <div style="text-align:left">
                        <div style="width:70px; height:70px; border:2px solid #000; display:flex; align-items:center; justify-content:center; background:#f8f9fa;">
                             <img src="logo.png" style="width:100%; height:100%; object-fit:contain;" alt="شعار الإدارة" />
                        </div>
                        <p style="font-size:8px; margin-top:3px; font-weight:bold; text-align:center;">لجنة الإدارة</p>
                    </div>
                </div>
                
                <table class="official-table" style="margin-top:20px;">
                    <thead>
                        <tr style="background:#e9ecef;">
                            <th style="width:50px;">م</th>
                            <th>اسم المدرسة</th>
                            <th style="width:200px;">اسم الموجه المقيم</th>
                            <th style="width:120px;">رقم التليفون</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    }).join('');

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return showToast("يرجى السماح بالنوافذ المنبثقة", "⚠️");

    printWindow.document.write(`<html><head><title>تقرير توزيع الموجهين</title>${PRINT_STYLES}</head><body>${fullHtml}</body></html>`);
    printWindow.document.close();
    triggerPrint(printWindow);
}

// --- Comprehensive Data Management System ---

// --- Modal Logic ---

function closeModal() {
    const modals = [
        document.getElementById('adminLoginModal'),
        document.getElementById('mgmtModal')
    ];
    modals.forEach(m => {
        if (m) m.classList.add('hidden');
    });
}

// --- New Reports Logic ---

function generateBlankLetter() {
    // Helper to render the HTML structure (reused layout)
    const renderLetter = (s, guidName) => `
        <div class="report-page page-break">
            <div class="report-header">
                <div style="text-align:right">
                    <p style="font-size:12px; font-weight:900;">محافظة الجيزة</p>
                    <p style="font-size:11px; font-weight:900;">إدارة العمرانية التعليمية</p>
                    <p style="font-size:9px; margin-top:4px; color:#555;">التاريخ: ${new Date().toLocaleDateString('ar-EG')}</p>
                </div>
                <div class="report-title-box" style="font-size:15px; padding:8px 15px; flex:1; margin:0 10px;">
                    <div style="font-weight:900; margin-bottom:5px;">✉️ خطاب تكليف الموجه المقيم</div>
                    <div style="font-size:13px; font-weight:normal;">لمتابعة امتحانات النقل | نصف العام 2025 / 2026</div>
                </div>
                <div style="text-align:left">
                    <div style="width:80px; height:80px; border:2.5px solid #000; display:flex; align-items:center; justify-content:center; background:#f8f9fa;">
                        <img src="logo.png" style="width:100%; height:100%; object-fit:contain;" alt="شعار الإدارة" />
                    </div>
                    <p style="font-size:8px; margin-top:3px; font-weight:bold; text-align:center;">لجنة الإدارة</p>
                </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:4px; margin-top:5px;">
                <div style="border:1.5px solid #000; padding:4px 10px; font-size:12px; display:flex; justify-content:space-between; align-items:center;">
                    <span>${OFFICIALS.gm.name} ( مدير عام الإدارة )</span>
                    <span dir="ltr">${OFFICIALS.gm.phone}</span>
                </div>
                <div style="border:1.5px solid #000; padding:4px 10px; font-size:12px; display:flex; justify-content:space-between; align-items:center;">
                    <span>${OFFICIALS.deputy.name} ( ${OFFICIALS.deputy.title} )</span>
                    <span dir="ltr">${OFFICIALS.deputy.phone}</span>
                </div>
                <div style="border:1.5px solid #000; padding:4px 10px; font-size:12px; display:flex; justify-content:space-between; align-items:center;">
                    <span>${OFFICIALS.security.name} ( مسئول أمن الإدارة )</span>
                    <span dir="ltr">${OFFICIALS.security.phone}</span>
                </div>
            </div>

            <div style="margin:5px 0; border:1.5px solid #000; padding:5px; position:relative;">
                <p style="font-weight:bold; margin-bottom:5px; font-size:11px;">السيد / <span style="border-bottom:1px dashed #000; padding:0 10px;">.........................................</span> &nbsp;&nbsp; توجيه: <span style="border-bottom:1px dashed #000; padding:0 10px;">.........................................</span></p>
                <p style="text-align:center; font-weight:bold; margin:5px 0; font-size:11px;">تم تكليفكم لمتابعة امتحانات نصف العام 2025 / 2026 لصفوف النقل بمدرسة :</p>

                <div style="display:flex; justify-content:center; gap:10px; margin:2px 0;">
                    <div style="border:2px solid #000; padding:4px 15px; font-size:1rem; font-weight:900; min-width:150px; text-align:center; background:#f9f9f9;">
                        ..................................................................
                    </div>
                </div>
                <p style="text-align:center; font-weight:bold; text-decoration:underline; font-size:10px;">وحسب مواعيد جدول امتحانات الصفوف الموجودة بالمدرسة</p>
            </div>

            <p style="text-align:right; font-weight:bold; margin-top:2px; font-size:11px;">ويراعى الالتزام بما يلى :</p>
            <ol class="instructions-list official-font-size" dir="rtl" style="margin-right:20px; margin-bottom:2px; font-size:11px; line-height:1.3;">
                <li>التزام الموجه المقيم بتواجده مع مدير المدرسة لاستلام مظاريف الأسئلة من المطبعة السرية وتأمين سرية الامتحانات.</li>
                <li>الالتزام بالحضور قبل فتح مظاريف الأسئلة بوقت كاف مع مدير المدرسة ومسئوليته حتى التسليم إلى الكنترول.</li>
                <li>التواجد بالمدرسة قبل بدء الامتحان بوقت كاف للتأكد من استيفاء جميع الإجراءات المتصلة بالامتحان وقبل فتح مظاريف الأسئلة مع مدير المدرسة ومسئوليته حتى التسليم إلى الكنترول.</li>
                <li>الالتزام بجدول الامتحان كما هو وارد من الإدارة التعليمية وعدم مخالفته مطلقا.</li>
                <li>عمل تقرير يومي عن سير الامتحان مرفق به نسخة من اسئلة المواد التي تم تأدية الامتحان فيها في ذات اليوم وكذلك نسخة من الإملاء لمادة اللغة العربية ونسخة من اسئلة الاستماع للغة الانجليزية بعد انتهاء الامتحانات.</li>
                <li>عمل تقرير شامل في نهاية الامتحانات عن سير الامتحان بالمدرسة وتسليم التقارير اليومية والتقرير الشامل للمراحل في آخر يوم من أيام الامتحان لكل مرحلة.</li>
                <li>الالتزام بخروج الطلاب آخر الوقت وعدم مغادرة المدرسة إلا بعد خروج آخر طالب ومتابعة ذلك مع مدير المدرسة ومراقبي الأدوار.</li>
                <li>التواصل مع غرفة العمليات بالإدارة على الفور في حال حدوث مخالفة أو أي عارض ذو شأن أثناء سير الامتحان اليومي أو في حال وجود زائر من خارج الإدارة سواء من المديرية التعليمية أو الوزارة حيث أن ذلك سيتم تدوينه في التقرير اليومي للإدارة.</li>
            </ol>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:8px;">
                 <div style="text-align:right; font-size:11px; padding-right:5px;">
                    <p style="font-weight:bold; text-decoration:underline; margin-bottom:4px;">توقيع الموجه</p>
                    <p style="margin-bottom:2px;">الاسم : ..........................................</p>
                    <p style="margin-bottom:2px;">الوظيفة : .......................................</p>
                    <p style="margin-bottom:2px;">رقم التليفون : .................................</p>
                    <p style="margin-bottom:2px;">التوقيع : ........................................</p>
                </div>

                <div style="border:1.5px solid #000; padding:0;">
                    <div style="background:#e9ecef; color:#000; text-align:center; font-weight:900; padding:3px; font-size:10px; border-bottom:1.5px solid #000;">جدول تليفونات مديرى المراحل</div>
                    <div style="font-size:10px; padding:2px;">
                        ${OFFICIALS.managers.map(m => `
                            <div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding:1px;">
                                <span>${m.stage}</span>
                                <strong>${m.name}</strong>
                                <span dir="ltr">${m.phone}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div style="margin-top:5px; display:flex; justify-content:space-between; align-items:flex-end;">
                <div style="text-align:center; width:200px;">
                    <p style="font-weight:bold;">يعتمد،، الموجه الأول</p>
                    <p style="margin-top:25px;">................................</p>
                </div>
                <div style="text-align:center; width:200px;">
                    <p style="font-weight:bold;">وكيل الإدارة</p>
                    <br>
                    <p style="font-weight:bold; font-size:1.1rem;">${OFFICIALS.deputy.name}</p>
                </div>
                <div style="text-align:center; width:200px;">
                    <p style="font-weight:bold;">مدير عام الإدارة</p>
                    <br />
                    <p style="font-weight:bold; font-size:1.1rem;">${OFFICIALS.gm.name}</p>
                </div>
            </div>
        </div>
        `;

    const fullHtml = renderLetter({}, ''); // Render blank

    printWindow.document.write(`<html><head><title>خطاب فارغ</title>${PRINT_STYLES}</head><body>${fullHtml}</body></html>`);
    printWindow.document.close();
    triggerPrint(printWindow);
}

function generateUnassignedReport() {
    // 1. Identify Unassigned Supervisors
    // Active (logic isSupervisorAvailable) AND Not in DATA.final as finalSupCode
    if (!DATA.supervisors) return showToast('لا توجد بيانات موجهين', '⚠️');

    const assignedCodes = new Set(DATA.final.filter(s => s.finalSupCode).map(s => String(s.finalSupCode).trim()));
    const unassigned = DATA.supervisors.filter(s => {
        const code = String(getVal(s, 'كود الموجه')).trim();
        return isSupervisorAvailable(s) && !assignedCodes.has(code);
    });

    if (unassigned.length === 0) return showToast("جميع الموجهين النشطين تم توزيعهم! 👏", "success");

    // 2. Generate Report HTML
    const rowsHtml = unassigned.map((s, idx) => `
        < tr >
            <td>${idx + 1}</td>
            <td>${getVal(s, 'اسم الموجه')}</td>
            <td>${getVal(s, 'كود الموجه')}</td>
            <td>${getGuidanceName(getVal(s, 'كود التوجيه'))}</td>
            <td>${isSupervisorAvailable(s) ? '✅ نشط' : '❌ غير نشط'}</td>
        </tr>
        `).join('');

    const fullHtml = `
        <div class="report-page">
            <div class="report-header">
                <div style="text-align:right">
                    <p style="font-weight:900; font-size:14px;">محافظة الجيزة</p>
                    <p style="font-weight:900; font-size:14px;">إدارة العمرانية التعليمية</p>
                    <p style="font-size:11px; margin-top:3px;">تاريخ: ${new Date().toLocaleDateString('ar-EG')}</p>
                </div>
                <div class="report-title-box" style="flex:1; margin:0 15px;">
                    <div style="font-weight:900; font-size:16px;">الموجهين غير الموزعين</div>
                    <div style="font-size:13px; margin-top:3px; font-weight:normal;">(لم يتم إسناد مدارس لهم)</div>
                </div>
                <div style="text-align:left">
                    <div style="width:70px; height:70px; border:2px solid #000; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:10px; background:#f8f9fa;">
                         <img src="logo.png" style="width:100%; height:100%; object-fit:contain;" alt="شعار الإدارة" />
                    </div>
                </div>
            </div>

            <table class="official-table">
                <thead>
                    <tr style="background:#e9ecef;">
                        <th style="width:50px;">م</th>
                        <th>اسم الموجه</th>
                        <th>التوجيه</th>
                        <th>الحالة</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
            
             <div class="signature-block">
                <p style="font-weight:bold; margin-bottom:5px;">يعتمد،،</p>
                <p style="font-weight:900; font-size:1.1rem; margin:3px 0;">مدير عام الإدارة</p>
                <p style="font-weight:bold; font-size:1.05rem; margin-top:8px;">${OFFICIALS.gm.name}</p>
            </div>
        </div>
        `;

    // Print
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return showToast("يرجى السماح بالنوافذ المنبثقة", "⚠️");

    printWindow.document.write(`<html><head><title>غير الموزعين</title>${PRINT_STYLES}</head><body>${fullHtml}</body></html>`);
    printWindow.document.close();
    triggerPrint(printWindow);
}

function generateUnifiedReport() {
    // 1. Filter Assigned Schools
    const assignments = DATA.final.filter(s => s.finalSup);

    if (assignments.length === 0) return showToast("لا توجد توزيعات لعرضها", "⚠️");

    // 2. Custom Sorting Logic
    const stageOrder = { 'إبتدائي': 1, 'ابتدائي': 1, 'إعدادي': 2, 'اعدادي': 2, 'ثانوي': 3, 'تجريبي': 4 };
    const typeOrder = { 'عام': 1, 'رسمي': 1, 'خاص': 2, 'لغات': 3, 'مجتمعي': 4, 'دولي': 5, 'فني': 6 };

    assignments.sort((a, b) => {
        // Get Ranks
        const sA = getVal(a, 'المرحلة') || '';
        const sB = getVal(b, 'المرحلة') || '';
        const rankSA = stageOrder[sA.trim()] || 99;
        const rankSB = stageOrder[sB.trim()] || 99;

        if (rankSA !== rankSB) return rankSA - rankSB;

        const tA = getVal(a, 'النوعية') || '';
        const tB = getVal(b, 'النوعية') || '';
        const rankTA = typeOrder[tA.trim()] || 99;
        const rankTB = typeOrder[tB.trim()] || 99;

        if (rankTA !== rankTB) return rankTA - rankTB;

        // Fallback: Name
        return String(getVal(a, 'اسم المدرسة')).localeCompare(String(getVal(b, 'اسم المدرسة')), 'ar');
    });

    // 3. Generate Rows
    const rowsHtml = assignments.map((s, idx) => {
        let guidCode = getVal(s, 'كود التوجيه') || getVal(s, 'التوجيه') || getVal(s, 'الإدارة') || getVal(s, 'الادارة');
        if (!guidCode && s.finalSupCode) {
            const assignedSup = DATA.supervisors.find(sx => getVal(sx, 'كود الموجه') == s.finalSupCode);
            if (assignedSup) guidCode = getVal(assignedSup, 'كود التوجيه') || getVal(assignedSup, 'التوجيه');
        }
        const guidName = getGuidanceName(guidCode);

        // Styling for separation
        const isNewStage = idx > 0 && (getVal(s, 'المرحلة') !== getVal(assignments[idx - 1], 'المرحلة'));
        const rowStyle = isNewStage ? 'border-top: 3px double #000;' : '';

        return `
            <tr style="${rowStyle}">
                <td>${idx + 1}</td>
                <td style="text-align:right;">${getVal(s, 'اسم المدرسة')} <span style="font-size:9px; color:#555;">(${getVal(s, 'المرحلة')} - ${getVal(s, 'النوعية')})</span></td>
                <td>${s.finalSup}</td>
                <td>${guidName}</td>
                 <td></td>
            </tr>
        `;
    }).join('');

    // 4. Build Report Layout (One Table)
    const fullHtml = `
        <div class="report-page">
            <div class="report-header">
                <div style="text-align:right">
                    <p style="font-weight:900; font-size:14px;">محافظة الجيزة</p>
                    <p style="font-weight:900; font-size:14px;">إدارة العمرانية التعليمية</p>
                    <p style="font-size:11px; margin-top:3px;">تاريخ: ${new Date().toLocaleDateString('ar-EG')}</p>
                </div>
                <div class="report-title-box" style="flex:1; margin:0 15px;">
                    <div style="font-weight:900; font-size:16px;">الكشف الموحد لتوزيع الموجهين المقيمين</div>
                    <div style="font-size:13px; margin-top:3px; font-weight:normal;">(مرتب حسب المرحلة والنوعية)</div>
                </div>
                <div style="text-align:left">
                    <div style="width:70px; height:70px; border:2px solid #000; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:10px; background:#f8f9fa;">
                         <img src="logo.png" style="width:100%; height:100%; object-fit:contain;" alt="شعار الإدارة" />
                    </div>
                </div>
            </div>

            <table class="official-table">
                <thead>
                    <tr style="background:#e9ecef;">
                        <th style="width:40px;">م</th>
                        <th>اسم المدرسة</th>
                        <th>اسم الموجه المقيم</th>
                        <th>التوجيه</th>
                        <th style="width:100px;">التوقيع</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
            
             <div class="signature-block">
                <p style="font-weight:bold; margin-bottom:5px;">يعتمد،،</p>
                <p style="font-weight:900; font-size:1.1rem; margin:3px 0;">مدير عام الإدارة</p>
                <p style="font-weight:bold; font-size:1.05rem; margin-top:8px;">${OFFICIALS.gm.name}</p>
            </div>
        </div>
        `;

    // Print
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return showToast("يرجى السماح بالنوافذ المنبثقة", "⚠️");

    printWindow.document.write(`<html><head><title>الكشف الموحد</title>${PRINT_STYLES}</head><body>${fullHtml}</body></html>`);
    printWindow.document.close();
    triggerPrint(printWindow);
}

function generateUnassignedSchoolsReport() {
    // 1. Filter Unassigned Schools
    const unassignedSchools = DATA.final.filter(s => !s.finalSup);

    if (unassignedSchools.length === 0) return showToast("جميع المدارس تم توزيعها بنجاح! 👏", "success");

    // 2. Sort by Stage & Name
    unassignedSchools.sort((a, b) => {
        const sA = getVal(a, 'المرحلة') || '';
        const sB = getVal(b, 'المرحلة') || '';
        if (sA !== sB) return sA.localeCompare(sB, 'ar');
        return String(getVal(a, 'اسم المدرسة')).localeCompare(String(getVal(b, 'اسم المدرسة')), 'ar');
    });

    // 3. Generate Rows
    const rowsHtml = unassignedSchools.map((s, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td style="text-align:right;">${getVal(s, 'اسم المدرسة')}</td>
            <td>${getVal(s, 'المرحلة')}</td>
            <td>${getVal(s, 'النوعية')}</td>
            <td>${getGuidanceName(getVal(s, 'كود التوجيه') || getVal(s, 'التوجيه'))}</td>
        </tr>
        `).join('');

    const fullHtml = `
        <div class="report-page">
            <div class="report-header">
                <div style="text-align:right">
                    <p style="font-weight:900; font-size:14px;">محافظة الجيزة</p>
                    <p style="font-weight:900; font-size:14px;">إدارة العمرانية التعليمية</p>
                    <p style="font-size:11px; margin-top:3px;">تاريخ: ${new Date().toLocaleDateString('ar-EG')}</p>
                </div>
                <div class="report-title-box" style="flex:1; margin:0 15px;">
                    <div style="font-weight:900; font-size:16px;">تقرير العجز (مدارس بلا موجهين)</div>
                    <div style="font-size:13px; margin-top:3px; font-weight:normal;">بيان بالمدارس التي لم يتم تسكين موجه مقيم لها</div>
                </div>
                <div style="text-align:left">
                    <div style="width:70px; height:70px; border:2px solid #000; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:10px; background:#f8f9fa;">
                         <img src="logo.png" style="width:100%; height:100%; object-fit:contain;" alt="شعار الإدارة" />
                    </div>
                </div>
            </div>

            <div style="margin:20px 0; padding:10px; background:#ffebeb; border:1px solid #ffcccc; text-align:center; color:#c00;">
                <strong>إجمالي العجز: ${unassignedSchools.length} مدرسة</strong>
            </div>

            <table class="official-table">
                <thead>
                    <tr style="background:#e9ecef;">
                        <th style="width:50px;">م</th>
                        <th>اسم المدرسة</th>
                        <th>المرحلة</th>
                        <th>النوعية</th>
                        <th>التوجيه المطلوب</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
            
             <div class="signature-block">
                <p style="font-weight:bold; margin-bottom:5px;">يعتمد،،</p>
                <p style="font-weight:900; font-size:1.1rem; margin:3px 0;">مدير عام الإدارة</p>
                <p style="font-weight:bold; font-size:1.05rem; margin-top:8px;">${OFFICIALS.gm.name}</p>
            </div>
        </div>
        `;

    // Print
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return showToast("يرجى السماح بالنوافذ المنبثقة", "⚠️");

    printWindow.document.write(`<html><head><title>تقرير العجز</title>${PRINT_STYLES}</head><body>${fullHtml}</body></html>`);
    printWindow.document.close();
    triggerPrint(printWindow);
}

let currentMgmtType = 'schools';
let currentEditId = null;

const MGMT_CONFIG = {
    schools: {
        title: 'إدارة المدارس',
        headers: ['الكود', 'اسم المدرسة', 'المرحلة', 'النوعية', 'التوجيه', 'إجراءات'],
        fields: [
            { id: 'كود المدرسة', label: 'كود المدرسة', type: 'text', required: true },
            { id: 'اسم المدرسة', label: 'اسم المدرسة', type: 'text', required: true },
            { id: 'المرحلة', label: 'المرحلة', type: 'select', options: ['إبتدائي', 'إعدادي', 'ثانوي', 'تجريبي'] },
            { id: 'النوعية', label: 'النوعية', type: 'select', options: ['عام', 'خاص', 'مجتمعي', 'فني'] },
            { id: 'كود التوجيه', label: 'كود التوجيه', type: 'text' }
        ]
    },
    supervisors: {
        title: 'إدارة الموجهين',
        headers: ['الكود', 'اسم الموجه', 'التوجيه', 'الحالة', 'إجراءات'],
        fields: [
            { id: 'كود الموجه', label: 'كود الموجه', type: 'text', required: true },
            { id: 'اسم الموجه', label: 'اسم الموجه', type: 'text', required: true },
            { id: 'كود التوجيه', label: 'كود التوجيه', type: 'text' },
            { id: 'التخصص', label: 'التخصص', type: 'text' },
            { id: 'الحالة', label: 'الحالة', type: 'select', options: ['متاح', 'غير متاح'] }
        ]
    },
    guidance: {
        title: 'إدارة التوجيهات',
        headers: ['الكود', 'اسم التوجيه', 'الباسوورد', 'إجراءات'],
        fields: [
            { id: 'كود التوجيه', label: 'كود التوجيه', type: 'text', required: true },
            { id: 'اسم التوجيه', label: 'اسم التوجيه', type: 'text', required: true },
            { id: 'الباسوورد', label: 'كلمة المرور', type: 'password' }
        ]
    }
};

function renderManagementTable(type) {
    currentMgmtType = type;
    const config = MGMT_CONFIG[type];

    // Update UI Active State
    ['schools', 'supervisors', 'guidance'].forEach(t => {
        const btn = document.getElementById(`mgmt-btn-${t}`);
        if (btn) {
            btn.classList.toggle('bg-indigo-600', t === type);
            btn.classList.toggle('text-white', t === type);
            btn.classList.toggle('text-slate-400', t !== type);
        }
    });

    document.getElementById('mgmtTitle').innerText = config.title;

    // Render Headers
    const headRow = document.createElement('tr');
    config.headers.forEach(h => {
        const th = document.createElement('th');
        th.className = "px-6 py-4 text-xs font-bold";
        th.innerText = h;
        headRow.appendChild(th);
    });
    document.getElementById('mgmtHead').innerHTML = '';
    document.getElementById('mgmtHead').appendChild(headRow);

    // Filter & Render Body
    const searchVal = document.getElementById('mgmtSearch').value.toLowerCase();
    const data = DATA[type] || [];

    const filtered = data.filter(item => {
        const valStr = Object.values(item).join(' ').toLowerCase();
        return valStr.includes(searchVal);
    });

    const tbody = document.getElementById('mgmtBody');
    tbody.innerHTML = filtered.map(item => {
        let cells = '';
        const idKey = config.fields[0].id; // Assumption: First field is ID
        const itemId = getVal(item, idKey);

        if (type === 'schools') { // Ordered: Code, Name, Stage, Type, Guid
            cells = `
                <td>${getVal(item, 'كود المدرسة')}</td>
                <td>${getVal(item, 'اسم المدرسة')}</td>
                <td>${getVal(item, 'المرحلة')}</td>
                <td>${getVal(item, 'النوعية')}</td>
                <td>${getGuidanceName(getVal(item, 'كود التوجيه'))}</td>
            `;
        } else if (type === 'supervisors') {
            cells = `
                <td>${getVal(item, 'كود الموجه')}</td>
                <td>${getVal(item, 'اسم الموجه')}</td>
                <td>${getGuidanceName(getVal(item, 'كود التوجيه'))}</td>
                <td>
                    <span class="px-2 py-1 rounded-full text-[10px] ${getVal(item, 'الحالة') === 'متاح' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
                        ${getVal(item, 'الحالة')}
                    </span>
                </td>
            `;
        } else { // Guidance
            cells = `
                <td>${getVal(item, 'كود التوجيه')}</td>
                <td>${getVal(item, 'اسم التوجيه')}</td>
                <td>●●●●●●</td>
            `;
        }

        return `
        <tr class="hover:bg-white/5 border-b border-white/5 transition-colors">
            ${cells.replace(/<td>/g, '<td class="px-6 py-4 text-sm">')}
    <td class="px-6 py-4 flex gap-2 justify-center">
        <button onclick="editRecord('${itemId}')" class="p-2 bg-indigo-500/20 text-indigo-300 rounded hover:bg-indigo-500/40" title="تعديل">✏️</button>
        <button onclick="deleteRecord('${itemId}')" class="p-2 bg-rose-500/20 text-rose-300 rounded hover:bg-rose-500/40" title="حذف">🗑️</button>
    </td>
            </tr >
        `;
    }).join('');
}

function filterManagementTable() {
    renderManagementTable(currentMgmtType);
}

function openAddModal() {
    currentEditId = null;
    document.getElementById('modalTitle').innerText = 'إضافة سجل جديد';
    buildForm();
    document.getElementById('mgmtModal').classList.remove('hidden');
}

function closeMgmtModal() {
    document.getElementById('mgmtModal').classList.add('hidden');
}

function editRecord(id) {
    currentEditId = id;
    document.getElementById('modalTitle').innerText = 'تعديل السجل';
    const idKey = MGMT_CONFIG[currentMgmtType].fields[0].id;
    const record = DATA[currentMgmtType].find(item => String(getVal(item, idKey)) == String(id));

    if (record) {
        buildForm(record);
        document.getElementById('mgmtModal').classList.remove('hidden');
    }
}

function buildForm(data = {}) {
    const form = document.getElementById('mgmtForm');
    form.innerHTML = '';
    const config = MGMT_CONFIG[currentMgmtType];

    config.fields.forEach(field => {
        const div = document.createElement('div');
        div.className = 'space-y-1';

        const label = document.createElement('label');
        label.className = 'text-xs font-bold text-slate-400';
        label.innerText = field.label;

        let input;
        const val = getVal(data, field.id) || '';

        if (field.type === 'select') {
            input = document.createElement('select');
            input.className = 'w-full p-3 bg-slate-900 rounded-xl text-sm border border-white/10';
            field.options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.innerText = opt;
                if (val === opt || (field.id === 'الحالة' && val === 'نشط' && opt === 'متاح')) option.selected = true;
                input.appendChild(option);
            });
        } else {
            input = document.createElement('input');
            input.type = field.type;
            input.className = 'w-full p-3 bg-slate-900 rounded-xl text-sm border border-white/10';
            input.value = val;
            if (field.id === 'كود المدرسة' && currentEditId) input.readOnly = true; // Prevent ID change on edit
        }

        input.id = `field_${field.id} `;
        div.appendChild(label);
        div.appendChild(input);
        form.appendChild(div);
    });
}

async function saveMgmtRecord() {
    const config = MGMT_CONFIG[currentMgmtType];
    const formData = {};

    config.fields.forEach(field => {
        const el = document.getElementById(`field_${field.id} `);
        formData[field.id] = el.value;
    });

    const action = currentEditId ? 'update' : 'add';
    const idKey = config.fields[0].id; // e.g. 'كود المدرسة'
    const recordId = currentEditId || formData[idKey];

    // Update UI Optimistically
    if (currentEditId) {
        const index = DATA[currentMgmtType].findIndex(i => String(getVal(i, idKey)) == String(currentEditId));
        if (index !== -1) DATA[currentMgmtType][index] = { ...DATA[currentMgmtType][index], ...formData };
    } else {
        DATA[currentMgmtType].push(formData);
    }

    closeMgmtModal();
    renderManagementTable(currentMgmtType);
    showToast('تم الحفظ محلياً.. جاري المزامنة', '⏳');

    // Send to Backend
    // For update: need { action: 'update', type: '...', id: '...', data: formData }
    // For add: need { type: '...', ...formData } (no action needed based on code.gs fallback, or implicit)

    // We construct the payload here
    let payload = {
        type: currentMgmtType, // 'schools', 'supervisors' etc. code.gs will normalize this
        ...formData
    };

    if (action === 'update') {
        payload = {
            action: 'update',
            type: currentMgmtType,
            id: currentEditId,
            data: formData
        };
    }
    // If action is add, we just send type and formData (which is merged above).
    // Note: For 'add', we might need specific field mappings like 'schoolName' depending on code.gs legacy.
    // Let's ensure code.gs handles the field names from formData correctly. 
    // code.gs expects 'schoolName', 'schoolCode' etc for Add. 
    // formData has 'اسم المدرسة', 'كود المدرسة'.
    // We MIGHT need to map these for 'add' if code.gs relies on English keys for Add.
    // Checking code.gs: it expects data.schoolName...
    // We need to map Arabic keys to English keys for ADD operation.

    if (action === 'add') {
        if (currentMgmtType === 'schools') {
            payload.schoolName = formData['اسم المدرسة'];
            payload.schoolCode = formData['كود المدرسة'];
            payload.guidanceCode = formData['كود التوجيه'];
            payload.stage = formData['المرحلة'];
            payload.schoolType = formData['النوعية']; // Added
            payload.type = 'school';
        } else if (currentMgmtType === 'supervisors') {
            payload.supName = formData['اسم الموجه'];
            payload.supCode = formData['كود الموجه'];
            payload.guidanceCode = formData['كود التوجيه'];
            payload.status = formData['الحالة'];
            payload.specialty = formData['التخصص']; // Added
            payload.type = 'supervisor';
        } else if (currentMgmtType === 'guidance') {
            payload.guidanceName = formData['اسم التوجيه'];
            payload.guidanceCode = formData['كود التوجيه'];
            payload.password = formData['الباسوورد']; // Added
            payload.type = 'guidance';
        }
    }

    const gasUrl = document.getElementById('gasUrl').value;
    if (gasUrl) {
        try {
            await fetch(gasUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
            showToast('تم الإرسال لقاعدة البيانات', '✅');
        } catch (e) {
            showToast('خطأ في المزامنة', '❌');
        }
    }
}

async function deleteRecord(id) {
    if (!confirm('هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء.')) return;

    const config = MGMT_CONFIG[currentMgmtType];
    const idKey = config.fields[0].id;

    // UI Update
    DATA[currentMgmtType] = DATA[currentMgmtType].filter(item => String(getVal(item, idKey)) != String(id));
    renderManagementTable(currentMgmtType);

    // Backend
    // Send { action: 'delete', type: 'schools', id: id }
    const gasUrl = document.getElementById('gasUrl').value;
    if (gasUrl) {
        try {
            await fetch(gasUrl, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify({
                    action: 'delete',
                    type: currentMgmtType,
                    id: id
                })
            });
            showToast('تم الحذف من السيرفر', '🗑️');
        } catch (e) { showToast('خطأ في الاتصال', '❌'); }
    }
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

async function sendToBackend(action, data) {
    const sheetId = localStorage.getItem('sheetId');
    const gasUrl = localStorage.getItem('gasUrl');
    if (!sheetId || !gasUrl) return false;

    try {
        await fetch(gasUrl, {
            method: 'POST',
            body: JSON.stringify({
                action,
                sheetId,
                ...data
            })
        });
        return true;
    } catch {
        showToast('فشل الاتصال بالخادم', '❌');
        return false;
    }
}

// --- Supervisor Status Management ---

/**
 * عرض جدول إدارة حالة الموجهين
 */
function renderStatusTable() {
    const searchVal = (document.getElementById('statusSearch')?.value || '').toLowerCase();
    const tbody = document.getElementById('statusTableBody');
    if (!tbody) return;

    const filtered = DATA.supervisors.filter(s =>
        Object.values(s).join(' ').toLowerCase().includes(searchVal)
    );

    tbody.innerHTML = filtered.map(sup => {
        const code = getVal(sup, 'كود الموجه');
        const name = getVal(sup, 'اسم الموجه');
        const isActive = isSupervisorAvailable(sup);
        const guidName = getGuidanceName(getVal(sup, 'كود التوجيه'));

        // حساب عدد المدارس المخصصة لهذا الموجه
        const assignedSchools = DATA.final.filter(s => s.finalSupCode == code);
        const schoolCount = assignedSchools.length;

        return `
        < tr class="hover:bg-white/5 transition-colors" >
                <td class="px-6 py-4 text-sm">${code}</td>
                <td class="px-6 py-4 text-sm font-bold">${name}</td>
                <td class="px-6 py-4 text-sm">${guidName}</td>
                <td class="px-6 py-4 text-center">
                    <span class="px-3 py-1 rounded-lg text-xs font-bold ${isActive
                ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30'
            }">
                        ${isActive ? '✅ نشط' : '❌ غير نشط'}
                    </span>
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center gap-2">
                        <button 
                            onclick="toggleSupervisorStatus('${code}')" 
                            class="px-4 py-2 rounded-lg text-xs font-bold transition-all ${isActive
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }"
                        >
                            ${isActive ? '🚫 إيقاف' : '✅ تفعيل'}
                        </button>
                        ${schoolCount > 0 ? `
                            <span class="text-xs px-2 py-1 bg-amber-500/20 text-amber-300 rounded-lg font-bold">
                                ${schoolCount} مدرسة
                            </span>
                        ` : ''}
                    </div>
                </td>
            </tr >
        `;
    }).join('');

    if (filtered.length === 0) {
        tbody.innerHTML = `
        < tr >
        <td colspan="5" class="px-6 py-12 text-center text-slate-500">
            <div class="text-4xl mb-2">🔍</div>
            لا توجد نتائج للبحث
        </td>
            </tr >
        `;
    }
}

/**
 * تبديل حالة الموجه بين نشط وغير نشط
 */
async function toggleSupervisorStatus(supCode) {
    const supervisor = DATA.supervisors.find(s => getVal(s, 'كود الموجه') == supCode);
    if (!supervisor) return showToast('الموجه غير موجود', '❌');

    const isCurrentlyActive = isSupervisorAvailable(supervisor);
    const newStatus = isCurrentlyActive ? 'غير متاح' : 'متاح';
    const supName = getVal(supervisor, 'اسم الموجه');

    // حساب المدارس المتأثرة
    const assignedSchools = DATA.final.filter(s => s.finalSupCode == supCode);

    // تحذير إذا كان الموجه لديه مدارس ويتم إيقافه
    if (isCurrentlyActive && assignedSchools.length > 0) {
        const confirmMsg = `⚠️ تحذير!\n\nالموجه "${supName}" لديه ${assignedSchools.length} مدرسة مخصصة.\n\nإذا قمت بإيقافه، ستصبح هذه المدارس بحاجة لإعادة توزيع.\n\nهل تريد المتابعة؟`;
        if (!confirm(confirmMsg)) return;
    }

    const gasUrl = document.getElementById('gasUrl')?.value;
    if (!gasUrl) return showToast('يرجى إعداد رابط GAS أولاً', '⚠️');

    toggleLoader(true, 'جاري تحديث حالة الموجه...');

    try {
        // إرسال التحديث إلى Google Sheets
        await fetch(gasUrl, {
            method: 'POST',
            body: JSON.stringify({
                type: 'supervisor',
                action: 'update',
                id: supCode,
                data: { 'الحالة': newStatus }
            })
        });

        // تحديث البيانات محلياً
        supervisor['الحالة'] = newStatus;
        supervisor['متاح'] = newStatus;
        supervisor['نشط'] = newStatus;

        // إعادة عرض الجدول
        renderStatusTable();

        // إذا تم إيقاف موجه لديه مدارس، عرض تنبيه
        if (newStatus === 'غير متاح' && assignedSchools.length > 0) {
            showToast(`تم إيقاف الموجه.${assignedSchools.length} مدرسة بحاجة لإعادة توزيع`, '⚠️');

            // الانتقال تلقائياً لعرض المدارس المتأثرة
            setTimeout(() => {
                showAffectedSchools(supCode);
            }, 2000);
        } else {
            showToast(`تم ${isCurrentlyActive ? 'إيقاف' : 'تفعيل'} الموجه بنجاح`, '✅');
        }

    } catch (e) {
        console.error('Error updating supervisor status:', e);
        showToast('فشل في تحديث الحالة', '❌');
    } finally {
        toggleLoader(false);
    }
}

/**
 * عرض المدارس المتأثرة بإيقاف موجه
 */
function showAffectedSchools(supCode) {
    const supervisor = DATA.supervisors.find(s => getVal(s, 'كود الموجه') == supCode);
    const supName = getVal(supervisor, 'اسم الموجه');
    const affectedSchools = DATA.final.filter(s => s.finalSupCode == supCode);

    if (affectedSchools.length === 0) return;

    const schoolsList = affectedSchools.map(s => `• ${getVal(s, 'اسم المدرسة')} `).join('\n');

    alert(`📋 المدارس التي كانت مخصصة للموجه "${supName}": \n\n${schoolsList} \n\nيمكنك إعادة توزيعها من خلال: \n1.الانتقال إلى علامة تبويب "النتائج"\n2.استخدام زر "⚡ توزيع وإصلاح" لإعادة التوزيع التلقائي\n3.أو استخدام التغيير اليدوي لكل مدرسة`);
}

/**
 * الحصول على المدارس التي لديها موجهين غير نشطين
 */
function getSchoolsWithInactiveSupervisors() {
    return DATA.final.filter(school => {
        if (!school.finalSupCode) return false;
        const supervisor = DATA.supervisors.find(s =>
            getVal(s, 'كود الموجه') == school.finalSupCode
        );
        return supervisor && !isSupervisorAvailable(supervisor);
    });
}

// تصدير الدوال للوصول العام
window.renderStatusTable = renderStatusTable;
window.toggleSupervisorStatus = toggleSupervisorStatus;
window.getSchoolsWithInactiveSupervisors = getSchoolsWithInactiveSupervisors;
window.showAffectedSchools = showAffectedSchools;
