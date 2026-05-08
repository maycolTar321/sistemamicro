/**
 * SaiceControl Engine v8.0 - Antigravity Edition
 * Developed for Microeconomics Analysis
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 SaiceControl Engine v8.0 - Antigravity Edition Initialized");

    // --- STATE MANAGEMENT ---
    const state = {
        activeTab: 'tab-perfecta',
        data: {}
    };

    // --- NAVIGATION ---
    const navItems = document.querySelectorAll('.nav-item');
    const tabSections = document.querySelectorAll('.tab-section');

    function switchTab(targetId) {
        if (!targetId) return;
        
        tabSections.forEach(section => {
            section.classList.remove('active');
        });
        navItems.forEach(nav => nav.classList.remove('active'));

        const targetSection = document.getElementById(targetId);
        const targetNav = document.querySelector(`.nav-item[data-target="${targetId}"]`);
        
        if (targetSection) {
            targetSection.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (targetNav) targetNav.classList.add('active');
        
        state.activeTab = targetId;
        saveAllData();
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(item.getAttribute('data-target'));
        });
    });

    // --- UTILS ---
    const formatNumber = (n, d = 2) => {
        if (isNaN(n) || n === null) return 0;
        return Number.isInteger(n) ? n : parseFloat(n.toFixed(d));
    };

    function calculateRegression(X, Y) {
        let n = X.length;
        if (n === 0) return null;
        
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        let data = [];
        let meanX = X.reduce((a, b) => a + b, 0) / n;
        let meanY = Y.reduce((a, b) => a + b, 0) / n;
        
        for(let i=0; i<n; i++) {
            sumX += X[i]; sumY += Y[i];
            sumXY += X[i]*Y[i]; sumX2 += X[i]*X[i];
            let dx = X[i] - meanX, dy = Y[i] - meanY;
            data.push({ x: X[i], y: Y[i], dx, dy, dxdy: dx*dy, dx2: dx*dx });
        }
        
        let sumDXDY = data.reduce((s, d) => s + d.dxdy, 0);
        let sumDX2 = data.reduce((s, d) => s + d.dx2, 0);
        
        let b = sumDX2 === 0 ? 0 : sumDXDY / sumDX2;
        let a = meanY - b * meanX;
        
        return { a, b, data, sumDXDY, sumDX2, meanX, meanY };
    }

    function renderRegressionTable(tableId, regData) {
        const table = document.getElementById(tableId);
        if (!table) return;
        const tbody = table.querySelector('tbody');
        const tfoot = table.querySelector('tfoot');
        
        tbody.innerHTML = regData.data.map(row => `
            <tr>
                <td>${formatNumber(row.x)}</td>
                <td>${formatNumber(row.y)}</td>
                <td>${formatNumber(row.dx)}</td>
                <td>${formatNumber(row.dy)}</td>
                <td>${formatNumber(row.dxdy)}</td>
                <td>${formatNumber(row.dx2)}</td>
            </tr>
        `).join('');
        
        if (tfoot) {
            tfoot.innerHTML = `
                <tr style="font-weight: bold; background: rgba(255,255,255,0.05);">
                    <td colspan="2">PROMEDIOS: X=${formatNumber(regData.meanX)} Y=${formatNumber(regData.meanY)}</td>
                    <td colspan="2" style="text-align: right;">SUMATORIAS:</td>
                    <td>${formatNumber(regData.sumDXDY)}</td>
                    <td>${formatNumber(regData.sumDX2)}</td>
                </tr>
            `;
        }
    }

    // --- CHARTS ---
    let utilityChart = null;
    function drawUtilityChart(xOpt, utMax, m, c, cv, cf) {
        const canvas = document.getElementById('chart-utilidad-custom');
        if (!canvas) return;
        if (utilityChart) utilityChart.destroy();
        
        let itData = [];
        const maxX = xOpt * 2.2 || 1000;
        const step = maxX / 50;
        for(let x=0; x<=maxX; x+=step) {
            itData.push({x: x, y: m*x*x + c*x});
        }
        
        utilityChart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                datasets: [{
                    data: itData,
                    borderColor: '#ff3e3e',
                    borderWidth: 4,
                    fill: false,
                    pointRadius: 0,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    annotation: {
                        annotations: {
                            lineX: { type: 'line', xMin: xOpt, xMax: xOpt, yMin: 0, yMax: utMax, borderColor: 'rgba(0, 242, 255, 0.5)', borderWidth: 2, borderDash: [5, 5] },
                            lineY: { type: 'line', yMin: utMax, yMax: utMax, xMin: 0, xMax: xOpt, borderColor: 'rgba(0, 242, 255, 0.5)', borderWidth: 2, borderDash: [5, 5] },
                            lblX: { type: 'label', xValue: xOpt, yValue: 0, content: formatNumber(xOpt, 1), position: 'bottom', color: '#fff', font: { size: 12, weight: 'bold' } },
                            lblY: { type: 'label', xValue: 0, yValue: utMax, content: formatNumber(utMax, 0), position: 'left', color: '#fff', font: { size: 12, weight: 'bold' } }
                        }
                    }
                },
                scales: {
                    x: { type: 'linear', grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } },
                    y: { type: 'linear', grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } }
                }
            }
        });
    }

    let imperfectaChart = null;
    function drawImperfectaChart(canvasId, m, c, cv, xMono, xComp) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        if (imperfectaChart) imperfectaChart.destroy();
        
        let demData = [{x: 0, y: c}, {x: xComp*1.5, y: m*(xComp*1.5) + c}];
        let imData = [{x: 0, y: c}, {x: xComp*1.5, y: 2*m*(xComp*1.5) + c}];
        let cmData = [{x: 0, y: cv}, {x: xComp*1.5, y: cv}];

        imperfectaChart = new Chart(canvas.getContext('2d'), {
            type: 'scatter',
            data: {
                datasets: [
                    { label: 'P', data: demData, showLine: true, borderColor: '#00f2ff', borderWidth: 3, pointRadius: 0 },
                    { label: 'IM', data: imData, showLine: true, borderColor: '#ff007a', borderWidth: 3, pointRadius: 0 },
                    { label: 'CM', data: cmData, showLine: true, borderColor: '#ff3e3e', borderWidth: 3, pointRadius: 0 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, labels: { color: '#fff' } }
                },
                scales: {
                    x: { type: 'linear', grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } },
                    y: { type: 'linear', grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } }
                }
            }
        });
    }

    // --- MODULES ---

    // 1. Competencia Perfecta
    const btnResolver = document.getElementById('btn-resolver');
    if (btnResolver) {
        btnResolver.onclick = () => {
            const P = Array.from(document.querySelectorAll('.t-price')).map(i => parseFloat(i.value) || 0);
            const D = Array.from(document.querySelectorAll('.t-dem')).map(i => parseFloat(i.value) || 0);
            const S = Array.from(document.querySelectorAll('.t-sup')).map(i => parseFloat(i.value) || 0);
            const cf = parseFloat(document.getElementById('inp-cf').value) || 0;
            const cvVal = parseFloat(document.getElementById('inp-porcentaje-cv').value) || 0;
            const cvType = document.getElementById('inp-cv-type').value;

            const regD = calculateRegression(P, D);
            const regS = calculateRegression(P, S);
            
            if (!regD || !regS) return;

            const Pe = (regS.a - regD.a) / (regD.b - regS.b);
            const Qe = regD.b * Pe + regD.a;
            const m = 1/regD.b; 
            const c = -regD.a/regD.b;
            const Cv = cvType === 'percent' ? (P[0] || 1) * (cvVal/100) : cvVal;
            const xOpt = (Cv - c) / (2 * m);
            const itOpt = m*xOpt*xOpt + c*xOpt;
            const ctOpt = Cv*xOpt + cf;
            const ut = itOpt - ctOpt;

            document.getElementById('resolution-container').style.display = 'block';
            renderRegressionTable('table-demanda', regD);
            renderRegressionTable('table-oferta', regS);

            document.getElementById('math-demanda').innerHTML = `
                <p>\\( b = \\frac{\\sum DXDY}{\\sum DX^2} = \\frac{${formatNumber(regD.sumDXDY)}}{${formatNumber(regD.sumDX2)}} = ${formatNumber(regD.b)} \\)</p>
                <p>\\( a = \\bar{Y} - b\\bar{X} = ${formatNumber(regD.meanY)} - (${formatNumber(regD.b)})(${formatNumber(regD.meanX)}) = ${formatNumber(regD.a)} \\)</p>
                <p class="text-gradient" style="font-size:1.4rem; font-weight:bold;">\\( Q_d = ${formatNumber(regD.b)}P + ${formatNumber(regD.a)} \\)</p>
            `;

            document.getElementById('math-equilibrio').innerHTML = `
                <p>\\( Q_d = Q_s \\implies ${formatNumber(regD.b)}P + ${formatNumber(regD.a)} = ${formatNumber(regS.b)}P + ${formatNumber(regS.a)} \\)</p>
                <p style="font-size:1.5rem; color:var(--secondary); font-weight:bold;">\\( P_e = ${formatNumber(Pe, 2)} \\) Bs. | \\( Q_e = ${formatNumber(Qe, 0)} \\) Unidades</p>
            `;

            document.getElementById('math-utilidad').innerHTML = `
                <p>Determinando el nivel óptimo de producción (IM = CM):</p>
                <p style="font-size:1.6rem; color:var(--primary); font-weight:bold;">\\( UT_{óptima} = ${formatNumber(ut, 2)} \\) Bs. en \\( x = ${formatNumber(xOpt, 1)} \\) unid.</p>
            `;

            drawUtilityChart(xOpt, itOpt, m, c, Cv, cf);
            if (window.MathJax) MathJax.typesetPromise();
        };
    }

    // 2. Competencia Imperfecta
    const btnResolverImp = document.getElementById('btn-resolver-imp');
    if (btnResolverImp) {
        btnResolverImp.onclick = () => {
            const P = Array.from(document.querySelectorAll('.t-price-imp')).map(i => parseFloat(i.value) || 0);
            const D = Array.from(document.querySelectorAll('.t-dem-imp')).map(i => parseFloat(i.value) || 0);
            const cvVal = parseFloat(document.getElementById('inp-cv-imp').value) || 0;
            const cvType = document.getElementById('inp-cv-imp-type').value;
            const cf = parseFloat(document.getElementById('inp-cf-imp').value) || 0;
            
            const regD = calculateRegression(P, D);
            if (!regD) return;

            const m = 1/regD.b; 
            const c = -regD.a/regD.b;
            const cv = cvType === 'percent' ? (P[0] || 1) * (cvVal/100) : cvVal;
            
            const xMono = (cv - c) / (2 * m);
            const pMono = m * xMono + c;
            const xComp = (cv - c) / m;
            
            const k = c - cv;
            const integral = (x) => (m/2)*x*x + k*x;
            const cs = Math.abs(integral(xComp) - integral(xMono));

            document.getElementById('resolution-container-imp').style.display = 'block';
            renderRegressionTable('table-demanda-imp', regD);

            document.getElementById('math-reg-imp').innerHTML = `
                <p>\\( Q_d = ${formatNumber(regD.b)}P + ${formatNumber(regD.a, 1)} \\)</p>
                <p>\\( P = ${formatNumber(m, 5)}x + ${formatNumber(c, 3)} \\)</p>
            `;

            document.getElementById('math-9-imp').innerHTML = `
                <p>Costo Social (Pérdida de Bienestar):</p>
                <p style="font-size:1.8rem; color:var(--primary); font-weight:bold;">\\( CS = ${formatNumber(cs, 2)} \\) Bs.</p>
            `;

            drawImperfectaChart('chart-imperfecta-custom', m, c, cv, xMono, xComp);
            if (window.MathJax) MathJax.typesetPromise();
        };
    }

    // --- PERSISTENCE ---
    function saveAllData() {
        const data = {
            activeTab: state.activeTab,
            perfecta: Array.from(document.querySelectorAll('#table-body tr')).map(tr => ({
                p: tr.querySelector('.t-price')?.value,
                d: tr.querySelector('.t-dem')?.value,
                s: tr.querySelector('.t-sup')?.value
            })),
            imperfecta: Array.from(document.querySelectorAll('#table-body-imp tr')).map(tr => ({
                p: tr.querySelector('.t-price-imp')?.value,
                d: tr.querySelector('.t-dem-imp')?.value
            })),
            cf: document.getElementById('inp-cf')?.value,
            cv: document.getElementById('inp-porcentaje-cv')?.value,
            pe: {
                cf: document.getElementById('pe-cf')?.value,
                cv: document.getElementById('pe-cv')?.value,
                p: document.getElementById('pe-p')?.value,
                q1: document.getElementById('pe-q1')?.value,
                q2: document.getElementById('pe-q2')?.value
            }
        };
        localStorage.setItem('saice_antigravity_state', JSON.stringify(data));
    }

    function loadAllData() {
        const saved = localStorage.getItem('saice_antigravity_state');
        if (!saved) return;
        
        try {
            const data = JSON.parse(saved);
            if (data.activeTab) switchTab(data.activeTab);
            
            if (data.perfecta && data.perfecta.length > 0) {
                const tbody = document.getElementById('table-body');
                tbody.innerHTML = '';
                data.perfecta.forEach(row => {
                    if (!row.p) return;
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td><input type="number" class="t-price" value="${row.p}" step="0.1"></td><td><input type="number" class="t-dem" value="${row.d}"></td><td><input type="number" class="t-sup" value="${row.s}"></td><td class="no-print"><button class="btn-icon delete-row" style="color:var(--primary);"><i class="fa-solid fa-trash"></i></button></td>`;
                    tbody.appendChild(tr);
                });
            }

            if (data.cf) document.getElementById('inp-cf').value = data.cf;
            if (data.cv) document.getElementById('inp-porcentaje-cv').value = data.cv;
            
            if (data.pe) {
                if (data.pe.cf) document.getElementById('pe-cf').value = data.pe.cf;
                if (data.pe.cv) document.getElementById('pe-cv').value = data.pe.cv;
                if (data.pe.p) document.getElementById('pe-p').value = data.pe.p;
                if (data.pe.q1) document.getElementById('pe-q1').value = data.pe.q1;
                if (data.pe.q2) document.getElementById('pe-q2').value = data.pe.q2;
            }

            attachDeleteEvents();
        } catch (e) {
            console.error("Error loading state", e);
        }
    }

    function attachDeleteEvents() {
        document.querySelectorAll('.delete-row, .delete-row-imp, .delete-row-elas').forEach(btn => {
            btn.onclick = function() {
                const rowCount = this.closest('tbody').querySelectorAll('tr').length;
                if (rowCount > 2) {
                    this.closest('tr').remove();
                    saveAllData();
                } else {
                    alert("Se requieren al menos 2 filas de datos.");
                }
            };
        });
    }

    // Add row buttons
    const addRowBtn = document.getElementById('add-row');
    if (addRowBtn) {
        addRowBtn.onclick = () => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><input type="number" class="t-price" value="0" step="0.1"></td><td><input type="number" class="t-dem" value="0"></td><td><input type="number" class="t-sup" value="0"></td><td class="no-print"><button class="btn-icon delete-row" style="color:var(--primary);"><i class="fa-solid fa-trash"></i></button></td>`;
            document.getElementById('table-body').appendChild(tr);
            attachDeleteEvents();
            saveAllData();
        };
    }

    // Auto-save
    document.addEventListener('input', saveAllData);
    
    // Initial load
    loadAllData();
    attachDeleteEvents();
});
