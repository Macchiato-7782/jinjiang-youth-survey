// Chart.js 默认配置
Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif";
Chart.defaults.color = '#666';

// 全局数据存储
let allStatistics = {};
let allRawData = []; // 存储原始回答数据
let filteredData = []; // 筛选后的数据
let currentPage = 1;
let totalPages = 1;
let currentJinjiangFilter = 'all'; // 当前晋江筛选条件

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    loadAllData();
});

// 导航切换
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const targetSection = this.dataset.section;

            // 更新导航状态
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            // 切换内容区
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(targetSection).classList.add('active');
        });
    });
}

// 加载所有数据
async function loadAllData() {
    try {
        // 加载概览数据
        const overviewRes = await fetch('/api/statistics/overview');
        const overviewData = await overviewRes.json();
        if (overviewData.success) {
            updateOverview(overviewData.data);
        }

        // 加载所有统计数据
        const statsRes = await fetch('/api/statistics');
        const statsData = await statsRes.json();
        if (statsData.success) {
            allStatistics = statsData.data;
            // 加载晋江身份分布
            const jinjiangRes = await fetch('/api/statistics/jinjiang-type');
            const jinjiangData = await jinjiangRes.json();
            if (jinjiangData.success) {
                allStatistics.jinjiang_type = jinjiangData.data;
            }
            renderAllCharts();
        }

        // 加载趋势数据
        const trendRes = await fetch('/api/trend');
        const trendData = await trendRes.json();
        if (trendData.success) {
            renderTrendChart(trendData.data);
        }

        // 加载所有原始数据（用于筛选）
        await loadAllRawData();

        // 加载原始数据表格
        loadResponses();

    } catch (error) {
        console.error('加载数据失败:', error);
        alert('加载数据失败，请稍后重试');
    }
}

// 加载所有原始数据
async function loadAllRawData() {
    try {
        const res = await fetch('/api/responses?limit=10000'); // 获取所有数据
        const data = await res.json();
        if (data.success) {
            allRawData = data.data;
            filteredData = [...allRawData];
            updateFilterCount();
        }
    } catch (error) {
        console.error('加载原始数据失败:', error);
    }
}

// 应用晋江筛选
function applyJinjiangFilter() {
    const filter = document.getElementById('jinjiangFilter').value;
    currentJinjiangFilter = filter;

    if (filter === 'all') {
        filteredData = [...allRawData];
    } else {
        filteredData = allRawData.filter(r => r.jinjiang_type === filter);
    }

    // 重新计算统计数据
    recalculateStatistics();
    updateFilterCount();
}

// 更新筛选计数
function updateFilterCount() {
    const countEl = document.getElementById('filterCount');
    if (countEl) {
        const total = allRawData.length;
        const filtered = filteredData.length;
        if (currentJinjiangFilter === 'all') {
            countEl.textContent = `显示全部 ${total} 条数据`;
        } else {
            const labelMap = {
                'local': '晋江本地户籍',
                'working': '在晋江工作/学习',
                'other': '非晋江地区'
            };
            countEl.textContent = `${labelMap[currentJinjiangFilter]}：${filtered} 条 / 总计 ${total} 条`;
        }
    }
}

// 重新计算统计数据（基于筛选后的数据）
function recalculateStatistics() {
    const stats = {};

    // 定义需要统计的字段
    const fields = [
        'gender', 'age', 'education', 'occupation', 'income', 'housing',
        'relationship_status', 'meet_channel', 'mate_priority', 'long_distance',
        'marriage_necessity', 'ideal_marriage_age', 'cohabitation', 'marriage_customs', 'marriage_factor',
        'fertility_willingness', 'children_num', 'gender_preference', 'fertility_concern', 'three_child_policy',
        'live_with_parents', 'housework', 'career_family', 'factors', 'jinjiang_feature', 'policy_suggestion',
        'partner_priority', 'jinjiang_marriage_custom_impact', 'marriage_risk_view',
        'jinjiang_clan_impact', 'independence_need'
    ];

    fields.forEach(field => {
        const distribution = {};
        filteredData.forEach(r => {
            const value = r[field];
            if (value) {
                // 处理多选字段（逗号分隔）
                if (typeof value === 'string' && value.includes(',')) {
                    value.split(',').forEach(v => {
                        const trimmed = v.trim();
                        if (trimmed) {
                            distribution[trimmed] = (distribution[trimmed] || 0) + 1;
                        }
                    });
                } else {
                    distribution[value] = (distribution[value] || 0) + 1;
                }
            }
        });

        // 转换为数组格式
        stats[field] = Object.entries(distribution)
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count);
    });

    // 晋江身份分布
    const jinjiangDist = {};
    filteredData.forEach(r => {
        const type = r.jinjiang_type || '未填写';
        const label = {
            'local': '晋江本地',
            'working': '在晋江工作/学习',
            'other': '其他地区'
        }[type] || type;
        jinjiangDist[label] = (jinjiangDist[label] || 0) + 1;
    });
    stats.jinjiang_type = Object.entries(jinjiangDist)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);

    allStatistics = stats;
    renderAllCharts();
}

