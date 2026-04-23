const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 确保数据库目录存在
const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'survey.db');

// 创建数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('数据库连接失败:', err);
    } else {
        console.log('数据库连接成功:', dbPath);
        initTables();
    }
});

// 初始化表结构
function initTables() {
    // 问卷回答主表
    db.run(`
        CREATE TABLE IF NOT EXISTS survey_responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            response_id TEXT UNIQUE NOT NULL,
            submit_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            ip_address TEXT,
            user_agent TEXT,
            completion_time INTEGER,

            -- 晋江身份标识
            jinjiang_type TEXT,

            -- 基本信息 (6题)
            gender TEXT,
            age TEXT,
            education TEXT,
            occupation TEXT,
            income TEXT,
            housing TEXT,

            -- 恋爱观 (4题)
            relationship_status TEXT,
            meet_channel TEXT,
            mate_priority TEXT,
            long_distance TEXT,

            -- 婚姻观 (5题)
            marriage_necessity TEXT,
            ideal_marriage_age TEXT,
            cohabitation TEXT,
            marriage_customs TEXT,
            marriage_factor TEXT,

            -- 生育观 (5题)
            fertility_willingness TEXT,
            children_num TEXT,
            gender_preference TEXT,
            fertility_concern TEXT,
            three_child_policy TEXT,

            -- 家庭与未来 (5题)
            live_with_parents TEXT,
            housework TEXT,
            career_family TEXT,
            factors TEXT,
            jinjiang_feature TEXT,
            policy_suggestion TEXT,
            other_suggestions TEXT
        )
    `, (err) => {
        if (err) console.error('创建表失败:', err);
        else console.log('survey_responses 表已就绪');
    });

    // 统计分析结果表（缓存）
    db.run(`
        CREATE TABLE IF NOT EXISTS statistics_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            stat_type TEXT UNIQUE NOT NULL,
            stat_data TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

// 数据库操作方法
const dbOperations = {
    // 保存问卷回答
    saveResponse: (data, callback) => {
        const sql = `
            INSERT INTO survey_responses (
                response_id, ip_address, user_agent, completion_time,
                jinjiang_type,
                gender, age, education, occupation, income, housing,
                relationship_status, meet_channel, mate_priority, long_distance,
                marriage_necessity, ideal_marriage_age, cohabitation, marriage_customs, marriage_factor,
                fertility_willingness, children_num, gender_preference, fertility_concern, three_child_policy,
                live_with_parents, housework, career_family, factors, jinjiang_feature, policy_suggestion, other_suggestions
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            data.response_id,
            data.ip_address,
            data.user_agent,
            data.completion_time,
            data.jinjiang_type,
            data.gender,
            data.age,
            data.education,
            data.occupation,
            data.income,
            data.housing,
            data.relationship_status,
            data.meet_channel,
            data.mate_priority,
            data.long_distance,
            data.marriage_necessity,
            data.ideal_marriage_age,
            data.cohabitation,
            data.marriage_customs,
            data.marriage_factor,
            data.fertility_willingness,
            data.children_num,
            data.gender_preference,
            data.fertility_concern,
            data.three_child_policy,
            data.live_with_parents,
            data.housework,
            data.career_family,
            data.factors,
            data.jinjiang_feature,
            data.policy_suggestion,
            data.other_suggestions
        ];

        db.run(sql, params, function(err) {
            callback(err, this ? this.lastID : null);
        });
    },

    // 获取所有回答
    getAllResponses: (callback) => {
        db.all('SELECT * FROM survey_responses ORDER BY submit_time DESC', [], callback);
    },

    // 获取回答总数
    getResponseCount: (callback) => {
        db.get('SELECT COUNT(*) as count FROM survey_responses', [], callback);
    },

    // 获取今日回答数
    getTodayCount: (callback) => {
        const today = new Date().toISOString().split('T')[0];
        db.get(
            "SELECT COUNT(*) as count FROM survey_responses WHERE DATE(submit_time) = ?",
            [today],
            callback
        );
    },

    // 获取某个字段的统计分布
    getFieldDistribution: (field, callback) => {
        const sql = `
            SELECT ${field} as value, COUNT(*) as count
            FROM survey_responses
            WHERE ${field} IS NOT NULL
            GROUP BY ${field}
            ORDER BY count DESC
        `;
        db.all(sql, [], callback);
    },

    // 获取多选字段的统计（逗号分隔）
    getMultiSelectDistribution: (field, callback) => {
        const sql = `SELECT ${field} FROM survey_responses WHERE ${field} IS NOT NULL`;
        db.all(sql, [], (err, rows) => {
            if (err) {
                callback(err);
                return;
            }

            const distribution = {};
            rows.forEach(row => {
                const values = row[field].split(',').map(v => v.trim());
                values.forEach(value => {
                    if (value) {
                        distribution[value] = (distribution[value] || 0) + 1;
                    }
                });
            });

            const result = Object.entries(distribution)
                .map(([value, count]) => ({ value, count }))
                .sort((a, b) => b.count - a.count);

            callback(null, result);
        });
    },

    // 分区统计 - 获取晋江本地/工作/其他的统计
    getJinjiangDistribution: (callback) => {
        const sql = `
            SELECT
                CASE
                    WHEN jinjiang_type = 'local' THEN '晋江本地'
                    WHEN jinjiang_type = 'working' THEN '在晋江工作/学习'
                    WHEN jinjiang_type = 'other' THEN '其他地区'
                    ELSE '未填写'
                END as value,
                COUNT(*) as count
            FROM survey_responses
            GROUP BY jinjiang_type
            ORDER BY count DESC
        `;
        db.all(sql, [], callback);
    },

    // 交叉分析
    getCrossAnalysis: (field1, field2, callback) => {
        const sql = `
            SELECT ${field1} as f1, ${field2} as f2, COUNT(*) as count
            FROM survey_responses
            WHERE ${field1} IS NOT NULL AND ${field2} IS NOT NULL
            GROUP BY ${field1}, ${field2}
            ORDER BY ${field1}, ${field2}
        `;
        db.all(sql, [], callback);
    },

    // 获取时间趋势
    getTimeTrend: (callback) => {
        const sql = `
            SELECT DATE(submit_time) as date, COUNT(*) as count
            FROM survey_responses
            GROUP BY DATE(submit_time)
            ORDER BY date DESC
            LIMIT 30
        `;
        db.all(sql, [], callback);
    },

    // 删除回答
    deleteResponse: (id, callback) => {
        db.run('DELETE FROM survey_responses WHERE id = ?', [id], callback);
    },

    // 导出数据为CSV格式
    exportToCSV: (callback) => {
        db.all('SELECT * FROM survey_responses ORDER BY submit_time DESC', [], (err, rows) => {
            if (err) {
                callback(err);
                return;
            }

            if (rows.length === 0) {
                callback(null, '');
                return;
            }

            // 构建CSV
            const headers = Object.keys(rows[0]);
            const csvContent = [
                headers.join(','),
                ...rows.map(row =>
                    headers.map(h => {
                        const val = row[h] || '';
                        // 处理包含逗号的值
                        if (String(val).includes(',')) {
                            return `"${val}"`;
                        }
                        return val;
                    }).join(',')
                )
            ].join('\n');

            callback(null, csvContent);
        });
    }
};

module.exports = dbOperations;
