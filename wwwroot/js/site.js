/**
 * dashboard-live.js  –  wwwroot/js/dashboard-live.js
 *
 * Reads seed values from the data-* attributes on
 *   <section class="diagnostic-shell" data-dashboard …>
 * then drives every chart, sensor card, bar, chip, and log entry
 * live with realistic correlated mock noise every 1.2 s.
 *
 * Requires Chart.js 4.x to be loaded before this script.
 * To freeze the loop (print / export view) add data-live="false"
 * to the <section> element in Index.cshtml.
 */

(function () {
    "use strict";

    /* ── 1. Find shell and read Razor seed values ─────────────────────────── */

    const shell = document.querySelector("[data-dashboard]");
    if (!shell) return;

    const liveMode = shell.dataset.live !== "false";

    const seed = {
        rul: parseFloat(shell.dataset.rul) || 650,
        health: parseFloat(shell.dataset.health) || 78,
        degradation: parseFloat(shell.dataset.degradation) || 22,
        confidence: parseFloat(shell.dataset.confidence) || 91,
        risk: shell.dataset.risk || "safe",
        vibration: parseFloat(shell.dataset.vibration) || 3.2,
        temperature: parseFloat(shell.dataset.temperature) || 72,
        current: parseFloat(shell.dataset.current) || 28,
        pressure: parseFloat(shell.dataset.pressure) || 95,
        bearing: shell.dataset.bearing === "True",
        stator: shell.dataset.stator === "True",
        rotor: shell.dataset.rotor === "True",
        anomaly: shell.dataset.anomaly === "True",
    };

    /* ── 2. Mutable live state ────────────────────────────────────────────── */

    let state = { ...seed };
    let tick = 0;

    /* ── 3. Pure helpers ──────────────────────────────────────────────────── */

    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const jitter = (v, amp) => v + (Math.random() - 0.5) * 2 * amp;
    const fmt0 = v => Math.round(v).toString();
    const fmt1 = v => v.toFixed(1);
    const fmt2 = v => v.toFixed(2);

    function setEl(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function setStyle(id, prop, val) {
        const el = document.getElementById(id);
        if (el) el.style[prop] = val;
    }

    /* ── 4. Sensor noise model ────────────────────────────────────────────── */

    function advanceSensors() {
        const t = tick / 20;
        const stress = clamp(state.degradation / 100, 0, 1);

        state.current = clamp(jitter(seed.current + stress * 8 + 2.0 * Math.sin(t * 0.7), 0.5), 0, 60);
        state.vibration = clamp(jitter(seed.vibration + stress * 4 + 1.2 * Math.sin(t * 1.1 + 0.4), 0.07), 0, 15);
        state.temperature = clamp(jitter(seed.temperature + stress * 15 + 3.0 * Math.sin(t * 0.4), 0.4), 0, 120);
        state.pressure = clamp(jitter(seed.pressure + stress * 8 + 2.0 * Math.cos(t * 0.9), 0.9), 0, 200);

        const vN = state.vibration / 15;
        const tN = state.temperature / 120;
        const iN = state.current / 60;
        state.degradation = clamp(
            seed.degradation + stress * 12 + vN * 8 + tN * 6 + iN * 4 + (Math.random() - 0.5) * 2,
            0, 100
        );
        state.health = clamp(100 - state.degradation, 0, 100);
        state.rul = clamp(Math.round(900 * (1 - state.degradation / 100)), 0, 900);
        state.confidence = clamp(Math.round(seed.confidence + 8 * Math.sin(tick * 0.13)), 50, 99);

        state.bearing = state.vibration > 6.0;
        state.stator = state.current > 50.0;
        state.rotor = state.temperature > 100.0;
        state.anomaly = state.bearing || state.stator || state.rotor;
        state.risk = state.health > 70 ? "safe" : state.health > 40 ? "warning" : "danger";
    }

    /* ── 5. Sparkline history ─────────────────────────────────────────────── */

    const SPARK = 20;
    const hist = {
        current: Array(SPARK).fill(seed.current),
        vibration: Array(SPARK).fill(seed.vibration),
        temperature: Array(SPARK).fill(seed.temperature),
        pressure: Array(SPARK).fill(seed.pressure),
    };

    /* ── 6. Color constants (hardcoded – canvas cannot read CSS vars) ─────── */

    const C = {
        blue: "#378ADD",
        orange: "#D85A30",
        amber: "#BA7517",
        purple: "#7F77DD",
        green: "#1D9E75",
        isoLine: "rgba(210,50,40,.65)",
        grid: "rgba(128,128,128,.08)",
        gaugeTrack: "rgba(128,128,128,.12)",
    };

    /* ── 7. Build charts ──────────────────────────────────────────────────── */

    /* 7a. Sparkline factory */
    function hexToRgba(hex, a) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${a})`;
    }

    function buildSparkline(canvasId, color, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        return new Chart(ctx, {
            type: "line",
            data: {
                labels: data.map((_, i) => i),
                datasets: [{
                    data: [...data],
                    borderColor: color,
                    backgroundColor: hexToRgba(color, 0.10),
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.35,
                    fill: true,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 300 },
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { display: false }, y: { display: false } },
            },
        });
    }

    const sparkCurrent = buildSparkline("currentSpark", C.blue, hist.current);
    const sparkVibration = buildSparkline("vibrationSpark", C.orange, hist.vibration);
    const sparkTemperature = buildSparkline("temperatureSpark", C.amber, hist.temperature);
    const sparkPressure = buildSparkline("pressureSpark", C.purple, hist.pressure);

    /* 7b. Main diagnostics chart */
    const DIAG = 30;
    const diagLabels = Array(DIAG).fill("");
    const dCurrent = Array(DIAG).fill(seed.current);
    const dVib = Array(DIAG).fill(seed.vibration);
    const dTemp = Array(DIAG).fill(seed.temperature);
    const dPsi = Array(DIAG).fill(seed.pressure);

    let diagChart = null;
    (function () {
        const ctx = document.getElementById("diagnosticsChart");
        if (!ctx) return;
        diagChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: diagLabels,
                datasets: [
                    { label: "Cərəyan (A)", data: dCurrent, borderColor: C.blue, borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: false, yAxisID: "yA" },
                    { label: "Vibrasiya (mm/s)", data: dVib, borderColor: C.orange, borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: false, yAxisID: "yV" },
                    { label: "Temperatur (°C)", data: dTemp, borderColor: C.amber, borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: false, yAxisID: "yT", borderDash: [4, 2] },
                    { label: "Təzyiq (PSI)", data: dPsi, borderColor: C.purple, borderWidth: 1, pointRadius: 0, tension: 0.3, fill: false, yAxisID: "yP", borderDash: [2, 3] },
                    {
                        label: "ISO 10816 (7.1 mm/s)", data: Array(DIAG).fill(7.1),
                        borderColor: C.isoLine, borderWidth: 1.5, borderDash: [6, 3],
                        pointRadius: 0, fill: false, yAxisID: "yV"
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 300 },
                plugins: {
                    legend: { display: true, position: "top", labels: { boxWidth: 12, font: { size: 11 } } },
                },
                scales: {
                    x: { ticks: { maxTicksLimit: 6, font: { size: 10 } }, grid: { color: C.grid } },
                    yA: { position: "left", title: { display: true, text: "A", font: { size: 10 } }, ticks: { font: { size: 10 } }, grid: { color: C.grid } },
                    yV: { position: "right", title: { display: true, text: "mm/s", font: { size: 10 } }, ticks: { font: { size: 10 } }, grid: { display: false }, min: 0, max: 12 },
                    yT: { display: false },
                    yP: { display: false },
                },
            },
        });
    }());

    /* 7c. RUL gauge (semi-circle doughnut) */
    let rulGauge = null;
    (function () {
        const ctx = document.getElementById("rulGauge");
        if (!ctx) return;
        rulGauge = new Chart(ctx, {
            type: "doughnut",
            data: {
                datasets: [{
                    data: [seed.rul, Math.max(0, 900 - seed.rul)],
                    backgroundColor: [C.green, C.gaugeTrack],
                    borderWidth: 0,
                    circumference: 180,
                    rotation: -90,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "72%",
                animation: { duration: 500 },
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
            },
        });
    }());

    /* 7d. FFT chart */
    let fftChart = null;
    (function () {
        const ctx = document.getElementById("faultSignatureChart");
        if (!ctx) return;
        fftChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: ["1×", "2×", "3×", "4×", "5×", "BPFO", "BPFI", "BSF"],
                datasets: [{
                    label: "Amplituda",
                    data: [1.2, 0.4, 0.9, 0.2, 0.3, 0.7, 0.15, 0.6],
                    backgroundColor: [C.blue, C.blue, C.orange, C.blue, C.blue, C.amber, C.blue, C.amber],
                    borderRadius: 3,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 400 },
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { font: { size: 10 } }, grid: { display: false } },
                    y: { ticks: { font: { size: 10 } }, grid: { color: C.grid } },
                },
            },
        });
    }());

    /* 7e. P-F curve */
    let pfChart = null;
    (function () {
        const ctx = document.getElementById("pfCurveChart");
        if (!ctx) return;
        const curve = Array.from({ length: 101 }, (_, i) => ({
            x: i,
            y: Math.max(0, 100 - i * 0.7 - Math.pow(i / 28, 2)),
        }));
        pfChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: curve.map(d => d.x),
                datasets: [
                    {
                        label: "P-F əyrisi",
                        data: curve.map(d => d.y),
                        borderColor: C.purple, borderWidth: 1.5,
                        pointRadius: 0, tension: 0.4, fill: false,
                    },
                    {
                        label: "Cari mövqe",
                        data: [],
                        borderColor: C.orange, backgroundColor: C.orange,
                        borderWidth: 0, pointRadius: 7, pointStyle: "circle", showLine: false,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 300 },
                plugins: { legend: { display: false } },
                scales: {
                    x: { title: { display: true, text: "Deqradasiya %", font: { size: 10 } }, ticks: { maxTicksLimit: 6, font: { size: 10 } }, grid: { color: C.grid } },
                    y: { title: { display: true, text: "Sağlamlıq", font: { size: 10 } }, min: 0, max: 100, ticks: { font: { size: 10 } }, grid: { color: C.grid } },
                },
            },
        });
    }());

    /* ── 8. DOM render – all targets are explicit ids from Index.cshtml ───── */

    const RISK_LABELS = { safe: "Optimal", warning: "Xəbərdarlıq", danger: "Təhlükəli" };

    const CMD = {
        safe: {
            title: "Normal işləmə",
            desc: () => `Bütün parametrlər normadadır. Növbəti profilaktik yoxlama: ${fmt0(state.rul)} saat sonra.`,
        },
        warning: {
            title: "Planlaşdırılmış texniki xidmət tələb olunur",
            desc: () => "Deqradasiya artır. Vibrasiya / temperatur limitə yaxınlaşır. Yoxlama tövsiyə edilir.",
        },
        danger: {
            title: "⚠ Dərhal xidmət – mühərriki dayandırın!",
            desc: () => `Kritik nasazlıq aşkarlandı. QÖM: ${fmt0(state.rul)} saat. Mühərriki dərhal söndürün.`,
        },
    };

    function renderDOM() {
        /* Status chip */
        const chip = document.getElementById("statusChip");
        if (chip) {
            chip.className = "status-chip " + state.risk;
            chip.textContent = RISK_LABELS[state.risk] || state.risk;
        }

        /* RUL heading + gauge readout */
        setEl("rulHeading", fmt2(state.rul) + " saat");
        setEl("rulGaugeReadout", fmt0(state.rul));

        /* Health / Degradation bars */
        setEl("healthLabel", fmt1(state.health) + "%");
        setEl("degradeLabel", fmt1(state.degradation) + "%");
        setStyle("healthBarFill", "width", clamp(state.health, 0, 100).toFixed(0) + "%");
        setStyle("degradeBarFill", "width", clamp(state.degradation, 0, 100).toFixed(0) + "%");

        /* Sensor card values (ids added in Index.cshtml) */
        setEl("scCurrent", fmt1(state.current) + " A");
        setEl("scVibration", fmt2(state.vibration) + " mm/s");
        setEl("scTemperature", fmt1(state.temperature) + " °C");
        setEl("scPressure", fmt1(state.pressure) + " PSI");

        /* Sidebar form inputs – keep in sync so submit sends live snapshot.
           Skip update if the user is actively editing that field.               */
        const inputMap = {
            inputCurrent: fmt1(state.current),
            inputVibration: fmt2(state.vibration),
            inputTemperature: fmt1(state.temperature),
            inputPressure: fmt1(state.pressure),
            inputHealth: fmt0(state.health),
        };
        Object.entries(inputMap).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el && document.activeElement !== el) el.value = val;
        });

        /* P-F used label */
        setEl("pfUsedLabel", fmt0(state.degradation) + "% istifadə olunub");

        /* Command box */
        const box = document.getElementById("commandBox");
        if (box) {
            box.className = "command-box " + state.risk;
            setEl("commandTitle", CMD[state.risk].title);
            setEl("commandDesc", CMD[state.risk].desc());
        }

        /* Fault chips */
        function setChip(id, isOk, txtOk, txtFault, faultCls) {
            const el = document.getElementById(id);
            if (!el) return;
            el.className = "fault-chip " + (isOk ? "fault-ok" : faultCls);
            el.textContent = isOk ? txtOk : txtFault;
        }
        setChip("chipBearing", !state.bearing, "Yataq ✓", "Yataq ✗", "fault-crit");
        setChip("chipStator", !state.stator, "Stator ✓", "Stator ✗", "fault-crit");
        setChip("chipRotor", !state.rotor, "Rotor ✓", "Rotor ✗", "fault-crit");
        setChip("chipAnomaly", !state.anomaly, "Anomaliya —", "Anomaliya ⚠", "fault-warn");
    }

    /* ── 9. Log panel ─────────────────────────────────────────────────────── */

    const logEl = document.getElementById("predictionLogs");
    const logLines = [];
    let prevFaults = { bearing: seed.bearing, stator: seed.stator, rotor: seed.rotor };

    function pushLog(msg) {
        const d = new Date();
        const ts = [d.getHours(), d.getMinutes(), d.getSeconds()]
            .map(n => String(n).padStart(2, "0")).join(":");
        logLines.unshift({ ts, msg });
        if (logLines.length > 40) logLines.pop();
        if (logEl) {
            logEl.innerHTML = logLines.slice(0, 10)
                .map(l => `<div><time>${l.ts}</time><span>${l.msg}</span></div>`)
                .join("");
        }
    }

    function updateLogs() {
        if (tick % 4 === 0) {
            pushLog(`Etibarlılıq: ${state.confidence}%  |  QÖM: ${fmt0(state.rul)} saat`);
            pushLog(`Anomaliya tespiti: ${state.anomaly ? "AKTİV ⚠" : "Yoxdur"}`);
        }
        if (state.bearing && !prevFaults.bearing) pushLog("XƏBƏRDARLIQ: Yataq nasazlığı (vib > 6 mm/s)");
        if (!state.bearing && prevFaults.bearing) pushLog("Yataq vəziyyəti normallaşdı");
        if (state.stator && !prevFaults.stator) pushLog("XƏBƏRDARLIQ: Stator cərəyanı hədd keçdi (>50 A)");
        if (!state.stator && prevFaults.stator) pushLog("Stator cərəyanı normala qayıtdı");
        if (state.rotor && !prevFaults.rotor) pushLog("KRİTİK: Rotor temperaturu həddaşımı (>100 °C)");
        if (!state.rotor && prevFaults.rotor) pushLog("Rotor temperaturu normala qayıtdı");
        prevFaults = { bearing: state.bearing, stator: state.stator, rotor: state.rotor };
    }

    /* ── 10. Chart refresh ────────────────────────────────────────────────── */

    function refreshCharts() {
        const label = new Date().toLocaleTimeString("az-AZ");

        /* Sparklines */
        function pushSpark(chart, arr, val) {
            if (!chart) return;
            arr.push(val); arr.shift();
            chart.data.datasets[0].data = [...arr];
            chart.update("none");
        }
        pushSpark(sparkCurrent, hist.current, state.current);
        pushSpark(sparkVibration, hist.vibration, state.vibration);
        pushSpark(sparkTemperature, hist.temperature, state.temperature);
        pushSpark(sparkPressure, hist.pressure, state.pressure);

        /* Diagnostics chart */
        if (diagChart) {
            diagLabels.push(label); diagLabels.shift();
            dCurrent.push(+fmt1(state.current)); dCurrent.shift();
            dVib.push(+fmt2(state.vibration)); dVib.shift();
            dTemp.push(+fmt1(state.temperature)); dTemp.shift();
            dPsi.push(+Math.round(state.pressure)); dPsi.shift();
            diagChart.data.labels = [...diagLabels];
            diagChart.data.datasets[0].data = [...dCurrent];
            diagChart.data.datasets[1].data = [...dVib];
            diagChart.data.datasets[2].data = [...dTemp];
            diagChart.data.datasets[3].data = [...dPsi];
            // dataset[4] = ISO threshold, constant – no update needed
            diagChart.update("none");
        }

        /* RUL gauge */
        if (rulGauge) {
            const col = state.risk === "safe" ? C.green : state.risk === "warning" ? C.amber : C.orange;
            rulGauge.data.datasets[0].data = [state.rul, Math.max(0, 900 - state.rul)];
            rulGauge.data.datasets[0].backgroundColor = [col, C.gaugeTrack];
            rulGauge.update();
        }

        /* FFT */
        if (fftChart) {
            const d = state.degradation / 100;
            const amps = [
                +(1.0 + d * 0.8 + (Math.random() - 0.5) * 0.15).toFixed(2),
                +(0.3 + (Math.random() - 0.5) * 0.2).toFixed(2),
                +(0.7 + (state.bearing ? 0.8 : 0) + (Math.random() - 0.5) * 0.1).toFixed(2),
                +(0.15 + (Math.random() - 0.5) * 0.1).toFixed(2),
                +(0.25 + (Math.random() - 0.5) * 0.1).toFixed(2),
                +(0.5 + (state.bearing ? 1.2 : 0) + (Math.random() - 0.5) * 0.1).toFixed(2),
                +(0.10 + (Math.random() - 0.5) * 0.1).toFixed(2),
                +(0.4 + (state.rotor ? 0.9 : 0) + (Math.random() - 0.5) * 0.1).toFixed(2),
            ];
            fftChart.data.datasets[0].data = amps;
            fftChart.data.datasets[0].backgroundColor = amps.map(v => v > 1 ? C.orange : C.blue);
            fftChart.update("none");
        }

        /* P-F dot */
        if (pfChart) {
            const idx = Math.round(clamp(state.degradation, 0, 100));
            const y = Math.max(0, 100 - idx * 0.7 - Math.pow(idx / 28, 2));
            pfChart.data.datasets[1].data = [{ x: idx, y }];
            pfChart.update("none");
        }
    }

    /* ── 11. Main tick ────────────────────────────────────────────────────── */

    function onTick() {
        tick++;
        if (liveMode) advanceSensors();
        renderDOM();
        refreshCharts();
        updateLogs();
    }

    /* Initial paint with server-seeded values */
    renderDOM();
    refreshCharts();
    pushLog("Sistem başladı. Sensor telemetriyası aktiv.");
    pushLog("ML proqnoz mühərriki yükləndi (v2.4)");

    if (liveMode) setInterval(onTick, 1200);

}());