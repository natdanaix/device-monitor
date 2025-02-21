// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBbkMXGQFEjrvPSdl6vAQ8-zmAMAdbOFdg",
    authDomain: "zsinage.firebaseapp.com",
    databaseURL: "https://zsinage-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "zsinage",
    storageBucket: "zsinage.firebasestorage.app",
    messagingSenderId: "811769710688",
    appId: "1:811769710688:android:a4541d48fa806296791b05"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

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
const editDeviceNameModal = new bootstrap.Modal(document.getElementById('editDeviceNameModal'));
const editDeviceNameForm = document.getElementById('editDeviceNameForm');
const editDeviceIdInput = document.getElementById('editDeviceId');
const editDeviceNameInput = document.getElementById('editDeviceName');
const saveDeviceNameBtn = document.getElementById('saveDeviceNameBtn');

// Current view state
let currentView = 'extraCompact';

// Parse Thai date format
function parseThaiDate(thaiDateStr) {
    if (!thaiDateStr) return null;
    
    try {
        const thaiMonths = [
            'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
        ];
        
        const parts = thaiDateStr.replace('วันที่ ', '').split(' เวลา ');
        const dateParts = parts[0].trim().split(' ');
        const timeParts = parts[1].replace(' น.', '').split(':');
        
        const day = parseInt(dateParts[0], 10);
        const month = thaiMonths.indexOf(dateParts[1]);
        const thaiYear = parseInt(dateParts[2], 10);
        const year = thaiYear - 543;
        
        const hour = parseInt(timeParts[0], 10);
        const minute = parseInt(timeParts[1], 10);
        
        return new Date(year, month, day, hour, minute);
    } catch (e) {
        console.error("Error parsing Thai date:", e);
        return null;
    }
}

// Check if device is active
function isDeviceActive(device) {
    if (!device.lastUpdated) return false;
    
    const lastUpdateDate = parseThaiDate(device.lastUpdated);
    if (!lastUpdateDate) return false;
    
    const now = new Date();
    const minutesSinceLastUpdate = Math.floor((now - lastUpdateDate) / (60 * 1000));
    
    return minutesSinceLastUpdate <= 60;
}

// Format uptime
function formatUptime(minutes) {
    if (!minutes && minutes !== 0) return "-";
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
        return `${hours} ชม. ${mins} น.`;
    } else {
        return `${mins} นาที`;
    }
}

// Get time since last update
function getTimeSinceLastUpdate(lastUpdated) {
    if (!lastUpdated) return "ไม่มีข้อมูล";
    
    const lastUpdateDate = parseThaiDate(lastUpdated);
    if (!lastUpdateDate) return "รูปแบบวันที่ไม่ถูกต้อง";
    
    const now = new Date();
    const diffMs = now - lastUpdateDate;
    const diffMins = Math.floor(diffMs / (60 * 1000));
    
    if (diffMins < 1) {
        return "น้อยกว่า 1 นาที";
    } else if (diffMins < 60) {
        return `${diffMins} นาทีที่แล้ว`;
    } else {
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) {
            return `<span class="time-overdue">${diffHours} ชั่วโมงที่แล้ว</span>`;
        } else {
            const diffDays = Math.floor(diffHours / 24);
            return `<span class="time-overdue">${diffDays} วันที่แล้ว</span>`;
        }
    }
}

