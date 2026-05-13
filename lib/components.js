/**
 * Dashboard Builder — Reusable UI Components (v2)
 *
 * v2 changes:
 * - Each component driven by a single config object
 * - Unified format enums (currency_wan, percent, days, count)
 * - Component registry for extensibility
 * - Config validation with clear error messages
 * - renderPage() single entry point for JSON-driven dashboards
 *
 * Usage:
 *   const DC = require('./components');
 *   // Low-level: compose with functions
 *   const html = DC.section({ title: '标题', body: DC.kpiRow({ metrics }) });
 *   // High-level: JSON config → full page
 *   const page = DC.renderPage(pageConfig);
 */

// ====== Format Registry ======

const FORMATS = {
  currency_wan: v => v == null || isNaN(v) ? '-' : (v / 10000).toFixed(2) + ' 万元',
  currency_wan_short: v => v == null || isNaN(v) ? '-' : (v / 10000).toFixed(2),
  percent: v => v == null || isNaN(v) ? '-' : (v * 100).toFixed(2) + '%',
  days: v => v == null || isNaN(v) ? '-' : Math.round(v) + ' 天',
  count: v => v == null || isNaN(v) ? '-' : (typeof v === 'number' ? v.toLocaleString('zh-CN') : String(v)),
  raw: v => v == null ? '-' : String(v),
  // Legacy aliases for backward compat
  wan: v => FORMATS.currency_wan(v),
  wanShort: v => FORMATS.currency_wan_short(v),
  pct: v => FORMATS.percent(v),
  num: v => FORMATS.count(v),
};

function fmt(value, format) {
  if (typeof format === 'function') return format(value);
  if (typeof format === 'string' && FORMATS[format]) return FORMATS[format](value);
  return value == null ? '-' : String(value);
}

// Shorthand exports for direct use
const fmtWan = FORMATS.currency_wan;
const fmtWanShort = FORMATS.currency_wan_short;
const fmtPct = FORMATS.percent;
const fmtDays = FORMATS.days;
const fmtNum = FORMATS.count;

// ====== Validation ======

function warn(component, msg) {
  console.warn(`[dashboard-builder] ${component}: ${msg}`);
}

function requireField(component, config, field) {
  if (config[field] == null) {
    warn(component, `缺少必填字段 "${field}"`);
    return false;
  }
  return true;
}

// ====== Utility ======

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** MoM/QoQ change arrow */
function changeArrow(curr, prev, invertColor) {
  if (prev == null || prev === 0 || curr == null) return '';
  const pct = ((curr - prev) / Math.abs(prev) * 100).toFixed(1);
  const isUp = curr > prev;
  const isDown = curr < prev;
  if (!isUp && !isDown) return '<span class="db-kpi-change neutral">\u2192 \u6301\u5e73</span>';
  const arrow = isUp ? '\u2191' : '\u2193';
  let cls = isUp ? 'up' : 'down';
  if (invertColor) cls = isUp ? 'down' : 'up';
  return `<span class="db-kpi-change ${cls}">${arrow} ${Math.abs(pct)}%</span>`;
}

// ====== Component Registry ======

const _registry = {};

function register(name, renderFn) {
  _registry[name] = renderFn;
}

function getComponent(name) {
  return _registry[name] || null;
}

function renderComponent(name, config) {
  const fn = _registry[name];
  if (!fn) {
    warn('renderComponent', `未注册的组件类型 "${name}"，已注册: ${Object.keys(_registry).join(', ')}`);
    return `<div class="db-error">未知组件: ${esc(name)}</div>`;
  }
  return fn(config);
}

// ====== Layout Components ======

/**
 * Page header
 * @param {object} config
 * @param {string} config.title
 * @param {string} [config.meta] - e.g. "数据截至 2026-04-17"
 * @param {string} [config.inner] - additional HTML (e.g. tab bar)
 */
function header(config) {
  if (typeof config === 'string') config = { title: config }; // back-compat
  const { title = '', meta, inner } = config;
  return `<div class="db-header"><div class="db-header-inner">
    <div class="db-header-top">
      <div class="db-header-title">${esc(title)}</div>
      ${meta ? `<div class="db-header-meta">${esc(meta)}</div>` : ''}
    </div>
    ${inner || ''}
  </div></div>`;
}

/**
 * Tab bar
 * @param {object} config
 * @param {Array<{key: string, label: string}>} config.tabs
 * @param {string} [config.active] - active tab key
 * @param {string} [config.onClickFn] - JS function name
 */
function tabBar(config) {
  const { tabs = [], active, onClickFn } = config;
  return `<div class="db-tab-bar">${tabs.map(t =>
    `<button class="db-tab${t.key === active ? ' active' : ''}" data-key="${t.key}"${onClickFn ? ` onclick="${onClickFn}('${t.key}')"` : ''}>${esc(t.label)}</button>`
  ).join('')}</div>`;
}

