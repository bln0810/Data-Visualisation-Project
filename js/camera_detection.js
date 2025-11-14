// Q5-Charts.js - Interactive charts for Q5 analysis (Impact of camera-based detection on enforcement)

class Q5Charts {
    constructor() {
        this.yearlyData = [];
        
        // Period definitions: Before and after camera-based detection introduction
        this.periods = {
            'Before Camera Detection (2008-2019)': { years: [2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018], color: '#95a5a6' },
            'After Camera Detection Introduction (2020+)': { years: [2019, 2020, 2021, 2022, 2023, 2024], color: '#f39c12' }
        };
        
        this.init();
    }
    
    async init() {
        await this.loadData();
        this.renderAll();
    }
    
    async loadData() {
        try {
            const response = await fetch('data/Q3.csv');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const csvText = await response.text();
            this.parseQ3CSV(csvText);
            console.log('Q3 data loaded successfully');
            console.log('Yearly data:', this.yearlyData);
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Failed to load data: ' + error.message);
        }
    }
    
    parseQ3CSV(csvText) {
        const lines = csvText.trim().split('\n');
        
        // Parse header
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        const yearIndex = headers.indexOf('YEAR');
        const cameraBased = headers.indexOf('Camera-based');
        const policeIssued = headers.indexOf('Police-issued');
        
        // Aggregate by year
        const yearlyAgg = {};
        
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const parts = this.parseCSVLine(lines[i]);
            const year = parseInt(parts[yearIndex]);
            const camera = parseInt(parts[cameraBased]) || 0;
            const police = parseInt(parts[policeIssued]) || 0;
            
            if (!yearlyAgg[year]) {
                yearlyAgg[year] = { camera: 0, police: 0, total: 0 };
            }
            
            yearlyAgg[year].camera += camera;
            yearlyAgg[year].police += police;
            yearlyAgg[year].total += camera + police;
        }
        
        // Convert to sorted array
        this.yearlyData = Object.entries(yearlyAgg)
            .map(([year, data]) => ({
                year: parseInt(year),
                camera: data.camera,
                police: data.police,
                total: data.total
            }))
            .sort((a, b) => a.year - b.year);
        
