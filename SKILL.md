---
name: dashboard-builder
description: >-
  看板组件库。从已有看板中提炼出的可复用UI组件和构建引擎，
  用于快速搭建新的数据看板。包含KPI卡片、数据表格、分组对比卡片、
  图表容器、Tab切换等组件，以及完整的页面布局系统。
  其他AI员工也可调用此组件库。
user-invocable: false
---

# Dashboard Builder — 看板组件库 v2

## 3步速建指南

任何AI员工都可以用这3步快速出看板：

### Step 1: 准备数据 JSON

把数据整理成标准JSON。字段随意，组件不关心数据结构——你在config里指定字段映射。

```json
{
  "projects": [
    { "name": "项目A", "revenue": 500000, "profit": 200000, "rate": 0.4 },
    { "name": "项目B", "revenue": 300000, "profit": 90000, "rate": 0.3 }
  ]
}
```

### Step 2: 写 Page Config

一个JSON描述一个完整看板。`modules` 数组里按顺序排列组件：

```json
{
  "title": "项目经营分析看板",
  "meta": "数据截至 2026-04-17",
  "modules": [
    {
      "type": "section",
      "title": "经营总览",
      "body": [
        {
          "type": "kpi-row",
          "columns": 4,
          "metrics": [
            { "label": "项目数", "value": "41" },
            { "label": "总收入", "value": 3921800, "format": "currency_wan" },
            { "label": "总利润", "value": 1130500, "format": "currency_wan" },
            { "label": "利润率", "value": 0.2883, "format": "percent" }
          ]
        }
      ]
    },
    {
      "type": "section",
      "title": "项目明细",
      "body": [
        {
          "type": "data-table",
          "columns": [
            { "key": "name", "label": "项目名称" },
            { "key": "revenue", "label": "收入", "align": "right", "format": "currency_wan" },
            { "key": "profit", "label": "利润", "align": "right", "format": "currency_wan" },
            { "key": "rate", "label": "利润率", "align": "right", "format": "percent" }
          ],
          "rows": []
        }
      ]
    }
  ]
}
```

### Step 3: 生成 HTML

```bash
# CLI方式
node ~/zylos/.claude/skills/dashboard-builder/lib/builder.js page-config.json output.html

# 或在代码中
const { buildFromConfig } = require('~/zylos/.claude/skills/dashboard-builder/lib/builder');
const html = buildFromConfig(pageConfig);
fs.writeFileSync('dashboard.html', html);
```

完成！打开 `output.html` 即可看到看板。

---

## 组件清单

### 格式化枚举

所有组件统一使用以下格式：

| 枚举值 | 效果 | 示例 |
|--------|------|------|
| `currency_wan` | 万元（保留2位） | 3921800 → "392.18 万元" |
| `currency_wan_short` | 万元数字（无单位） | 3921800 → "392.18" |
| `percent` | 百分比 | 0.2883 → "28.83%" |
| `days` | 天数（取整） | 125.7 → "126 天" |
| `count` | 千分位数字 | 12345 → "12,345" |
| `raw` | 原样输出 | "abc" → "abc" |

### 布局组件

| 组件类型 | 用途 | 必填字段 |
|----------|------|----------|
| `section` | 白色卡片容器 | `title`, `body`(子组件数组或HTML) |
| `subtitle` | 子标题（带左边框） | `text` |

### 数据展示组件

| 组件类型 | 用途 | 必填字段 |
|----------|------|----------|
| `kpi-row` | 一行N个KPI卡片 | `metrics`(数组) |
| `data-table` | 可配置列+格式化的表格 | `columns`, `rows` |
| `type-breakdown` | 分组对比卡片（常规/雀巢等） | `groups`(数组) |
| `module-tabs` | 模块内Tab切换 | `groupId`, `tabs`(数组) |
| `conclusion-list` | 带颜色标记的结论条目 | `items`(数组) |
| `chart-row` | Chart.js图表并排 | `charts`(数组) |

### 组件配置详解

#### kpi-row

```json
{
  "type": "kpi-row",
  "columns": 4,
  "metrics": [
    {
      "label": "总收入",
      "value": 3921800,
      "format": "currency_wan",
      "prevValue": 3500000,
      "invertColor": false
    }
  ]
}
```

- `value`: 显示值。如果指定了 `format`，会自动格式化原始数字
- `prevValue`: 上期值，自动计算环比箭头
- `invertColor`: 上升显示红色（用于成本等指标）

#### data-table

