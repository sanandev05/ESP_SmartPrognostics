/**
 * ESP Ağıllı Proqnostika – Dashboard JS
 * Reads seed values from data-* attributes on the dashboard section,
 * then drives charts, gauges, sensor bars, and alerts live.
 */
(function () {
    "use strict";

    const page = document.getElementById("dashboardPage");
    if (!page) return;

    /* ── 1. Seed values from Razor ──────────────────────────────── */
    const seed = {
        rul:         parseFloat(page.dataset.rul) || 1027,
        health:      parseFloat(page.dataset.health) || 84,
        degradation: parseFloat(page.dataset.degradation) || 16,
        confidence:  parseFloat(page.dataset.confidence) || 84,
        voltage:     parseFloat(page.dataset.voltage) || 380,
        current:     parseFloat(page.dataset.current) || 13.8,
        vibration:   parseFloat(page.dataset.vibration) || 0.42,
        temperature: parseFloat(page.dataset.temperature) || 68
    };

    let state = { ...seed };
    let tick = 0;

    /* ── 2. Helpers ─────────────────────────────────────────────── */
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const jitter = (v, amp) => v + (Math.random() - 0.5) * 2 * amp;
    const fmt0 = v => Math.round(v).toString();
    const fmt1 = v => v.toFixed(1);
    const fmt2 = v => v.toFixed(2);

    function setEl(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    /* ── 3. Colors ──────────────────────────────────────────────── */
    const C = {
        green:  "#22c55e",
        orange: "#f59e0b",
        red:    "#ef4444",
        blue:   "#3b82f6",
        purple: "#8b5cf6",
        grid:   "rgba(0,0,0,.06)",
        track:  "rgba(0,0,0,.08)"
    };

    /* ── 4. Trend history ───────────────────────────────────────── */
    const HIST_LEN = 30;
    const trendLabels = [];
    const trendVoltage = [];
    const trendCurrent = [];
    const trendTemp = [];
    const trendVib = [];

    const now = new Date();
    for (let i = HIST_LEN - 1; i >= 0; i--) {
        const t = new Date(now.getTime() - i * 120000);
        trendLabels.push(t.toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" }));
        trendVoltage.push(seed.voltage + (Math.random() - 0.5) * 1.2);
        trendCurrent.push(seed.current + (Math.random() - 0.5) * 0.08);
        trendTemp.push(seed.temperature + (Math.random() - 0.5) * 4);
        trendVib.push(seed.vibration + (Math.random() - 0.5) * 0.15);
    }

    /* ── 5. Charts ──────────────────────────────────────────────── */

    /* 5a. RUL Donut */
    let rulChart = null;
    (function () {
        const ctx = document.getElementById("rulGauge");
        if (!ctx) return;
        rulChart = new Chart(ctx, {
            type: "doughnut",
            data: {
                datasets: [{
                    data: [seed.rul, Math.max(0, 1500 - seed.rul)],
                    backgroundColor: [C.green, "#e5e7eb"],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "75%",
                animation: { duration: 600, easing: "easeOutQuart" },
                plugins: { legend: { display: false }, tooltip: { enabled: false } }
            }
        });
    })();

    /* 5b. Trend Line Chart */
    let trendChart = null;
    (function () {
        const ctx = document.getElementById("trendChart");
        if (!ctx) return;
        trendChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: trendLabels,
                datasets: [
                    {
                        label: "Gərginlik (V)",
                        data: [...trendVoltage],
                        borderColor: C.blue,
                        backgroundColor: "rgba(59,130,246,.08)",
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.4,
                        fill: true,
                        yAxisID: "yLeft"
                    },
                    {
                        label: "Cərəyan (A)",
                        data: [...trendCurrent],
                        borderColor: C.purple,
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.4,
                        fill: false,
                        yAxisID: "yLeft"
                    },
                    {
                        label: "Temperatur (°C)",
                        data: [...trendTemp],
                        borderColor: C.orange,
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.4,
                        fill: false,
                        yAxisID: "yRight"
                    },
                    {
                        label: "Vibrasiya (mm/s)",
                        data: [...trendVib],
                        borderColor: C.green,
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.4,
                        fill: false,
                        yAxisID: "yLeft"
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: "#fff",
                        titleColor: "#1a1a2e",
                        bodyColor: "#6b7280",
                        borderColor: "#e5e7eb",
                        borderWidth: 1,
                        padding: 10,
                        boxPadding: 4,
                        usePointStyle: true
                    }
                },
                scales: {
                    x: {
                        grid: { color: C.grid, drawBorder: false },
                        ticks: {
                            color: "#9ca3af",
                            font: { size: 10, family: "Inter" },
                            maxTicksLimit: 8
                        }
                    },
                    yLeft: {
                        position: "left",
                        min: 0,
                        max: 20,
                        grid: { color: C.grid, drawBorder: false },
                        ticks: {
                            color: "#9ca3af",
                            font: { size: 10, family: "Inter" },
                            stepSize: 5
                        }
                    },
                    yRight: {
                        position: "right",
                        min: 0,
                        max: 100,
                        grid: { display: false, drawBorder: false },
                        ticks: {
                            color: "#9ca3af",
                            font: { size: 10, family: "Inter" },
                            stepSize: 25
                        }
                    }
                }
            }
        });
    })();

    /* ── 6. Trend filter buttons ────────────────────────────────── */
    document.querySelectorAll(".trend-filter-btn").forEach(btn => {
        btn.addEventListener("click", function () {
            document.querySelectorAll(".trend-filter-btn").forEach(b => b.classList.remove("active"));
            this.classList.add("active");
        });
    });

    /* ── 7. Sensor range bar helpers ────────────────────────────── */
    function updateRangeMarker(id, value, min, max) {
        const el = document.getElementById(id);
        if (!el) return;
        const pct = clamp(((value - min) / (max - min)) * 100, 0, 100);
        el.style.left = pct + "%";
    }

    function getStatus(value, thresholds) {
        if (value <= thresholds[0]) return "allowable";
        if (value <= thresholds[1]) return "warning";
        return "dangerous";
    }

    function setBadge(id, status) {
        const el = document.getElementById(id);
        if (!el) return;
        el.className = "status-badge badge-" + status;
        el.textContent = status === "allowable" ? "Normal" : status === "warning" ? "Nəzarət" : "Təhlükəli";
    }

    /* ── 8. Live sensor updates ─────────────────────────────────── */
    function advanceSensors() {
        const t = tick / 15;
        const stress = clamp(state.degradation / 100, 0, 1);

        state.voltage = clamp(jitter(seed.voltage + Math.sin(t * 0.5) * 5, 2), 340, 440);
        state.current = clamp(jitter(seed.current + Math.sin(t * 0.7) * 0.4, 0.2), 0, 20);
        state.temperature = clamp(jitter(seed.temperature + Math.sin(t * 0.3) * 2 + stress * 5, 0.4), 0, 100);
        state.vibration = clamp(jitter(seed.vibration + Math.sin(t * 1.1) * 0.08, 0.03), 0, 7.1);

        state.health = clamp(seed.health + Math.sin(t * 0.2) * 2, 50, 100);
        state.confidence = clamp(seed.confidence + Math.sin(t * 0.15) * 3, 70, 98);
        state.rul = clamp(Math.round(seed.rul + Math.sin(t * 0.1) * 30), 80, 1500);
    }

    /* ── 9. DOM render ──────────────────────────────────────────── */
    function renderDOM() {
        /* DateTime */
        const nowDt = new Date();
        setEl("infoDateTime", nowDt.toLocaleString("az-AZ", {
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit"
        }));

        /* Sensor values */
        setEl("valVoltage", fmt1(state.voltage));
        setEl("valCurrent", fmt2(state.current));
        setEl("valTemp", fmt1(state.temperature));
        setEl("valVib", fmt2(state.vibration));

        /* Range markers */
        /* Range markers */
        updateRangeMarker("markerVoltage", state.voltage, 340, 440);
        updateRangeMarker("markerCurrent", state.current, 0, 20);
        updateRangeMarker("markerTemp", state.temperature, 0, 100);
        updateRangeMarker("markerVib", state.vibration, 0, 7.1);

        /* Status badges */
        let vSt = "allowable";
        if (state.voltage < 340 || state.voltage > 430) vSt = "dangerous";
        else if (state.voltage < 360 || state.voltage > 410) vSt = "warning";

        const cSt = getStatus(state.current, [13, 16]);
        const tSt = getStatus(state.temperature, [70, 85]);
        const vibSt = getStatus(state.vibration, [2.8, 4.5]);

        setBadge("badgeVoltage", vSt);
        setBadge("badgeCurrent", cSt);
        setBadge("badgeTemp", tSt);
        setBadge("badgeVib", vibSt);

        /* RUL */
        setEl("rulValue", fmt0(state.rul));
        setEl("rulConfidence", fmt1(state.confidence) + "%");

        /* Status panel */
        const statuses = [vSt, cSt, tSt, vibSt];
        const allowCount = statuses.filter(s => s === "allowable").length;
        const warnCount = statuses.filter(s => s === "warning").length;
        const dangerCount = statuses.filter(s => s === "dangerous").length;

        setEl("countAllow", allowCount);
        setEl("countWarn", warnCount);
        setEl("countDanger", dangerCount);

        const statusIcon = document.getElementById("statusIcon");
        const statusHeading = document.getElementById("statusHeading");
        const statusDesc = document.getElementById("statusDesc");

        if (statusIcon && statusHeading && statusDesc) {
            if (dangerCount > 0) {
                statusIcon.className = "status-icon-wrapper status-icon-danger";
                statusIcon.innerHTML = '<i class="fa-solid fa-xmark" style="color:var(--red)"></i>';
                statusHeading.textContent = "SİSTEM TƏHLÜKƏDƏ";
                statusDesc.textContent = "Bəzi göstəricilər təhlükəli həddə çatıb. Dərhal müdaxilə tələb olunur.";
            } else if (warnCount > 0) {
                statusIcon.className = "status-icon-wrapper status-icon-warn";
                statusIcon.innerHTML = '<i class="fa-solid fa-exclamation" style="color:var(--orange)"></i>';
                statusHeading.textContent = "SİSTEM NƏZARƏTDƏ";
                statusDesc.textContent = "Bəzi göstəricilər xəbərdarlıq zonasındadır. Nəzarət altında saxlayın.";
            } else {
                statusIcon.className = "status-icon-wrapper status-icon-ok";
                statusIcon.innerHTML = '<i class="fa-solid fa-check" style="color:var(--green)"></i>';
                statusHeading.textContent = "SİSTEM NORMALDİR";
                statusDesc.textContent = "Bütün göstəricilər icazə verilən hədlər daxilindədir.";
            }
        }

        /* Notification badge */
        const navBadge = document.querySelector(".nav-badge");
        if (navBadge) {
            navBadge.textContent = warnCount + dangerCount;
        }
    }

    /* ── 10. Chart refresh ──────────────────────────────────────── */
    function refreshCharts() {
        /* RUL donut */
        if (rulChart) {
            const rul = state.rul;
            const col = rul >= 500 ? C.green : rul >= 200 ? C.orange : C.red;
            rulChart.data.datasets[0].data = [rul, Math.max(0, 1500 - rul)];
            rulChart.data.datasets[0].backgroundColor = [col, "#e5e7eb"];
            rulChart.update("none");
        }

        /* Trend chart */
        if (trendChart) {
            const label = new Date().toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" });
            trendLabels.push(label);
            trendLabels.shift();
            trendVoltage.push(+fmt1(state.voltage));
            trendVoltage.shift();
            trendCurrent.push(+fmt2(state.current));
            trendCurrent.shift();
            trendTemp.push(+fmt1(state.temperature));
            trendTemp.shift();
            trendVib.push(+fmt2(state.vibration));
            trendVib.shift();

            trendChart.data.labels = [...trendLabels];
            trendChart.data.datasets[0].data = [...trendVoltage];
            trendChart.data.datasets[1].data = [...trendCurrent];
            trendChart.data.datasets[2].data = [...trendTemp];
            trendChart.data.datasets[3].data = [...trendVib];
            trendChart.update("none");
        }
    }

    /* ── 11. Alert system ───────────────────────────────────────── */
    const alertMessages = [];

    function updateAlerts() {
        if (tick % 5 !== 0 && tick > 0) return;

        const ts = new Date().toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

        if (state.voltage < 360 || state.voltage > 410) {
            alertMessages.unshift({
                type: "warning",
                icon: "exclamation",
                text: "Gərginlik xəbərdarlıq həddindədir",
                detail: "Cari dəyər: " + fmt0(state.voltage) + " V",
                time: ts
            });
        }

        if (state.temperature > 70) {
            alertMessages.unshift({
                type: "warning",
                icon: "exclamation",
                text: "Temperatur xəbərdarlıq həddinə yaxınlaşır",
                detail: "Cari dəyər: " + fmt1(state.temperature) + " °C",
                time: ts
            });
        }

        if (state.vibration <= 2.8) {
            alertMessages.unshift({
                type: "ok",
                icon: "check",
                text: "Vibrasiya normal həddədir",
                detail: "Cari dəyər: " + fmt2(state.vibration) + " mm/s",
                time: ts
            });
        } else {
            alertMessages.unshift({
                type: "warning",
                icon: "exclamation",
                text: "Vibrasiya xəbərdarlıq həddinə yaxınlaşır",
                detail: "Cari dəyər: " + fmt2(state.vibration) + " mm/s",
                time: ts
            });
        }

        if (state.current > 13) {
            alertMessages.unshift({
                type: "warning",
                icon: "exclamation",
                text: "Cərəyan xəbərdarlıq həddinə yaxınlaşır",
                detail: "Cari dəyər: " + fmt2(state.current) + " A",
                time: ts
            });
        }

        // Keep max 10
        while (alertMessages.length > 10) alertMessages.pop();

        const listEl = document.getElementById("alertList");
        if (!listEl) return;

        listEl.innerHTML = alertMessages.slice(0, 4).map(a => `
            <li class="alert-item">
                <div class="alert-icon alert-icon-${a.type}"><i class="fa-solid fa-${a.icon}"></i></div>
                <div class="alert-content">
                    <div class="alert-text">${a.text}</div>
                    <div class="alert-detail">${a.detail}</div>
                </div>
                <div class="alert-time">${a.time}</div>
            </li>
        `).join("");
    }

    /* ── 12. Main tick ──────────────────────────────────────────── */
    function onTick() {
        tick++;
        advanceSensors();
        renderDOM();
        refreshCharts();
        updateAlerts();
    }

    /* ── Theme management and toggle ── */
    (function initTheme() {
        const themeBtn = document.getElementById("themeToggleBtn");
        if (!themeBtn) return;

        const updateThemeButton = (isDark) => {
            const icon = themeBtn.querySelector("i");
            const text = themeBtn.querySelector("span");
            if (isDark) {
                if (icon) icon.className = "fa-solid fa-sun";
                if (text) text.textContent = "Açıq rejim";
            } else {
                if (icon) icon.className = "fa-solid fa-moon";
                if (text) text.textContent = "Qaranlıq rejim";
            }
        };

        const updateChartsForTheme = (isDark) => {
            const gridColor = isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.06)";
            const textColor = isDark ? "#8B949E" : "#9ca3af";
            const tooltipBg = isDark ? "#161B22" : "#fff";
            const tooltipBorder = isDark ? "#30363d" : "#e5e7eb";
            const tooltipText = isDark ? "#E6EDF3" : "#1a1a2e";
            const trackColor = isDark ? "#21262d" : "#e5e7eb";

            if (rulChart) {
                rulChart.data.datasets[0].backgroundColor[1] = trackColor;
                rulChart.update();
            }

            if (trendChart) {
                trendChart.options.scales.x.grid.color = gridColor;
                trendChart.options.scales.x.ticks.color = textColor;
                trendChart.options.scales.yLeft.grid.color = gridColor;
                trendChart.options.scales.yLeft.ticks.color = textColor;
                trendChart.options.scales.yRight.ticks.color = textColor;

                trendChart.options.plugins.tooltip.backgroundColor = tooltipBg;
                trendChart.options.plugins.tooltip.borderColor = tooltipBorder;
                trendChart.options.plugins.tooltip.titleColor = tooltipText;
                trendChart.options.plugins.tooltip.bodyColor = textColor;
                trendChart.update();
            }
        };

        const savedTheme = localStorage.getItem("theme");
        if (savedTheme === "dark") {
            document.body.classList.add("dark-mode");
            updateThemeButton(true);
            setTimeout(() => updateChartsForTheme(true), 150);
        } else {
            document.body.classList.remove("dark-mode");
            updateThemeButton(false);
        }

        themeBtn.addEventListener("click", function () {
            const isDark = document.body.classList.toggle("dark-mode");
            localStorage.setItem("theme", isDark ? "dark" : "light");
            updateThemeButton(isDark);
            updateChartsForTheme(isDark);
        });
    })();

    /* ── Prediction logs manager ── */
    function managePredictionLogs() {
        const logsEl = document.getElementById("predictionLogs");
        if (!logsEl) return;

        let logs = [];
        try {
            logs = JSON.parse(localStorage.getItem("prediction_logs")) || [];
        } catch (e) {
            logs = [];
        }

        const isAnomaly = seed.vibration >= 0.72 || seed.temperature >= 84 || seed.current >= 16;
        const currentLogEntry = {
            time: new Date().toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            confidence: fmt0(seed.confidence),
            rul: fmt0(seed.rul),
            anomaly: isAnomaly ? "Aktiv" : "Yoxdur"
        };

        const hasParams = window.location.search.indexOf("Cycle") > -1;
        const lastEntry = logs[0];
        
        const isDifferent = !lastEntry || 
                            lastEntry.text.indexOf("QÖM: " + currentLogEntry.rul) === -1 || 
                            lastEntry.text.indexOf("Etibarlılıq: " + currentLogEntry.confidence) === -1;

        if (hasParams && isDifferent) {
            logs.unshift({
                time: currentLogEntry.time,
                text: `Etibarlılıq: ${currentLogEntry.confidence}% | QÖM: ${currentLogEntry.rul} saat`
            });
            logs.unshift({
                time: currentLogEntry.time,
                text: `Anomaliya təsbiti: ${currentLogEntry.anomaly}`
            });
        }

        if (logs.length === 0) {
            const timeNow = new Date();
            const formatTime = (offsetSec) => {
                const d = new Date(timeNow.getTime() - offsetSec * 1000);
                return d.toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
            };

            logs = [
                { time: formatTime(0), text: `Anomaliya təsbiti: ${currentLogEntry.anomaly}` },
                { time: formatTime(8), text: `Etibarlılıq: 96% | QÖM: 684 saat` },
                { time: formatTime(12), text: "Anomaliya təsbiti: Yoxdur" }
            ];
        }

        if (logs.length > 8) {
            logs = logs.slice(0, 8);
        }

        localStorage.setItem("prediction_logs", JSON.stringify(logs));

        logsEl.innerHTML = logs.map(log => `
            <div class="prediction-log-item">
                <div class="prediction-log-time">${log.time}</div>
                <div class="prediction-log-text">${log.text}</div>
            </div>
        `).join("");
    }

    /* Initial render */
    renderDOM();
    refreshCharts();
    managePredictionLogs();

    /* Start live loop */
    setInterval(onTick, 2000);

})();
