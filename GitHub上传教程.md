# GitHub上传代码教程

## 第1步：创建GitHub账号和仓库

### 1.1 注册GitHub账号
1. 打开 https://github.com
2. 点击 "Sign up" 注册账号（如果已有账号直接登录）

### 1.2 创建新仓库
1. 登录后，点击右上角 **+** 号 → **New repository**
2. 填写信息：
   - **Repository name**: `jinjiang-youth-survey` （仓库名称）
   - **Description**: `晋江青年婚育观念调查系统` （描述，可选）
   - **Public** / **Private**: 选 Public（公开，免费）
   - ✅ 勾选 **Add a README file**（添加README）
3. 点击 **Create repository**

---

## 第2步：上传代码到GitHub

### 方法A：用Git命令行上传（推荐）

#### 2.1 检查是否安装了Git
打开终端，输入：
```bash
git --version
```
如果显示版本号（如 `git version 2.39.0`），说明已安装。

如果没安装，Mac用户先安装：
```bash
xcode-select --install
```

#### 2.2 初始化本地仓库
```bash
# 进入项目目录
cd "/Users/kai/Desktop/晋江青年婚育观念调查系统"

# 初始化Git仓库
git init

# 添加所有文件到暂存区
git add .

# 提交文件
git commit -m "初始版本：晋江青年婚育观念调查系统"
```

#### 2.3 连接GitHub仓库
```bash
# 添加远程仓库（把下面的URL换成你自己的仓库地址）
git remote add origin https://github.com/你的用户名/jinjiang-youth-survey.git

# 推送代码到GitHub
git branch -M main
git push -u origin main
```

推送时会要求输入GitHub用户名和密码（或Token）。

---

### 方法B：用GitHub Desktop图形界面（最简单）

#### 2.1 下载GitHub Desktop
1. 访问 https://desktop.github.com
2. 下载并安装

#### 2.2 添加本地仓库
1. 打开GitHub Desktop
2. 点击 **File** → **Add Local Repository**
3. 选择文件夹：`/Users/kai/Desktop/晋江青年婚育观念调查系统`
4. 点击 **Add Repository**

#### 2.3 发布到GitHub
1. 点击 **Publish repository**
2. 填写仓库名：`jinjiang-youth-survey`
3. 勾选 **Keep this code private**（如果要私有）
4. 点击 **Publish Repository**

---

### 方法C：直接网页拖拽上传（最快，但不太专业）

#### 2.1 打包代码
```bash
# 在项目目录的父目录执行
cd "/Users/kai/Desktop"
zip -r 晋江青年婚育观念调查系统.zip 晋江青年婚育观念调查系统/ -x "*/node_modules/*" "*/.DS_Store"
```

#### 2.2 网页上传
1. 在GitHub仓库页面，点击 **Add file** → **Upload files**
2. 把zip文件拖进去上传
3. 点击 **Commit changes**

---

## 第3步：验证上传成功

1. 刷新GitHub仓库页面
2. 应该能看到所有文件：
   - server.js
   - package.json
   - public/
   - admin/
   - database/
   - README.md

---

## 第4步：部署到Railway（自动部署）

### 4.1 登录Railway
1. 访问 https://railway.app
2. 点击 **Login**，选择 **Continue with GitHub**
3. 授权Railway访问你的GitHub仓库

### 4.2 创建项目
1. 点击 **New Project**
2. 选择 **Deploy from GitHub repo**
3. 找到并选择 `jinjiang-youth-survey` 仓库
4. Railway会自动检测Node.js项目并部署

### 4.3 获取访问地址
1. 等待部署完成（约1-2分钟）
2. 点击项目名，进入设置
3. 会看到类似 `jinjiang-youth-survey-production-xxx.up.railway.app` 的域名
4. 点击即可访问！

---

## 常用Git命令速查

```bash
# 查看当前状态
git status

# 添加文件到暂存区
git add 文件名
git add .                    # 添加所有文件

# 提交更改
git commit -m "描述信息"

# 推送到GitHub
git push

# 拉取最新代码
git pull

# 查看提交历史
git log
```

---

## 可能遇到的问题

### 1. 提示 "Permission denied"
需要配置SSH密钥或改用HTTPS方式：
```bash
# 改用HTTPS
git remote set-url origin https://github.com/用户名/仓库名.git
```

### 2. node_modules文件夹太大
应该忽略不上传：
```bash
# 创建.gitignore文件
echo "node_modules/" > .gitignore
echo "database/survey.db" >> .gitignore
echo ".DS_Store" >> .gitignore

git add .gitignore
git commit -m "添加gitignore"
git push
```

### 3. 忘记GitHub密码
访问 https://github.com/password_reset 重置

---

## 下一步

上传成功后，你的代码就在GitHub上了：
- 地址：`https://github.com/你的用户名/jinjiang-youth-survey`
- 部署到Railway后，获得一个公开链接
- 把链接发给朋友填写问卷
- 后台数据实时查看
