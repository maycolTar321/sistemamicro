/**
 * SaiceControl Engine v8.2 - Final Paper Edition
 * Fixed Cache, Navigation & Math Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 SaiceControl v8.2 - Full Restoration");

    // --- NAVIGATION ---
    const navItems = document.querySelectorAll('.nav-item');
    const tabSections = document.querySelectorAll('.tab-section');

    function switchTab(targetId) {
        if (!targetId) return;
        tabSections.forEach(section => section.classList.remove('active'));
        navItems.forEach(nav => nav.classList.remove('active'));

        const targetSection = document.getElementById(targetId);
        const targetNav = document.querySelector(`.nav-item[data-target="${targetId}"]`);
        
        if (targetSection) {
            targetSection.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (targetNav) targetNav.classList.add('active');
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
        if (n < 2) return null;
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

    function renderTable(tableId, regData) {
        const table = document.getElementById(tableId);
        if(!table) return;
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
                <tr style="font-weight: bold; background: #f1f5f9;">
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
    let imperfectaChart = null;

    function drawUtilityChart(xOpt, utMax, m, c, cv, cf) {
        const canvas = document.getElementById('chart-utilidad-custom');
        if (!canvas) return;
        if (utilityChart) utilityChart.destroy();
        let itData = [];
        const maxX = xOpt * 2.2 || 1000;
        const step = maxX / 50;
        for(let x=0; x<=maxX; x+=step) itData.push({x: x, y: m*x*x + c*x});
        utilityChart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { datasets: [{ data: itData, borderColor: '#1e293b', borderWidth: 4, fill: false, pointRadius: 0, tension: 0.4 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    annotation: {
                        annotations: {
                            lineX: { type: 'line', xMin: xOpt, xMax: xOpt, yMin: 0, yMax: utMax, borderColor: 'rgba(220, 38, 38, 0.7)', borderWidth: 1.5 },
                            lineY: { type: 'line', yMin: utMax, yMax: utMax, xMin: 0, xMax: xOpt, borderColor: 'rgba(220, 38, 38, 0.7)', borderWidth: 1.5 },
                            lblX: { type: 'label', xValue: xOpt, yValue: 0, content: formatNumber(xOpt, 1), position: 'bottom', yAdjust: 20, font: { size: 14, weight: 'bold' } },
                            lblY: { type: 'label', xValue: 0, yValue: utMax, content: formatNumber(utMax, 0), position: 'left', xAdjust: -25, font: { size: 14, weight: 'bold' } }
                        }
                    }
                },
                scales: {
                    x: { type: 'linear', display: true, border: { color: '#000', width: 3 }, ticks: { display: false }, grid: { display: false } },
                    y: { type: 'linear', display: true, border: { color: '#000', width: 3 }, ticks: { display: false }, grid: { display: false } }
                }
            }
        });
    }

    function drawImperfectaChart(canvasId, m, c, cv, xMono, xComp) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        if (imperfectaChart) imperfectaChart.destroy();
        let demData = [{x: 0, y: c}, {x: xComp*1.4, y: m*(xComp*1.4) + c}];
        let imData = [{x: 0, y: c}, {x: xComp*1.4, y: 2*m*(xComp*1.4) + c}];
        let cmData = [{x: 0, y: cv}, {x: xComp*1.4, y: cv}];
        const socialCostLines = {};
        for(let i=0; i<=15; i++) {
            const x = xMono + (xComp - xMono) * (i / 15);
            socialCostLines[`line${i}`] = { type: 'line', xMin: x, xMax: x, yMin: cv, yMax: m*x + c, borderColor: 'rgba(0,0,0,0.1)', borderWidth: 1 };
        }
        imperfectaChart = new Chart(canvas.getContext('2d'), {
            type: 'scatter',
            data: {
                datasets: [
                    { label: 'P', data: demData, showLine: true, borderColor: '#1f4e79', borderWidth: 3, pointRadius: 0 },
                    { label: 'IM', data: imData, showLine: true, borderColor: '#70ad47', borderWidth: 3, pointRadius: 0 },
                    { label: 'CM', data: cmData, showLine: true, borderColor: '#c00000', borderWidth: 3, pointRadius: 0 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: true } },
                scales: { 
                    x: { type: 'linear', display: true, border: { color: '#000', width: 3 }, ticks: { display: false }, grid: { display: false } }, 
                    y: { type: 'linear', display: true, border: { color: '#000', width: 3 }, ticks: { display: false }, grid: { display: false } } 
                }
            }
        });
    }

    // --- BUTTON HANDLERS ---

    // 1. Competencia Perfecta
    if(document.getElementById('btn-resolver')) {
        document.getElementById('btn-resolver').onclick = () => {
            const P = Array.from(document.querySelectorAll('.t-price')).map(i => parseFloat(i.value) || 0);
            const D = Array.from(document.querySelectorAll('.t-dem')).map(i => parseFloat(i.value) || 0);
            const S = Array.from(document.querySelectorAll('.t-sup')).map(i => parseFloat(i.value) || 0);
            const cf = parseFloat(document.getElementById('inp-cf').value) || 0;
            const cvVal = parseFloat(document.getElementById('inp-porcentaje-cv').value) || 0;
            const cvType = document.getElementById('inp-cv-type').value;

            const regD = calculateRegression(P, D);
            const regS = calculateRegression(P, S);
            if(!regD || !regS) return;

            const Pe = (regS.a - regD.a) / (regD.b - regS.b);
            const Qe = regD.b * Pe + regD.a;
            const m = 1/regD.b; 
            const c = -regD.a/regD.b;
            const Cv = cvType === 'percent' ? P[0] * (cvVal/100) : cvVal;
            const xOpt = (Cv - c) / (2 * m);
            const itOpt = m*xOpt*xOpt + c*xOpt;
            const ut = itOpt - (Cv*xOpt + cf);

            document.getElementById('resolution-container').style.display = 'block';
            renderTable('table-demanda', regD);
            renderTable('table-oferta', regS);
            
            document.getElementById('math-demanda').innerHTML = `<p>\\( Q_d = ${formatNumber(regD.b)}P + ${formatNumber(regD.a)} \\)</p>`;
            document.getElementById('math-equilibrio').innerHTML = `<p>\\( P_e = ${formatNumber(Pe, 2)} \\) Bs. | \\( Q_e = ${formatNumber(Qe, 0)} \\) Unid.</p>`;
            document.getElementById('math-utilidad').innerHTML = `<p style="font-size:1.4rem; color:var(--accent); font-weight:bold;">\\( UT = ${formatNumber(ut, 2)} \\) Bs.</p>`;

            drawUtilityChart(xOpt, itOpt, m, c, Cv, cf);
            if(window.MathJax) MathJax.typesetPromise();
        };
    }

    // 2. Competencia Imperfecta
    if(document.getElementById('btn-resolver-imp')) {
        document.getElementById('btn-resolver-imp').onclick = () => {
            const P = Array.from(document.querySelectorAll('.t-price-imp')).map(i => parseFloat(i.value) || 0);
            const D = Array.from(document.querySelectorAll('.t-dem-imp')).map(i => parseFloat(i.value) || 0);
            const cvVal = parseFloat(document.getElementById('inp-cv-imp').value) || 0;
            const cvType = document.getElementById('inp-cv-imp-type').value;
            const cf = parseFloat(document.getElementById('inp-cf-imp').value) || 0;

            const regD = calculateRegression(P, D);
            if(!regD) return;

            const m = 1/regD.b; 
            const c = -regD.a/regD.b;
            const cv = cvType === 'percent' ? P[0] * (cvVal/100) : cvVal;
            const xMono = (cv - c) / (2 * m);
            const xComp = (cv - c) / m;
            const k = c - cv;
            const integral = (x) => (m/2)*x*x + k*x;
            const cs = Math.abs(integral(xComp) - integral(xMono));

            document.getElementById('resolution-container-imp').style.display = 'block';
            renderTable('table-demanda-imp', regD);
            document.getElementById('math-reg-imp').innerHTML = `<p>\\( P = ${formatNumber(m, 5)}x + ${formatNumber(c, 2)} \\)</p>`;
            document.getElementById('math-9-imp').innerHTML = `<p style="font-size:1.5rem; color:var(--secondary); font-weight:bold;">\\( CS = ${formatNumber(cs, 2)} \\) Bs.</p>`;

            drawImperfectaChart('chart-imperfecta-custom', m, c, cv, xMono, xComp);
            if(window.MathJax) MathJax.typesetPromise();
        };
    }

    // 3. Elasticidad
    if(document.getElementById('calc-elasticidad')) {
        document.getElementById('calc-elasticidad').onclick = () => {
            const P = Array.from(document.querySelectorAll('.t-elas-p')).map(i => parseFloat(i.value));
            const Q = Array.from(document.querySelectorAll('.t-elas-q')).map(i => parseFloat(i.value));
            if(P.length < 2) return;
            let html = '';
            for(let i=0; i<P.length-1; i++) {
                const e = Math.abs(((Q[i+1]-Q[i])/((Q[i]+Q[i+1])/2))/((P[i+1]-P[i])/((P[i]+P[i+1])/2)));
                html += `<p>Tramo ${i+1}-${i+2}: \\( \\epsilon = ${formatNumber(e, 2)} \\) (${e>1?'Elástica':e<1?'Inelástica':'Unitaria'})</p>`;
            }
            document.getElementById('math-elasticidad').innerHTML = html;
            document.getElementById('res-elasticidad').style.display = 'block';
            if(window.MathJax) MathJax.typesetPromise();
        };
    }

    // --- ROW MANAGEMENT ---
    function attachDeleteEvents() {
        document.querySelectorAll('.delete-row, .delete-row-imp, .delete-row-elas').forEach(btn => {
            btn.onclick = function() {
                const tbody = this.closest('tbody');
                if(tbody.querySelectorAll('tr').length > 1) {
                    this.closest('tr').remove();
                    saveAllData();
                }
            };
        });
    }

    const addActions = {
        'add-row': 'table-body',
        'add-row-imp': 'table-body-imp',
        'add-row-elas': 'table-body-elas'
    };

    Object.keys(addActions).forEach(id => {
        const btn = document.getElementById(id);
        if(btn) {
            btn.onclick = () => {
                const tbody = document.getElementById(addActions[id]);
                const tr = document.createElement('tr');
                if(id === 'add-row') {
                    tr.innerHTML = `<td><input type="number" class="t-price" value="0"></td><td><input type="number" class="t-dem" value="0"></td><td><input type="number" class="t-sup" value="0"></td><td class="no-print"><button class="btn-icon delete-row" style="color:red;"><i class="fa-solid fa-trash"></i></button></td>`;
                } else {
                    tr.innerHTML = `<td><input type="number" class="${id==='add-row-imp'?'t-price-imp':'t-elas-p'}" value="0"></td><td><input type="number" class="${id==='add-row-imp'?'t-dem-imp':'t-elas-q'}" value="0"></td><td class="no-print"><button class="btn-icon ${id==='add-row-imp'?'delete-row-imp':'delete-row-elas'}" style="color:red;"><i class="fa-solid fa-trash"></i></button></td>`;
                }
                tbody.appendChild(tr);
                attachDeleteEvents();
                saveAllData();
            };
        }
    });

    // --- PERSISTENCE ---
    function saveAllData() {
        const data = {
            perfecta: Array.from(document.querySelectorAll('#table-body tr')).map(tr => ({
                p: tr.querySelector('.t-price')?.value,
                d: tr.querySelector('.t-dem')?.value,
                s: tr.querySelector('.t-sup')?.value
            })),
            imperfecta: Array.from(document.querySelectorAll('#table-body-imp tr')).map(tr => ({
                p: tr.querySelector('.t-price-imp')?.value,
                d: tr.querySelector('.t-dem-imp')?.value
            })),
            elas: Array.from(document.querySelectorAll('#table-body-elas tr')).map(tr => ({
                p: tr.querySelector('.t-elas-p')?.value,
                q: tr.querySelector('.t-elas-q')?.value
            })),
            cf: document.getElementById('inp-cf')?.value,
            cv: document.getElementById('inp-porcentaje-cv')?.value
        };
        localStorage.setItem('saice_v8.2', JSON.stringify(data));
    }

    function loadAllData() {
        const saved = localStorage.getItem('saice_v8.2');
        if(!saved) return;
        try {
            const data = JSON.parse(saved);
            if(data.perfecta) {
                const tbody = document.getElementById('table-body');
                tbody.innerHTML = data.perfecta.map(row => row.p ? `<tr><td><input type="number" class="t-price" value="${row.p}"></td><td><input type="number" class="t-dem" value="${row.d}"></td><td><input type="number" class="t-sup" value="${row.s}"></td><td class="no-print"><button class="btn-icon delete-row" style="color:red;"><i class="fa-solid fa-trash"></i></button></td></tr>` : '').join('');
            }
            if(data.elas) {
                const tbody = document.getElementById('table-body-elas');
                tbody.innerHTML = data.elas.map(row => row.p ? `<tr><td><input type="number" class="t-elas-p" value="${row.p}"></td><td><input type="number" class="t-elas-q" value="${row.q}"></td><td class="no-print"><button class="btn-icon delete-row-elas" style="color:red;"><i class="fa-solid fa-trash"></i></button></td></tr>` : '').join('');
            }
            if(data.cf) document.getElementById('inp-cf').value = data.cf;
            if(data.cv) document.getElementById('inp-porcentaje-cv').value = data.cv;
            attachDeleteEvents();
        } catch(e) {}
    }

    document.addEventListener('input', saveAllData);
    loadAllData();
    attachDeleteEvents();
});
