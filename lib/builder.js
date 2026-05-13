#!/usr/bin/env node
/**
 * Dashboard Builder — Assembly Engine (v2)
 *
 * Three ways to build:
 * 1. buildFromConfig(pageConfig) — JSON config → standalone HTML (recommended)
 * 2. buildStaticDashboard(config, bodyHtml) — manual body composition
 * 3. buildDashboard(config) — dynamic dashboard with client-side data loading
 */

const fs = require('fs');
const path = require('path');
const C = require('./components');

/**
 * Build a complete standalone HTML from a page config JSON.
 * This is the primary entry point for JSON-driven dashboards.
 *
 * @param {object} pageConfig
 * @param {string} pageConfig.title
 * @param {string} [pageConfig.meta]
 * @param {Array} pageConfig.modules - component definitions
 * @param {string} [pageConfig.chartLib] - 'chartjs' | 'none'
 * @param {string} [pageConfig.customCss]
 * @param {string} [pageConfig.customScript]
 * @returns {string} Complete HTML document
 */
function buildFromConfig(pageConfig) {
  const bodyHtml = C.renderPage(pageConfig);
  return wrapHtml(pageConfig, bodyHtml);
}

/**
 * Build a static dashboard with manually composed body HTML.
 * Use when you need full control over layout.
 */
function buildStaticDashboard(config, bodyHtml) {
  return wrapHtml(config, bodyHtml);
}

/**
 * Build a dynamic dashboard with client-side data loading.
 * Requires window.dbRenderContent to be defined.
 */
