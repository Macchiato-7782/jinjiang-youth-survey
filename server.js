const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const db = require('./database/db');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ===== API 路由 =====

// 提交问卷
app.post('/api/submit', (req, res) => {
    const responseId = uuidv4();
    const data = {
        response_id: responseId,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        completion_time: req.body.completion_time || 0,
        ...req.body
    };

    db.saveResponse(data, (err, id) => {
        if (err) {
            console.error('保存回答失败:', err);
            res.status(500).json({
                success: false,
                message: '提交失败，请稍后重试',
                error: err.message
            });
        } else {
            res.json({
                success: true,
                message: '提交成功，感谢您的参与！',
                response_id: responseId
            });
        }
    });
});

// 获取统计数据概览
app.get('/api/statistics/overview', (req, res) => {
    const stats = {};

    db.getResponseCount((err, countResult) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.totalResponses = countResult.count;

        db.getTodayCount((err, todayResult) => {
            if (err) return res.status(500).json({ error: err.message });
            stats.todayResponses = todayResult.count;

            res.json({ success: true, data: stats });
        });
    });
});

// 获取单个字段的统计分布
app.get('/api/statistics/:field', (req, res) => {
    const field = req.params.field;
    const multiSelectFields = ['meet_channel', 'mate_priority', 'marriage_factor', 'fertility_concern', 'factors', 'policy_suggestion'];

    if (multiSelectFields.includes(field)) {
        db.getMultiSelectDistribution(field, (err, data) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, field, data });
        });
    } else {
        db.getFieldDistribution(field, (err, data) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, field, data });
        });
    }
});

// 获取所有字段的统计
app.get('/api/statistics', (req, res) => {
    const fields = [
        'gender', 'age', 'education', 'occupation', 'income', 'housing',
        'relationship_status', 'long_distance', 'marriage_necessity',
        'ideal_marriage_age', 'cohabitation', 'marriage_customs',
        'fertility_willingness', 'children_num', 'gender_preference', 'three_child_policy',
        'live_with_parents', 'housework', 'career_family',
        'jinjiang_feature'
    ];
    const multiSelectFields = ['meet_channel', 'mate_priority', 'marriage_factor', 'fertility_concern', 'factors', 'policy_suggestion'];

    const results = {};
    let completed = 0;
    const total = fields.length + multiSelectFields.length;

    fields.forEach(field => {
        db.getFieldDistribution(field, (err, data) => {
            results[field] = err ? { error: err.message } : data;
            completed++;
            if (completed === total) {
                res.json({ success: true, data: results });
            }
        });
    });

    multiSelectFields.forEach(field => {
        db.getMultiSelectDistribution(field, (err, data) => {
            results[field] = err ? { error: err.message } : data;
            completed++;
            if (completed === total) {
                res.json({ success: true, data: results });
            }
        });
    });
});

// 交叉分析
app.get('/api/cross-analysis', (req, res) => {
    const { field1, field2 } = req.query;
    if (!field1 || !field2) {
        return res.status(400).json({ error: '需要提供 field1 和 field2 参数' });
    }

    db.getCrossAnalysis(field1, field2, (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, field1, field2, data });
    });
});

// 获取时间趋势
app.get('/api/trend', (req, res) => {
    db.getTimeTrend((err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, data });
    });
});

// 获取所有回答（分页）
app.get('/api/responses', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    db.getAllResponses((err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedRows = rows.slice(start, end);

        res.json({
            success: true,
            total: rows.length,
            page,
            limit,
            data: paginatedRows
        });
    });
});

// 导出数据
app.get('/api/export', (req, res) => {
    const format = req.query.format || 'json';

    if (format === 'csv') {
        db.exportToCSV((err, csvContent) => {
            if (err) return res.status(500).json({ error: err.message });

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename=survey_data.csv');
            // 添加BOM以支持Excel中文显示
            res.send('\uFEFF' + csvContent);
        });
    } else {
        db.getAllResponses((err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, count: rows.length, data: rows });
        });
    }
});

// 删除回答
app.delete('/api/responses/:id', (req, res) => {
    const id = req.params.id;
    db.deleteResponse(id, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: '删除成功' });
    });
});

// 首页重定向到问卷
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 后台管理页面
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

module.exports = app;

module.exports = app;
