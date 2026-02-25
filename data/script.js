document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. UTILITÁRIOS E SELEÇÃO SEGURA
    // ==========================================
    const getEl = (id) => document.getElementById(id);
    const getQuery = (sel) => document.querySelector(sel);
    const getAll = (sel) => document.querySelectorAll(sel);

    // --- TELA DE LOGIN ---
    const loginOverlay = getEl('login-overlay');
    const loginForm = getEl('login-form');
    const loginUser = getEl('login-user');
    const loginPass = getEl('login-pass');
    const loginError = getEl('login-error');
    const loginThemeBtn = getEl('login-theme-btn');

    // --- CABEÇALHO E MENUS ---
    const welcomeMessage = getEl('welcome-message');
    const userMenuTrigger = getEl('user-menu-trigger');
    const dropdownContent = getEl('dropdown-content');
    const logoutLink = getEl('logout-link');
    const themeToggle = getEl('theme-toggle');
    const statusIndicator = getEl('connection-status');
    const body = document.body;

    // --- NAVEGAÇÃO LATERAL (SPA) ---
    const navSidebar = getEl('nav-sidebar');
    const menuToggleBtn = getEl('menu-toggle-btn');
    const navItems = getAll('.nav-item');
    const viewSections = getAll('.view-section');

    // --- SIDEBAR DE LOGS ---
    const logSidebar = getEl('log-sidebar');
    const toggleLogBtn = getEl('toggle-log-btn');
    const closeLogBtn = getEl('close-log-btn');
    const clearLogBtn = getEl('clear-log-btn');
    const logList = getEl('log-list');
    const logBadge = getEl('log-badge');

    // --- ALERTAS E OVERLAYS ---
    const alertBanner = getEl('alert-banner');
    const heroCard = getQuery('.hero-card'); 
    const connectionOverlay = getEl('connection-overlay');

    // --- MÉTRICAS ---
    const currentValueEl = getEl('current-value');
    const voltageValueEl = getEl('voltage-value');
    const powerValueEl = getEl('power-value');
    const currentTrendBadge = getEl('current-trend-badge');
    const voltageTrendBadge = getEl('voltage-trend-badge');
    const powerTrendBadge = getEl('power-trend-badge');

    // --- ESTATÍSTICAS ---
    const maxCurrentValueEl = getEl('max-current-value');
    const maxPowerValueEl = getEl('max-power-value');
    const maxVoltageValueEl = getEl('max-voltage-value');
    const sessionTimerEl = getEl('session-timer');
    const sessionKwhEl = getEl('session-kwh');

    // --- CONTROLES GRÁFICO ---
    const resetStatsButton = getEl('reset-stats-button');
    const downloadCsvButton = getEl('download-csv-button');
    const downloadChartBtn = getEl('download-chart-btn');
    const chartCanvas = getEl('current-chart');
    const toggleCurrentCheck = getEl('toggle-current');
    const toggleVoltageCheck = getEl('toggle-voltage');
    const togglePowerCheck = getEl('toggle-power');
    const alertThresholdInput = getEl('alert-threshold');
    const settingAlertThreshold = getEl('setting-alert-threshold');
    const pauseBtn = getEl('pause-chart-btn');
    const pauseIcon = getEl('pause-icon');
    
    // --- FULLSCREEN ---
    const fullscreenBtn = getEl('fullscreen-btn'); 
    const chartCard = getEl('chart-card'); 

    // --- RELATÓRIOS E CONFIGS ---
    const reportsTableBody = getQuery('#reports-table tbody');
    const downloadReportBtn = getEl('download-report-btn');
    const factoryResetBtn = getEl('factory-reset-btn');
    const settingRefreshRate = getEl('setting-refresh-rate');

    // ==========================================
    // 2. VARIÁVEIS DE ESTADO
    // ==========================================
    const MAX_CHART_POINTS = 50; 
    const MOVING_AVERAGE_SIZE = 5; 
    let currentChart;
    let maxCurrent = 0.0, maxPower = 0.0, maxVoltage = 0.0;
    let previousCurrent = 0.0, previousVoltage = 0.0, previousPower = 0.0;
    let currentHistory = [];
    let isConnected = false; 
    let isChartPaused = false;
    let alarmActive = false;
    let isFirstLoad = true;
    let sessionStartTime = Date.now();
    let totalEnergyWs = 0;
    let lastUpdateTime = Date.now();
    let logCount = 0;
    let lastLogType = ""; 
    let allLogs = [];
    
    let updateInterval = 1000; // Padrão 1s
    let fetchIntervalId;

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // ==========================================
    // 3. LÓGICA DE AUTENTICAÇÃO (ADMIN)
    // ==========================================
    const VALID_USER = "admin";
    const VALID_PASS = "admin";

    function checkSession() {
        const isLogged = sessionStorage.getItem('isLogged');
        if (isLogged === 'true') {
            if(loginOverlay) loginOverlay.classList.remove('active');
            if(welcomeMessage) welcomeMessage.textContent = sessionStorage.getItem('username') || 'Admin';
        } else {
            if(loginOverlay) loginOverlay.classList.add('active');
        }
    }

    if(loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = loginUser.value;
            const pass = loginPass.value;

            if(loginError) loginError.style.display = 'none';

            if (user === VALID_USER && pass === VALID_PASS) {
                sessionStorage.setItem('isLogged', 'true');
                sessionStorage.setItem('username', 'Admin');
                loginOverlay.classList.remove('active');
                loginUser.value = '';
                loginPass.value = '';
                if(welcomeMessage) welcomeMessage.textContent = 'Admin';
                addLogEntry('info', 'Login de Admin efetuado.');
            } else {
                if(loginError) loginError.style.display = 'flex';
                loginPass.value = ''; 
                addLogEntry('warning', `Falha de login: usuário ${user}`);
            }
        });
    }

    if (loginThemeBtn) {
        loginThemeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            body.classList.toggle('light-mode');
            const isLight = body.classList.contains('light-mode');
            localStorage.setItem('theme', isLight ? 'light-mode' : '');
            if(themeToggle) themeToggle.checked = isLight;
            updateChartColors();
        });
    }

    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('isLogged');
            sessionStorage.removeItem('username');
            if(dropdownContent) dropdownContent.classList.remove('show');
            if(loginOverlay) loginOverlay.classList.add('active');
            addLogEntry('info', 'Sessão encerrada.');
        });
    }

    // ==========================================
    // 4. INICIALIZAÇÃO DE VALORES
    // ==========================================
    const savedThreshold = localStorage.getItem('alertThreshold') || 2.5;
    if (alertThresholdInput) alertThresholdInput.value = savedThreshold;
    if (settingAlertThreshold) settingAlertThreshold.value = savedThreshold;

    const savedRefresh = localStorage.getItem('refreshRate');
    if (savedRefresh && settingRefreshRate) {
        updateInterval = parseInt(savedRefresh);
        settingRefreshRate.value = savedRefresh;
    }

    // ==========================================
    // 5. FUNÇÕES CORE (UI & LÓGICA)
    // ==========================================
    function switchView(targetId) {
        viewSections.forEach(el => el.style.display = 'none');
        navItems.forEach(el => el.classList.remove('active'));
        const targetSection = getEl(targetId);
        if (targetSection) targetSection.style.display = 'block';
        const activeLink = getQuery(`.nav-item[data-target="${targetId}"]`);
        if(activeLink) activeLink.classList.add('active');
        if (targetId === 'view-reports') updateReportsTable();
        if (navSidebar) navSidebar.classList.remove('open');
    }

    navItems.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(link.getAttribute('data-target'));
        });
    });

    function getMovingAverage(newValue) {
        currentHistory.push(newValue);
        if (currentHistory.length > MOVING_AVERAGE_SIZE) currentHistory.shift();
        return currentHistory.reduce((a, b) => a + b, 0) / currentHistory.length;
    }

    function updateTrendBadge(element, current, previous) {
        if (!element) return;
        element.classList.remove('up', 'down', 'neutral');
        const iconSpan = element.querySelector('.trend-icon');
        // Ajustado para 100 de multiplicador
        if (current > previous + 1) { element.classList.add('up'); if(iconSpan) iconSpan.textContent = "↑"; }
        else if (current < previous - 1) { element.classList.add('down'); if(iconSpan) iconSpan.textContent = "↓"; }
        else { element.classList.add('neutral'); if(iconSpan) iconSpan.textContent = "―"; }
    }

    function addLogEntry(type, message) {
        if (lastLogType === type && type !== 'info') return;
        lastLogType = type;
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        
        if (logList) {
            const emptyMsg = logList.querySelector('.empty-log');
            if (emptyMsg) emptyMsg.remove();
            const item = document.createElement('div');
            item.className = `log-item ${type}`;
            item.innerHTML = `<span class="log-time">${timeStr}</span>${message}`;
            logList.insertBefore(item, logList.firstChild);
        }
        
        if (logSidebar && !logSidebar.classList.contains('open') && logBadge) {
            logCount++;
            logBadge.textContent = logCount;
            logBadge.style.display = 'inline-block';
        }
        
        allLogs.unshift({ time: timeStr, type: type, msg: message, val: '-' });
        
        const reportsView = getEl('view-reports');
        if (reportsView && reportsView.style.display === 'block') updateReportsTable();
    }

    function updateReportsTable() {
        if (!reportsTableBody) return;
        reportsTableBody.innerHTML = '';
        if (allLogs.length === 0) {
            reportsTableBody.innerHTML = '<tr class="empty-table-row"><td colspan="4">Nenhum dado registrado ainda.</td></tr>';
            return;
        }
        allLogs.forEach(log => {
            const row = document.createElement('tr');
            let typeLabel = log.type === 'danger' ? 'Crítico' : (log.type === 'warning' ? 'Alerta' : 'Info');
            let color = log.type === 'danger' ? 'var(--danger-color)' : (log.type === 'warning' ? '#f59e0b' : 'var(--accent-color)');
            row.innerHTML = `<td>${log.time}</td><td style="color: ${color}; font-weight: 700;">${typeLabel}</td><td>${log.msg}</td><td>${log.val}</td>`;
            reportsTableBody.appendChild(row);
        });
    }

    function updateSessionStats(power) {
        const now = Date.now();
        const deltaTime = (now - lastUpdateTime) / 1000;
        if (sessionTimerEl) {
            const sessionDuration = now - sessionStartTime;
            const hours = Math.floor(sessionDuration / 3600000);
            const minutes = Math.floor((sessionDuration % 3600000) / 60000);
            const seconds = Math.floor((sessionDuration % 60000) / 1000);
            sessionTimerEl.textContent = `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
        }
        if (!isNaN(power)) {
            totalEnergyWs += power * deltaTime;
            if (sessionKwhEl) {
                const kwh = totalEnergyWs / (3600 * 1000);
                sessionKwhEl.textContent = kwh.toFixed(4);
            }
        }
        lastUpdateTime = now;
    }

    function playAlertSound(type) {
        if (alarmActive) return;
        alarmActive = true;
        try {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            if (type === 'warning') {
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); 
                gainNode.gain.setValueAtTime(0.7, audioCtx.currentTime);
                oscillator.start();
                setTimeout(() => { oscillator.stop(); alarmActive = false; }, 300);
            } else {
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                oscillator.start();
                body.classList.add('emergency-flash');
                setTimeout(() => { 
                    oscillator.stop(); 
                    body.classList.remove('emergency-flash'); 
                    alarmActive = false; 
                }, 800);
            }
        } catch(e) { alarmActive = false; }
    }

    function removeSkeleton() {
        if(!isFirstLoad) return;
        document.querySelectorAll('.skeleton').forEach(el => el.classList.remove('skeleton'));
        if(welcomeMessage) welcomeMessage.textContent = 'Admin';
        isFirstLoad = false;
    }

    function loadChartPreferences() {
        const showCurrent = localStorage.getItem('chart_show_current') !== 'false';
        const showVoltage = localStorage.getItem('chart_show_voltage') === 'true';
        const showPower = localStorage.getItem('chart_show_power') === 'true';
        if(toggleCurrentCheck) toggleCurrentCheck.checked = showCurrent;
        if(toggleVoltageCheck) toggleVoltageCheck.checked = showVoltage;
        if(togglePowerCheck) togglePowerCheck.checked = showPower;
        if (currentChart) {
            currentChart.data.datasets[0].hidden = !showCurrent;
            currentChart.data.datasets[1].hidden = !showVoltage;
            currentChart.data.datasets[2].hidden = !showPower;
            currentChart.update();
        }
    }

   function updateData(current, voltage, power, picoTensao) {
        removeSkeleton();
        if(statusIndicator) statusIndicator.className = 'status-indicator online';
        if (!isConnected) { isConnected = true; if(connectionOverlay) connectionOverlay.classList.remove('active'); addLogEntry('info', 'Conexão restabelecida.'); }
        
        updateSessionStats(power);
        const smoothedCurrent = getMovingAverage(current);
        
        // --- 1. ATUALIZAÇÃO DO TEXTO PRINCIPAL (CORRIGIDO PARA x100) ---
        // Voltei para * 100 para bater com sua expectativa (25.8 mA)
        if (currentValueEl) {
            const currentmA = (current * 100).toFixed(1);
            
            if (currentmA.length > 5) currentValueEl.classList.add('long-text');
            else currentValueEl.classList.remove('long-text');
            
            currentValueEl.textContent = currentmA; 
        }

        if(voltageValueEl) voltageValueEl.textContent = voltage.toFixed(1);
        if(powerValueEl) powerValueEl.textContent = power.toFixed(2);
        
        // Badges com multiplicador 100
        updateTrendBadge(currentTrendBadge, current * 100, previousCurrent * 100);
        updateTrendBadge(voltageTrendBadge, voltage, previousVoltage);
        updateTrendBadge(powerTrendBadge, power, previousPower);

        // --- LÓGICA DE ALERTA ---
        const threshold = parseFloat(alertThresholdInput ? alertThresholdInput.value : 2.5);
        const alertText = alertBanner ? alertBanner.querySelector('.alert-content span') : null;
        
        if (alertBanner) alertBanner.classList.remove('visible', 'warning');
        if (heroCard) heroCard.classList.remove('card-alert-mode', 'warning');
        if (currentValueEl) currentValueEl.style.color = ''; 

        if (current >= threshold) {
            playAlertSound('danger'); 
            if (alertBanner && alertText) { alertText.textContent = "SOBRECARGA DETECTADA!"; alertBanner.classList.add('visible'); }
            if (heroCard) heroCard.classList.add('card-alert-mode');
            if (currentValueEl) currentValueEl.style.color = 'var(--danger-color)';
            addLogEntry('danger', `Sobrecarga: ${current.toFixed(3)}A`);
        } else if (current < 0.005) { 
            playAlertSound('warning'); 
            if (alertBanner && alertText) { alertText.textContent = "FALHA: CORRENTE ZERADA"; alertBanner.classList.add('visible', 'warning'); }
            if (heroCard) heroCard.classList.add('card-alert-mode', 'warning');
            if (currentValueEl) currentValueEl.style.color = '#f59e0b';
            addLogEntry('warning', `Corrente zerada: Possível falha.`);
        } else {
            if (lastLogType === 'danger' || lastLogType === 'warning') { lastLogType = ""; addLogEntry('info', 'Parâmetros normalizados.'); }
        }

        previousCurrent = current;
        previousVoltage = voltage;
        previousPower = power;

        if (current > maxCurrent) maxCurrent = current;
        if (power > maxPower) maxPower = power;
        if (picoTensao > maxVoltage) maxVoltage = picoTensao;

        // Máximos com multiplicador 100
        if(maxCurrentValueEl) maxCurrentValueEl.textContent = (maxCurrent * 100).toFixed(1);
        if(maxPowerValueEl) maxPowerValueEl.textContent = maxPower.toFixed(2);
        if(maxVoltageValueEl) maxVoltageValueEl.textContent = maxVoltage.toFixed(1);

        // --- 2. ATUALIZAÇÃO DO GRÁFICO (x100) ---
        if (!isChartPaused && currentChart) {
            const nowTime = new Date();
            const timeLabel = `${nowTime.getHours()}:${String(nowTime.getMinutes()).padStart(2, '0')}:${String(nowTime.getSeconds()).padStart(2, '0')}`;
            
            currentChart.data.labels.push(timeLabel);
            currentChart.data.datasets[0].data.push(smoothedCurrent * 100); // Voltou para 100
            currentChart.data.datasets[1].data.push(voltage);
            currentChart.data.datasets[2].data.push(power);
            
            if (currentChart.data.labels.length > MAX_CHART_POINTS) {
                currentChart.data.labels.shift();
                currentChart.data.datasets.forEach(dataset => dataset.data.shift());
            }
            currentChart.update('none');
        }
    }

    async function fetchSensorData() {
        try {
            const response = await fetch('/dados');
            if (!response.ok) throw new Error();
            const data = await response.json();
            updateData(data.corrente, data.tensao, data.potencia, data.picoTensao);
        } catch (error) {
            isConnected = false;
            if(statusIndicator) statusIndicator.className = 'status-indicator offline';
            if(connectionOverlay) connectionOverlay.classList.add('active');
        }
    }

    function initializeChart() {
        if (!chartCanvas) return;
        const ctx = chartCanvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.25)'); gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
        
        currentChart = new Chart(ctx, {
            type: 'line',
            data: { 
                labels: [], 
                datasets: [
                    { label: 'Corrente (mA)', data: [], borderColor: '#3b82f6', backgroundColor: gradient, borderWidth: 2, tension: 0.4, fill: true, pointRadius: 0, yAxisID: 'yCurrent' }, 
                    { label: 'Tensão (V)', data: [], borderColor: '#a855f7', hidden: true, borderWidth: 2, tension: 0.4, pointRadius: 0, yAxisID: 'yVoltage' }, 
                    { label: 'Potência (W)', data: [], borderColor: '#f59e0b', hidden: true, borderWidth: 2, tension: 0.4, pointRadius: 0, yAxisID: 'yPower' }
                ] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                interaction: { mode: 'index', intersect: false }, 
                scales: { 
                    x: { ticks: { color: '#6b7280', maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.05)' } }, 
                    yCurrent: { 
                        type: 'linear', position: 'left', beginAtZero: true, 
                        grid: { color: 'rgba(255,255,255,0.05)' }, 
                        ticks: { color: '#6b7280', callback: function(value) { return value.toFixed(0) + ' mA'; } } 
                    }, 
                    yVoltage: { type: 'linear', position: 'right', display: false }, 
                    yPower: { type: 'linear', position: 'right', display: false } 
                }, 
                plugins: { 
                    legend: { display: false }, 
                    tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleFont: { family: 'Inter' }, bodyFont: { family: 'JetBrains Mono' }, padding: 10, cornerRadius: 8, displayColors: true },
                    annotation: { 
                        annotations: { 
                            alertLine: { 
                                type: 'line', 
                                // Limite x100 também
                                yMin: alertThresholdInput ? (parseFloat(alertThresholdInput.value) * 100) : 250, 
                                yMax: alertThresholdInput ? (parseFloat(alertThresholdInput.value) * 100) : 250, 
                                borderColor: '#ef4444', borderWidth: 2, borderDash: [6, 6], scaleID: 'yCurrent', 
                                label: { content: 'Limite', display: true, position: 'start', backgroundColor: '#ef4444', color: 'white', font: { size: 10 } } 
                            } 
                        } 
                    } 
                } 
            } 
        });
        updateChartColors();
        loadChartPreferences();
    }

    function updateChartColors() {
        if (!currentChart) return;
        const isLight = body.classList.contains('light-mode');
        const textColor = isLight ? '#6b7280' : '#A1A1AA';
        const gridColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
        currentChart.options.scales.x.ticks.color = textColor; currentChart.options.scales.x.grid.color = gridColor;
        currentChart.options.scales.yCurrent.grid.color = gridColor; currentChart.options.scales.yCurrent.ticks.color = textColor;
        currentChart.update();
    }

    function downloadChartCSV() {
        if (!currentChart) return;
        let csv = 'Horário,Corrente(mA),Tensão(V),Potência(W)\n';
        currentChart.data.labels.forEach((l, i) => { csv += `${l},${currentChart.data.datasets[0].data[i]},${currentChart.data.datasets[1].data[i]},${currentChart.data.datasets[2].data[i]}\n`; });
        const a = document.createElement('a'); a.href = window.URL.createObjectURL(new Blob([csv], {type: 'text/csv'})); a.download = `monitoramento_${Date.now()}.csv`; a.click();
    }

    function startDataFetch() {
        if (fetchIntervalId) clearInterval(fetchIntervalId);
        fetchIntervalId = setInterval(fetchSensorData, updateInterval);
    }

    if(downloadCsvButton) downloadCsvButton.addEventListener('click', downloadChartCSV);
    if(downloadChartBtn) downloadChartBtn.addEventListener('click', downloadChartCSV);
    if(downloadReportBtn) {
        downloadReportBtn.addEventListener('click', () => { 
            if(allLogs.length===0) return alert("Sem dados."); 
            let csv = 'Horário,Tipo,Msg,Valor\n'; 
            allLogs.forEach(l => csv += `${l.time},${l.type},"${l.msg}",${l.val}\n`); 
            const a = document.createElement('a'); a.href = window.URL.createObjectURL(new Blob([csv], {type: 'text/csv'})); a.download = `relatorio_${Date.now()}.csv`; a.click(); 
        });
    }
    
    if(menuToggleBtn && navSidebar) menuToggleBtn.addEventListener('click', (e) => { e.stopPropagation(); navSidebar.classList.toggle('open'); });
    if(toggleLogBtn && logSidebar) toggleLogBtn.addEventListener('click', (e) => { e.stopPropagation(); logSidebar.classList.toggle('open'); if(logBadge) logBadge.style.display = 'none'; logCount = 0; });
    if(closeLogBtn) closeLogBtn.addEventListener('click', () => logSidebar.classList.remove('open'));
    if(clearLogBtn) clearLogBtn.addEventListener('click', () => { if(logList) logList.innerHTML = '<div class="empty-log">Nenhum evento.</div>'; logCount = 0; allLogs = []; updateReportsTable(); });

    if(resetStatsButton) resetStatsButton.addEventListener('click', () => {
        maxCurrent=0; maxPower=0; maxVoltage=0; totalEnergyWs=0; sessionStartTime=Date.now();
        if(maxCurrentValueEl) maxCurrentValueEl.textContent="0.0"; 
        if(sessionTimerEl) sessionTimerEl.textContent="00:00:00";
        if(currentChart) { currentChart.data.labels=[]; currentChart.data.datasets.forEach(d=>d.data=[]); currentChart.update(); }
        addLogEntry('info', 'Estatísticas resetadas.');
    });

    if(themeToggle) { 
        const savedTheme = localStorage.getItem('theme'); 
        if (savedTheme) { body.classList.add(savedTheme); themeToggle.checked = savedTheme === 'light-mode'; } 
        themeToggle.addEventListener('change', () => { 
            body.classList.toggle('light-mode'); 
            localStorage.setItem('theme', body.classList.contains('light-mode') ? 'light-mode' : ''); 
            updateChartColors(); 
        }); 
    }

    const updateThreshold = (val) => { 
        localStorage.setItem('alertThreshold', val); 
        if(alertThresholdInput) alertThresholdInput.value = val; 
        if(settingAlertThreshold) settingAlertThreshold.value = val; 
        
        if(currentChart) { 
            const valEmMA = parseFloat(val) * 100; // Voltou para 100
            currentChart.options.plugins.annotation.annotations.alertLine.yMin = valEmMA; 
            currentChart.options.plugins.annotation.annotations.alertLine.yMax = valEmMA; 
            currentChart.update(); 
        } 
    };
    if(alertThresholdInput) alertThresholdInput.addEventListener('change', (e) => updateThreshold(e.target.value));
    if(settingAlertThreshold) settingAlertThreshold.addEventListener('change', (e) => updateThreshold(e.target.value));

    if(settingRefreshRate) settingRefreshRate.addEventListener('change', (e) => {
        updateInterval = parseInt(e.target.value);
        localStorage.setItem('refreshRate', updateInterval);
        startDataFetch();
    });

    if(toggleCurrentCheck) toggleCurrentCheck.addEventListener('change', () => { const v = toggleCurrentCheck.checked; localStorage.setItem('chart_show_current', v); currentChart.data.datasets[0].hidden = !v; currentChart.update(); });
    if(toggleVoltageCheck) toggleVoltageCheck.addEventListener('change', () => { const v = toggleVoltageCheck.checked; localStorage.setItem('chart_show_voltage', v); currentChart.data.datasets[1].hidden = !v; currentChart.update(); });
    if(togglePowerCheck) togglePowerCheck.addEventListener('change', () => { const v = togglePowerCheck.checked; localStorage.setItem('chart_show_power', v); currentChart.data.datasets[2].hidden = !v; currentChart.update(); });

    if(pauseBtn) pauseBtn.addEventListener('click', () => { isChartPaused = !isChartPaused; if(isChartPaused) { pauseBtn.classList.add('paused'); pauseBtn.innerHTML='<span id="pause-icon">▶</span> Retomar'; } else { pauseBtn.classList.remove('paused'); pauseBtn.innerHTML='<span id="pause-icon">⏸</span> Congelar'; } });

    if(fullscreenBtn && chartCard) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                chartCard.requestFullscreen().catch(err => console.log(`Erro: ${err.message}`));
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
            }
        });
    }

    if (userMenuTrigger && dropdownContent) {
        userMenuTrigger.addEventListener('click', (e) => { e.stopPropagation(); dropdownContent.classList.toggle('show'); });
    }

    document.addEventListener('click', (e) => {
        if (navSidebar && !navSidebar.contains(e.target) && menuToggleBtn && !menuToggleBtn.contains(e.target)) navSidebar.classList.remove('open');
        if (logSidebar && !logSidebar.contains(e.target) && toggleLogBtn && !toggleLogBtn.contains(e.target)) logSidebar.classList.remove('open');
        if (userMenuTrigger && dropdownContent && !userMenuTrigger.contains(e.target) && !dropdownContent.contains(e.target)) dropdownContent.classList.remove('show');
    });

    // ==========================================
    // 10. START
    // ==========================================
    initializeChart();
    checkSession();
    startDataFetch(); 
});