/**
 * Controls bar
 * @param {object} config
 * @param {string} config.inner - composed from toggleGroup() + select()
 */
function controlsBar(config) {
  const inner = typeof config === 'string' ? config : (config.inner || '');
  return `<div class="db-controls"><div class="db-controls-inner">${inner}</div></div>`;
}

/**
 * Toggle button group
 * @param {object} config
 * @param {Array<{key: string, label: string}>} config.options
 * @param {string} [config.active]
 * @param {string} [config.onClickFn]
 */
function toggleGroup(config) {
  const { options = [], active, onClickFn } = config;
  return `<div class="db-toggle-group">${options.map(o =>
    `<button class="db-toggle-btn${o.key === active ? ' active' : ''}" data-key="${o.key}"${onClickFn ? ` onclick="${onClickFn}('${o.key}')"` : ''}>${esc(o.label)}</button>`
  ).join('')}</div>`;
}

/**
 * Select dropdown
 * @param {object} config
 * @param {Array<{value: string, label: string}>} config.options
 * @param {string} [config.selected]
 * @param {string} [config.id]
 * @param {string} [config.onChangeFn]
 */
function select(config) {
  const { options = [], selected, id, onChangeFn } = config;
  return `<select class="db-select"${id ? ` id="${id}"` : ''}${onChangeFn ? ` onchange="${onChangeFn}(this.value)"` : ''}>
    ${options.map(o => `<option value="${o.value}"${o.value === selected ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}
  </select>`;
}

// ====== Content Components ======

/**
 * Section card
 * @param {object} config
 * @param {string} config.title
 * @param {string} config.body - inner HTML
 */
function section(config) {
  if (!requireField('section', config, 'title')) return '';
  return `<div class="db-section">
    <div class="db-section-header">${esc(config.title)}</div>
    <div class="db-section-body">${config.body || ''}</div>
  </div>`;
}

/**
 * Subtitle (left-bordered heading)
 * @param {object|string} config
 * @param {string} config.text
 */
function subtitle(config) {
  const text = typeof config === 'string' ? config : config.text;
  return `<div class="db-subtitle">${esc(text)}</div>`;
}

/**
 * KPI card row
 * @param {object} config
 * @param {Array<{label: string, value: string|number, unit?: string, format?: string, prevValue?: number, invertColor?: boolean}>} config.metrics
 * @param {number} [config.columns] - force N columns
 */
function kpiRow(config) {
  if (!requireField('kpi-row', config, 'metrics')) return '';
  const { metrics, columns } = config;
  const cols = columns || metrics.length;
  return `<div class="db-kpi-row" style="grid-template-columns:repeat(${cols},1fr)">
    ${metrics.map(m => {
      const display = m.format ? fmt(m.value, m.format) : (m.value == null ? '-' : String(m.value));
      const change = m.prevValue != null ? changeArrow(m.value, m.prevValue, m.invertColor) : (m.change || '');
      return `<div class="db-kpi-card">
      <div class="db-kpi-label">${esc(m.label)}</div>
      <div class="db-kpi-value">${display}</div>
      ${change}
    </div>`;
    }).join('')}
  </div>`;
}

/**
 * Type breakdown (side-by-side group cards)
 * @param {object} config
 * @param {Array<{title: string, metrics: Array<{label: string, value: string}>}>} config.groups
 * @param {number} [config.metricsPerRow]
 */
function typeBreakdown(config) {
  if (!requireField('type-breakdown', config, 'groups')) return '';
  const { groups, metricsPerRow } = config;
  const gridStyle = metricsPerRow ? ` style="grid-template-columns:repeat(${metricsPerRow},1fr)"` : '';
  return `<div class="db-type-row">${groups.map(g =>
    `<div class="db-type-card">
      <div class="db-type-title">${esc(g.title)}</div>
      <div class="db-type-metrics"${gridStyle}>${(g.metrics || []).map(m =>
        `<div class="db-type-metric"><div class="label">${esc(m.label)}</div><div class="value">${m.value}</div></div>`
      ).join('')}</div>
    </div>`
  ).join('')}</div>`;
}

/**
 * Module-level tabs (filter within a section)
 * @param {object} config
 * @param {string} config.groupId - unique ID
 * @param {Array<{key: string, label: string, content: string}>} config.tabs
 */
function moduleTabs(config) {
  if (!requireField('module-tabs', config, 'groupId')) return '';
  const { groupId, tabs = [] } = config;
  let html = `<div class="db-module-tabs">`;
  tabs.forEach((t, i) => {
    html += `<button class="db-module-tab${i === 0 ? ' active' : ''}" onclick="dbSwitchTab('${groupId}','${t.key}',this)">${esc(t.label)}</button>`;
  });
  html += `</div>`;
  tabs.forEach((t, i) => {
    html += `<div class="db-module-tab-content${i === 0 ? ' active' : ''}" data-tab-group="${groupId}" data-tab-key="${t.key}">${t.content}</div>`;
  });
  return html;
}

/**
 * Data table
 * @param {object} config
 * @param {Array<{key: string, label: string, align?: string, format?: string|function, className?: string|function}>} config.columns
 * @param {Array<object>} config.rows
 * @param {function} [config.rowClass] - (row) => className
 */
function dataTable(config) {
  if (!requireField('data-table', config, 'columns')) return '';
  const { columns, rows = [], rowClass } = config;
  if (rows.length === 0) return '<p style="color:var(--db-gray-500);padding:12px 0;">无数据</p>';
  let html = `<div class="db-table-wrap"><table><thead><tr>`;
  for (const col of columns) {
    const cls = col.align === 'right' ? ' class="text-right"' : (col.align === 'center' ? ' class="text-center"' : '');
    html += `<th${cls}>${esc(col.label)}</th>`;
  }
  html += `</tr></thead><tbody>`;
  for (const row of rows) {
    const rc = rowClass ? rowClass(row) : '';
    html += `<tr${rc ? ` class="${rc}"` : ''}>`;
    for (const col of columns) {
      const raw = row[col.key];
      const formatted = fmt(raw, col.format);
      const align = col.align === 'right' ? ' text-right' : (col.align === 'center' ? ' text-center' : '');
      const extra = col.className ? ` ${typeof col.className === 'function' ? col.className(raw, row) : col.className}` : '';
      html += `<td class="${align}${extra}">${formatted}</td>`;
    }
    html += `</tr>`;
  }
  html += `</tbody></table></div>`;
  return html;
}

/**
 * Conclusion list
 * @param {object} config
 * @param {Array<{text: string, type?: string}>} config.items - type: '' | 'warn' | 'bad'
 */
function conclusionList(config) {
  const items = Array.isArray(config) ? config : (config.items || []);
  if (items.length === 0) return '';
  return `<ul class="db-conclusion-list">${items.map(c =>
    `<li class="${c.type || ''}">${esc(c.text)}</li>`
  ).join('')}</ul>`;
}

/**
 * Chart container pair
 * @param {object} config
 * @param {Array<{id: string, title: string}>} config.charts
 */
function chartRow(config) {
  const charts = Array.isArray(config) ? config : (config.charts || []);
  return `<div class="db-charts-row">${charts.map(c =>
    `<div class="db-chart-box">
      <div class="db-chart-title">${esc(c.title)}</div>
      <div class="db-chart-container"><canvas id="${c.id}"></canvas></div>
    </div>`
  ).join('')}</div>`;
}

/**
 * Multi-filter bar — time range + category + person dimensions
 * @param {object} config
 * @param {Array<{key: string, type: string, ...}>} config.filters
 * @param {string} [config.onChangeFn] - JS callback function name
 */
function multiFilter(config) {
  if (!requireField('multi-filter', config, 'filters')) return '';
  const { filters = [], onChangeFn } = config;
  const parts = filters.map(f => {
    if (f.type === 'range-bar') {
      const presets = (f.presets || []).map(p =>
        `<button class="db-toggle-btn${p.active ? ' active' : ''}" data-filter-key="${f.key}" data-value="${p.key}" onclick="dbFilterPreset('${f.key}','${p.key}',this${onChangeFn ? `,'${onChangeFn}'` : ''})">${esc(p.label)}</button>`
      ).join('');
      const custom = f.showCustom ? `<span class="db-filter-custom">
        <input type="date" class="db-filter-date" id="dbFilterStart_${f.key}">
        <span>~</span>
        <input type="date" class="db-filter-date" id="dbFilterEnd_${f.key}">
        <button class="db-toggle-btn" onclick="dbFilterCustomDate('${f.key}'${onChangeFn ? `,'${onChangeFn}'` : ''})">应用</button>
      </span>` : '';
      return `<div class="db-filter-group"><div class="db-toggle-group">${presets}</div>${custom}</div>`;
    }
    if (f.type === 'select') {
      const opts = (f.options || []).map(o =>
        `<option value="${o.value}"${o.value === (f.selected || f.options[0]?.value) ? ' selected' : ''}>${esc(o.label)}</option>`
      ).join('');
      return `<select class="db-select" id="dbFilter_${f.key}" data-filter-key="${f.key}" onchange="dbFilterSelect('${f.key}',this.value${onChangeFn ? `,'${onChangeFn}'` : ''})">${opts}</select>`;
    }
    return '';
  });
  return `<div class="db-multi-filter">${parts.join('')}</div>`;
}

function loading(config) {
  const text = typeof config === 'string' ? config : (config && config.text || '加载数据中...');
  return `<div class="db-loading">${esc(text)}</div>`;
}

function error(config) {
  const msg = typeof config === 'string' ? config : (config && config.message || '出错了');
  return `<div class="db-error">${esc(msg)}</div>`;
}

// ====== Tab Switch Script ======

function tabSwitchScript() {
  return `<script>
function dbSwitchTab(groupId, key, btn) {
  document.querySelectorAll('.db-module-tab-content[data-tab-group="'+groupId+'"]').forEach(function(el) {
    el.classList.toggle('active', el.dataset.tabKey === key);
  });
  btn.closest('.db-module-tabs').querySelectorAll('.db-module-tab').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
}
var _dbFilterState = {};
function dbFilterPreset(key, value, btn, cbName) {
  btn.closest('.db-toggle-group').querySelectorAll('.db-toggle-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  _dbFilterState[key] = { type: 'preset', key: value };
  if (cbName && typeof window[cbName] === 'function') window[cbName](_dbFilterState);
}
function dbFilterCustomDate(key, cbName) {
  var s = document.getElementById('dbFilterStart_' + key);
  var e = document.getElementById('dbFilterEnd_' + key);
  if (s && e && s.value && e.value) {
    _dbFilterState[key] = { type: 'custom', start: s.value, end: e.value };
    if (cbName && typeof window[cbName] === 'function') window[cbName](_dbFilterState);
  }
}
function dbFilterSelect(key, value, cbName) {
  _dbFilterState[key] = value;
  if (cbName && typeof window[cbName] === 'function') window[cbName](_dbFilterState);
}
</script>`;
}

// ====== Register Built-in Components ======

register('kpi-row', kpiRow);
register('data-table', dataTable);
register('type-breakdown', typeBreakdown);
register('module-tabs', moduleTabs);
register('conclusion-list', conclusionList);
register('chart-row', chartRow);
register('section', section);
register('subtitle', subtitle);
register('multi-filter', multiFilter);
register('loading', loading);
register('error', error);

// ====== renderPage — JSON Config → Full Dashboard ======

/**
 * Render a complete dashboard page from a JSON config.
 *
 * @param {object} pageConfig
 * @param {string} pageConfig.title - Dashboard title
 * @param {string} [pageConfig.meta] - Header meta text
 * @param {Array<{type: string, ...}>} pageConfig.modules - Module definitions
 * @param {string} [pageConfig.chartLib] - 'chartjs' | 'none'
 * @param {string} [pageConfig.customCss]
 * @param {string} [pageConfig.customScript]
 * @returns {string} Body HTML (without <html> wrapper — use builder.js for full page)
 *
 * Module definition:
 * {
 *   type: 'section',       // registered component name
 *   title: '经营总览',      // passed to component
 *   body: [                 // nested modules rendered and joined
 *     { type: 'kpi-row', metrics: [...] },
 *     { type: 'data-table', columns: [...], rows: [...] }
 *   ]
 * }
 *
 * Special: if a module has `body` as an array of sub-modules, they are
 * recursively rendered and the result is set as the body string.
 */
function renderPage(pageConfig) {
  if (!pageConfig || !pageConfig.title) {
    warn('renderPage', '缺少 title 字段');
    return error({ message: 'renderPage: 缺少 title 字段' });
  }

  const headerHtml = header({ title: pageConfig.title, meta: pageConfig.meta || '' });
  const bodyHtml = renderModules(pageConfig.modules || []);

  return headerHtml + `<div class="db-main">${bodyHtml}</div>`;
}

/**
 * Recursively render an array of module configs
 */
function renderModules(modules) {
  if (!Array.isArray(modules)) return '';
  return modules.map(mod => {
    if (!mod || !mod.type) {
      warn('renderModules', '模块缺少 type 字段: ' + JSON.stringify(mod));
      return '';
    }
    // If body is an array of sub-modules, render them first
    const config = { ...mod };
    if (Array.isArray(config.body)) {
      config.body = renderModules(config.body);
    }
    return renderComponent(config.type, config);
  }).join('\n');
}

// ====== Exports ======

module.exports = {
  // Format system
  FORMATS, fmt, fmtWan, fmtWanShort, fmtPct, fmtDays, fmtNum,
  // Utility
  esc, changeArrow, warn,
  // Registry
  register, getComponent, renderComponent, renderModules,
  // Layout
  header, tabBar, controlsBar, toggleGroup, select,
  // Content
  section, subtitle, kpiRow, typeBreakdown, moduleTabs,
  dataTable, conclusionList, chartRow, multiFilter,
  loading, error,
  // Page
  renderPage,
  // Script
  tabSwitchScript,
};