        console.log('Data aggregated:', this.yearlyData);
    }
    
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let insideQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
                result.push(current.replace(/"/g, '').trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.replace(/"/g, '').trim());
        return result;
    }
    
    renderAll() {
        this.renderTimelineChart();
        this.updateInsights();
    }
    
    renderTimelineChart() {
        const container = document.getElementById('timeline-chart');
        container.innerHTML = '';
        
        // Set dimensions
        const margin = { top: 40, right: 30, bottom: 60, left: 100 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = 450 - margin.top - margin.bottom;
        
        // Create SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        // Create scales
        const xScale = d3.scaleLinear()
            .domain([d3.min(this.yearlyData, d => d.year) - 0.5, d3.max(this.yearlyData, d => d.year) + 0.5])
            .range([0, width]);
        
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(this.yearlyData, d => d.total) * 1.15])
            .range([height, 0]);
        
        // Create line generators for each detection method
        const cameraLine = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d.camera));
        
        const policeLine = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d.police));
        
        // Add grid lines
        svg.append('g')
            .attr('class', 'grid-line')
            .call(d3.axisLeft(yScale)
                .tickSize(-width)
                .tickFormat('')
            )
            .style('stroke', '#ddd')
            .style('stroke-dasharray', '2');
        
        // Add period backgrounds
        const periodBackgrounds = [
            { period: 'Before', color: 'rgba(149, 165, 166, 0.05)', x1: xScale(2008), x2: xScale(2019.5) },
            { period: 'After Introduction', color: 'rgba(243, 156, 18, 0.05)', x1: xScale(2019.5), x2: xScale(2024.5) }
        ];
        
        periodBackgrounds.forEach(bg => {
            svg.append('rect')
                .attr('x', bg.x1)
                .attr('y', 0)
                .attr('width', bg.x2 - bg.x1)
                .attr('height', height)
                .attr('fill', bg.color)
                .attr('z-index', 0);
        });
        
        // Add vertical line at camera introduction (2020)
        svg.append('line')
            .attr('x1', xScale(2019.5))
            .attr('x2', xScale(2019.5))
            .attr('y1', 0)
            .attr('y2', height)
            .attr('stroke', '#e74c3c')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5')
            .attr('opacity', 0.7);
        
        // Add label for camera introduction
        svg.append('text')
            .attr('x', xScale(2019.5))
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('fill', '#e74c3c')
            .attr('font-weight', 'bold')
            .text('Camera Detection Introduced');
        
        // Add camera-based line
        svg.append('path')
            .datum(this.yearlyData)
            .attr('class', 'line')
            .attr('d', cameraLine)
            .attr('stroke', '#E74C3C')
            .attr('stroke-width', 3)
            .attr('fill', 'none');
        
        // Add police-issued line
        svg.append('path')
            .datum(this.yearlyData)
            .attr('class', 'line')
            .attr('d', policeLine)
            .attr('stroke', '#3498db')
            .attr('stroke-width', 3)
            .attr('fill', 'none');
        
        // Add total fines line (starting from 2019 to show transition)
        const totalFinesData = this.yearlyData.filter(d => d.year >= 2019);
        
        const totalLine = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d.total));
        
        svg.append('path')
            .datum(totalFinesData)
            .attr('class', 'line')
            .attr('d', totalLine)
            .attr('stroke', '#90EE90')
            .attr('stroke-width', 3)
            .attr('fill', 'none');
        
        // Add camera data points
        svg.selectAll('.line-point-camera')
            .data(this.yearlyData)
            .enter()
            .append('circle')
            .attr('class', 'line-point-camera')
            .attr('cx', d => xScale(d.year))
            .attr('cy', d => yScale(d.camera))
            .attr('r', 5)
            .attr('fill', '#E74C3C')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .on('mouseover', (event, d) => {
                const percentage = ((d.camera / d.total) * 100).toFixed(1);
                this.showTooltip(event, `${d.year}\nCamera-based: ${d.camera.toLocaleString()}\n(${percentage}% of total)`);
            })
            .on('mouseout', () => {
                this.hideTooltip();
            });
        
        // Add police data points
        svg.selectAll('.line-point-police')
            .data(this.yearlyData)
            .enter()
            .append('circle')
            .attr('class', 'line-point-police')
            .attr('cx', d => xScale(d.year))
            .attr('cy', d => yScale(d.police))
            .attr('r', 5)
            .attr('fill', '#3498db')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .on('mouseover', (event, d) => {
                const percentage = ((d.police / d.total) * 100).toFixed(1);
                this.showTooltip(event, `${d.year}\nPolice-issued: ${d.police.toLocaleString()}\n(${percentage}% of total)`);
            })
            .on('mouseout', () => {
                this.hideTooltip();
            });
        
        // Add total fines data points
        svg.selectAll('.line-point-total')
            .data(totalFinesData)
            .enter()
            .append('circle')
            .attr('class', 'line-point-total')
            .attr('cx', d => xScale(d.year))
            .attr('cy', d => yScale(d.total))
            .attr('r', 5)
            .attr('fill', '#90EE90')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .on('mouseover', (event, d) => {
                if (d.year === 2019) {
                    this.showTooltip(event, `${d.year}\nPolice-issued: ${d.police.toLocaleString()}`);
                } else {
                    this.showTooltip(event, `${d.year}\nTotal Fines: ${d.total.toLocaleString()}`);
                }
            })
            .on('mouseout', () => {
                this.hideTooltip();
            });
        
        // Add X axis
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale)
                .tickValues(d3.range(2008, 2025))
                .tickFormat(d => d.toString())
            )
            .style('font-size', '11px')
            .append('text')
            .attr('class', 'axis-title')
            .attr('x', width / 2)
            .attr('y', 45)
            .attr('fill', '#333')
            .style('text-anchor', 'middle')
            .text('Year');
        
        // Add Y axis
        svg.append('g')
            .call(d3.axisLeft(yScale))
            .style('font-size', '12px')
            .append('text')
            .attr('class', 'axis-title')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -70)
            .attr('fill', '#333')
            .style('text-anchor', 'middle')
            .text('Number of Fines');
        
        // Add title
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -15)
            .attr('text-anchor', 'middle')
            .attr('font-weight', 'bold')
            .attr('font-size', '15px')
            .attr('fill', '#333')
            .text('Impact of Camera-Based Detection on Enforcement Levels (2008-2024)');
        
        // Add legend
        const legendX = width - 220;
        const legendY = 10;
        
        const legendData = [
            { label: 'Camera-Based Detection', color: '#E74C3C' },
            { label: 'Police-Issued Fines', color: '#3498db' },
            { label: 'Total Fines Level', color: '#90EE90' }
        ];
        
        legendData.forEach((d, i) => {
            svg.append('rect')
                .attr('x', legendX)
                .attr('y', legendY + i * 25)
                .attr('width', 12)
                .attr('height', 12)
                .attr('fill', d.color)
                .attr('rx', 2);
            
            svg.append('text')
                .attr('x', legendX + 18)
                .attr('y', legendY + i * 25 + 10)
                .attr('font-size', '12px')
                .attr('fill', '#333')
                .text(d.label);
        });
    }
    
    updateInsights() {
        const insightsContent = document.getElementById('insights-content');
        
        // Calculate stats before and after camera introduction
        const beforeCamera = this.yearlyData.filter(d => d.year < 2020);
        const afterCamera = this.yearlyData.filter(d => d.year >= 2020);
        
        const beforeCameraTotal = beforeCamera.reduce((sum, d) => sum + d.total, 0);
        const beforeCameraAvg = beforeCameraTotal / beforeCamera.length;
        const beforeCameraPoliceAvg = beforeCamera.reduce((sum, d) => sum + d.police, 0) / beforeCamera.length;
        
        const afterCameraTotal = afterCamera.reduce((sum, d) => sum + d.total, 0);
        const afterCameraAvg = afterCameraTotal / afterCamera.length;
        const afterCameraCameraAvg = afterCamera.reduce((sum, d) => sum + d.camera, 0) / afterCamera.length;
        const afterCameraPoliceAvg = afterCamera.reduce((sum, d) => sum + d.police, 0) / afterCamera.length;
        
        // Calculate percentage changes
        const totalIncreasePercent = ((afterCameraAvg - beforeCameraAvg) / beforeCameraAvg * 100).toFixed(1);
        const cameraPercentageAfter = (afterCameraCameraAvg / afterCameraAvg * 100).toFixed(1);
        const policePercentageAfter = (afterCameraPoliceAvg / afterCameraAvg * 100).toFixed(1);
        
        // Find peak year
        const peakYear = this.yearlyData.reduce((max, d) => d.total > max.total ? d : max);
        
        let insights = `
            <p><strong>📊 Period Comparison:</strong></p>
            <p>
                <strong>Before Camera Detection (2008-2019):</strong> ${beforeCameraAvg.toLocaleString('en-US', { maximumFractionDigits: 0 })} fines/year on average
                <br/>Primary method: Police-issued (${beforeCameraPoliceAvg.toLocaleString('en-US', { maximumFractionDigits: 0 })} fines/year)
            </p>
            <p>
                <strong>After Camera Detection Introduction (2020-2024):</strong> ${afterCameraAvg.toLocaleString('en-US', { maximumFractionDigits: 0 })} fines/year on average
                <br/>
                <span style="color: #E74C3C;"><strong>Camera-based:</strong> ${afterCameraCameraAvg.toLocaleString('en-US', { maximumFractionDigits: 0 })} fines/year (${cameraPercentageAfter}%)</span>
                <br/>
                <span style="color: #3498db;"><strong>Police-issued:</strong> ${afterCameraPoliceAvg.toLocaleString('en-US', { maximumFractionDigits: 0 })} fines/year (${policePercentageAfter}%)</span>
            </p>
            <p><strong>🔍 Key Findings:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li><strong style="color: #e74c3c;">Overall enforcement increase:</strong> Average fines increased by <strong>${totalIncreasePercent}%</strong> after camera detection was introduced</li>
                <li><strong style="color: #E74C3C;">Camera-based dominance:</strong> Camera-based detection now accounts for <strong>${cameraPercentageAfter}%</strong> of all fines, demonstrating the significant impact of automated enforcement</li>
                <li><strong>Peak activity:</strong> Highest enforcement activity occurred in <strong>${peakYear.year}</strong> with <strong>${peakYear.total.toLocaleString()}</strong> total fines</li>
                <li><strong>Adoption impact:</strong> The introduction of camera-based detection in 2020 has fundamentally transformed enforcement capabilities, enabling detection at scale</li>
            </ul>
        `;
        
        insightsContent.innerHTML = insights;
    }
    
    showTooltip(event, text) {
        let tooltip = document.querySelector('.chart-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'chart-tooltip';
            document.body.appendChild(tooltip);
        }
        tooltip.innerHTML = text.replace(/\n/g, '<br/>');
        tooltip.style.left = (event.pageX + 10) + 'px';
        tooltip.style.top = (event.pageY + 10) + 'px';
        tooltip.style.display = 'block';
    }
    
    hideTooltip() {
        const tooltip = document.querySelector('.chart-tooltip');
        if (tooltip) tooltip.style.display = 'none';
    }
}

// Initialize charts when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Q5Charts...');
    new Q5Charts();
});