// 更新概览数据
function updateOverview(data) {
    document.getElementById('totalResponses').textContent = data.totalResponses;
    document.getElementById('todayResponses').textContent = data.todayResponses;
}

// 渲染所有图表
function renderAllCharts() {
    // 人口特征
    renderPieChart('genderChart', allStatistics.gender, '性别分布');
    renderBarChart('ageChart', allStatistics.age, '年龄分布');
    renderPieChart('educationChart', allStatistics.education, '学历分布');
    renderBarChart('occupationChart', allStatistics.occupation, '职业分布');
    renderBarChart('incomeChart', allStatistics.income, '收入分布');

    // 恋爱观
    renderPieChart('relationshipStatusChart', allStatistics.relationship_status, '感情状况');
    renderHorizontalBarChart('meetChannelChart', allStatistics.meet_channel, '认识渠道');
    renderHorizontalBarChart('matePriorityChart', allStatistics.mate_priority, '择偶标准');
    renderPieChart('longDistanceChart', allStatistics.long_distance, '异地恋态度');

    // 婚姻观
    renderPieChart('marriageNecessityChart', allStatistics.marriage_necessity, '结婚必要性');
    renderBarChart('idealMarriageAgeChart', allStatistics.ideal_marriage_age, '理想结婚年龄');
    renderPieChart('cohabitationChart', allStatistics.cohabitation, '同居态度');
    renderPieChart('marriageCustomsChart', allStatistics.marriage_customs, '婚嫁习俗影响');
    renderHorizontalBarChart('marriageFactorChart', allStatistics.marriage_factor, '维系婚姻因素');

    // 生育观
    renderPieChart('fertilityWillingnessChart', allStatistics.fertility_willingness, '生育意愿');
    renderBarChart('childrenNumChart', allStatistics.children_num, '子女数量');
    renderPieChart('genderPreferenceChart', allStatistics.gender_preference, '性别偏好');
    renderHorizontalBarChart('fertilityConcernChart', allStatistics.fertility_concern, '生育顾虑');
    renderPieChart('threeChildPolicyChart', allStatistics.three_child_policy, '三孩政策态度');

    // 家庭观念
    renderPieChart('liveWithParentsChart', allStatistics.live_with_parents, '同住态度');
    renderPieChart('houseworkChart', allStatistics.housework, '家务分配');
    renderPieChart('careerFamilyChart', allStatistics.career_family, '事业家庭平衡');

    // 影响因素与建议
    renderHorizontalBarChart('factorsChart', allStatistics.factors, '影响因素');
    renderPieChart('jinjiangFeatureChart', allStatistics.jinjiang_feature, '地域特色影响');
    renderHorizontalBarChart('policySuggestionChart', allStatistics.policy_suggestion, '政策建议');

    // 晋江身份分布
    renderPieChart('jinjiangTypeChart', allStatistics.jinjiang_type, '晋江身份分布');
}