```json
{
  "type": "data-table",
  "columns": [
    { "key": "name", "label": "项目名称" },
    { "key": "revenue", "label": "收入", "align": "right", "format": "currency_wan" },
    { "key": "rate", "label": "利润率", "align": "right", "format": "percent", "className": "highlight" }
  ],
  "rows": [...]
}
```

- `align`: `left`(默认) / `right` / `center`
- `format`: 格式化枚举名（见上表）
- `className`: 固定class或函数 `(value, row) => className`

#### type-breakdown

```json
{
  "type": "type-breakdown",
  "metricsPerRow": 4,
  "groups": [
    {
      "title": "常规项目 (180个)",
      "metrics": [
        { "label": "总收入", "value": "320 万元" },
        { "label": "利润率", "value": "29.7%" }
      ]
    }
  ]
}
```

#### module-tabs

```json
{
  "type": "module-tabs",
  "groupId": "module2-tabs",
  "tabs": [
    { "key": "all", "label": "全部", "content": "<html-string>" },
    { "key": "regular", "label": "常规", "content": "<html-string>" }
  ]
}
```

#### conclusion-list

```json
{
  "type": "conclusion-list",
  "items": [
    { "text": "利润率健康", "type": "" },
    { "text": "成本偏高，需关注", "type": "warn" },
    { "text": "项目C亏损", "type": "bad" }
  ]
}
```

## 三种构建模式

| 模式 | 函数 | 适用场景 |
|------|------|----------|
| **JSON配置（推荐）** | `buildFromConfig(config)` | 简单看板，其他AI员工使用 |
| 代码组装 | `buildStaticDashboard(config, bodyHtml)` | 复杂布局，需要自定义逻辑 |
| 动态加载 | `buildDashboard(config)` | 多平台/多时间段切换 |

## 实战模式库

以下模式从已有看板中提炼，可直接复用。

### 密码门控（auth-gate）

适用于需要按平台/角色控制访问权限的看板。前端实现，适合非敏感数据。

```javascript
// 在 customScript 中添加
function showPasswordGate(platformKey) {
  const container = document.getElementById('dbMain');
  container.innerHTML = `
    <div class="db-auth-gate">
      <h3>请输入访问密码</h3>
      <input type="password" id="authPwd" class="db-auth-input" placeholder="密码">
      <button class="db-auth-btn" onclick="checkAuth('${platformKey}')">确认</button>
    </div>`;
}

// 密码哈希校验 + localStorage缓存
const PASSWORDS = { xhs: 'sha256hash...', zhihu: 'sha256hash...' };
function checkAuth(key) {
  const pwd = document.getElementById('authPwd').value;
  if (sha256(pwd) === PASSWORDS[key]) {
    localStorage.setItem('auth_' + key, '1');
    renderContent(); // 通过后渲染实际内容
  }
}
function isAuthed(key) { return localStorage.getItem('auth_' + key) === '1'; }
```

**来源**: 项目经营分析看板。**注意**: 仅适合内部看板，密码哈希暴露在前端，不防技术人员。

### 多维度过滤（multi-filter）

内置组件，支持时间范围 + 类别 + 人员三个维度独立过滤。

```json
{
  "type": "multi-filter",
  "filters": [
    {
      "key": "dateRange",
      "type": "range-bar",
      "presets": [
        { "key": "4w", "label": "近4周" },
        { "key": "month", "label": "本月" },
        { "key": "quarter", "label": "本季度" },
        { "key": "year", "label": "本年" }
      ],
      "showCustom": true
    },
    {
      "key": "customerType",
      "type": "select",
      "label": "客户类型",
      "options": [
        { "value": "all", "label": "全部" },
        { "value": "direct", "label": "直客" },
        { "value": "agency", "label": "代理" }
      ]
    },
    {
      "key": "salesperson",
      "type": "select",
      "label": "销售人员",
      "options": [
        { "value": "all", "label": "全部" }
      ]
    }
  ],
  "onChangeFn": "onFilterChange"
}
```

前端需定义 `onFilterChange(filters)` 回调函数，接收当前各维度的筛选值：
```javascript
function onFilterChange(filters) {
  // filters = { dateRange: { type:'preset', key:'4w' }, customerType: 'direct', salesperson: 'all' }
  const filtered = applyFilters(rawData, filters);
  recomputeKPIs(filtered);
  renderContent();
}
```

**来源**: 知乎商务看板（时间+客户类型+销售人员三维过滤）。

### 时间范围双模态（range-bar）

