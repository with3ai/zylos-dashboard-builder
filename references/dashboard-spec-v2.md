# 知外看板 UI 规范 v2.0

**适用**：知乎/小红书/抖音/B站/海外 等所有 dashboard 类业务看板
**目录**：`/web/public/dashboard/{platform}/index.html`
**维护**：aqi 主导，Zylos 协同 review

---

## 一、色板系统（必须统一）

```css
:root {
  --text:   #000000;
  --text-2: #4D4D4D;
  --text-3: #888888;
  --bg:     #FFFFFF;
  --bg-sub: #FAFAFA;
  --border: #E5E5E5;
  --yellow:    #FFD25F;
  --yellow-bg: #FFF5D1;
  --danger:        #DC2626;
  --danger-bg:     #FEF2F2;
  --danger-border: #FECACA;
  --shadow:    0 2px 8px  rgba(0,0,0,0.06);
  --shadow-lg: 0 4px 16px rgba(0,0,0,0.08);
}
```

**不允许**：自建 --db-* / --accent-* / --primary-* 等独立色板；蓝/紫/绿作为主色（紫仅限 xhs P4 团队效能特例）

## 二、排版规范

```css
body {
  font-family: 'Inter', 'PingFang SC', 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px; line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
```

| 元素 | font-size | font-weight |
|------|-----------|-------------|
| h1 主标题 | 28px | 700 |
| h3 卡片标题 | 15px | 700 |
| KPI 数字 | **40px** | **800** |
| KPI 单位 | 16px | 600 |
| KPI label | 12px | 600 |
| 表格 th | 11px | 600 |
| 表格 td | 13px | 数字列 700 |
| Footer | 11px | 500 |

## 三、组件骨架

### Header（必须 h1 + .hl 黄色高亮）
```html
<header>
  <div class="title-block">
    <h1>知乎 <span class="hl">商务看板</span></h1>
  </div>
  <div class="meta-block">
    <span class="updated">更新：<span id="updated-time">—</span></span>
  </div>
</header>
```
```css
header { display: flex; align-items: flex-end; justify-content: space-between;
         flex-wrap: wrap; gap: 16px;
         padding-bottom: 20px; margin-bottom: 28px;
         border-bottom: 2px solid #000; }
.title-block h1 .hl { background: var(--yellow); padding: 0 6px; display: inline-block; }
```

### Tab
```css
.tabs { display: flex; margin-bottom: 28px; border-bottom: 1px solid var(--border); }
.tab { padding: 12px 22px; font-size: 14px; font-weight: 600;
       color: var(--text-2); background: none; border: 0;
       border-bottom: 3px solid transparent; cursor: pointer; }
.tab.active { color: #000; border-bottom-color: #000; }
.tab.active::after { content: ''; display: inline-block; width: 6px; height: 6px;
       background: var(--yellow); border-radius: 50%; margin-left: 8px; vertical-align: middle; }
```

### Panel（Tab 内容）
```css
.panel { display: none; }
.panel.active { display: block; }
```

### KPI
```css
.kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.kpi { background: var(--bg); border: 1px solid var(--border);
       border-radius: 14px; padding: 22px 24px; }
.kpi.highlight { background: var(--yellow-bg); border-color: var(--yellow); }
.kpi .value { font-size: 40px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; }
```

### 卡片
```css
.card { background: var(--bg); border: 1px solid var(--border);
        border-radius: 14px; padding: 22px; margin-bottom: 16px; }
.card h3 { font-size: 15px; font-weight: 700; color: #000; margin-bottom: 16px; }
```

### 表格
```css
table { width: 100%; border-collapse: collapse; font-size: 13px; }
thead th { text-align: left; font-weight: 600; color: var(--text-2);
           font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase;
           padding: 10px; border-bottom: 2px solid #000; }
tbody td { padding: 12px 10px; border-bottom: 1px solid var(--border); }
tbody td.num { text-align: right; font-weight: 700; }
```