// 渲染趋势图
function renderTrendChart(data) {
    const ctx = document.getElementById('trendChart').getContext('2d');

    const labels = data.map(d => d.date).reverse();
    const values = data.map(d => d.count).reverse();

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '每日回答数',
                data: values,
                borderColor: '#0071e3',
                backgroundColor: 'rgba(0, 113, 227, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// 渲染饼图
function renderPieChart(canvasId, data, title) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !data || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    const labels = data.map(d => d.value);
    const values = data.map(d => d.count);

    const colors = [
        '#0071e3', '#34c759', '#ff9500', '#ff3b30', '#5856d6',
        '#af52de', '#5ac8fa', '#ffcc00', '#ff2d55', '#00c7be'
    ];

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12,
                        padding: 10,
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

// 渲染柱状图
function renderBarChart(canvasId, data, title) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !data || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    const labels = data.map(d => d.value);
    const values = data.map(d => d.count);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '人数',
                data: values,
                backgroundColor: '#0071e3',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// 渲染水平柱状图
function renderHorizontalBarChart(canvasId, data, title) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !data || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    const labels = data.map(d => d.value);
    const values = data.map(d => d.count);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '选择人数',
                data: values,
                backgroundColor: '#5856d6',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// 加载原始数据表格（使用筛选后的数据）
function loadResponsesTable(page = 1) {
    const pageSize = 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageData = filteredData.slice(start, end);

    renderResponsesTable(pageData);
    currentPage = page;
    totalPages = Math.ceil(filteredData.length / pageSize);
    renderPagination();
}

// 加载原始数据（兼容旧调用）
async function loadResponses(page = 1) {
    loadResponsesTable(page);
}

// 渲染原始数据表格
function renderResponsesTable(responses) {
    const tbody = document.getElementById('responsesTableBody');
    tbody.innerHTML = '';

    responses.forEach(response => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${response.id}</td>
            <td>${new Date(response.submit_time).toLocaleString()}</td>
            <td>${response.gender || '-'}</td>
            <td>${response.age || '-'}</td>
            <td>${response.education || '-'}</td>
            <td>${response.relationship_status || '-'}</td>
            <td>${response.marriage_necessity || '-'}</td>
            <td>${response.fertility_willingness || '-'}</td>
            <td>
                <button class="btn btn-secondary" onclick="viewDetail(${response.id})">查看</button>
                <button class="btn btn-danger" onclick="deleteResponse(${response.id})">删除</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 渲染分页
function renderPagination() {
    const container = document.getElementById('pagination');
    container.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = i === currentPage ? 'active' : '';
        btn.onclick = () => loadResponses(i);
        container.appendChild(btn);
    }
}

// 查看详情
async function viewDetail(id) {
    try {
        const res = await fetch('/api/responses');
        const data = await res.json();

        if (data.success) {
            const response = data.data.find(r => r.id === id);
            if (response) {
                showDetailModal(response);
            }
        }
    } catch (error) {
        console.error('加载详情失败:', error);
    }
}

// 显示详情弹窗
function showDetailModal(response) {
    const modal = document.getElementById('detailModal');
    const content = document.getElementById('detailContent');

    const fieldNames = {
        id: 'ID',
        response_id: '响应ID',
        submit_time: '提交时间',
        jinjiang_type: '晋江身份',
        gender: '性别',
        age: '年龄',
        education: '学历',
        occupation: '职业',
        income: '收入',
        housing: '居住情况',
        relationship_status: '感情状况',
        meet_channel: '认识渠道',
        mate_priority: '择偶标准',
        long_distance: '异地恋态度',
        partner_priority: '择偶最看重',
        jinjiang_marriage_custom_impact: '晋江婚嫁习俗影响',
        marriage_necessity: '结婚必要性',
        ideal_marriage_age: '理想结婚年龄',
        cohabitation: '同居态度',
        marriage_customs: '婚嫁习俗影响',
        marriage_factor: '维系婚姻因素',
        marriage_risk_view: '婚姻风险看法',
        fertility_willingness: '生育意愿',
        children_num: '子女数量',
        gender_preference: '性别偏好',
        fertility_concern: '生育顾虑',
        three_child_policy: '三孩政策态度',
        jinjiang_clan_impact: '晋江宗族文化影响',
        live_with_parents: '与父母同住',
        housework: '家务分配',
        career_family: '事业家庭平衡',
        factors: '影响因素',
        independence_need: '独立空间需求',
        jinjiang_feature: '晋江地域特色影响',
        policy_suggestion: '政策建议',
        other_suggestions: '其他建议'
    };

    let html = '<table class="detail-table">';
    for (const [key, value] of Object.entries(response)) {
        if (fieldNames[key] && value) {
            let displayValue = value;
            if (key === 'submit_time') {
                displayValue = new Date(value).toLocaleString();
            }
            html += `
                <tr>
                    <td>${fieldNames[key]}</td>
                    <td>${displayValue || '-'}</td>
                </tr>
            `;
        }
    }
    html += '</table>';

    content.innerHTML = html;
    modal.classList.add('show');
}

// 关闭详情弹窗
function closeDetailModal() {
    document.getElementById('detailModal').classList.remove('show');
}

// 删除回答
async function deleteResponse(id) {
    if (!confirm('确定要删除这条回答吗？此操作不可恢复。')) {
        return;
    }

    try {
        const res = await fetch(`/api/responses/${id}`, {
            method: 'DELETE'
        });
        const data = await res.json();

        if (data.success) {
            alert('删除成功');
            loadResponses(currentPage);
            loadAllData();
        } else {
            alert('删除失败：' + data.error);
        }
    } catch (error) {
        console.error('删除失败:', error);
        alert('删除失败，请稍后重试');
    }
}

// 交叉分析
async function runCrossAnalysis() {
    const field1 = document.getElementById('crossField1').value;
    const field2 = document.getElementById('crossField2').value;

    if (!field1 || !field2) {
        alert('请选择两个分析维度');
        return;
    }

    try {
        const res = await fetch(`/api/cross-analysis?field1=${field1}&field2=${field2}`);
        const data = await res.json();

        if (data.success) {
            renderCrossTable(data.data, field1, field2);
        }
    } catch (error) {
        console.error('交叉分析失败:', error);
        alert('分析失败，请稍后重试');
    }
}

// 渲染交叉分析表格
function renderCrossTable(data, field1, field2) {
    const container = document.getElementById('crossResultContainer');
    const tableDiv = document.getElementById('crossTable');

    const f1Values = [...new Set(data.map(d => d.f1))];
    const f2Values = [...new Set(data.map(d => d.f2))];

    const matrix = {};
    data.forEach(d => {
        if (!matrix[d.f1]) matrix[d.f1] = {};
        matrix[d.f1][d.f2] = d.count;
    });

    const f1Totals = {};
    const f2Totals = {};
    let grandTotal = 0;

    data.forEach(d => {
        f1Totals[d.f1] = (f1Totals[d.f1] || 0) + d.count;
        f2Totals[d.f2] = (f2Totals[d.f2] || 0) + d.count;
        grandTotal += d.count;
    });

    let html = '<table class="data-table"><thead><tr><th></th>';
    f2Values.forEach(v => {
        html += `<th>${v}</th>`;
    });
    html += '<th>合计</th></tr></thead><tbody>';

    f1Values.forEach(f1 => {
        html += `<tr><td><strong>${f1}</strong></td>`;
        f2Values.forEach(f2 => {
            const count = matrix[f1]?.[f2] || 0;
            const percentage = f1Totals[f1] ? ((count / f1Totals[f1]) * 100).toFixed(1) : 0;
            html += `<td>${count} (${percentage}%)</td>`;
        });
        html += `<td><strong>${f1Totals[f1]}</strong></td></tr>`;
    });

    html += '<tr><td><strong>合计</strong></td>';
    f2Values.forEach(f2 => {
        html += `<td><strong>${f2Totals[f2] || 0}</strong></td>`;
    });
    html += `<td><strong>${grandTotal}</strong></td></tr>`;

    html += '</tbody></table>';

    tableDiv.innerHTML = html;
    container.style.display = 'block';
}

// 刷新数据
function refreshData() {
    loadAllData();
    alert('数据已刷新');
}

// 导出数据
async function exportData() {
    try {
        const res = await fetch('/api/export?format=csv');
        const blob = await res.blob();

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `survey_data_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('导出失败:', error);
        alert('导出失败，请稍后重试');
    }
}

// 点击弹窗外部关闭
window.onclick = function(event) {
    const modal = document.getElementById('detailModal');
    if (event.target === modal) {
        closeDetailModal();
    }
}
