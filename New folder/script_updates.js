
// --- Supervisor Status Management ---

function renderStatusTable() {
    const tableBody = document.getElementById('statusTableBody');
    const searchVal = document.getElementById('statusSearch')?.value.toLowerCase() || '';

    if (!tableBody) return;

    const supervisors = DATA.supervisors || [];

    // Sort: Unavailable first, then Available
    supervisors.sort((a, b) => {
        const statusA = isSupervisorAvailable(a) ? 1 : 0;
        const statusB = isSupervisorAvailable(b) ? 1 : 0;
        return statusA - statusB;
    });

    const filtered = supervisors.filter(sup => {
        const name = getVal(sup, 'اسم الموجه') || '';
        const code = getVal(sup, 'كود الموجه') || '';
        return (name.toLowerCase().includes(searchVal) || String(code).includes(searchVal));
    });

    tableBody.innerHTML = filtered.map(sup => {
        const code = getVal(sup, 'كود الموجه');
        const name = getVal(sup, 'اسم الموجه');
        const guidCode = getVal(sup, 'كود التوجيه');
        const guidName = getGuidanceName(guidCode);
        const isAvailable = isSupervisorAvailable(sup);

        return `
            <tr class="hover:bg-indigo-900/10 transition-colors border-b border-white/5">
                <td class="px-6 py-4 text-xs font-mono text-slate-400">${code}</td>
                <td class="px-6 py-4 text-sm font-bold text-white">${name}</td>
                <td class="px-6 py-4 text-xs text-slate-300 bg-white/5 rounded-lg mx-2">${guidName}</td>
                <td class="px-6 py-4 text-center">
                    ${isAvailable
                ? '<span class="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-bold border border-emerald-500/20">✅ نشط (متاح)</span>'
                : '<span class="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-[10px] font-bold border border-red-500/20">❌ غير نشط</span>'}
                </td>
                <td class="px-6 py-4 text-center">
                   <button onclick="toggleSupervisorStatus('${code}', ${isAvailable})" 
                           class="px-4 py-2 ${isAvailable ? 'bg-red-900/40 text-red-300 hover:bg-red-900/60' : 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/60'} rounded-lg text-xs font-bold transition-all border border-white/10 shadow-lg">
                       ${isAvailable ? 'تعطيل ⛔' : 'تفعيل ✅'}
                   </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function toggleSupervisorStatus(supCode, currentStatus) {
    const newStatus = currentStatus ? 'غير متاح' : 'متاح'; // Toggle

    // Optimistic Update
    const sup = DATA.supervisors.find(s => getVal(s, 'كود الموجه') == supCode);
    if (!sup) return;

    // Update local data
    // Check if 'الحالة' key exists, if not find a key or create one
    let statusKey = Object.keys(sup).find(k => k === 'الحالة' || k === 'status');
    if (!statusKey) {
        statusKey = 'الحالة';
        sup[statusKey] = ''; // Init
    }
    sup[statusKey] = newStatus;

    // Re-render immediately
    renderStatusTable();
    showToast(`تم تغيير الحالة إلى: ${newStatus}`, '🔄');

    // Send to Backend
    const sheetId = localStorage.getItem('sheetId');
    const gasUrl = localStorage.getItem('gasUrl');

    if (!sheetId || !gasUrl) {
        showToast('تنبيه: تم التحديث محلياً فقط. تأكد من إعدادات المزامنة للحفظ في الشيت.', '⚠️');
        return;
    }

    try {
        await fetch(gasUrl, {
            method: 'POST',
            body: JSON.stringify({
                action: 'updateSupervisorStatus',
                sheetId: sheetId,
                supCode: supCode,
                status: newStatus
            })
        });
        showToast('تم الحفظ في قاعدة البيانات بنجاح', '✅');
    } catch (e) {
        console.error(e);
        showToast('فشل الحفظ في قاعدة البيانات', '❌');
        // Revert on error? For now, keep local change to not confuse user
    }
}
