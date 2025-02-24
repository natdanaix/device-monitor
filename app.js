// NocoDB configuration ใช้ชื่อฟิลด์เหมือน Firebase
const firebaseConfig = {
    apiKey: "Zd-ccF0UxCF6l--_dGniPXktC74-qGFmLLX-OVNy", // NocoDB API key
    authDomain: "app.nocodb.com",
    databaseURL: "https://app.nocodb.com/api/v2",
    projectId: "mhz0eowltsx33th", // NocoDB Table ID
    storageBucket: "nocodb",
    messagingSenderId: "",
    appId: "vwiadf8odw4oe9si" // NocoDB View ID
};

// DOM Elements
const devicesList = document.getElementById('devicesList');
const loadingSpinner = document.getElementById('loadingSpinner');
const activeCount = document.getElementById('activeCount');
const inactiveCount = document.getElementById('inactiveCount');
const totalCount = document.getElementById('totalCount');
const lastUpdatedTime = document.getElementById('lastUpdatedTime');
const refreshBtn = document.getElementById('refreshBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const normalViewBtn = document.getElementById('normalViewBtn');
const compactViewBtn = document.getElementById('compactViewBtn');
const extraCompactViewBtn = document.getElementById('extraCompactViewBtn');

// View state
let currentView = 'normal'; // normal, compact, extraCompact

// Format ISO date to Thai format
function formatThaiDateTime(isoString) {
    if (!isoString) return null;
    
    try {
        const date = new Date(isoString);
        const thaiMonths = [
            'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
        ];
        
        const thaiYear = date.getFullYear() + 543;
        const formattedDate = `วันที่ ${date.getDate()} ${thaiMonths[date.getMonth()]} ${thaiYear}`;
        const formattedTime = `เวลา ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} น.`;
        
        return `${formattedDate} ${formattedTime}`;
    } catch (e) {
        console.error("Error formatting Thai date:", e, isoString);
        return null;
    }
}

// Format time duration
function formatDuration(minutes) {
    if (!minutes && minutes !== 0) return "-";
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
        return `${hours} ชม. ${mins} น.`;
    } else {
        return `${mins} นาที`;
    }
}

// Get time since update
function getTimeSinceUpdate(isoString) {
    if (!isoString) return "ไม่มีข้อมูล";
    
    try {
        const updateDate = new Date(isoString);
        const now = new Date();
        const diffMs = now - updateDate;
        const diffMins = Math.floor(diffMs / (60 * 1000));
        
        let timeText;
        if (diffMins < 1) {
            timeText = "น้อยกว่า 1 นาที";
        } else if (diffMins < 60) {
            timeText = `${diffMins} นาทีที่แล้ว`;
        } else {
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) {
                timeText = `<span class="time-overdue">${diffHours} ชั่วโมงที่แล้ว</span>`;
            } else {
                const diffDays = Math.floor(diffHours / 24);
                timeText = `<span class="time-overdue">${diffDays} วันที่แล้ว</span>`;
            }
        }
        return timeText;
    } catch (e) {
        console.error("Error calculating time since update:", e);
        return "รูปแบบวันที่ไม่ถูกต้อง";
    }
}

// Check if record is active based on update time
function isRecordActive(record) {
    if (!record.last_update) return false;
    
    try {
        const lastUpdateDate = new Date(record.last_update);
        const now = new Date();
        const minutesSinceLastUpdate = Math.floor((now - lastUpdateDate) / (60 * 1000));
        
        return minutesSinceLastUpdate <= 60;
    } catch (e) {
        console.error("Error checking record active status:", e);
        return false;
    }
}

