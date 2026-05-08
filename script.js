document.addEventListener('DOMContentLoaded', () => {
    console.log("SaiceControl Engine v7.0 - Full Restoration with Paste & OCR");

    // --- NAVIGATION ---
    const navItems = document.querySelectorAll('.nav-item');
    const tabSections = document.querySelectorAll('.tab-section');

    function switchTab(targetId) {
        if (!targetId) return;
        tabSections.forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });
        navItems.forEach(nav => nav.classList.remove('active'));

        const targetSection = document.getElementById(targetId);
        const targetNav = document.querySelector(`.nav-item[data-target="${targetId}"]`);
        if (targetSection) {
            targetSection.classList.add('active');
            targetSection.style.display = 'block';
        }
        if (targetNav) targetNav.classList.add('active');
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(item.getAttribute('data-target'));
        });
    });

    // --- UTILS ---
    const formatNumber = (n, d=2) => isNaN(n) ? 0 : (Number.isInteger(n) ? n : parseFloat(n.toFixed(d)));
    
    function calculateRegression(X, Y) {
        let n = X.length, sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        let data = [];
        let meanX = X.reduce((a, b) => a + b, 0) / n;
        let meanY = Y.reduce((a, b) => a + b, 0) / n;
        
        for(let i=0; i<n; i++) {
            sumX += X[i]; sumY += Y[i];
            sumXY += X[i]*Y[i]; sumX2 += X[i]*X[i];
            let dx = X[i] - meanX, dy = Y[i] - meanY;
            data.push({ x: X[i], y: Y[i], dx, dy, dxdy: dx*dy, dx2: dx*dx });
        }
        let sumDXDY = 0, sumDX2 = 0;
        data.forEach(d => { sumDXDY += d.dxdy; sumDX2 += d.dx2; });
        let b = sumDXDY / sumDX2;
        let a = meanY - b * meanX;
        return { a, b, data, sumDXDY, sumDX2, meanX, meanY };
    }

    function renderTable(tableId, regData, labelY) {
        const tbody = document.querySelector(`#${tableId} tbody`);
        const tfoot = document.querySelector(`#${tableId} tfoot`);
        if(!tbody) return;
        
        // Match user's manual format: Precio (X), Demanda/Oferta (Y), DX, DY, DX*DY, DX^2
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
        
        if(tfoot) {
            const sumDXDY = regData.data.reduce((s, r) => s + r.dxdy, 0);
            const sumDX2 = regData.data.reduce((s, r) => s + r.dx2, 0);
            tfoot.innerHTML = `
                <tr style="font-weight: bold; background: #f1f5f9;">
                    <td colspan="2">PROMEDIOS: X=${formatNumber(regData.meanX)} Y=${formatNumber(regData.meanY)}</td>
                    <td colspan="2" style="text-align: right;">SUMATORIAS:</td>
                    <td>${formatNumber(sumDXDY)}</td>
                    <td>${formatNumber(sumDX2)}</td>
                </tr>
            `;
        }
    }

    // --- CHARTS (CHART.JS) ---
    let utilityChart = null;
    function drawUtilityChart(xOpt, utMax, m, c, cv, cf) {
        const canvas = document.getElementById('chart-utilidad-custom');
        if(!canvas) return;
        if(utilityChart) utilityChart.destroy();
        
        let itData = [];
        const maxX = xOpt * 2.2;
        const step = maxX / 50;
        for(let x=0; x<=maxX; x+=step) {
            itData.push({x: x, y: m*x*x + c*x});
        }
        
        utilityChart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                datasets: [{
                    data: itData,
                    borderColor: '#1e293b',
                    borderWidth: 5,
                    fill: false,
                    pointRadius: 0,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 20, right: 60, bottom: 40, left: 60 } },
                plugins: {
                    legend: { display: false },
                    annotation: {
                        annotations: {
                            lineX: { type: 'line', xMin: xOpt, xMax: xOpt, yMin: 0, yMax: utMax, borderColor: 'rgba(239, 68, 68, 0.7)', borderWidth: 1.5 },
                            lineY: { type: 'line', yMin: utMax, yMax: utMax, xMin: 0, xMax: xOpt, borderColor: 'rgba(239, 68, 68, 0.7)', borderWidth: 1.5 },
                            lblX: { type: 'label', xValue: xOpt, yValue: 0, content: formatNumber(xOpt, 3), position: 'bottom', yAdjust: 20, font: { size: 14, weight: 'bold' } },
                            lblY: { type: 'label', xValue: 0, yValue: utMax, content: formatNumber(utMax, 2), position: 'left', xAdjust: -25, font: { size: 14, weight: 'bold' } }
                        }
                    }
                },
                scales: {
                    x: { type: 'linear', display: true, grid: { display: false }, ticks: { display: false }, border: { color: '#000', width: 3 }, min: -xOpt * 0.1, max: xOpt * 2.1 },
                    y: { type: 'linear', display: true, grid: { display: false }, ticks: { display: false }, border: { color: '#000', width: 3 }, min: -utMax * 0.1, max: utMax * 1.2 }
                }
            }
        });
    }

    let imperfectaChart = null;
    function drawImperfectaChart(canvasId, m, c, cv, xMono, xComp) {
        const canvas = document.getElementById(canvasId);
        if(!canvas) return;
        if(imperfectaChart) imperfectaChart.destroy();
        
        let demData = [{x: 0, y: c}, {x: xComp*1.4, y: m*(xComp*1.4) + c}];
        let imData = [{x: 0, y: c}, {x: xComp*1.4, y: 2*m*(xComp*1.4) + c}];
        let cmData = [{x: 0, y: cv}, {x: xComp*1.4, y: cv}];

        const socialCostLines = {};
        const numLines = 15;
        for(let i=0; i<=numLines; i++) {
            const x = xMono + (xComp - xMono) * (i / numLines);
            socialCostLines[`line${i}`] = {
                type: 'line', xMin: x, xMax: x, yMin: cv, yMax: m*x + c, borderColor: '#000', borderWidth: 1.5
            };
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
                layout: { padding: { top: 20, right: 60, bottom: 40, left: 60 } },
                plugins: {
                    legend: { display: false },
                    annotation: {
                        annotations: {
                            ...socialCostLines,
                            lblP: { type: 'label', xValue: 0, yValue: c, content: formatNumber(c, 3), position: 'left', xAdjust: -25, font: { size: 14, weight: 'bold' } },
                            lblCM: { type: 'label', xValue: 0, yValue: cv, content: formatNumber(cv, 1), position: 'left', xAdjust: -25, font: { size: 14, weight: 'bold' } },
                            lblX1: { type: 'label', xValue: xMono, yValue: 0, content: formatNumber(xMono, 2), position: 'bottom', yAdjust: 20, font: { size: 14, weight: 'bold' } },
                            lblX2: { type: 'label', xValue: xComp, yValue: 0, content: formatNumber(xComp, 2), position: 'bottom', yAdjust: 20, font: { size: 14, weight: 'bold' } },
                            lineX1: { type: 'line', xMin: xMono, xMax: xMono, yMin: 0, yMax: cv, borderColor: '#1e293b', borderWidth: 1.5 },
                            lineX2: { type: 'line', xMin: xComp, xMax: xComp, yMin: 0, yMax: cv, borderColor: '#1e293b', borderWidth: 1.5 }
                        }
                    }
                },
                scales: { 
                    x: { type: 'linear', display: true, grid: { display: false }, ticks: { display: false }, border: { color: '#000', width: 3 }, min: -xComp * 0.1, max: xComp * 1.5 }, 
                    y: { type: 'linear', display: true, grid: { display: false }, ticks: { display: false }, border: { color: '#000', width: 3 }, min: -c * 0.1, max: c * 1.2 } 
                }
            }
        });
    }

    // --- MODULE 1: PERFECT COMPETITION ---
    const btnResolver = document.getElementById('btn-resolver');
    if(btnResolver) {
        btnResolver.onclick = () => {
            const P = Array.from(document.querySelectorAll('.t-price')).map(i => parseFloat(i.value));
            const D = Array.from(document.querySelectorAll('.t-dem')).map(i => parseFloat(i.value));
            const S = Array.from(document.querySelectorAll('.t-sup')).map(i => parseFloat(i.value));
            const cf = parseFloat(document.getElementById('inp-cf').value);
            const cvVal = parseFloat(document.getElementById('inp-porcentaje-cv').value);
            const cvType = document.getElementById('inp-cv-type').value;

            const regD = calculateRegression(P, D);
            const regS = calculateRegression(P, S);
            const Pe = (regS.a - regD.a) / (regD.b - regS.b);
            const Qe = regD.b * Pe + regD.a;
            const m = 1/regD.b; 
            const c = -regD.a/regD.b;
            const Cv = cvType === 'percent' ? P[0] * (cvVal/100) : cvVal;
            const xOpt = (Cv - c) / (2 * m);
            const itOpt = m*xOpt*xOpt + c*xOpt;
            const ctOpt = Cv*xOpt + cf;
            const ut = itOpt - ctOpt;

            document.getElementById('resolution-container').style.display = 'block';
            renderTable('table-demanda', regD);
            document.getElementById('math-demanda').innerHTML = `
                <p>\\( b = \\frac{\\sum DXDY}{\\sum DX^2} = \\frac{${formatNumber(regD.sumDXDY)}}{${formatNumber(regD.sumDX2)}} = ${formatNumber(regD.b)} \\)</p>
                <p>\\( a = \\bar{Y} - b\\bar{X} = ${formatNumber(regD.meanY)} - (${formatNumber(regD.b)})(${formatNumber(regD.meanX)}) = ${formatNumber(regD.a)} \\)</p>
                <p style="font-size:1.4em; color:var(--secondary);">\\( Q_d = ${formatNumber(regD.b)}P + ${formatNumber(regD.a)} \\)</p>
            `;
            renderTable('table-oferta', regS);
            document.getElementById('math-oferta').innerHTML = `
                <p>\\( b = \\frac{\\sum DXDY}{\\sum DX^2} = \\frac{${formatNumber(regS.sumDXDY)}}{${formatNumber(regS.sumDX2)}} = ${formatNumber(regS.b)} \\)</p>
                <p>\\( a = \\bar{Y} - b\\bar{X} = ${formatNumber(regS.meanY)} - (${formatNumber(regS.b)})(${formatNumber(regS.meanX)}) = ${formatNumber(regS.a)} \\)</p>
                <p style="font-size:1.4em; color:var(--secondary);">\\( Q_s = ${formatNumber(regS.b)}P + ${formatNumber(regS.a)} \\)</p>
            `;
            document.getElementById('math-equilibrio').innerHTML = `
                <p>\\( Q_d = Q_s \\)</p>
                <p>\\( ${formatNumber(regD.b)}P + ${formatNumber(regD.a)} = ${formatNumber(regS.b)}P + ${formatNumber(regS.a)} \\)</p>
                <p>\\( (${formatNumber(regD.b)} - ${formatNumber(regS.b)})P = ${formatNumber(regS.a)} - ${formatNumber(regD.a)} \\)</p>
                <p style="font-size:1.4em; color:var(--accent);">\\( P_e = ${formatNumber(Pe, 2)} \\) Bs. / \\( Q_e = ${formatNumber(Qe, 0)} \\) Unid.</p>
            `;

            // Step 4: Función Demanda
            document.getElementById('math-funcion-demanda').innerHTML = `
                <p>9.2.2. ECUACIÓN Y FUNCIÓN DEMANDA</p>
                <p>\\( Qd = ${formatNumber(regD.b)}P + ${formatNumber(regD.a)} \\)</p>
                <p>\\( P = -\\frac{1}{${-formatNumber(regD.b)}}x + \\frac{${formatNumber(regD.a)}}{${-formatNumber(regD.b)}} \\)</p>
                <p style="font-size:1.4em; color:var(--secondary);">\\( P = -\\frac{1}{${-formatNumber(regD.b)}}x + ${formatNumber(c, 3)} \\)</p>
            `;

            // Step 5: Función Ingresos
            const vX = -c / (2*m);
            const vY = m*vX*vX + c*vX;
            document.getElementById('math-ingresos').innerHTML = `
                <p>9.2.3. FUNCIÓN INGRESOS</p>
                <p>\\( IT = P \\cdot x \\)</p>
                <p>\\( IT = (-\\frac{1}{${-formatNumber(regD.b)}}x + ${formatNumber(c, 3)}) \\cdot x \\)</p>
                <p style="font-size:1.4em; color:var(--secondary);">\\( IT = -\\frac{1}{${-formatNumber(regD.b)}}x^2 + ${formatNumber(c, 3)}x \\)</p>
                <br>
                <p>Determinamos el vértice de la función ingresos y graficamos:</p>
                <p>\\( x = -\\frac{${formatNumber(c, 3)}}{2 \\cdot (-\\frac{1}{${-formatNumber(regD.b)}})} = ${formatNumber(vX, 2)} \\)</p>
                <p style="font-size:1.4em; color:var(--accent);">\\( IT = ${formatNumber(vY, 2)} \\)</p>
            `;

            // Step 6: Función Costos
            document.getElementById('math-costos').innerHTML = `
                <p>9.2.4. FUNCIÓN COSTOS</p>
                <p style="font-size:1.4em; color:var(--primary);">\\( CT = ${formatNumber(Cv)}x + ${cf} \\)</p>
            `;

            // Step 7: Función Ingreso Marginal
            document.getElementById('math-im').innerHTML = `
                <p>9.2.5. FUNCIÓN INGRESO MARGINAL IM</p>
                <p style="font-size:1.4em; color:var(--secondary);">\\( IM = -\\frac{2}{${-formatNumber(regD.b)}}x + ${formatNumber(c, 3)} \\)</p>
            `;

            // Step 8: Función Costo Marginal
            document.getElementById('math-cm').innerHTML = `
                <p>9.2.6. FUNCIÓN COSTO MARGINAL CM</p>
                <p style="font-size:1.4em; color:var(--primary);">\\( CM = ${formatNumber(Cv)} \\)</p>
            `;

            // Step 9: IM = CM
            document.getElementById('math-im-cm').innerHTML = `
                <p>9.2.7. APLICAR LA FÓRMULA IM=CM</p>
                <p>\\( -\\frac{2}{${-formatNumber(regD.b)}}x + ${formatNumber(c, 3)} = ${formatNumber(Cv)} \\)</p>
                <p>\\( x = \\frac{(${formatNumber(Cv)} - ${formatNumber(c, 3)}) \\cdot ${-formatNumber(regD.b)}}{-2} \\)</p>
                <p style="font-size:1.4em; color:var(--accent);">\\( x = ${formatNumber(xOpt, 2)} \\)</p>
            `;

            // Step 10: Utilidad
            document.getElementById('math-utilidad').innerHTML = `
                <p>CANTIDAD Y UTILIDAD ÓPTIMA</p>
                <p>\\( UT = IT - CT \\)</p>
                <p style="font-size:1.6em; font-weight:bold; color:#059669;">\\( UT = ${formatNumber(ut, 2)} \\)</p>
            `;

            // Step 11: Gráfico e Interpretación
            drawUtilityChart(vX, vY, -1/(-regD.b), c, Cv, cf);
            document.getElementById('box-interpretacion').innerHTML = `
                <p><b>Interpretación:</b> La utilidad óptima se alcanza en <b>${formatNumber(xOpt, 2)} unidades</b> con un beneficio de <b>${formatNumber(ut, 2)} bs.</b></p>
            `;
            
            if(window.MathJax) MathJax.typesetPromise();
        };
    }

    // --- MODULE 2: IMPERFECT COMPETITION ---
    const btnResolverImp = document.getElementById('btn-resolver-imp');
    if(btnResolverImp) {
        btnResolverImp.onclick = () => {
            const P = Array.from(document.querySelectorAll('.t-price-imp')).map(i => parseFloat(i.value));
            const D = Array.from(document.querySelectorAll('.t-dem-imp')).map(i => parseFloat(i.value));
            const cvVal = parseFloat(document.getElementById('inp-cv-imp').value);
            const cvType = document.getElementById('inp-cv-imp-type').value;
            const cf = parseFloat(document.getElementById('inp-cf-imp').value);
            
            // 9.2.1. Regression
            const regD = calculateRegression(P, D);
            
            // 9.2.2. Ecuación y Función Demanda
            const m = 1/regD.b; 
            const c = -regD.a/regD.b;
            
            // 9.2.4. Función Costos
            const cv = cvType === 'percent' ? P[0] * (cvVal/100) : cvVal;
            
            // 9.2.7. IM = CM
            const xMono = (cv - c) / (2 * m);
            const pMono = m * xMono + c;

            // 9.2.8. P = CM (Competencia)
            const xComp = (cv - c) / m;
            
            // 9.2.9 & 9.2.10. Integrales y Costo Social
            // CS = Integral( (mx + c - cv) dx ) = (m/2)x^2 + (c - cv)x
            const k = c - cv;
            const integral = (x) => (m/2)*x*x + k*x;
            const cs = Math.abs(integral(xComp) - integral(xMono));

            document.getElementById('resolution-container-imp').style.display = 'block';
            
            // Step 1: Tabla Regresión
            renderTable('table-demanda-imp', regD);
            document.getElementById('math-reg-imp').innerHTML = `
                <p>\\( b = \\frac{\\sum DXDY}{\\sum DX^2} = \\frac{${formatNumber(regD.sumDXDY)}}{${formatNumber(regD.sumDX2)}} = ${formatNumber(regD.b)} \\)</p>
                <p>\\( a = \\bar{Y} - b\\bar{X} = ${formatNumber(regD.meanY)} - (${formatNumber(regD.b)})(${formatNumber(regD.meanX)}) = ${formatNumber(regD.a, 1)} \\)</p>
            `;

            // Step 2: Ecuación y Función
            document.getElementById('math-1-imp').innerHTML = `
                <p>En base a la ecuación demanda se determina la función demanda.</p>
                <p><b>Ecuación demanda:</b> \\( Qd = ${formatNumber(regD.b)}P + ${formatNumber(regD.a)} \\)</p>
                <p>De la ecuación se debe despejar la variable "precio":</p>
                <p>\\( x = ${formatNumber(regD.b)}P + ${formatNumber(regD.a)} \\)</p>
                <p>\\( ${-formatNumber(regD.b)}P = -x + ${formatNumber(regD.a)} \\)</p>
                <p>\\( P = \\frac{-x + ${formatNumber(regD.a)}}{${-formatNumber(regD.b)}} \\)</p>
                <p>\\( P = -\\frac{1}{${-formatNumber(regD.b)}}x + \\frac{${formatNumber(regD.a)}}{${-formatNumber(regD.b)}} \\)</p>
                <p style="font-size:1.4em; color:var(--secondary);">\\( P = -\\frac{1}{${-formatNumber(regD.b)}}x + ${formatNumber(c, 3)} \\)</p>
            `;
            
            // Step 3: Ingresos
            const vX = -c / (2*m);
            const vY = m*vX*vX + c*xMono; // Wait, vertex of IT
            const itVertexY = m*vX*vX + c*vX;

            document.getElementById('math-2-imp').innerHTML = `
                <p>Ingresos Total = Precio * Cantidad</p>
                <p>\\( IT = P \\cdot x \\)</p>
                <p>\\( IT = (-\\frac{1}{${-formatNumber(regD.b)}}x + ${formatNumber(c, 3)}) \\cdot x \\)</p>
                <p style="font-size:1.4em; color:var(--secondary);">\\( IT = -\\frac{1}{${-formatNumber(regD.b)}}x^2 + ${formatNumber(c, 3)}x \\)</p>
                <br>
                <p><b>Determinamos el vértice de la función ingresos y graficamos:</b></p>
                <p>\\( x = -\\frac{b}{2a} = -\\frac{${formatNumber(c, 3)}}{2 \\cdot (-\\frac{1}{${-formatNumber(regD.b)}})} = ${formatNumber(vX, 2)} \\)</p>
                <p>\\( IT = ${formatNumber(itVertexY, 2)} \\)</p>
            `;

            // Step 4: Costos
            document.getElementById('math-3-imp').innerHTML = `
                <p>Costos totales = Costo variable + Costo fijo</p>
                <p>\\( CT = Cv \\cdot x + CF \\)</p>
                <p style="font-size:1.4em; color:var(--primary);">\\( CT = ${formatNumber(cv)}x + ${cf} \\)</p>
            `;

            // Step 5: IM
            document.getElementById('math-4-imp').innerHTML = `
                <p>El ingreso marginal es la primera derivada de los ingresos totales.</p>
                <p>\\( IT = -\\frac{1}{${-formatNumber(regD.b)}}x^2 + ${formatNumber(c, 3)}x \\)</p>
                <p>\\( IM = \\frac{dIT}{dx} \\)</p>
                <p style="font-size:1.4em; color:var(--secondary);">\\( IM = -\\frac{2}{${-formatNumber(regD.b)}}x + ${formatNumber(c, 3)} \\)</p>
            `;

            // Step 6: CM
            document.getElementById('math-5-imp').innerHTML = `
                <p>El costo marginal es igual a la primera derivada de los costos totales.</p>
                <p>\\( CT = ${formatNumber(cv)}x + ${cf} \\)</p>
                <p style="font-size:1.4em; color:var(--primary);">\\( CM = ${formatNumber(cv)} \\)</p>
            `;

            // Step 7: IM = CM
            document.getElementById('math-6-imp').innerHTML = `
                <p>\\( IM = CM \\)</p>
                <p>\\( -\\frac{2}{${-formatNumber(regD.b)}}x + ${formatNumber(c, 3)} = ${formatNumber(cv)} \\)</p>
                <p style="font-size:1.4em; color:var(--accent);">\\( x_{mono} = ${formatNumber(xMono, 2)} \\) unid.</p>
            `;

            // Step 8: P = CM
            document.getElementById('math-7-imp').innerHTML = `
                <p>\\( P = CM \\)</p>
                <p>\\( -\\frac{1}{${-formatNumber(regD.b)}}x + ${formatNumber(c, 3)} = ${formatNumber(cv)} \\)</p>
                <p style="font-size:1.4em; color:var(--accent);">\\( x_{comp} = ${formatNumber(xComp, 2)} \\) unid.</p>
            `;

            // Step 9: Integral Indefinida
            document.getElementById('math-8-imp').innerHTML = `
                <p>\\( CS = \\int (P - CM) \\, dx = \\int (-\\frac{1}{${-formatNumber(regD.b)}}x + ${formatNumber(c, 3)} - ${formatNumber(cv)}) \\, dx \\)</p>
                <p>\\( CS = \\int (-\\frac{1}{${-formatNumber(regD.b)}}x + ${formatNumber(k, 3)}) \\, dx \\)</p>
                <p style="font-size:1.4em; color:var(--secondary);">\\( CS = -\\frac{1}{${-formatNumber(regD.b)}} \\cdot \\frac{x^2}{2} + ${formatNumber(k, 3)}x \\)</p>
            `;

            // Step 10: Integral Definida
            document.getElementById('math-9-imp').innerHTML = `
                <p>\\( CS = \\int_{${formatNumber(xMono, 2)}}^{${formatNumber(xComp, 2)}} (P - CM) \\, dx \\)</p>
                <p>\\( CS = [-\\frac{1}{${-formatNumber(regD.b)}} \\cdot \\frac{x^2}{2} + ${formatNumber(k, 3)}x]_{${formatNumber(xMono, 2)}}^{${formatNumber(xComp, 2)}} \\)</p>
                <p>\\( CS = (${formatNumber(integral(xComp), 2)}) - (${formatNumber(integral(xMono), 2)}) \\)</p>
                <p style="font-size:1.6em; font-weight:bold; color:var(--primary);">\\( CS = ${formatNumber(cs, 3)} \\) bs.</p>
            `;
            
            if(document.getElementById('eq-p-imp')) {
                document.getElementById('eq-p-imp').innerHTML = `\\( P = -\\frac{1}{${-formatNumber(regD.b)}}x + ${formatNumber(c, 3)} \\)`;
                document.getElementById('eq-cm-imp').innerHTML = `\\( CM = ${formatNumber(cv)} \\)`;
                document.getElementById('eq-im-imp').innerHTML = `\\( IM = -\\frac{2}{${-formatNumber(regD.b)}}x + ${formatNumber(c, 3)} \\)`;
            }
            
            drawImperfectaChart('chart-imperfecta-custom', m, c, cv, xMono, xComp);
            if(window.MathJax) MathJax.typesetPromise();
        };
    }
    
    // (Redundant Elasticity module removed, handled by correct implementation below)

    // (Redundant Equilibrium module removed, handled by correct implementation below)

    // --- MODULE 5: INDIFFERENCIA ---
    const btnCalcInd = document.getElementById('calc-indiferencia');
    if(btnCalcInd) {
        btnCalcInd.onclick = () => {
            const cfa = parseFloat(document.getElementById('ind-cfa').value);
            const cfb = parseFloat(document.getElementById('ind-cfb').value);
            const cva = parseFloat(document.getElementById('ind-cva').value);
            const cvb = parseFloat(document.getElementById('ind-cvb').value);
            
            // Formula: CFa + CVa*x = CFb + CVb*x => x(CVa - CVb) = CFb - CFa => x = (CFb - CFa)/(CVa - CVb)
            const xInd = (cfb - cfa) / (cva - cvb);
            const cost = cfa + cva * xInd;
            
            document.getElementById('res-indiferencia').innerHTML = `
                <div class="math-formulas">
                    <p><b>Igualando los costos de ambas alternativas:</b></p>
                    <p>\\( CT_A = CT_B \\)</p>
                    <p>\\( ${cfa} + ${cva}x = ${cfb} + ${cvb}x \\)</p>
                    <p>\\( ${cva}x - ${cvb}x = ${cfb} - ${cfa} \\)</p>
                    <p>\\( (${cva} - ${cvb})x = ${cfb - cfa} \\)</p>
                    <p style="text-align:center; font-size:1.4em; color:var(--accent);">\\( x = \\frac{${cfb - cfa}}{${formatNumber(cva - cvb, 2)}} = ${formatNumber(xInd, 1)} \\) unidades</p>
                    
                    <div class="interpretation-box">
                        <p><b>Interpretación:</b> A un nivel de producción de <b>${formatNumber(xInd, 1)} unidades</b>, es indiferente utilizar cualquiera de las dos alternativas, ya que el costo total en ambas es de <b>${formatNumber(cost, 2)} bs.</b></p>
                    </div>
                </div>
            `;
            document.getElementById('res-indiferencia').style.display = 'block';
            if(window.MathJax) MathJax.typesetPromise();
        };
    }

    // --- MODULE 6: CAPACITY ---
    const btnCalcCap = document.getElementById('calc-capacidad');
    if(btnCalcCap) {
        btnCalcCap.onclick = () => {
            // Datos Iniciales (75%)
            const x75 = 9150;
            const p75 = 110;
            const cv75 = 60;
            const cf75 = 40000;

            // Cálculos 75%
            const it75 = p75 * x75;
            const ct75 = (cv75 * x75) + cf75;
            const ut75 = it75 - ct75;

            // Datos 80%
            const x80 = (80 * x75) / 75;
            const pExtra = p75 * 0.89; // 97.9
            const cv80 = cv75 * 1.04; // 62.4
            
            const it80 = pExtra * (x80 - x75) + it75;
            const ct80 = cv80 * (x80 - x75) + 0 + ct75;
            const ut80 = it80 - ct80;

            // Datos 100%
            const x100 = (100 * x80) / 80;
            const cv100 = cv80 * 1.06; // 66.144
            const cfExtra = cf75 * 0.25; // 10000

            const it100 = pExtra * (x100 - x80) + it80;
            const ct100 = cv100 * (x100 - x80) + cfExtra + ct80;
            const ut100 = it100 - ct100;

            document.getElementById('math-capacidad-res').innerHTML = `
                <div class="math-formulas">
                    <div style="display: flex; justify-content: space-between; border: 1px solid #000; padding: 10px; margin-bottom: 20px; text-align: center; font-weight: bold;">
                        <div style="flex:1;">\\( UT_{75\\%} = ? \\)</div>
                        <div style="flex:1; border-left: 1px solid #000; border-right: 1px solid #000;">\\( UT_{80\\%} = ? \\)</div>
                        <div style="flex:1;">\\( UT_{100\\%} = ? \\)</div>
                    </div>

                    <div style="text-align: center; margin-bottom: 20px;">
                        <p>\\( UT = IT - CT \\)</p>
                        <p>\\( UT = (P \\cdot x) - (Cv \\cdot x + CF) \\)</p>
                    </div>

                    <div style="border: 1px solid #000; padding: 15px; margin-bottom: 20px;">
                        <h4 style="margin-top:0;">DATOS:</h4>
                        
                        <div style="text-align: center; margin-bottom: 15px;">
                            <p><b>Cantidad</b></p>
                            <p>\\( x_{75\\%} = 9150 \\)</p>
                            <p>\\( x_{80\\%} = 9760 \\)</p>
                            <p>\\( x_{100\\%} = 12200 \\)</p>
                            
                            <table style="margin: 10px auto; border-collapse: collapse; border: 1px solid #000;">
                                <tr><td style="border: 1px solid #000; padding: 5px;">75%</td><td style="border: 1px solid #000; padding: 5px; width: 100px;">9150</td></tr>
                                <tr><td style="border: 1px solid #000; padding: 5px;">80%</td><td style="border: 1px solid #000; padding: 5px;">x</td></tr>
                            </table>
                            <p>\\( x = \\frac{80\\% \\cdot 9150}{75\\%} = 9760 \\)</p>

                            <table style="margin: 10px auto; border-collapse: collapse; border: 1px solid #000;">
                                <tr><td style="border: 1px solid #000; padding: 5px;">80%</td><td style="border: 1px solid #000; padding: 5px; width: 100px;">9760</td></tr>
                                <tr><td style="border: 1px solid #000; padding: 5px;">100%</td><td style="border: 1px solid #000; padding: 5px;">x</td></tr>
                            </table>
                            <p>\\( x = \\frac{100\\% \\cdot 9760}{80\\%} = 12200 \\)</p>
                        </div>

                        <div style="text-align: center; margin-bottom: 15px; border-top: 1px solid #000; padding-top: 10px;">
                            <p><b>Precio</b></p>
                            <p>\\( P_{75\\%} = 110 \\)</p>
                            <p>\\( P_{80\\%} = 97.9 \\)</p>
                            <p>\\( P_{100\\%} = 97.9 \\)</p>
                        </div>

                        <div style="text-align: center; margin-bottom: 15px; border-top: 1px solid #000; padding-top: 10px;">
                            <p><b>Costo Variable</b></p>
                            <p>\\( Cv_{75\\%} = 60 \\)</p>
                            <p>\\( Cv_{80\\%} = 62.4 \\) (60 * 1.04)</p>
                            <p>\\( Cv_{100\\%} = 66.144 \\) (62.4 * 1.06)</p>
                        </div>

                        <div style="text-align: center; border-top: 1px solid #000; padding-top: 10px;">
                            <p><b>Costo Fijo</b></p>
                            <p>\\( CF_{75\\%} = 40000 \\)</p>
                            <p>\\( CF_{80\\%} = 0 \\)</p>
                            <p>\\( CF_{100\\%} = 10000 \\)</p>
                        </div>
                    </div>

                    <div style="display: flex; justify-content: space-between; border: 1px solid #000; padding: 10px; margin-bottom: 20px; text-align: center; font-weight: bold;">
                        <div style="flex:1;">\\( UT = IT - CT \\)</div>
                        <div style="flex:1; border-left: 1px solid #000; border-right: 1px solid #000;">\\( IT = P \\cdot x \\)</div>
                        <div style="flex:1;">\\( CT = Cv \\cdot x + CF \\)</div>
                    </div>

                    <div class="resolution-step">
                        <h4>UTILIDAD AL 75%</h4>
                        <p>\\( IT_{75\\%} = P_{75\\%} \\cdot x_{75\\%} \\)</p>
                        <p>\\( IT_{75\\%} = 110 \\cdot 9150 \\)</p>
                        <p>\\( IT_{75\\%} = 1006500 \\)</p>
                        <p>\\( CT_{75\\%} = Cv_{75\\%} \\cdot x_{75\\%} + CF_{75\\%} \\)</p>
                        <p>\\( CT_{75\\%} = 60 \\cdot 9150 + 40000 \\)</p>
                        <p>\\( CT_{75\\%} = 589000 \\)</p>
                        <p>\\( UT_{75\\%} = 1006500 - 589000 \\)</p>
                        <p style="font-weight: bold;">\\( UT_{75\\%} = 417500 \\)</p>
                    </div>

                    <div class="resolution-step mt-4">
                        <h4>UTILIDAD AL 80%</h4>
                        <p>\\( IT_{80\\%} = P_{80\\%} \\cdot (x_{80\\%} - x_{75\\%}) + IT_{75\\%} \\)</p>
                        <p>\\( IT_{80\\%} = 97.9 \\cdot (9760 - 9150) + 1006500 \\)</p>
                        <p>\\( IT_{80\\%} = 59719 + 1006500 \\)</p>
                        <p>\\( IT_{80\\%} = 1066219 \\)</p>
                        <p>\\( CT_{80\\%} = Cv_{80\\%} \\cdot (x_{80\\%} - x_{75\\%}) + CF_{80\\%} + CT_{75\\%} \\)</p>
                        <p>\\( CT_{80\\%} = 62.4 \\cdot (9760 - 9150) + 0 + 589000 \\)</p>
                        <p>\\( CT_{80\\%} = 38064 + 589000 \\)</p>
                        <p>\\( CT_{80\\%} = 627064 \\)</p>
                        <p>\\( UT_{80\\%} = 1066219 - 627064 \\)</p>
                        <p style="font-weight: bold;">\\( UT_{80\\%} = 439155 \\)</p>
                    </div>

                    <div class="resolution-step mt-4">
                        <h4>UTILIDAD AL 100%</h4>
                        <p>\\( IT_{100\\%} = P_{100\\%} \\cdot (x_{100\\%} - x_{80\\%}) + IT_{80\\%} \\)</p>
                        <p>\\( IT_{100\\%} = 97.9 \\cdot (12200 - 9760) + 1066219 \\)</p>
                        <p>\\( IT_{100\\%} = 238876 + 1066219 \\)</p>
                        <p>\\( IT_{100\\%} = 1305095 \\)</p>
                        <p>\\( CT_{100\\%} = Cv_{100\\%} \\cdot (x_{100\\%} - x_{80\\%}) + CF_{100\\%} + CT_{80\\%} \\)</p>
                        <p>\\( CT_{100\\%} = 66.144 \\cdot (12200 - 9760) + 10000 + 627064 \\)</p>
                        <p>\\( CT_{100\\%} = 171391.36 + 627064 \\)</p>
                        <p>\\( CT_{100\\%} = 798455.36 \\)</p>
                        <p>\\( UT_{100\\%} = 1305095 - 798455.36 \\)</p>
                        <p style="font-weight: bold;">\\( UT_{100\\%} = 506639.64 \\)</p>
                    </div>

                    <table style="width: 100%; margin-top: 30px; border-collapse: collapse; border: 1px solid #000; text-align: center;">
                        <tr style="font-weight: bold;">
                            <td style="border: 1px solid #000; padding: 10px; width: 33%;">\\( UT_{75\\%} = 417500 \\)</td>
                            <td style="border: 1px solid #000; padding: 10px; width: 33%;">\\( UT_{80\\%} = 439155 \\)</td>
                            <td style="border: 1px solid #000; padding: 10px; width: 33%; background-color: #fca5a5;">\\( UT_{100\\%} = 506639.64 \\)</td>
                        </tr>
                    </div>
                </div>
            `;
            document.getElementById('res-capacidad').style.display = 'block';
            if(window.MathJax) MathJax.typesetPromise();
        };
    }

    // --- SMART SYNC ---
    function advancedSync(type) {
        const text = document.getElementById(type === 'cap' ? 'enunciado-capacidad' : 'enunciado-equilibrio').innerText.toLowerCase();
        const cfMatch = text.match(/(?:cf|fijo|costos fijos son de)\s*(?:bs\.?|)\s*(\d+(?:\.\d+)?)/);
        const cents = [...text.matchAll(/(\d+)\s*centavos/g)];
        
        if(type === 'eq') {
            if(cfMatch) document.getElementById('pe-cf').value = cfMatch[1];
            if(cents.length >= 2) {
                document.getElementById('pe-cv').value = (cents[0][1]/100).toFixed(2);
                document.getElementById('pe-p').value = (cents[1][1]/100).toFixed(2);
            }
            const qMatches = [...text.matchAll(/(?:para|y)\s*(\d+)/g)];
            if(qMatches.length >= 1) document.getElementById('pe-q1').value = qMatches[0][1];
            if(qMatches.length >= 2) document.getElementById('pe-q2').value = qMatches[1][1];
            if(qMatches.length === 0) {
                const numbers = text.match(/\d+/g);
                if(numbers && numbers.length >= 2) {
                     document.getElementById('pe-q1').value = numbers[numbers.length-2];
                     document.getElementById('pe-q2').value = numbers[numbers.length-1];
                }
            }
        } else {
            if(cfMatch) document.getElementById('cap-base-cf').value = cfMatch[1];
            if(cents.length >= 2) {
                document.getElementById('cap-base-cv').value = (cents[0][1]/100).toFixed(2);
                document.getElementById('cap-base-p').value = (cents[1][1]/100).toFixed(2);
            }
        }
    }
    if(document.getElementById('btn-sync-capacidad')) document.getElementById('btn-sync-capacidad').onclick = () => advancedSync('cap');
    if(document.getElementById('btn-sync-equilibrio')) document.getElementById('btn-sync-equilibrio').onclick = () => advancedSync('eq');

    // --- COPY FROM PERFECTA ---
    if(document.getElementById('copy-to-imp')) {
        document.getElementById('copy-to-imp').onclick = () => {
            const pPrices = Array.from(document.querySelectorAll('.t-price')).map(i => i.value);
            const pDemands = Array.from(document.querySelectorAll('.t-dem')).map(i => i.value);
            const tbody = document.getElementById('table-body-imp');
            if(tbody) {
                tbody.innerHTML = '';
                for(let i=0; i<pPrices.length; i++) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td><input type="number" class="t-price-imp" value="${pPrices[i]}" step="0.1"></td><td><input type="number" class="t-dem-imp" value="${pDemands[i]}"></td><td class="no-print"><button class="btn-icon delete-row-imp" style="color:red;"><i class="fa-solid fa-trash"></i></button></td>`;
                    tbody.appendChild(tr);
                }
                attachDeleteEvents();
            }
            if(document.getElementById('inp-cv-imp-type')) document.getElementById('inp-cv-imp-type').value = document.getElementById('inp-cv-type').value;
            if(document.getElementById('inp-cv-imp')) document.getElementById('inp-cv-imp').value = document.getElementById('inp-porcentaje-cv').value;
            if(document.getElementById('inp-cf-imp')) document.getElementById('inp-cf-imp').value = document.getElementById('inp-cf').value;
        };
    }

    // (Redundant copy-to-elas removed)

    if(document.getElementById('copy-to-eq')) {
        document.getElementById('copy-to-eq').onclick = () => {
            const pPrices = Array.from(document.querySelectorAll('.t-price')).map(i => i.value);
            const pDemands = Array.from(document.querySelectorAll('.t-dem')).map(i => i.value);
            const cvVal = parseFloat(document.getElementById('inp-porcentaje-cv').value);
            const cvType = document.getElementById('inp-cv-type').value;
            let cv = cvType === 'percent' && pPrices.length > 0 ? parseFloat(pPrices[0]) * (cvVal / 100) : cvVal;
            
            document.getElementById('pe-cf').value = document.getElementById('inp-cf').value;
            document.getElementById('pe-cv').value = cv;
            if(pPrices.length >= 2) {
                document.getElementById('pe-p').value = pPrices[0];
                document.getElementById('pe-q1').value = pDemands[0];
                document.getElementById('pe-q2').value = pDemands[1];
            }
        };
    }

    // --- TABLE MANAGEMENT (ADD/DELETE ROWS) ---
    function attachDeleteEvents() {
        document.querySelectorAll('.delete-row').forEach(btn => {
            btn.onclick = function() {
                if(document.querySelectorAll('#table-body tr').length > 2) this.closest('tr').remove();
                else alert("Mínimo 2 filas.");
            };
        });
        document.querySelectorAll('.delete-row-imp').forEach(btn => {
            btn.onclick = function() {
                if(document.querySelectorAll('#table-body-imp tr').length > 2) this.closest('tr').remove();
                else alert("Mínimo 2 filas.");
            };
        });
        document.querySelectorAll('.delete-row-elas').forEach(btn => {
            btn.onclick = function() {
                if(document.querySelectorAll('#table-body-elas tr').length > 2) this.closest('tr').remove();
                else alert("Mínimo 2 filas.");
            };
        });
    }

    if(document.getElementById('add-row')) {
        document.getElementById('add-row').onclick = () => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><input type="number" class="t-price" value="0" step="0.1"></td><td><input type="number" class="t-dem" value="0"></td><td><input type="number" class="t-sup" value="0"></td><td class="no-print"><button class="btn-icon delete-row" style="color:red;"><i class="fa-solid fa-trash"></i></button></td>`;
            document.getElementById('table-body').appendChild(tr);
            attachDeleteEvents();
        };
    }
    if(document.getElementById('add-row-imp')) {
        document.getElementById('add-row-imp').onclick = () => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><input type="number" class="t-price-imp" value="0" step="0.1"></td><td><input type="number" class="t-dem-imp" value="0"></td><td class="no-print"><button class="btn-icon delete-row-imp" style="color:red;"><i class="fa-solid fa-trash"></i></button></td>`;
            document.getElementById('table-body-imp').appendChild(tr);
            attachDeleteEvents();
        };
    }
    attachDeleteEvents();

    // --- OCR & SMART PASTE (TESSERACT) ---
    function parsePastedTable(text, targetTableId) {
        const rows = text.trim().split('\n');
        const tbody = document.getElementById(targetTableId);
        tbody.innerHTML = ''; 
        rows.forEach(row => {
            const cols = row.split('\t').map(c => c.trim().replace(',', '.'));
            if(cols.length >= 2) {
                const tr = document.createElement('tr');
                if(targetTableId === 'table-body') {
                    tr.innerHTML = `<td><input type="number" class="t-price" value="${cols[0]||0}" step="0.1"></td><td><input type="number" class="t-dem" value="${cols[1]||0}"></td><td><input type="number" class="t-sup" value="${cols[2]||0}"></td><td class="no-print"><button class="btn-icon delete-row" style="color:red;"><i class="fa-solid fa-trash"></i></button></td>`;
                } else {
                    tr.innerHTML = `<td><input type="number" class="t-price-imp" value="${cols[0]||0}" step="0.1"></td><td><input type="number" class="t-dem-imp" value="${cols[1]||0}"></td><td class="no-print"><button class="btn-icon delete-row-imp" style="color:red;"><i class="fa-solid fa-trash"></i></button></td>`;
                }
                tbody.appendChild(tr);
            }
        });
        attachDeleteEvents();
    }

    async function processImageWithTesseract(imgSrc, targetTableId) {
        alert("Procesando imagen con IA OCR... por favor espera unos segundos.");
        try {
            const { data: { text } } = await Tesseract.recognize(imgSrc, 'eng');
            const rows = text.trim().split('\n');
            const tbody = document.getElementById(targetTableId);
            tbody.innerHTML = '';
            rows.forEach(row => {
                const cols = row.trim().split(/\s+/).map(c => c.replace(',', '.').replace(/[^0-9.]/g, ''));
                if(cols.length >= 2 && cols[0] !== '') {
                    const tr = document.createElement('tr');
                    if(targetTableId === 'table-body') {
                        tr.innerHTML = `<td><input type="number" class="t-price" value="${cols[0]||0}" step="0.1"></td><td><input type="number" class="t-dem" value="${cols[1]||0}"></td><td><input type="number" class="t-sup" value="${cols[2]||0}"></td><td class="no-print"><button class="btn-icon delete-row" style="color:red;"><i class="fa-solid fa-trash"></i></button></td>`;
                    } else {
                        tr.innerHTML = `<td><input type="number" class="t-price-imp" value="${cols[0]||0}" step="0.1"></td><td><input type="number" class="t-dem-imp" value="${cols[1]||0}"></td><td class="no-print"><button class="btn-icon delete-row-imp" style="color:red;"><i class="fa-solid fa-trash"></i></button></td>`;
                    }
                    tbody.appendChild(tr);
                }
            });
            attachDeleteEvents();
            alert("¡Datos extraídos con éxito!");
        } catch (err) {
            alert("Error al leer la imagen. Intenta con una imagen más nítida.");
        }
    }

    async function handleSmartPaste(targetTableId) {
        try {
            if (!navigator.clipboard || !navigator.clipboard.read) {
                alert("Tu navegador no soporta el acceso directo al portapapeles. Intenta usar Ctrl+V directamente en la página.");
                return;
            }

            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
                if (item.types.some(t => t.startsWith('image/'))) {
                    const type = item.types.find(t => t.startsWith('image/'));
                    const blob = await item.getType(type);
                    const reader = new FileReader();
                    reader.onload = e => processImageWithTesseract(e.target.result, targetTableId);
                    reader.readAsDataURL(blob);
                    return;
                }
                if (item.types.includes('text/plain')) {
                    const blob = await item.getType('text/plain');
                    const text = await blob.text();
                    parsePastedTable(text, targetTableId);
                    return;
                }
            }
            alert("No se encontró contenido válido para pegar (usa texto o imágenes).");
        } catch (err) {
            console.error("Clipboard Error:", err);
            alert("Error al acceder al portapapeles. Asegúrate de dar permisos o intenta usar Ctrl+V directamente.");
        }
    }

    // Global Paste Event Listener (More reliable)
    window.addEventListener('paste', async (e) => {
        const activeTab = document.querySelector('.tab-section.active');
        if(!activeTab) return;
        const targetTableId = activeTab.id === 'tab-perfecta' ? 'table-body' : 'table-body-imp';
        
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (const item of items) {
            if (item.type.indexOf("image") !== -1) {
                const blob = item.getAsFile();
                const reader = new FileReader();
                reader.onload = event => processImageWithTesseract(event.target.result, targetTableId);
                reader.readAsDataURL(blob);
                return;
            }
            if (item.type === "text/plain") {
                item.getAsString(text => parsePastedTable(text, targetTableId));
                return;
            }
        }
    });

    if(document.getElementById('btn-paste-perfecta')) document.getElementById('btn-paste-perfecta').onclick = () => handleSmartPaste('table-body');
    if(document.getElementById('btn-paste-imperfecta')) document.getElementById('btn-paste-imperfecta').onclick = () => handleSmartPaste('table-body-imp');

    // --- WORD EXPORT ---
    const btnWord = document.getElementById('btn-export-word');
    if(btnWord) {
        btnWord.onclick = () => {
            const activeSec = document.querySelector('.tab-section.active');
            if(!activeSec) return;
            const html = `<html><head><meta charset='utf-8'><style>body{font-family:Calibri;} table{border:1px solid #000; border-collapse:collapse; width:100%;} td,th{border:1px solid #000; padding:5px;}</style></head><body>${activeSec.innerHTML}</body></html>`;
            const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'Resolucion_Saice.doc';
            a.click();
        };
    }
    if(document.getElementById('calc-equilibrio')) {
        document.getElementById('calc-equilibrio').onclick = calculateEquilibrio;
    }

    function calculateEquilibrio() {
        const cf = parseFloat(document.getElementById('pe-cf').value);
        const cv = parseFloat(document.getElementById('pe-cv').value);
        const p = parseFloat(document.getElementById('pe-p').value);
        const q1 = parseFloat(document.getElementById('pe-q1').value);
        const q2 = parseFloat(document.getElementById('pe-q2').value);

        if(isNaN(cf) || isNaN(cv) || isNaN(p)) {
            alert("Por favor completa los datos numéricos.");
            return;
        }

        const xEq = cf / (p - cv);
        const volEq = p * xEq;
        
        const ut1 = p * q1 - (cv * q1 + cf);
        const ut2 = p * q2 - (cv * q2 + cf);

        let html = `
            <div class="resolution-step">
                <h4>a) El punto de equilibrio (en platos)</h4>
                <p>\\( x = \\frac{CF}{P - Cv} \\)</p>
                <p>\\( x = \\frac{${cf}}{${p} - ${cv}} = ${formatNumber(xEq, 1)} \\text{ unidades} \\)</p>
            </div>

            <div class="resolution-step mt-4">
                <h4>b) El volumen de equilibrio (en bolivianos)</h4>
                <p>\\( IT = P \\cdot x \\)</p>
                <p>\\( IT = ${p} \\cdot ${formatNumber(xEq, 1)} = ${formatNumber(volEq, 0)} \\text{ bs} \\)</p>
                <p>\\( CT = Cv \\cdot x + CF \\)</p>
                <p>\\( CT = ${cv} \\cdot ${formatNumber(xEq, 1)} + ${cf} = ${formatNumber(volEq, 0)} \\text{ bs} \\)</p>
            </div>

            <div class="resolution-step mt-4">
                <h4>c) La utilidad para ${q1} unidades y ${q2} unidades</h4>
                <p><strong>Para ${q1}:</strong></p>
                <p>\\( UT = P \\cdot x - (Cv \\cdot x + CF) \\)</p>
                <p>\\( UT = ${p} \\cdot ${q1} - (${cv} \\cdot ${q1} + ${cf}) = ${formatNumber(ut1, 0)} \\)</p>
                
                <p class="mt-3"><strong>Para ${q2}:</strong></p>
                <p>\\( UT = ${p} \\cdot ${q2} - (${cv} \\cdot ${q2} + ${cf}) = ${formatNumber(ut2, 0)} \\)</p>
            </div>
        `;

        document.getElementById('math-equilibrio-res').innerHTML = html;
        document.getElementById('res-equilibrio').style.display = 'block';
        
        if(window.MathJax) {
            MathJax.typesetPromise();
        }
    }

    // --- MODULE 3: ELASTICIDAD ---
    if(document.getElementById('add-row-elas')) {
        document.getElementById('add-row-elas').onclick = () => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><input type="number" class="t-elas-p" value="0" step="0.1"></td><td><input type="number" class="t-elas-q" value="0"></td><td class="no-print"><button class="btn-icon delete-row-elas" style="color:red;"><i class="fa-solid fa-trash"></i></button></td>`;
            document.getElementById('table-body-elas').appendChild(tr);
            attachDeleteEvents();
        };
    }

    if(document.getElementById('copy-to-elas')) {
        document.getElementById('copy-to-elas').onclick = () => {
            const pPrices = Array.from(document.querySelectorAll('.t-price')).map(i => i.value);
            const pDemands = Array.from(document.querySelectorAll('.t-dem')).map(i => i.value);
            const tbody = document.getElementById('table-body-elas');
            if(tbody) {
                tbody.innerHTML = '';
                for(let i=0; i<pPrices.length; i++) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td><input type="number" class="t-elas-p" value="${pPrices[i]}" step="0.1"></td><td><input type="number" class="t-elas-q" value="${pDemands[i]}"></td><td class="no-print"><button class="btn-icon delete-row-elas" style="color:red;"><i class="fa-solid fa-trash"></i></button></td>`;
                    tbody.appendChild(tr);
                }
                attachDeleteEvents();
            }
        };
    }

    function calculateElasticidad() {
        const prices = Array.from(document.querySelectorAll('.t-elas-p')).map(i => parseFloat(i.value));
        const demands = Array.from(document.querySelectorAll('.t-elas-q')).map(i => parseFloat(i.value));
        
        if(prices.length < 2) {
            alert("Se requieren al menos 2 puntos.");
            return;
        }

        let html = '';
        let totalInter = '';

        for(let i = 0; i < prices.length - 1; i++) {
            const p1 = prices[i], p2 = prices[i+1];
            const q1 = demands[i], q2 = demands[i+1];

            const dq = q2 - q1;
            const dp = p2 - p1;
            const avgQ = (q1 + q2) / 2;
            const avgP = (p1 + p2) / 2;
            
            const elasticity = Math.abs((dq / avgQ) / (dp / avgP));
            let type = "";
            if (elasticity > 1) type = "ELÁSTICA";
            else if (elasticity < 1) type = "INELÁSTICA";
            else type = "UNITARIA";

            html += `
                <div class="resolution-step mb-4" style="border-bottom: 1px dashed #ccc; padding-bottom: 15px;">
                    <h4>Tramo Punto ${i+1} a Punto ${i+2}</h4>
                    <p>\\( \\epsilon = \\left| \\frac{\\Delta Q / Q_{prom}}{\\Delta P / P_{prom}} \\right| \\)</p>
                    <p>\\( \\epsilon = \\left| \\frac{(${q2} - ${q1}) / ((${q1} + ${q2})/2)}{(${p2} - ${p1}) / ((${p1} + ${p2})/2)} \\right| = ${formatNumber(elasticity, 2)} \\)</p>
                    <p><strong>Resultado:</strong> Demanda <b>${type}</b></p>
                </div>
            `;
            
            totalInter += `<p>• En el tramo ${i+1}-${i+2}, la demanda es <b>${type}</b> (${formatNumber(elasticity, 2)}). </p>`;
        }

        document.getElementById('math-elasticidad').innerHTML = html;
        document.getElementById('box-elas-inter').innerHTML = `<h4>Interpretación General</h4>` + totalInter;
        document.getElementById('res-elasticidad').style.display = 'block';
        
        if(window.MathJax) {
            MathJax.typesetPromise();
        }
    }
    if(document.getElementById('calc-elasticidad')) {
        document.getElementById('calc-elasticidad').onclick = calculateElasticidad;
    }
    
    // --- PERSISTENCE (SHIELD DATA) ---
    function saveAllData() {
        const data = {
            // Perfecta
            perfecta: Array.from(document.querySelectorAll('#table-body tr')).map(tr => ({
                p: tr.querySelector('.t-price').value,
                d: tr.querySelector('.t-dem').value,
                s: tr.querySelector('.t-sup').value
            })),
            cf: document.getElementById('inp-cf').value,
            cv: document.getElementById('inp-porcentaje-cv').value,
            cvType: document.getElementById('inp-cv-type').value,
            
            // Imperfecta
            imperfecta: Array.from(document.querySelectorAll('#table-body-imp tr')).map(tr => ({
                p: tr.querySelector('.t-price-imp').value,
                d: tr.querySelector('.t-dem-imp').value
            })),
            
            // Elasticidad
            elasticidad: Array.from(document.querySelectorAll('#table-body-elas tr')).map(tr => ({
                p: tr.querySelector('.t-elas-p').value,
                q: tr.querySelector('.t-elas-q').value
            })),

            // Script/Guia
            guia: document.querySelector('.paper-container[style*="max-width: 900px"]').innerHTML
        };
        localStorage.setItem('saiceData', JSON.stringify(data));
    }

    function loadAllData() {
        const saved = localStorage.getItem('saiceData');
        if(!saved) return;
        const data = JSON.parse(saved);

        // Restore Perfecta
        if(data.perfecta) {
            const tbody = document.getElementById('table-body');
            tbody.innerHTML = '';
            data.perfecta.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td><input type="number" class="t-price" value="${row.p}" step="0.1"></td><td><input type="number" class="t-dem" value="${row.d}"></td><td><input type="number" class="t-sup" value="${row.s}"></td><td class="no-print"><button class="btn-icon delete-row" style="color:red;"><i class="fa-solid fa-trash"></i></button></td>`;
                tbody.appendChild(tr);
            });
        }
        document.getElementById('inp-cf').value = data.cf || 9000;
        document.getElementById('inp-porcentaje-cv').value = data.cv || 30;
        document.getElementById('inp-cv-type').value = data.cvType || 'percent';

        // Restore Imperfecta
        if(data.imperfecta) {
            const tbody = document.getElementById('table-body-imp');
            tbody.innerHTML = '';
            data.imperfecta.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td><input type="number" class="t-price-imp" value="${row.p}" step="0.1"></td><td><input type="number" class="t-dem-imp" value="${row.d}"></td><td class="no-print"><button class="btn-icon delete-row-imp" style="color:red;"><i class="fa-solid fa-trash"></i></button></td>`;
                tbody.appendChild(tr);
            });
        }

        // Restore Elasticidad
        if(data.elasticidad) {
            const tbody = document.getElementById('table-body-elas');
            tbody.innerHTML = '';
            data.elasticidad.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td><input type="number" class="t-elas-p" value="${row.p}" step="0.1"></td><td><input type="number" class="t-elas-q" value="${row.q}"></td><td class="no-print"><button class="btn-icon delete-row-elas" style="color:red;"><i class="fa-solid fa-trash"></i></button></td>`;
                tbody.appendChild(tr);
            });
        }

        // Restore Guia
        if(data.guia) {
            document.querySelector('.paper-container[style*="max-width: 900px"]').innerHTML = data.guia;
        }

        attachDeleteEvents();
    }

    // Auto-save on any input or click
    document.addEventListener('input', saveAllData);
    document.addEventListener('click', (e) => {
        if(e.target.closest('button')) saveAllData();
    });

    loadAllData();
});