### Footer（必须）
```css
footer { margin-top: 48px; padding-top: 20px;
         border-top: 1px solid var(--border);
         text-align: center; font-size: 11px; color: var(--text-3); }
```

### 响应式
```css
@media (max-width: 768px) {
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
  .kpi .value { font-size: 30px; }
  header { flex-direction: column; align-items: flex-start; }
}
```

### 容器
```css
.app { max-width: 1200px; margin: 0 auto; padding: 28px 24px 60px; }
```

## 四、页面标题（必须带 · 知外 后缀）

```html
<title>{看板名} · 知外</title>
```

## 五、数据加载

### A. 外部 JSON（推荐）
```js
async function loadData(range='4w') {
  const res = await fetch(`/dashboard/{platform}/latest.json?range=${range}&_=${Date.now()}`);
  return res.json();
}
```

### B. 内嵌 window.__DATA__（静态预生成）

### 加载失败兜底（必须）
```js
try { render(await loadData()); }
catch (err) {
  document.body.innerHTML = '<pre style="padding:40px;color:#DC2626">加载数据失败：' + err.message + '</pre>';
}
```

### 空数据（必须）
```js
if (!rows.length) {
  tbody.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;color:#888;padding:20px">无数据</td></tr>`;
}
```

## 六、Chart.js 默认

```js
Chart.defaults.font.family = 'Inter, "PingFang SC", sans-serif';
Chart.defaults.font.size = 12;
Chart.defaults.color = '#4D4D4D';
const CHART_COLORS = ['#000000', '#FFD25F', '#888888', '#DC2626', '#4D4D4D', '#E5E5E5'];
```

## 七、命名约定

| 场景 | 规范 |
|------|------|
| 文件路径 | `/web/public/dashboard/{platform}/index.html` |
| 数据路径 | `/web/public/dashboard/{platform}/latest.json` |
| CSS 类名 | 小写连字符（.kpi-row） |
| JS 变量 | camelCase |
| 术语 | 参照 CRM：建项 / 订单金额 / 回款 / 新签客户 / 策划经理（非项目经理） |

## 八、质检 Checklist（建新看板或改完必过）

- [ ] `<title>` 带「· 知外」后缀
- [ ] Header 用 `<h1>`，含 `.hl` 黄色高亮 span
- [ ] CSS 变量用既有命名，无 --db-* 等独立色板
- [ ] Header 下边框 `2px solid #000`
- [ ] KPI 数字 font-size 40px + font-weight 800
- [ ] 卡片圆角 14px，边框 1px solid var(--border)
- [ ] Tab 用 `.tabs / .tab`，激活态黄色圆点 ::after
- [ ] Panel 用 `.panel.active` 切换
- [ ] 字体栈 `'Inter', 'PingFang SC', ...`（中文前置）
- [ ] Container max-width 1200px
- [ ] Footer 含数据来源+刷新时间
- [ ] 空数据占位"无数据"
- [ ] 加载失败兜底
- [ ] 响应式 @768px 测试
- [ ] 术语与 CRM/其他看板一致

## 九、不允许的事

- 自建独立色板系统（--db-*, --primary-* 等）
- 用 `<div>` 代替 `<h1>` 做标题
- 页面标题不带「· 知外」后缀
- KPI 数字字号 < 36px
- 卡片圆角非 14px
- 忽略空状态/加载错误态
- 中文字体顺序靠后
- 术语与 CRM 不一致

## 参考实现

- `/dashboard/zhihu/index.html` — 基础看板
- `/dashboard/xiaohongshu/index.html` — 多 Tab + 时间筛选
- `/dashboard/project-analysis/zhihu/index.html` — 最新规范实现

## 版本

- v2.0 (2026-04-17) — 首版规范，基于 zhihu-commercial review 提炼
  - Zylos + aqi 协同，波总审核拍板