`multi-filter` 的子组件，支持预设快捷按钮 + 自定义日期范围。

- 预设模式：点击按钮直接过滤（4周/月/季/年），自动计算环比/同比
- 自定义模式：显示日期选择器 + "应用"按钮，不计算环比（无参照期）

**来源**: 知乎商务看板。

### PM分组分析

适用于需要按人员分组聚合分析的场景（如按PM、按销售）。

```javascript
// 1. 定义分组配置（JSON驱动）
const PM_GROUPS = {
  "AE组": ["张三", "李四"],
  "大发组": ["王五", "赵六"],
  // ...
};

// 2. 通用分组聚合函数
function groupKPI(projects, groupConfig) {
  const result = {};
  for (const [groupName, members] of Object.entries(groupConfig)) {
    const grouped = projects.filter(p => members.includes(p.pm));
    result[groupName] = {
      count: grouped.length,
      revenue: grouped.reduce((s, p) => s + p.revenue, 0),
      profit: grouped.reduce((s, p) => s + p.profit, 0),
    };
    result[groupName].rate = result[groupName].revenue ? result[groupName].profit / result[groupName].revenue : 0;
  }
  return result;
}

// 3. 渲染为type-breakdown组件
const groups = Object.entries(groupKPI(projects, PM_GROUPS)).map(([name, kpi]) => ({
  title: `${name} (${kpi.count}个)`,
  metrics: [
    { label: '收入', value: fmtWan(kpi.revenue) },
    { label: '利润率', value: fmtPct(kpi.rate) },
  ]
}));
```

**来源**: 项目经营分析看板（5个PM组 + ungrouped）。

### 洞察自动生成

根据KPI与阈值自动生成彩色结论条目，避免手写结论。

```javascript
function generateInsights(kpis, thresholds) {
  const items = [];
  if (kpis.profitRate >= thresholds.profitRateGood)
    items.push({ text: `利润率 ${fmtPct(kpis.profitRate)}，保持健康水平`, type: '' });
  else if (kpis.profitRate < thresholds.profitRateBad)
    items.push({ text: `利润率 ${fmtPct(kpis.profitRate)}，低于目标 ${fmtPct(thresholds.profitRateBad)}`, type: 'bad' });

  if (kpis.avgDays > thresholds.daysWarn)
    items.push({ text: `平均周期 ${kpis.avgDays} 天，超过 ${thresholds.daysWarn} 天警戒线`, type: 'warn' });

  return items; // 直接传给 conclusion-list 组件
}
```

**来源**: 项目分析+知乎看板均有使用，逻辑一致。

### 多平台Tab架构

同一HTML支持多平台独立数据和视图，点击Tab切换时重载数据。

```javascript
// buildDashboard config 中定义
{
  platforms: [
    { key: 'xhs', name: '小红书' },
    { key: 'zhihu', name: '知乎' },
    { key: 'bilibili', name: 'B站' },
    { key: 'overseas', name: '海外' },
  ],
  dataFilePattern: '{platform}.json', // 按平台加载不同数据文件
}
```

使用 `buildDashboard()` 模式时自动支持。每个平台的数据结构保持一致，UI逻辑在 `dbRenderContent` 中统一处理。

**来源**: 项目经营分析看板（4个平台独立数据）。

## 扩展组件

```javascript
const DC = require('./lib/components');

// 注册自定义组件
DC.register('my-widget', function(config) {
  return '<div class="db-my-widget">' + DC.esc(config.text) + '</div>';
});

// 之后在page config中使用
// { "type": "my-widget", "text": "Hello" }
```

## 部署到 zhiw.ai

看板部署到 Vercel (zhiw.ai) 时：

1. **Git author 必须为** `snoopylion@gmail.com`，否则 Vercel 部署会失败
2. 目标 repo: `HeXiaobo/zhiwai`，路径 `web/private-dashboard/<看板名>/`（走认证路由，需登录才能访问）
3. push 前需将 `vercel.json` 中 `ignoreCommand` 改为 `"exit 1"` 触发构建，部署完成后改回 `"exit 0"`
4. 看板 URL 格式: `https://zhiw.ai/dashboard/<看板名>/`

**⚠ 禁止将看板 HTML 放到 `web/public/dashboard/` 下** — 该目录无认证，任何人拿到链接即可直接访问。仅允许在 `public/` 下存放纯数据文件（JSON）。

```bash
# 示例 commit
git -c user.name="HeXiaobo" -c user.email="snoopylion@gmail.com" commit -m "Add dashboard"
```