function buildDashboard(config) {
  const css = loadCss();

  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${C.esc(config.title || '数据看板')}</title>
${FONT_LINKS}
${config.chartLib === 'chartjs' ? '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>' : ''}
<style>
${css}
${config.customCss || ''}
</style>
</head>
<body>

<div class="db-header"><div class="db-header-inner">
  <div class="db-header-top">
    <div class="db-header-title" id="dbTitle">${C.esc(config.title || '数据看板')}</div>
    <div class="db-header-meta" id="dbMeta"></div>
  </div>
  ${config.platforms ? '<div class="db-tab-bar" id="dbPlatformTabs"></div>' : ''}
</div></div>

${config.views ? `<div class="db-controls"><div class="db-controls-inner">
  <div class="db-toggle-group" id="dbViewToggle"></div>
  <select class="db-select" id="dbPeriodSelect"></select>
</div></div>` : ''}

<div class="db-main" id="dbMain">
  ${C.loading()}
</div>

${C.tabSwitchScript()}
<script>
${generateRuntime(config)}
${config.customScript || ''}
</script>
</body>
</html>`;

  return html;
}

// ====== Internal Helpers ======

function loadCss() {
  return fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf-8');
}

const FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`;

function wrapHtml(config, bodyHtml) {
  const css = loadCss();
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${C.esc(config.title || '数据看板')}</title>
${FONT_LINKS}
${config.chartLib === 'chartjs' ? '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>' : ''}
<style>
${css}
${config.customCss || ''}
</style>
</head>
<body>
${bodyHtml}
${C.tabSwitchScript()}
${config.customScript ? `<script>${config.customScript}</script>` : ''}
</body>
</html>`;
}

function generateRuntime(config) {
  return `
(function() {
  var CONFIG = ${JSON.stringify({
    title: config.title,
    platforms: config.platforms || null,
    views: config.views || null,
    dataPath: config.dataPath || './data/',
    dataFilePattern: config.dataFilePattern || '{platform}.json',
  })};

  var state = {
    platform: CONFIG.platforms ? CONFIG.platforms[0].key : null,
    view: CONFIG.views ? CONFIG.views[0].key : null,
    periodIndex: 0,
    data: null,
  };

  function init() {
    if (CONFIG.platforms) renderPlatformTabs();
    if (CONFIG.views) renderViewToggle();
    loadData();
  }

  function renderPlatformTabs() {
    var el = document.getElementById('dbPlatformTabs');
    if (!el || !CONFIG.platforms) return;
    el.innerHTML = CONFIG.platforms.map(function(p) {
      return '<button class="db-tab' + (p.key === state.platform ? ' active' : '') + '" data-key="' + p.key + '">' + p.name + '</button>';
    }).join('');
    el.querySelectorAll('.db-tab').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.platform = btn.dataset.key;
        state.periodIndex = 0;
        init();
      });
    });
  }

  function renderViewToggle() {
    var el = document.getElementById('dbViewToggle');
    if (!el || !CONFIG.views) return;
    el.innerHTML = CONFIG.views.map(function(v) {
      return '<button class="db-toggle-btn' + (v.key === state.view ? ' active' : '') + '" data-key="' + v.key + '">' + v.label + '</button>';
    }).join('');
    el.querySelectorAll('.db-toggle-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.view = btn.dataset.key;
        state.periodIndex = 0;
        renderContent();
      });
    });
  }

  function loadData() {
    var url = CONFIG.dataPath + CONFIG.dataFilePattern.replace('{platform}', state.platform || 'data');
    fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        state.data = d;
        renderPeriodSelect();
        renderContent();
        var meta = document.getElementById('dbMeta');
        if (meta && d.generatedAt) {
          meta.textContent = '数据生成: ' + new Date(d.generatedAt).toLocaleString('zh-CN');
        }
        if (state.platform && CONFIG.platforms) {
          var pname = CONFIG.platforms.find(function(p) { return p.key === state.platform; });
          document.title = (pname ? pname.name + '—' : '') + CONFIG.title;
          document.getElementById('dbTitle').textContent = (pname ? pname.name + '—' : '') + CONFIG.title;
        }
      })
      .catch(function(e) {
        document.getElementById('dbMain').innerHTML = '<div class="db-error">数据加载失败: ' + e.message + '</div>';
      });
  }

  function renderPeriodSelect() {
    var sel = document.getElementById('dbPeriodSelect');
    if (!sel || !state.data) return;
    var items = state.view === 'monthly' ? (state.data.monthly || []) : (state.data.quarterly || []);
    sel.innerHTML = items.map(function(item, i) {
      var label = item.month || item.quarter || ('Period ' + i);
      return '<option value="' + i + '"' + (i === state.periodIndex ? ' selected' : '') + '>' + label + '</option>';
    }).join('');
    sel.onchange = function() {
      state.periodIndex = parseInt(sel.value);
      renderContent();
    };
  }

  function renderContent() {
    var main = document.getElementById('dbMain');
    if (!state.data) { main.innerHTML = '<div class="db-loading">加载数据中...</div>'; return; }
    var items = state.view === 'monthly' ? (state.data.monthly || []) : (state.data.quarterly || []);
    if (items.length === 0) { main.innerHTML = '<div class="db-loading">当前视图无数据</div>'; return; }
    var idx = Math.min(state.periodIndex, items.length - 1);
    var curr = items[idx];
    var prev = idx > 0 ? items[idx - 1] : null;
    if (typeof window.dbRenderContent === 'function') {
      main.innerHTML = window.dbRenderContent(state, curr, prev, items);
    } else {
      main.innerHTML = '<div class="db-loading">请定义 window.dbRenderContent 函数</div>';
    }
  }

  init();
})();
`;
}

// ====== CLI ======

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node builder.js <page-config.json> [output.html]  — Build from JSON config');
    console.log('  node builder.js --demo [output.html]              — Generate demo page');
    process.exit(0);
  }

  if (args[0] === '--demo') {
    const demoConfig = {
      title: 'Dashboard Builder Demo',
      meta: '组件库演示 — v2',
      modules: [
        {
          type: 'section', title: 'KPI 指标卡',
          body: [{
            type: 'kpi-row',
            metrics: [
              { label: '总项目数', value: '234' },
              { label: '总收入', value: 3921800, format: 'currency_wan' },
              { label: '总利润', value: 1130500, format: 'currency_wan' },
              { label: '利润率', value: 0.2883, format: 'percent' },
            ],
            columns: 4,
          }],
        },
        {
          type: 'section', title: '数据表格',
          body: [{
            type: 'data-table',
            columns: [
              { key: 'name', label: '项目名称' },
              { key: 'revenue', label: '收入', align: 'right', format: 'currency_wan' },
              { key: 'profit', label: '利润', align: 'right', format: 'currency_wan' },
              { key: 'rate', label: '利润率', align: 'right', format: 'percent' },
            ],
            rows: [
              { name: '示例项目A', revenue: 500000, profit: 200000, rate: 0.4 },
              { name: '示例项目B', revenue: 300000, profit: 90000, rate: 0.3 },
              { name: '示例项目C', revenue: 150000, profit: -10000, rate: -0.067 },
            ],
          }],
        },
        {
          type: 'section', title: '分组总览',
          body: [{
            type: 'type-breakdown',
            groups: [
              { title: '常规项目 (180个)', metrics: [
                { label: '总收入', value: '320 万元' },
                { label: '总利润', value: '95 万元' },
                { label: '利润率', value: '29.7%' },
                { label: '平均周转', value: '125 天' },
              ]},
              { title: '特殊项目 (54个)', metrics: [
                { label: '总收入', value: '72 万元' },
                { label: '总利润', value: '18 万元' },
                { label: '利润率', value: '25.0%' },
                { label: '平均周转', value: '98 天' },
              ]},
            ],
            metricsPerRow: 4,
          }],
        },
        {
          type: 'section', title: '结论',
          body: [{
            type: 'conclusion-list',
            items: [
              { text: '整体利润率保持健康水平，环比增长 2.1%' },
              { text: '项目C利润为负，需关注成本控制', type: 'bad' },
              { text: '特殊项目周转天数低于常规项目，效率更高', type: 'warn' },
            ],
          }],
        },
      ],
    };

    const html = buildFromConfig(demoConfig);
    const outPath = args[1] || 'demo-dashboard.html';
    fs.writeFileSync(outPath, html);
    console.log(`Demo written to ${outPath}`);
    process.exit(0);
  }

  // Build from config file
  const configPath = args[0];
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const html = buildFromConfig(config);
  const outPath = args[1] || 'dashboard.html';
  fs.writeFileSync(outPath, html);
  console.log(`Dashboard written to ${outPath}`);
}

module.exports = { buildFromConfig, buildStaticDashboard, buildDashboard };
