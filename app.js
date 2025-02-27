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
const auth = firebase.auth();

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
const gridViewBtn = document.getElementById('gridViewBtn');
const loginPage = document.getElementById('loginPage');
const mainApp = document.getElementById('mainApp');
const loginForm = document.getElementById('loginForm');
const userDisplayName = document.getElementById('userDisplayName');
const logoutBtn = document.getElementById('logoutBtn');
const loginError = document.getElementById('loginError');

// View state
let currentView = 'normal'; // normal, compact, extraCompact, grid

// Authentication state observer
auth.onAuthStateChanged(user => {
    if (user) {
        // ผู้ใช้ลงชื่อเข้าใช้แล้ว
        console.log('User is signed in', user);
        showApp(user);
    } else {
        // ไม่มีผู้ใช้ลงชื่อเข้าใช้
        console.log('No user is signed in');
        showLogin();
    }
});

// แสดงหน้าแอพหลักเมื่อล็อกอินแล้ว
function showApp(user) {
    loginPage.classList.add('d-none');
    mainApp.classList.remove('d-none');
    
    // แสดงชื่อผู้ใช้
    userDisplayName.textContent = user.email || 'ผู้ใช้';
    
    // โหลดข้อมูลอุปกรณ์
    loadDevicesData();
}

// แสดงหน้าล็อกอิน
function showLogin() {
    mainApp.classList.add('d-none');
    loginPage.classList.remove('d-none');
    devicesList.innerHTML = ''; // ล้างข้อมูลอุปกรณ์
}

// ลงชื่อเข้าใช้
function login(email, password) {
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // ล็อกอินสำเร็จ
            loginError.classList.add('d-none');
        })
        .catch((error) => {
            // แสดงข้อผิดพลาด
            console.error('Login error:', error);
            loginError.classList.remove('d-none');
            loginError.textContent = `เกิดข้อผิดพลาด: ${error.message}`;
        });
}

// ออกจากระบบ
function logout() {
    auth.signOut()
        .then(() => {
            // ออกจากระบบสำเร็จ
            console.log('User signed out');
        })
        .catch((error) => {
            console.error('Sign out error:', error);
        });
}

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

// Check if device is active based on last update time
function isDeviceActive(device) {
    if (!device.lastUpdated) return false;
    
    try {
        const lastUpdateDate = new Date(device.lastUpdated);
        const now = new Date();
        const minutesSinceLastUpdate = Math.floor((now - lastUpdateDate) / (60 * 1000));
        
        return minutesSinceLastUpdate <= 60;
    } catch (e) {
        console.error("Error checking device active status:", e);
        return false;
    }
}

// Format uptime in hours and minutes
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
function getTimeSinceLastUpdate(isoString) {
    if (!isoString) return "ไม่มีข้อมูล";
    
    try {
        const lastUpdateDate = new Date(isoString);
        const now = new Date();
        const diffMs = now - lastUpdateDate;
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
        console.error("Error calculating time since last update:", e);
        return "รูปแบบวันที่ไม่ถูกต้อง";
    }
}

// Create device card HTML based on current view
function createDeviceCard(deviceId, deviceData) {
    const isActive = isDeviceActive(deviceData);
    const statusClass = isActive ? 'device-active' : 'device-inactive';
    const statusText = isActive ? 'ออนไลน์' : 'ออฟไลน์';
    const statusIcon = isActive ? 'fa-check-circle' : 'fa-times-circle';
    const deviceName = deviceData.deviceName || deviceId;
    
    // Format the last update time in Thai format
    const thaiDateTime = formatThaiDateTime(deviceData.lastUpdated);
    const lastUpdateStatus = thaiDateTime ? 
        `${thaiDateTime}<br><small>(${getTimeSinceLastUpdate(deviceData.lastUpdated)})</small>` : 
        '-';

    if (currentView === 'grid') {
        // 6x4 Grid View optimized for 16:9 display
        return `
            <div class="device-card">
                <div class="card ${statusClass}">
                    <div class="card-body p-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <strong class="text-truncate" title="${deviceName}">${deviceName}</strong>
                            <span class="badge ${isActive ? 'bg-success' : 'bg-danger'} status-badge">
                                <i class="fas ${statusIcon}"></i>
                            </span>
                        </div>
                        <small class="d-block text-truncate" title="${deviceId}">${deviceId}</small>
                        <div class="d-flex justify-content-between align-items-center mt-1">
                            <small>${getTimeSinceLastUpdate(deviceData.lastUpdated)}</small>
                            <button class="btn btn-sm btn-outline-primary edit-name-btn p-0 px-1" 
                                data-device-id="${deviceId}" 
                                data-device-name="${deviceName}">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else if (currentView === 'extraCompact') {
        return `
            <div class="col-12 col-device">
                <div class="card mb-1">
                    <div class="card-body p-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="d-flex align-items-center">
                                <span class="badge ${isActive ? 'bg-success' : 'bg-danger'} me-2">
                                    <i class="fas ${statusIcon}"></i>
                                </span>
                                <strong>${deviceName}</strong>
                                <span class="text-muted ms-2 d-none d-md-inline">${deviceId}</span>
                            </div>
                            <div class="d-flex align-items-center">
                                <span class="me-3 d-none d-md-inline">${formatUptime(deviceData.uptimeMinutes)}</span>
                                <span class="text-muted me-2">${thaiDateTime ? thaiDateTime.split(' เวลา')[0] : '-'}</span>
                                <button class="btn btn-sm btn-outline-primary edit-name-btn" 
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
    } else if (currentView === 'compact') {
        return `
            <div class="col-md-4 col-lg-3 device-card">
                <div class="card compact-view">
                    <div class="card-header ${statusClass} d-flex justify-content-between align-items-center">
                        <span class="text-truncate">${deviceName}</span>
                        <span class="badge ${isActive ? 'bg-success' : 'bg-danger'} status-badge">
                            <i class="fas ${statusIcon}"></i>
                        </span>
                    </div>
                    <div class="card-body">
                        <div class="device-info">
                            <span class="device-info-label">อัปเดต:</span>
                            <span class="text-truncate">${getTimeSinceLastUpdate(deviceData.lastUpdated)}</span>
                        </div>
                        <div class="device-info">
                            <span class="device-info-label">ทำงาน:</span>
                            <span>${formatUptime(deviceData.uptimeMinutes)}</span>
                        </div>
                        <div class="device-info">
                            <span class="device-info-label">รหัส:</span>
                            <span class="text-truncate">${deviceId}</span>
                        </div>
                        <div class="d-flex justify-content-end mt-1">
                            <button class="btn btn-sm btn-outline-primary edit-name-btn" 
                                    data-device-id="${deviceId}" 
                                    data-device-name="${deviceName}">
                                <i class="fas fa-edit"></i>
                            </button>
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
                        <span>${deviceName}</span>
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
                            <span>${formatUptime(deviceData.uptimeMinutes)}</span>
                        </div>
                        <div class="device-info">
                            <span class="device-info-label">รหัสอุปกรณ์:</span> 
                            <span>${deviceId}</span>
                        </div>
                        <div class="device-info d-flex justify-content-between align-items-center mt-2">
                            <button class="btn btn-sm btn-outline-primary edit-name-btn" 
                                    data-device-id="${deviceId}" 
                                    data-device-name="${deviceName}">
                                <i class="fas fa-edit me-1"></i> แก้ไขชื่อ
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