## 数据策略

三种标准模式，搭建前先选定一种，不要混用。

### 模式A：纯静态内嵌（推荐）

构建时将数据序列化后嵌入HTML，单文件自包含。

```javascript
// build.js 中
const html = `<script>window.__DATA__ = ${JSON.stringify(data)};</script>`;

// 前端 init() 中
state.data = window.__DATA__;
```

- **优点**: 零依赖，部署到任何环境都能跑，无 CORS/路径问题
- **缺点**: 数据更新需重新构建HTML
- **适用**: 报告类看板（月报/季报/结项报告），数据固定不变
- **构建函数**: `buildFromConfig()` 或 `buildStaticDashboard()`

### 模式B：定时生成（频繁更新）

周期脚本拉取数据生成JSON，HTML加载最新JSON文件。数据和页面分离。

```javascript
// 定时脚本 (cron/scheduler) 每天运行
const data = await fetchFromAPI();
fs.writeFileSync('data/dashboard-data.json', JSON.stringify(data));

// HTML中（同域部署时）
fetch('./data/dashboard-data.json').then(r => r.json()).then(render);
```

- **优点**: 数据自动更新，无需重建HTML
- **缺点**: 需要同域部署（Vercel上用相对路径会返回HTML 404）
- **适用**: 日报/周报类看板，数据每天更新
- **注意**: Vercel部署时改用模式A（构建时内嵌），或将JSON放在同域API路径下

### 模式C：实时API（交互强）

前端直接fetch API，支持用户过滤后实时刷新。

```javascript
// 前端
async function loadData(filters) {
  const params = new URLSearchParams(filters);
  const data = await fetch(`/api/dashboard?${params}`).then(r => r.json());
  renderContent(data);
}
```

- **优点**: 数据实时，支持动态过滤和交互
- **缺点**: 需要后端API支持，复杂度最高
- **适用**: 运营看板，用户需要按维度自由筛选
- **构建函数**: `buildDashboard()`

### 选择决策树

```
数据会变吗？
├─ 不变 → 模式A（纯静态内嵌）
└─ 会变
   ├─ 用户需要实时交互过滤？
   │  ├─ 是 → 模式C（实时API）
   │  └─ 否 → 模式B（定时生成）
   └─ 部署在Vercel？
      └─ 是 → 改用模式A（构建时内嵌最新数据）
```

### 数据可追溯

保留原始拉取的 JSON 文件（如 `data/renkuan.json`），不部署但本地留存。
当需求方质疑数据时，可从原始记录中查出每条明细（项目名、金额、日期），
做到数据可追溯、可验证。

## UI 规范 v2.0（必读）

**完整规范文件**：`references/dashboard-spec-v2.md`

搭建任何看板前**必须先读**该文件。包含：
- 色板系统（--text/--yellow/--border/--bg 等）
- 排版规范（字体栈、字号、字重完整对照表）
- 组件骨架（Header/Tab/KPI/卡片/表格/Footer 的 HTML+CSS）
- 数据加载方式（外部JSON / 内嵌 window.__DATA__）
- Chart.js 默认配色
- 命名约定（文件路径/CSS类名/JS变量/术语）
- 质检 Checklist（15项，新看板必过）
- 不允许的事（8条红线）

关键速查：
| Token | 值 |
|-------|-----|
| 字体栈 | `'Inter', 'PingFang SC', 'Helvetica Neue', Arial, sans-serif` |
| 主色 | #000（黑色） |
| 强调色 | #FFD25F（黄色） |
| 边框 | 1px solid var(--border)，Header/表头 2px solid #000 |
| 圆角 | 14px |
| KPI数字 | 40px / font-weight 800 |
| 容器宽度 | 1200px |

**禁止**：自建 --db-*/--primary-* 色板、div 代替 h1、缺少空状态/错误兜底

## 设计原则

1. **组件无状态** — 输入config，输出HTML字符串
2. **CSS前缀隔离** — 所有class用 `db-` 前缀
3. **格式化内置** — 统一枚举，调用方不写格式化逻辑
4. **配置校验** — 缺字段时 console.warn 明确提示
5. **渐进复杂** — 简单用JSON config，复杂用代码组装
6. **可被其他AI调用** — 纯函数 + JSON驱动，无隐式依赖

## 文件结构

```
lib/
├── styles.css      # 共享CSS（db-前缀）
├── components.js   # UI组件 + renderPage + 组件注册
└── builder.js      # HTML生成引擎（3种模式）
```