// Create device card HTML
function createDeviceCard(deviceId, deviceData) {
    const isActive = isDeviceActive(deviceData);
    const statusClass = isActive ? 'bg-success' : 'bg-danger';
    const statusIcon = isActive ? 'fa-check-circle' : 'fa-times-circle';
    const deviceName = deviceData.deviceName || deviceId;

    return `
        <div class="col-12 col-device">
            <div class="card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center flex-grow-1">
                            <span class="badge ${statusClass} me-1">
                                <i class="fas ${statusIcon}"></i>
                            </span>
                            <strong class="text-truncate me-1">${deviceName}</strong>
                            <small class="text-muted text-truncate d-none d-sm-inline">(${deviceId})</small>
                        </div>
                        <div class="d-flex align-items-center ms-2">
                            <small class="text-muted me-2 d-none d-sm-inline">${formatUptime(deviceData.uptimeMinutes)}</small>
                            <small class="text-muted me-1">${deviceData.lastUpdated ? deviceData.lastUpdated.split(' เวลา')[0] : '-'}</small>
                            <button class="btn btn-sm btn-outline-primary edit-name-btn p-1" 
                                data-device-id="${deviceId}" 
                                data-device-name="${deviceName}">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Update device counts
function updateCounts(devices) {
    let active = 0;
    let inactive = 0;
    let total = Object.keys(devices).length;
    
    for (const deviceId in devices) {
        if (isDeviceActive(devices[deviceId])) {
            active++;
        } else {
            inactive++;
        }
    }
    
    activeCount.textContent = active;
    inactiveCount.textContent = inactive;
    totalCount.textContent = total;
}

// Filter devices based on search input
function filterDevices() {
    const searchTerm = searchInput.value.toLowerCase();
    const deviceCards = document.querySelectorAll('.device-card, .col-device');
    
    deviceCards.forEach(card => {
        const cardText = card.textContent.toLowerCase();
        if (cardText.includes(searchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

// Update device name in Firebase
function updateDeviceName(deviceId, newName) {
    const deviceRef = database.ref('device_status').child(deviceId);
    
    return deviceRef.update({
        deviceName: newName,
        nameUpdatedByUser: true,
        nameUpdatedAt: new Date().toISOString()
    }).then(() => {
        loadDevicesData();
        return true;
    }).catch(error => {
        console.error("Error updating device name:", error);
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
        return false;
    });
}

// Load devices data from Firebase
function loadDevicesData() {
    loadingSpinner.style.display = 'flex';
    devicesList.innerHTML = '';
    
    const devicesRef = database.ref('device_status');
    
    devicesRef.once('value')
        .then(snapshot => {
            const devices = snapshot.val() || {};
            let devicesHTML = '';
            
            const sortedDevices = Object.entries(devices).sort((a, b) => {
                const aActive = isDeviceActive(a[1]);
                const bActive = isDeviceActive(b[1]);
                
                if (aActive === bActive) {
                    return (a[1].deviceName || a[0]).localeCompare(b[1].deviceName || b[0]);
                }
                
                return aActive ? -1 : 1;
            });
            
            sortedDevices.forEach(([deviceId, deviceData]) => {
                devicesHTML += createDeviceCard(deviceId, deviceData);
            });
            
            devicesList.innerHTML = devicesHTML || '<div class="col text-center">ไม่พบข้อมูลอุปกรณ์</div>';
            updateCounts(devices);
            
            const now = new Date();
            const options = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            };
            lastUpdatedTime.textContent = now.toLocaleString('th-TH', options) + ' น.';
        })
        .catch(error => {
            console.error("Error fetching data:", error);
            devicesList.innerHTML = `
                <div class="col text-center text-danger">
                    <i class="fas fa-exclamation-circle fa-3x mb-3"></i>
                    <h5>เกิดข้อผิดพลาดในการโหลดข้อมูล</h5>
                    <p>${error.message}</p>
                </div>
            `;
        })
        .finally(() => {
            loadingSpinner.style.display = 'none';
        });
}

// View toggle functions
function setViewMode(mode) {
    currentView = mode;
    document.querySelectorAll('.view-toggle .btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${mode}ViewBtn`).classList.add('active');
    devicesList.className = `row g-1 ${mode === 'extraCompact' ? 'extra-compact-view' : ''}`;
    loadDevicesData();
}

// Event delegation for edit buttons
devicesList.addEventListener('click', event => {
    const editBtn = event.target.closest('.edit-name-btn');
    if (!editBtn) return;
    
    const deviceId = editBtn.dataset.deviceId;
    const currentName = editBtn.dataset.deviceName;
    
    editDeviceIdInput.value = deviceId;
    editDeviceNameInput.value = currentName;
    
    editDeviceNameModal.show();
});

// Save button click handler
saveDeviceNameBtn.addEventListener('click', () => {
    if (editDeviceNameForm.checkValidity()) {
        const deviceId = editDeviceIdInput.value;
        const newName = editDeviceNameInput.value.trim();
        
        if (newName) {
            saveDeviceNameBtn.disabled = true;
            saveDeviceNameBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> กำลังบันทึก...';
            
            updateDeviceName(deviceId, newName)
                .then(success => {
                    if (success) {
                        editDeviceNameModal.hide();
                    }
                })
                .finally(() => {
                    saveDeviceNameBtn.disabled = false;
                    saveDeviceNameBtn.innerHTML = 'บันทึก';
                });
        }
    } else {
        editDeviceNameForm.reportValidity();
    }
});

// Handle form submission
editDeviceNameForm.addEventListener('submit', event => {
    event.preventDefault();
    saveDeviceNameBtn.click();
});

// Event Listeners
document.addEventListener('DOMContentLoaded', loadDevicesData);
refreshBtn.addEventListener('click', loadDevicesData);
searchBtn.addEventListener('click', filterDevices);
searchInput.addEventListener('keyup', filterDevices);
document.getElementById('normalViewBtn').addEventListener('click', () => setViewMode('normal'));
document.getElementById('compactViewBtn').addEventListener('click', () => setViewMode('compact'));
document.getElementById('extraCompactViewBtn').addEventListener('click', () => setViewMode('extraCompact'));

// Auto refresh every 5 minutes
setInterval(loadDevicesData, 5 * 60 * 1000);
