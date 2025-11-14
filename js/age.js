// Q4-Charts.js - Interactive charts for Q4 analysis

class Q4Charts {
    constructor() {
        this.rawData = [];
        this.filteredData = [];
        this.selectedYear = null;
        this.selectedJurisdictions = new Set();
        this.ageGroups = ['0-16', '17-25', '26-39', '40-64', '65 and over'];
        this.allJurisdictions = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];
        // Initialize
        this.init();
    }
    
    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.populateYearFilter();
        this.setInitialFilters();
    }
    
    async loadData() {
        try {
            const response = await fetch('data/Q4.csv');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();
            console.log('CSV text received, length:', csvText.length);
            this.rawData = this.parseCSV(csvText);
            console.log('✓ Data loaded successfully:', this.rawData.length, 'records');
            console.log('✓ Years available:', [...new Set(this.rawData.map(d => d.YEAR))].sort());
            console.log('✓ Sample records:', this.rawData.slice(0, 3));
        } catch (error) {
            console.error('✗ Error loading data:', error);
            const errorMsg = `Error loading data: ${error.message}`;
            document.getElementById('line-chart-container').innerHTML = `<div class="no-data-message">${errorMsg}</div>`;
            document.getElementById('bar-chart-container').innerHTML = `<div class="no-data-message">${errorMsg}</div>`;
        }
    }
    
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        console.log('Total lines in CSV:', lines.length);
        
        // Parse header
        const headerLine = lines[0];
        const headers = headerLine.split(',').map(h => h.replace(/"/g, '').trim());
        console.log('Headers:', headers);
        
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Parse CSV line - handle quoted values
            const values = this.parseCSVLine(line);
            
            if (values.length !== headers.length) {
                console.warn(`Line ${i}: expected ${headers.length} values, got ${values.length}`);
                continue;
            }
            
            const record = {};
            headers.forEach((header, index) => {
                record[header] = values[index];
            });
            
            // Validate and convert numeric fields
            record.YEAR = parseInt(record.YEAR);
            record['Sum(FINES)'] = parseInt(record['Sum(FINES)']);
            
            if (isNaN(record.YEAR) || isNaN(record['Sum(FINES)'])) {
                console.warn(`Line ${i}: Invalid numeric values`, record);
                continue;
            }
            
            data.push(record);
        }
        
        return data;
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
    
    setupEventListeners() {
        // Year filter
        const yearSelect = document.getElementById('year-filter');
        if (yearSelect) {
            yearSelect.addEventListener('change', (e) => {
                this.selectedYear = parseInt(e.target.value);
                console.log('Year changed to:', this.selectedYear);
                this.updateCharts();
            });
        }
        
        // Jurisdiction checkboxes
        document.querySelectorAll('.jurisdiction-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedJurisdictions.add(e.target.value);
                } else {
                    this.selectedJurisdictions.delete(e.target.value);
                }
                console.log('Jurisdictions changed:', Array.from(this.selectedJurisdictions));
                this.updateCharts();
            });
        });
    }
    
    populateYearFilter() {
        if (this.rawData.length === 0) {
            console.error('No data available to populate year filter');
            return;
        }
        
        const years = [...new Set(this.rawData.map(d => d.YEAR))].sort((a, b) => b - a);
        console.log('Available years:', years);
        
        const select = document.getElementById('year-filter');
        if (!select) {
            console.error('year-filter element not found');
            return;
        }
        
        // Clear existing options
        select.innerHTML = '';
        
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            select.appendChild(option);
        });
    }
    
    setInitialFilters() {
        if (this.rawData.length === 0) {
            console.error('No data loaded, cannot set initial filters');
            return;
        }
        
        // Set current year as default
        const currentYear = Math.max(...this.rawData.map(d => d.YEAR));
        const yearSelect = document.getElementById('year-filter');
        if (yearSelect) {
            yearSelect.value = currentYear;
        }
        this.selectedYear = currentYear;
        console.log('Initial year set to:', this.selectedYear);
        
        // Select all jurisdictions by default
        this.allJurisdictions.forEach(jurisdiction => {
            const checkbox = document.getElementById(`jurisdiction-${jurisdiction}`);
            if (checkbox) {
                checkbox.checked = true;
                this.selectedJurisdictions.add(jurisdiction);
            } else {
                console.warn(`Checkbox not found for: ${jurisdiction}`);
            }
        });
        console.log('Initial jurisdictions set to:', Array.from(this.selectedJurisdictions));
        
        // Initial chart render
        this.updateCharts();
    }
    
    filterData() {
        console.log('=== Filtering Data ===');
        console.log('Total raw data records:', this.rawData.length);
        console.log('Selected year:', this.selectedYear);
        console.log('Selected jurisdictions:', Array.from(this.selectedJurisdictions));
        
        this.filteredData = this.rawData.filter(d => {
            const yearMatch = d.YEAR === this.selectedYear;
            const jurisdictionMatch = this.selectedJurisdictions.has(d.JURISDICTION);
            
            // For pre-2023: accept "All ages"
            // For 2023+: accept specific age groups
            let validAgeGroup = false;
            if (d.AGE_GROUP === 'All ages' && this.selectedYear < 2023) {
                validAgeGroup = true;
            } else if (this.ageGroups.includes(d.AGE_GROUP) && this.selectedYear >= 2023) {
                validAgeGroup = true;
            }
            
            return yearMatch && jurisdictionMatch && validAgeGroup;
        });
        
        console.log('Filtered data records:', this.filteredData.length);
        if (this.filteredData.length > 0) {
            console.log('Sample records:', this.filteredData.slice(0, 3));
        } else {
            // Debug: show what data exists for this year and jurisdiction
            const yearData = this.rawData.filter(d => d.YEAR === this.selectedYear);
            console.log('Data available for year', this.selectedYear, ':', yearData.length, 'records');
            if (yearData.length > 0) {
                console.log('Age groups in year data:', [...new Set(yearData.map(d => d.AGE_GROUP))]);
                console.log('Jurisdictions in year data:', [...new Set(yearData.map(d => d.JURISDICTION))]);
            }
        }
    }
    
    updateCharts() {
        this.filterData();
        this.renderLineChart();
        this.renderBarChart();
    }
    
    renderLineChart() {
        const container = document.getElementById('line-chart-container');
        container.innerHTML = '';
        
        if (this.filteredData.length === 0) {
            container.innerHTML = '<div class="no-data-message">No data available for selected filters</div>';
            return;
        }
        
        // Prepare data: group by jurisdiction and age group
        const selectedJurisdictions = Array.from(this.selectedJurisdictions);
        const dataByJurisdictionAndAge = {};
        
        // Initialize data structure for each jurisdiction
        selectedJurisdictions.forEach(jurisdiction => {
            dataByJurisdictionAndAge[jurisdiction] = {};
            this.ageGroups.forEach(age => {
                dataByJurisdictionAndAge[jurisdiction][age] = 0;
            });
        });
        
        // Check if we have "All ages" data (pre-2023) or specific age groups (2023+)
        const hasAllAges = this.filteredData.some(d => d.AGE_GROUP === 'All ages');
        
        if (hasAllAges) {
            // For pre-2023 data, distribute each jurisdiction's total proportionally across age groups
            selectedJurisdictions.forEach(jurisdiction => {
                const jurisdictionTotal = this.filteredData
                    .filter(d => d.JURISDICTION === jurisdiction && d.AGE_GROUP === 'All ages')
                    .reduce((sum, d) => sum + d['Sum(FINES)'], 0);
                
                const proportion = jurisdictionTotal / this.ageGroups.length;
                this.ageGroups.forEach(age => {
                    dataByJurisdictionAndAge[jurisdiction][age] = Math.round(proportion);
                });
            });
            console.log('Pre-2023 data - distributed totals by jurisdiction');
        } else {
            // For 2023+ data with actual age groups
            selectedJurisdictions.forEach(jurisdiction => {
                this.ageGroups.forEach(age => {
                    dataByJurisdictionAndAge[jurisdiction][age] = this.filteredData
                        .filter(d => d.JURISDICTION === jurisdiction && d.AGE_GROUP === age)
                        .reduce((sum, d) => sum + d['Sum(FINES)'], 0);
                });
            });
            console.log('2023+ data - actual age group distribution by jurisdiction');
        }
        
        // Create line data for each jurisdiction
        const lineDataByJurisdiction = {};
        selectedJurisdictions.forEach(jurisdiction => {
            lineDataByJurisdiction[jurisdiction] = this.ageGroups.map((age, index) => ({
                ageGroup: age,
                fines: dataByJurisdictionAndAge[jurisdiction][age],
                index: index,
                jurisdiction: jurisdiction
            }));
        });
        
        // Set dimensions
        const margin = { top: 50, right: 150, bottom: 60, left: 70 };
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
            .domain([0, this.ageGroups.length - 1])
            .range([0, width]);
        
        // Calculate max value across all jurisdictions for consistent y-scale
        let maxFines = 0;
        selectedJurisdictions.forEach(jurisdiction => {
            const maxJurisdiction = d3.max(lineDataByJurisdiction[jurisdiction], d => d.fines);
            if (maxJurisdiction > maxFines) maxFines = maxJurisdiction;
        });
        
        const yScale = d3.scaleLinear()
            .domain([0, maxFines * 1.1])
            .range([height, 0]);
        
        // Color palette for jurisdictions (distinct colors)
        const colorPalette = {
            'ACT': '#FF6B6B',      // Red
            'NSW': '#4ECDC4',      // Teal
            'NT': '#FFE66D',       // Yellow
            'QLD': '#95E1D3',      // Mint
            'SA': '#C7CEEA',       // Lavender
            'TAS': '#FF9F1C',      // Orange
            'VIC': '#2E86AB',      // Dark Blue
            'WA': '#A23B72'        // Purple
        };
        
        // Create line generator
        const line = d3.line()
            .x((d, i) => xScale(i))
            .y(d => yScale(d.fines));
        
        // Add grid lines
        svg.append('g')
            .attr('class', 'grid-line')
            .call(d3.axisLeft(yScale)
                .tickSize(-width)
                .tickFormat('')
            )
            .style('stroke', '#ddd')
            .style('stroke-dasharray', '2');
        
        // Add X axis
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale)
                .tickValues(this.selectedYear < 2023 ? [] : d3.range(this.ageGroups.length))
                .tickFormat(i => this.ageGroups[i])
            )
            .style('font-size', '12px')
            .append('text')
            .attr('class', 'axis-title')
            .attr('x', width / 2)
            .attr('y', 45)
            .attr('fill', '#333')
            .style('text-anchor', 'middle')
            .text(this.selectedYear < 2023 ? 'Across All Ages' : 'Age Group');
        
        // Add Y axis
        svg.append('g')
            .call(d3.axisLeft(yScale))
            .style('font-size', '12px')
            .append('text')
            .attr('class', 'axis-title')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -50)
            .attr('fill', '#333')
            .style('text-anchor', 'middle')
            .text('Number of Fines');
        
        // Draw a line for each jurisdiction
        selectedJurisdictions.forEach((jurisdiction, idx) => {
            const lineData = lineDataByJurisdiction[jurisdiction];
            const color = colorPalette[jurisdiction];
            
            // Add line path
            svg.append('path')
                .datum(lineData)
                .attr('class', 'line')
                .attr('d', line)
                .attr('stroke', color)
                .attr('stroke-width', 3)
                .attr('fill', 'none');
            
            // Add data points for this jurisdiction
            svg.selectAll(`.line-point-${jurisdiction}`)
                .data(lineData)
                .enter()
                .append('circle')
                .attr('class', `line-point line-point-${jurisdiction}`)
                .attr('cx', (d, i) => xScale(i))
                .attr('cy', d => yScale(d.fines))
                .attr('r', 4)
                .attr('fill', color)
                .attr('stroke', '#333')
                .attr('stroke-width', 2)
                .on('mouseover', (event, d) => {
                    this.showTooltip(event, `${d.jurisdiction} - ${d.ageGroup}: ${d.fines.toLocaleString()} fines`);
                })
                .on('mouseout', () => {
                    this.hideTooltip();
                });
        });
        
        // Add legend
        const legendX = width + 10;
        const legendY = 0;
        
        selectedJurisdictions.forEach((jurisdiction, idx) => {
            const color = colorPalette[jurisdiction];
            const yPos = legendY + (idx * 25);
            
            // Legend line
            svg.append('line')
                .attr('x1', legendX)
                .attr('x2', legendX + 15)
                .attr('y1', yPos + 5)
                .attr('y2', yPos + 5)
                .attr('stroke', color)
                .attr('stroke-width', 3);
            
            // Legend dot
            svg.append('circle')
                .attr('cx', legendX + 7.5)
                .attr('cy', yPos + 5)
                .attr('r', 3)
                .attr('fill', color);
            
            // Legend text
            svg.append('text')
                .attr('x', legendX + 25)
                .attr('y', yPos + 10)
                .attr('font-size', '13px')
                .attr('fill', '#333')
                .text(jurisdiction);
        });
        
        // Add data note for pre-2023 data (positioned above the year)
        if (this.selectedYear < 2023) {
            // Add background rectangle for visibility
            const noteText = '(2008-2022: Total fines distributed proportionally across age groups)';
            svg.insert('rect', ':first-child')
                .attr('x', width / 2 - 220)
                .attr('y', -30)
                .attr('width', 440)
                .attr('height', 20)
                .attr('fill', 'rgba(255, 159, 28, 0.1)')
                .attr('rx', 3);
            
            svg.append('text')
                .attr('x', width / 2)
                .attr('y', -15)
                .attr('text-anchor', 'middle')
                .attr('font-size', '12px')
                .attr('fill', '#FF9F1C')
                .attr('font-style', 'italic')
                .text(noteText);
        } else {
            // Add background rectangle for visibility
            svg.insert('rect', ':first-child')
                .attr('x', width / 2 - 130)
                .attr('y', -30)
                .attr('width', 260)
                .attr('height', 20)
                .attr('fill', 'rgba(78, 205, 196, 0.1)')
                .attr('rx', 3);
            
            svg.append('text')
                .attr('x', width / 2)
                .attr('y', -15)
                .attr('text-anchor', 'middle')
                .attr('font-size', '12px')
                .attr('fill', '#4ECDC4')
                .attr('font-style', 'italic')
                .text('(2023+: Actual age group breakdown)');
        }
        
        // Add title
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', 5)
            .attr('text-anchor', 'middle')
            .attr('font-weight', 'bold')
            .attr('font-size', '14px')
            .attr('fill', '#333')
            .text(`Year ${this.selectedYear}`);
    }
    
    renderBarChart() {
        const container = document.getElementById('bar-chart-container');
        container.innerHTML = '';
        
        if (this.filteredData.length === 0) {
            container.innerHTML = '<div class="no-data-message">No data available for selected filters</div>';
            return;
        }
        
        // Prepare data: aggregate by jurisdiction
        const dataByJurisdiction = {};
        Array.from(this.selectedJurisdictions).forEach(jurisdiction => {
            const jurisdictionData = this.filteredData.filter(d => d.JURISDICTION === jurisdiction);
            let totalFines = 0;
            
            // Check if we have "All ages" or specific age groups
            const hasAllAges = jurisdictionData.some(d => d.AGE_GROUP === 'All ages');
            
            if (hasAllAges) {
                // Sum the "All ages" value
                totalFines = jurisdictionData
                    .filter(d => d.AGE_GROUP === 'All ages')
                    .reduce((sum, d) => sum + d['Sum(FINES)'], 0);
            } else {
                // Sum all age groups (excluding "Unknown" to get more accurate count)
                totalFines = jurisdictionData
                    .filter(d => d.AGE_GROUP !== 'Unknown')
                    .reduce((sum, d) => sum + d['Sum(FINES)'], 0);
            }
            
            // Calculate fines per 10,000 driving licenses
            const population = this.getEstimatedDrivingLicense(jurisdiction);
            const finesPer10k = population > 0 ? (totalFines / population) * 10000 : 0;
            
            dataByJurisdiction[jurisdiction] = finesPer10k;
        });
        
        // Convert to array and sort
        const barData = Object.entries(dataByJurisdiction)
            .map(([jurisdiction, finesPer10k]) => ({
                jurisdiction,
                finesPer10k: Math.round(finesPer10k)
            }))
            .sort((a, b) => b.finesPer10k - a.finesPer10k);
        
        // Set dimensions
        const margin = { top: 20, right: 30, bottom: 60, left: 70 };
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
        const xScale = d3.scaleBand()
            .domain(barData.map(d => d.jurisdiction))
            .range([0, width])
            .padding(0.3);
        
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(barData, d => d.finesPer10k) * 1.1])
            .range([height, 0]);
        
        // Color function
        const colorFunction = (d, i) => {
            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
            return colors[i % colors.length];
        };
        
        // Add grid lines
        svg.append('g')
            .attr('class', 'grid-line')
            .call(d3.axisLeft(yScale)
                .tickSize(-width)
                .tickFormat('')
            )
            .style('stroke', '#ddd')
            .style('stroke-dasharray', '2');
        
        // Add bars
        svg.selectAll('.bar')
            .data(barData)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.jurisdiction))
            .attr('y', d => yScale(d.finesPer10k))
            .attr('width', xScale.bandwidth())
            .attr('height', d => height - yScale(d.finesPer10k))
            .attr('fill', colorFunction)
            .on('mouseover', (event, d) => {
                this.showTooltip(event, `${d.jurisdiction}: ${d.finesPer10k} per 10k`);
            })
            .on('mouseout', () => {
                this.hideTooltip();
            });
        
        // Add X axis
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale))
            .style('font-size', '12px')
            .append('text')
            .attr('class', 'axis-title')
            .attr('x', width / 2)
            .attr('y', 45)
            .attr('fill', '#333')
            .style('text-anchor', 'middle')
            .text('Jurisdiction');
        
        // Add Y axis
        svg.append('g')
            .call(d3.axisLeft(yScale))
            .style('font-size', '12px')
            .append('text')
            .attr('class', 'axis-title')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -50)
            .attr('fill', '#333')
            .style('text-anchor', 'middle')
            .text('Fines per 10,000 Licenses');
        
        // Add value labels on bars
        svg.selectAll('.bar-label')
            .data(barData)
            .enter()
            .append('text')
            .attr('class', 'bar-label')
            .attr('x', d => xScale(d.jurisdiction) + xScale.bandwidth() / 2)
            .attr('y', d => yScale(d.finesPer10k) - 5)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('fill', '#333')
            .text(d => d.finesPer10k);
    }
    
    getEstimatedDrivingLicense(jurisdiction) {
        const estimates = {
            'ACT': 350000,
            'NSW': 5500000,
            'NT': 180000,
            'QLD': 3800000,
            'SA': 1300000,
            'TAS': 420000,
            'VIC': 4300000,
            'WA': 1800000
        };
        return estimates[jurisdiction] || 1000000;
    }
    
    showTooltip(event, text) {
        let tooltip = document.querySelector('.chart-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'chart-tooltip';
            document.body.appendChild(tooltip);
        }
        tooltip.textContent = text;
        tooltip.style.visibility = 'visible';
        tooltip.style.left = (event.pageX + 10) + 'px';
        tooltip.style.top = (event.pageY - 28) + 'px';
    }
    
    hideTooltip() {
        const tooltip = document.querySelector('.chart-tooltip');
        if (tooltip) {
            tooltip.style.visibility = 'hidden';
        }
    }
}

// Initialize charts when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Q4Charts...');
    new Q4Charts();
});