// Create record card HTML based on current view
function createRecordCard(record) {
    const isActive = isRecordActive(record);
    const statusClass = isActive ? 'device-active' : 'device-inactive';
    const statusText = isActive ? 'ออนไลน์' : 'ออฟไลน์';
    const statusIcon = isActive ? 'fa-check-circle' : 'fa-times-circle';
    const recordName = record.name || record.id || "ไม่มีชื่อ";
    
    // Format the last update time in Thai format
    const thaiDateTime = formatThaiDateTime(record.last_update);
    const lastUpdateStatus = thaiDateTime ? 
        `${thaiDateTime}<br><small>(${getTimeSinceUpdate(record.last_update)})</small>` : 
        '-';

    if (currentView === 'extraCompact') {
        return `
            <div class="col-12 col-device">
                <div class="card mb-1">
                    <div class="card-body p-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="d-flex align-items-center">
                                <span class="badge ${isActive ? 'bg-success' : 'bg-danger'} me-2">
                                    <i class="fas ${statusIcon}"></i>
                                </span>
                                <strong>${recordName}</strong>
                                <span class="text-muted ms-2 d-none d-md-inline">${record.id || ''}</span>
                            </div>
                            <div class="d-flex align-items-center">
                                <span class="me-3 d-none d-md-inline">${formatDuration(record.uptime || 0)}</span>
                                <span class="text-muted me-2">${thaiDateTime ? thaiDateTime.split(' เวลา')[0] : '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else if (currentView === 'compact') {
        return `
            <div class="col-md-4 col-lg-3 device-card">
                <div class="card compact-view">
                    <div class="card-header ${statusClass} d-flex justify-content-between align-items-center">
                        <span class="text-truncate">${recordName}</span>
                        <span class="badge ${isActive ? 'bg-success' : 'bg-danger'} status-badge">
                            <i class="fas ${statusIcon}"></i>
                        </span>
                    </div>
                    <div class="card-body">
                        <div class="device-info">
                            <span class="device-info-label">อัปเดต:</span>
                            <span class="text-truncate">${getTimeSinceUpdate(record.last_update)}</span>
                        </div>
                        <div class="device-info">
                            <span class="device-info-label">ทำงาน:</span>
                            <span>${formatDuration(record.uptime || 0)}</span>
                        </div>
                        <div class="device-info">
                            <span class="device-info-label">รหัส:</span>
                            <span class="text-truncate">${record.id || ''}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="col-md-6 col-lg-4 device-card">
                <div class="card">
                    <div class="card-header ${statusClass} d-flex justify-content-between align-items-center">
                        <span>${recordName}</span>
                        <span class="badge ${isActive ? 'bg-success' : 'bg-danger'} status-badge">
                            <i class="fas ${statusIcon} me-1"></i> ${statusText}
                        </span>
                    </div>
                    <div class="card-body">
                        <div class="device-info">
                            <span class="device-info-label">อัปเดตล่าสุด:</span> 
                            <span>${lastUpdateStatus}</span>
                        </div>
                        <div class="device-info">
                            <span class="device-info-label">ระยะเวลาทำงาน:</span> 
                            <span>${formatDuration(record.uptime || 0)}</span>
                        </div>
                        <div class="device-info">
                            <span class="device-info-label">รหัส:</span> 
                            <span>${record.id || ''}</span>
                        </div>
                        <div class="device-info">
                            <span class="device-info-label">สถานที่:</span> 
                            <span>${record.location || '-'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Update counts
function updateCounts(records) {
    let active = 0;
    let inactive = 0;
    let total = records.length;
    
    records.forEach(record => {
        if (isRecordActive(record)) {
            active++;
        } else {
            inactive++;
        }
    });
    
    activeCount.textContent = active;
    inactiveCount.textContent = inactive;
    totalCount.textContent = total;
}

// Filter records based on search input
function filterRecords() {
    const searchTerm = searchInput.value.toLowerCase();
    const recordCards = document.querySelectorAll('.device-card, .col-device');
    
    recordCards.forEach(card => {
        const cardText = card.textContent.toLowerCase();
        if (cardText.includes(searchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

// Fetch data from NocoDB API using firebase config field names
async function fetchDataFromNocoDB() {
    try {
        const response = await fetch(`${firebaseConfig.databaseURL}/tables/${firebaseConfig.projectId}/records?limit=100&viewId=${firebaseConfig.appId}`, {
            method: 'GET',
            headers: {
                'xc-token': firebaseConfig.apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Data from NocoDB:", data);
        return data;
    } catch (error) {
        console.error("Error fetching data from NocoDB:", error);
        throw error;
    }
}

// Load data from NocoDB
async function loadData() {
    if (!devicesList) {
        console.error('Element #devicesList not found');
        return;
    }
    
    if (loadingSpinner) {
        loadingSpinner.style.display = 'flex';
    }
    
    devicesList.innerHTML = '';
    
    try {
        const data = await fetchDataFromNocoDB();
        const records = data.list || [];
        
        if (records.length === 0) {
            devicesList.innerHTML = '<div class="col text-center">ไม่พบข้อมูลอุปกรณ์</div>';
            updateCounts([]);
            return;
        }
        
        let recordsHTML = '';
        
        // Sort records by active status
        const sortedRecords = [...records].sort((a, b) => {
            const aActive = isRecordActive(a);
            const bActive = isRecordActive(b);
            
            if (aActive === bActive) {
                return (a.name || a.id || '').localeCompare(b.name || b.id || '');
            }
            
            return aActive ? -1 : 1;
        });
        
        sortedRecords.forEach(record => {
            recordsHTML += createRecordCard(record);
        });
        
        devicesList.innerHTML = recordsHTML;
        updateCounts(records);
        
        const now = new Date();
        if (lastUpdatedTime) {
            lastUpdatedTime.textContent = formatThaiDateTime(now.toISOString());
        }
    } catch (error) {
        console.error("Error fetching data:", error);
        devicesList.innerHTML = `
            <div class="col text-center text-danger">
                <i class="fas fa-exclamation-circle fa-3x mb-3"></i>
                <h5>เกิดข้อผิดพลาดในการโหลดข้อมูล</h5>
                <p>${error.message}</p>
            </div>
        `;
    } finally {
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
        }
    }
}

// View toggle functions
function setNormalView() {
    currentView = 'normal';
    normalViewBtn.classList.add('active');
    compactViewBtn.classList.remove('active');
    extraCompactViewBtn.classList.remove('active');
    devicesList.classList.remove('compact-view', 'extra-compact-view');
    loadData();
}

function setCompactView() {
    currentView = 'compact';
    normalViewBtn.classList.remove('active');
    compactViewBtn.classList.add('active');
    extraCompactViewBtn.classList.remove('active');
    devicesList.classList.add('compact-view');
    devicesList.classList.remove('extra-compact-view');
    loadData();
}

function setExtraCompactView() {
    currentView = 'extraCompact';
    normalViewBtn.classList.remove('active');
    compactViewBtn.classList.remove('active');
    extraCompactViewBtn.classList.add('active');
    devicesList.classList.remove('compact-view');
    devicesList.classList.add('extra-compact-view');
    loadData();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load data on page load
    loadData();
    
    // Set up event listeners
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadData);
    }
    
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', filterRecords);
        searchInput.addEventListener('keyup', filterRecords);
    }
    
    if (normalViewBtn && compactViewBtn && extraCompactViewBtn) {
        normalViewBtn.addEventListener('click', setNormalView);
        compactViewBtn.addEventListener('click', setCompactView);
        extraCompactViewBtn.addEventListener('click', setExtraCompactView);
    }
    
    // Auto refresh every 5 minutes
    setInterval(loadData, 5 * 60 * 1000);
});
