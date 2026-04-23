// 问卷开始时间
let startTime = Date.now();
let currentPart = 1;
const totalParts = 5;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initOptions();
    initMultiSelect();
    initFormSubmit();
    updateProgressIndicator();
});

// 初始化选项交互
function initOptions() {
    // 选项卡片点击效果
    document.querySelectorAll('.option-card').forEach(card => {
        card.addEventListener('click', function(e) {
            const input = this.querySelector('input');
            if (!input) return;

            const isCheckbox = input.type === 'checkbox';
            const name = input.name;

            if (isCheckbox) {
                // 多选逻辑
                const max = getMaxSelections(name);
                const checkedCount = document.querySelectorAll(`input[name="${name}"]:checked`).length;

                if (!input.checked && checkedCount >= max) {
                    e.preventDefault();
                    showToast(`最多选择 ${max} 项`);
                    return;
                }

                input.checked = !input.checked;
                this.classList.toggle('selected', input.checked);
            } else {
                // 单选逻辑 - 清除同组其他选项
                document.querySelectorAll(`input[name="${name}"]`).forEach(radio => {
                    radio.closest('.option-card')?.classList.remove('selected');
                    radio.closest('.option-item')?.classList.remove('selected');
                    radio.closest('.slider-option')?.classList.remove('selected');
                    radio.closest('.balance-option')?.classList.remove('selected');
                });

                input.checked = true;
                this.classList.add('selected');
            }
        });
    });

    // 列表选项点击
    document.querySelectorAll('.option-item, .slider-option, .balance-option').forEach(item => {
        item.addEventListener('click', function() {
            const input = this.querySelector('input');
            if (!input || input.type !== 'radio') return;

            // 清除同组其他选项
            document.querySelectorAll(`input[name="${input.name}"]`).forEach(radio => {
                radio.closest('.option-item')?.classList.remove('selected');
                radio.closest('.slider-option')?.classList.remove('selected');
                radio.closest('.balance-option')?.classList.remove('selected');
            });

            input.checked = true;
            this.classList.add('selected');
        });
    });
}

// 获取最多选择项数
function getMaxSelections(name) {
    const limits = {
        'meet_channel': 2,
        'mate_priority': 3,
        'marriage_factor': 3,
        'fertility_concern': 3,
        'factors': 3,
        'policy_suggestion': 3
    };
    return limits[name] || 999;
}

// 初始化多选限制
function initMultiSelect() {
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const name = this.name;
            const max = getMaxSelections(name);
            const checked = document.querySelectorAll(`input[name="${name}"]:checked`);

            if (checked.length > max) {
                this.checked = false;
                this.closest('.option-card')?.classList.remove('selected');
                showToast(`此题最多选择 ${max} 项`);
            }
        });
    });
}

// 切换到指定部分
function goToPart(part) {
    if (part < 1 || part > totalParts) return;

    // 验证当前部分是否已填写
    if (part > currentPart && !validateCurrentPart()) {
        return;
    }

    // 隐藏当前部分
    document.querySelector(`.form-part[data-part="${currentPart}"]`)?.classList.remove('active');

    // 显示目标部分
    currentPart = part;
    document.querySelector(`.form-part[data-part="${currentPart}"]`)?.classList.add('active');

    // 更新进度指示器
    updateProgressIndicator();

    // 滚动到问卷顶部
    document.getElementById('survey').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 更新进度指示器
function updateProgressIndicator() {
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        const stepNum = index + 1;
        step.classList.remove('active', 'completed');

        if (stepNum === currentPart) {
            step.classList.add('active');
        } else if (stepNum < currentPart) {
            step.classList.add('completed');
        }
    });
}

// 验证当前部分
function validateCurrentPart() {
    const currentPartEl = document.querySelector(`.form-part[data-part="${currentPart}"]`);
    if (!currentPartEl) return true;

    const requiredInputs = currentPartEl.querySelectorAll('input[required]');
    const radioGroups = new Set();

    // 收集必填的单选组
    requiredInputs.forEach(input => {
        if (input.type === 'radio') {
            radioGroups.add(input.name);
        }
    });

    // 检查单选组是否已选
    for (const groupName of radioGroups) {
        const checked = currentPartEl.querySelector(`input[name="${groupName}"]:checked`);
        if (!checked) {
            showToast('请完成当前页面的所有必填项');
            // 找到未填写的问题并滚动到那里
            const firstUnchecked = currentPartEl.querySelector(`input[name="${groupName}"]`);
            if (firstUnchecked) {
                firstUnchecked.closest('.question')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return false;
        }
    }

    return true;
}

// 初始化表单提交
function initFormSubmit() {
    document.getElementById('surveyForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!validateCurrentPart()) {
            return;
        }

        const submitBtn = document.querySelector('.btn-submit');
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
                <circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="20"/>
            </svg>
            提交中...
        `;

        // 收集表单数据
        const formData = new FormData(this);
        const data = {};

        for (let [key, value] of formData.entries()) {
            if (data[key]) {
                data[key] = data[key] + ',' + value;
            } else {
                data[key] = value;
            }
        }

        // 添加完成时间（秒）
        data.completion_time = Math.round((Date.now() - startTime) / 1000);

        try {
            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                // 构建结果页URL参数
                const params = new URLSearchParams();
                for (let [key, value] of Object.entries(data)) {
                    params.append(key, value);
                }
                // 跳转到结果页
                window.location.href = '/result.html?' + params.toString();
            } else {
                showToast('提交失败：' + result.message);
            }
        } catch (error) {
            console.error('提交错误:', error);
            showToast('提交失败，请检查网络连接');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `
                <span>提交问卷</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
            `;
        }
    });
}

// 重置表单
function resetForm() {
    currentPart = 1;
    startTime = Date.now();

    document.querySelectorAll('.form-part').forEach(part => {
        part.classList.remove('active');
    });
    document.querySelector('.form-part[data-part="1"]')?.classList.add('active');

    document.querySelectorAll('.option-card, .option-item, .slider-option, .balance-option').forEach(el => {
        el.classList.remove('selected');
    });

    updateProgressIndicator();
}

// 显示成功弹窗
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.classList.add('show');
}

// 关闭弹窗
function closeModal() {
    const modal = document.getElementById('successModal');
    modal.classList.remove('show');

    // 滚动到页面顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Toast 提示
function showToast(message) {
    // 移除已有的 toast
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 14px 28px;
        border-radius: 50px;
        font-size: 14px;
        z-index: 3000;
        animation: toastIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// 添加 toast 动画样式
const toastStyle = document.createElement('style');
toastStyle.textContent = `
    @keyframes toastIn {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes toastOut {
        from { opacity: 1; transform: translateX(-50%) translateY(0); }
        to { opacity: 0; transform: translateX(-50%) translateY(20px); }
    }
    .spin {
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(toastStyle);

// 点击弹窗外部关闭
window.onclick = function(event) {
    const modal = document.getElementById('successModal');
    if (event.target === modal) {
        closeModal();
    }
}
