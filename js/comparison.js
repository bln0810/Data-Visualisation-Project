// comparism.js - Comparison of mobile phone fines vs other fine types

class FineComparison {
    constructor() {
        this.data = [];
        this.init();
    }

    async init() {
        await this.loadData();
        this.renderChart();
    }

    async loadData() {
        try {
            const finesData = await d3.csv('data/police_enforcement_2024_fines-1.csv');
            
            // Aggregate fines by metric (offense type)
            const metricTotals = {};
            
            finesData.forEach(d => {
                const metric = d.METRIC;
                const fines = +d.FINES || 0;
                
                if (!metricTotals[metric]) {
                    metricTotals[metric] = 0;
                }
                metricTotals[metric] += fines;
            });
            
            // Convert to array and format metric names
            this.data = Object.entries(metricTotals)
                .map(([metric, total]) => ({
                    metric: this.formatMetricName(metric),
                    total: total,
                    isMobilePhone: metric === 'mobile_phone_use'
                }))
                .sort((a, b) => b.total - a.total);
            
            console.log('Data loaded and aggregated:', this.data);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    formatMetricName(metric) {
        // Format metric names to be more readable
        return metric
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    renderChart() {
        const container = document.getElementById('comparison-chart');
        container.innerHTML = '';

        // Set dimensions
        const margin = { top: 40, right: 100, bottom: 60, left: 200 };
        const width = Math.min(1200, container.clientWidth) - margin.left - margin.right;
        const height = Math.max(400, this.data.length * 50) - margin.top - margin.bottom;

        // Create SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create scales
        const xScale = d3.scaleLinear()
            .domain([0, d3.max(this.data, d => d.total) * 1.1])
            .range([0, width]);

        const yScale = d3.scaleBand()
            .domain(this.data.map(d => d.metric))
            .range([0, height])
            .padding(0.2);

        // Add X axis
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale)
                .tickFormat(d => d3.format('.2s')(d))
            )
            .style('font-size', '12px');

        // Add X axis label
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', height + 45)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('fill', '#333')
            .text('Total Number of Fines');

        // Add Y axis
        svg.append('g')
            .call(d3.axisLeft(yScale))
            .style('font-size', '12px');

        // Add bars
        svg.selectAll('.bar')
            .data(this.data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', 0)
            .attr('y', d => yScale(d.metric))
            .attr('width', d => xScale(d.total))
            .attr('height', yScale.bandwidth())
            .attr('fill', d => d.isMobilePhone ? '#E74C3C' : '#3498db')
            .attr('opacity', 0.8)
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .attr('opacity', 1);
                
                // Show tooltip
                const tooltip = d3.select('body')
                    .append('div')
                    .attr('class', 'tooltip')
                    .style('position', 'absolute')
                    .style('background-color', 'white')
                    .style('border', '2px solid #333')
                    .style('border-radius', '5px')
                    .style('padding', '10px')
                    .style('pointer-events', 'none')
                    .style('z-index', '1000');

                tooltip.html(`
                    <strong>${d.metric}</strong><br/>
                    Total Fines: ${d.total.toLocaleString()}
                `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .attr('opacity', 0.8);
                
                d3.selectAll('.tooltip').remove();
            });

        // Add value labels on bars
        svg.selectAll('.bar-label')
            .data(this.data)
            .enter()
            .append('text')
            .attr('class', 'bar-label')
            .attr('x', d => xScale(d.total) + 5)
            .attr('y', d => yScale(d.metric) + yScale.bandwidth() / 2)
            .attr('dy', '0.35em')
            .attr('font-size', '12px')
            .attr('fill', '#333')
            .text(d => d.total.toLocaleString());

        // Add title
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -15)
            .attr('text-anchor', 'middle')
            .attr('font-weight', 'bold')
            .attr('font-size', '16px')
            .attr('fill', '#333')
            .text('Comparison of Fine Types: Mobile Phone Use vs Other Offenses');

        // Add legend
        const legendData = [
            { label: 'Mobile Phone Use', color: '#E74C3C' },
            { label: 'Other Offenses', color: '#3498db' }
        ];

        const legend = svg.append('g')
            .attr('transform', `translate(${width - 150}, -30)`);

        legendData.forEach((d, i) => {
            legend.append('rect')
                .attr('x', 0)
                .attr('y', i * 20)
                .attr('width', 15)
                .attr('height', 15)
                .attr('fill', d.color)
                .attr('opacity', 0.8);

            legend.append('text')
                .attr('x', 20)
                .attr('y', i * 20 + 12)
                .attr('font-size', '12px')
                .attr('fill', '#333')
                .text(d.label);
        });
    }
}

// Initialize the chart when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FineComparison();
});
