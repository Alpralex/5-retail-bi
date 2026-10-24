// Generates the PBIR pages, visuals and "M5 Retail" theme for powerbi/M5RetailBI.Report.
// Run from the repo root: node scripts/build_powerbi_report.mjs
// The script owns every page listed in PAGES and the M5Retail theme; it rewrites them on each run.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const REPORT = path.resolve("powerbi/M5RetailBI.Report");
const DEF = path.join(REPORT, "definition");
const VISUAL_SCHEMA = "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.9.0/schema.json";
const PAGE_SCHEMA = "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.1.0/schema.json";

const C = {
  page: "#F5F6F4", card: "#FFFFFF", border: "#D6DBD9", text: "#16202A", muted: "#5A6670", grid: "#E6E9E8",
  blue: "#2A78D6", orange: "#EB6834", green: "#1BAF7A", alert: "#B45309", grey: "#5A6670",
  seqMin: "#CDE2FB", seqMax: "#256ABF",
};

// ---------- expression helpers ----------
const lit = (v) => ({ expr: { Literal: { Value: v } } });
const str = (s) => lit(`'${s.replace(/'/g, "''")}'`);
const num = (n) => lit(`${n}D`);
const int = (n) => lit(`${n}L`);
const bool = (b) => lit(b ? "true" : "false");
const fill = (hex) => ({ solid: { color: lit(`'${hex}'`) } });
const col = (entity, prop) => ({ Column: { Expression: { SourceRef: { Entity: entity } }, Property: prop } });
const meas = (entity, prop) => ({ Measure: { Expression: { SourceRef: { Entity: entity } }, Property: prop } });
const proj = (field) => {
  const f = field.Column || field.Measure;
  const entity = f.Expression.SourceRef.Entity;
  return { field, queryRef: `${entity}.${f.Property}`, nativeQueryRef: f.Property };
};
const ref = (field) => proj(field).queryRef;
const id = (...parts) => crypto.createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 20);
const filterId = (...parts) => "Filter" + crypto.createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 24);

// ---------- fields ----------
const F = {
  category: col("dim_dept", "category_name"),
  store: col("dim_store", "store_id"),
  state: col("dim_store", "state_name"),
  week: col("dim_date", "week_start"),
  day: col("dim_date", "date_day"),
  revenue: meas("fct_sales", "Revenue"),
  rev52: meas("fct_sales", "Revenue Last 52 Weeks"),
  rev52yoy: meas("fct_sales", "Revenue 52w YoY %"),
  wape: meas("fct_forecast", "WAPE Store-Day %"),
  bias: meas("fct_forecast", "Forecast Bias %"),
  actual: meas("fct_forecast", "Actual Units"),
  forecast: meas("fct_forecast", "Forecast Units"),
  lost: meas("stockout_runs", "Est. Lost Revenue"),
  lostPct: meas("stockout_runs", "Lost % of Revenue"),
  runs: meas("stockout_runs", "Stock-out Runs"),
  soItem: col("stockout_runs", "item_id"),
  soStore: col("stockout_runs", "store_id"),
  soStart: col("stockout_runs", "run_start"),
  soDays: col("stockout_runs", "run_days"),
};

// ---------- visual builders ----------
let z = 0;
function container(page, key, pos, visual, extra = {}) {
  z += 1000;
  return {
    $schema: VISUAL_SCHEMA,
    name: id(page, key),
    position: { x: pos.x, y: pos.y, z, height: pos.h, width: pos.w, tabOrder: z },
    visual,
    ...extra,
  };
}

const vcoPadding = (p) => ({ properties: { top: num(p), bottom: num(p), left: num(p), right: num(p) } });

function chartVcos(title, alt, subtitle) {
  const v = {
    title: [{ properties: { show: bool(true), text: str(title) } }],
    general: [{ properties: { altText: str(alt) } }],
    padding: [vcoPadding(12)],
  };
  // Without an explicit subtitle Desktop shows an auto-generated one in the UI language.
  v.subTitle = [{ properties: subtitle ? { show: bool(true), text: str(subtitle) } : { show: bool(false) } }];
  return v;
}

function textbox(page, key, pos, text, style) {
  return container(page, key, pos, {
    visualType: "textbox",
    objects: {
      general: [{
        properties: {
          paragraphs: [{ textRuns: [{ value: text, textStyle: style }], horizontalTextAlignment: "left" }],
        },
      }],
    },
    visualContainerObjects: {
      background: [{ properties: { show: bool(false) } }],
      border: [{ properties: { show: bool(false) } }],
      padding: [vcoPadding(0)],
    },
  });
}

function header(page, title, subtitle) {
  return [
    textbox(page, "title", { x: 16, y: 16, w: 680, h: 40 }, title,
      { fontFamily: "Segoe UI Semibold", fontSize: "22px", color: C.text }),
    textbox(page, "subtitle", { x: 16, y: 60, w: 680, h: 28 }, subtitle,
      { fontFamily: "Segoe UI", fontSize: "13px", color: C.muted }),
  ];
}

function slicers(page) {
  const category = container(page, "slicer_category", { x: 712, y: 16, w: 376, h: 104 }, {
    visualType: "advancedSlicerVisual",
    syncGroup: { groupName: "CategorySync", fieldChanges: true, filterChanges: true },
    query: { queryState: { Values: { projections: [proj(F.category)] } } },
    objects: {
      layout: [{ properties: { rowCount: int(1), columnCount: int(3) } }],
    },
    visualContainerObjects: {
      title: [{ properties: { show: bool(true), text: str("Category") } }],
      general: [{ properties: { altText: str("Category filter buttons: Foods, Hobbies, Household. Applies to every page.") } }],
      padding: [vcoPadding(8)],
    },
  });
  const store = container(page, "slicer_store", { x: 1104, y: 16, w: 160, h: 104 }, {
    visualType: "slicer",
    syncGroup: { groupName: "StoreSync", fieldChanges: true, filterChanges: true },
    query: { queryState: { Values: { projections: [proj(F.store)] } } },
    objects: {
      data: [{ properties: { mode: str("Dropdown") } }],
      header: [{ properties: { show: bool(true), text: str("Store") } }],
    },
    visualContainerObjects: {
      general: [{ properties: { altText: str("Store filter dropdown. Applies to every page.") } }],
      padding: [vcoPadding(8)],
    },
  });
  return [category, store];
}

// Card with an optional reference label (a second measure shown under the value).
function card(page, key, pos, field, label, opts = {}) {
  const objects = {
    value: [{
      properties: {
        fontSize: num(20),
        ...(opts.valueColor ? { fontColor: fill(opts.valueColor) } : {}),
        ...(opts.units ? { labelDisplayUnits: str(opts.units) } : {}),
        ...(opts.precision !== undefined ? { labelPrecision: int(opts.precision) } : {}),
      },
      selector: { id: "default" },
    }],
    label: [{ properties: { show: bool(true), text: str(label), fontSize: num(11), fontColor: fill(C.muted) }, selector: { id: "default" } }],
    padding: [{ properties: { paddingUniform: num(8) }, selector: { id: "default" } }],
    layout: [{ properties: { paddingUniform: num(0) }, selector: { id: "default" } }],
    outline: [{ properties: { show: bool(false) }, selector: { id: "default" } }],
  };
  if (opts.reference) {
    const refId = id(page, key, "ref");
    const sel = { data: [{ dataViewWildcard: { matchingOption: 0 } }], metadata: ref(field), id: refId, order: 0 };
    const partSel = { data: [{ dataViewWildcard: { matchingOption: 1 } }], metadata: ref(field), id: refId };
    objects.referenceLabel = [{ properties: { value: { expr: opts.reference.field } }, selector: sel }];
    const titleProps = { show: bool(true), titleContentType: str("custom"), titleText: str(opts.reference.title), titleFontColor: fill(C.muted) };
    objects.referenceLabelTitle = [
      { properties: titleProps, selector: { id: "default" } },
      { properties: titleProps, selector: partSel },
    ];
    objects.referenceLabelValue = [{ properties: { show: bool(true), valueFontColor: fill(opts.reference.color || C.text), valueBold: bool(true) }, selector: partSel }];
  }
  return container(page, key, pos, {
    visualType: "cardVisual",
    query: { queryState: { Data: { projections: [proj(field)] } } },
    objects,
    visualContainerObjects: {
      title: [{ properties: { show: bool(false) } }],
      general: [{ properties: { altText: str(opts.alt || label) } }],
      padding: [vcoPadding(8)],
      spacing: [{ properties: { customizeSpacing: bool(true), verticalSpacing: num(2) }, selector: { id: "default" } }],
    },
  });
}

function barChart(page, key, pos, category, value, color, title, alt, opts = {}) {
  const dataPoint = opts.dataPoint || [{ properties: { defaultColor: fill(color) } }];
  return container(page, key, pos, {
    visualType: "barChart",
    query: {
      queryState: { Category: { projections: [proj(category)] }, Y: { projections: [proj(value)] } },
      sortDefinition: { sort: [{ field: value, direction: opts.sort || "Descending" }], isDefaultSort: true },
    },
    objects: {
      dataPoint,
      labels: [{ properties: { show: bool(true), fontSize: num(10), color: fill(C.text), ...(opts.labelUnits ? { labelDisplayUnits: str(opts.labelUnits) } : {}) } }],
      categoryAxis: [{ properties: { show: bool(true), fontSize: num(10), labelColor: fill(C.muted), showAxisTitle: bool(false) } }],
      valueAxis: [{ properties: { show: bool(false), gridlineShow: bool(false), showAxisTitle: bool(false) } }],
      legend: [{ properties: { show: bool(false) } }],
    },
    visualContainerObjects: chartVcos(title, alt, opts.subtitle),
  });
}

// ---------- pages ----------
function overview() {
  const p = "6eadae11554c4707bb28";
  z = 0;
  const cards = [
    card(p, "card_rev52", { x: 16, y: 136, w: 300, h: 120 }, F.rev52, "Revenue, last 52 weeks", {
      units: "1000000", precision: 2,
      reference: { field: F.rev52yoy, title: "vs prior 52 weeks", color: C.green },
      alt: "Revenue in the last 52 weeks, with growth against the prior 52 weeks.",
    }),
    card(p, "card_wape", { x: 332, y: 136, w: 300, h: 120 }, F.wape, "Forecast error (WAPE, store-day)", {
      alt: "Weighted absolute percentage error of the forecast, summed per store and day.",
    }),
    card(p, "card_bias", { x: 648, y: 136, w: 300, h: 120 }, F.bias, "Forecast bias (forecast vs actual)", {
      alt: "Forecast bias: positive means the forecast was above actual sales.",
    }),
    card(p, "card_lost", { x: 964, y: 136, w: 300, h: 120 }, F.lost, "Est. revenue lost to stock-outs", {
      units: "1000", precision: 0,
      valueColor: C.alert,
      reference: { field: F.lostPct, title: "of last-52-week revenue", color: C.alert },
      alt: "Estimated revenue lost during suspected stock-outs, and its share of last-52-week revenue.",
    }),
  ];
  const trend = container(p, "line_revenue_state", { x: 16, y: 272, w: 752, h: 432 }, {
    visualType: "lineChart",
    query: {
      queryState: {
        Category: { projections: [proj(F.week)] },
        Y: { projections: [proj(F.revenue)] },
        Series: { projections: [proj(F.state)] },
      },
    },
    objects: {
      legend: [{ properties: { show: bool(true), position: str("Top"), fontSize: num(10), labelColor: fill(C.muted) } }],
      lineStyles: [{ properties: { strokeWidth: num(1.5), lineChartType: str("linear"), areaShow: bool(false) } }],
      labels: [{ properties: { show: bool(false) } }],
      categoryAxis: [{ properties: { show: bool(true), fontSize: num(10), labelColor: fill(C.muted), showAxisTitle: bool(false) } }],
      valueAxis: [{ properties: { show: bool(true), fontSize: num(10), labelColor: fill(C.muted), showAxisTitle: bool(false), gridlineShow: bool(true), gridlineColor: fill(C.grid) } }],
    },
    visualContainerObjects: chartVcos("Weekly revenue by state",
      "Line chart of weekly revenue from 2011 to 2016, one line per state: California, Texas and Wisconsin."),
  });
  const lostByStore = barChart(p, "bar_lost_store", { x: 784, y: 272, w: 480, h: 432 }, F.store, F.lost, C.alert,
    "Estimated revenue lost to suspected stock-outs, by store",
    "Bar chart of estimated revenue lost to suspected stock-outs for each of the 10 stores, largest first.",
    { labelUnits: "1000" });
  return {
    name: p, displayName: "Overview",
    visuals: [...header(p, "Where is a 10-store retailer losing sales?", "Walmart M5 data, 10 stores in CA, TX and WI, 2011–2016"),
      ...slicers(p), ...cards, trend, lostByStore],
  };
}

function forecastPage() {
  const p = "a1f0c4e2b7d94e3a8c51";
  z = 0;
  const dayFilter = {
    name: filterId(p, "day_from"),
    field: F.day,
    type: "Advanced",
    filter: {
      Version: 2,
      From: [{ Name: "d", Entity: "dim_date", Type: 0 }],
      Where: [{
        Condition: {
          Comparison: {
            ComparisonKind: 2,
            Left: { Column: { Expression: { SourceRef: { Source: "d" } }, Property: "date_day" } },
            Right: { Literal: { Value: "datetime'2016-05-23T00:00:00'" } },
          },
        },
      }],
    },
    howCreated: "User",
  };
  const line = container(p, "line_forecast", { x: 632, y: 136, w: 632, h: 272 }, {
    visualType: "lineChart",
    query: {
      queryState: {
        Category: { projections: [proj(F.day)] },
        Y: { projections: [proj(F.actual), proj(F.forecast)] },
      },
    },
    objects: {
      dataPoint: [
        { properties: { fill: fill(C.blue) }, selector: { metadata: ref(F.actual) } },
        { properties: { fill: fill(C.orange) }, selector: { metadata: ref(F.forecast) } },
      ],
      lineStyles: [
        { properties: { strokeWidth: num(2), lineChartType: str("linear"), areaShow: bool(false) } },
        { properties: { lineStyle: str("dashed") }, selector: { metadata: ref(F.forecast) } },
      ],
      legend: [{ properties: { show: bool(true), position: str("Top"), fontSize: num(10), labelColor: fill(C.muted) } }],
      labels: [{ properties: { show: bool(false) } }],
      categoryAxis: [{ properties: { show: bool(true), fontSize: num(10), labelColor: fill(C.muted), showAxisTitle: bool(false) } }],
      valueAxis: [{ properties: { show: bool(true), fontSize: num(10), labelColor: fill(C.muted), showAxisTitle: bool(false), gridlineShow: bool(true), gridlineColor: fill(C.grid) } }],
    },
    visualContainerObjects: chartVcos("Forecast against actual sales",
      "Line chart of daily actual units (solid blue) and forecast units (dashed orange) from 23 May to 19 June 2016."),
  }, { filterConfig: { filters: [dayFilter] } });

  const wapeRef = ref(F.wape);
  const named = (field, displayName) => ({ ...proj(field), displayName });
  const matrix = container(p, "matrix_error", { x: 16, y: 136, w: 600, h: 568 }, {
    visualType: "pivotTable",
    query: {
      queryState: {
        Rows: { projections: [named(F.store, "Store")] },
        Columns: { projections: [named(F.category, "Category")] },
        Values: { projections: [named(F.wape, "WAPE"), named(F.bias, "Bias")] },
      },
    },
    objects: {
      columnHeaders: [{ properties: { columnAdjustment: str("growToFit"), autoSizeColumnWidth: bool(true) } }],
      values: [
        {
          properties: {
            backColor: {
              solid: {
                color: {
                  expr: {
                    FillRule: {
                      Input: { SelectRef: { ExpressionName: wapeRef } },
                      FillRule: {
                        linearGradient2: {
                          min: { color: { Literal: { Value: `'${C.seqMin}'` } }, value: { Literal: { Value: "0.04D" } } },
                          max: { color: { Literal: { Value: `'${C.seqMax}'` } }, value: { Literal: { Value: "0.17D" } } },
                          nullColoringStrategy: { strategy: { Literal: { Value: "'noColor'" } } },
                        },
                      },
                    },
                  },
                },
              },
            },
            fontColor: {
              solid: {
                color: {
                  expr: {
                    Conditional: {
                      Cases: [
                        { Condition: { Comparison: { ComparisonKind: 2, Left: F.wape, Right: { Literal: { Value: "0.14D" } } } }, Value: { Literal: { Value: "'#FFFFFF'" } } },
                        { Condition: { Comparison: { ComparisonKind: 3, Left: F.wape, Right: { Literal: { Value: "0.14D" } } } }, Value: { Literal: { Value: `'${C.text}'` } } },
                      ],
                    },
                  },
                },
              },
            },
          },
          selector: { data: [{ dataViewWildcard: { matchingOption: 1 } }], metadata: wapeRef },
        },
      ],
    },
    visualContainerObjects: chartVcos("Forecast error by store and category",
      "Matrix of forecast error (WAPE) and bias for each store and category; darker blue cells have larger errors.",
      "WAPE shaded from light (low error) to dark blue (high error)"),
  });

  const biasRules = (fieldExpr) => [{
    properties: {
      fill: {
        solid: {
          color: {
            expr: {
              Conditional: {
                Cases: [
                  { Condition: { Comparison: { ComparisonKind: 2, Left: fieldExpr, Right: { Literal: { Value: "0D" } } } }, Value: { Literal: { Value: `'${C.orange}'` } } },
                  { Condition: { Comparison: { ComparisonKind: 3, Left: fieldExpr, Right: { Literal: { Value: "0D" } } } }, Value: { Literal: { Value: `'${C.blue}'` } } },
                ],
              },
            },
          },
        },
      },
    },
    selector: { data: [{ dataViewWildcard: { matchingOption: 1 } }] },
  }];
  const biasBar = barChart(p, "bar_bias_category", { x: 632, y: 424, w: 632, h: 280 }, F.category, F.bias, C.blue,
    "Forecast bias by category",
    "Bar chart of forecast bias by category. Orange bars are over-forecast, blue bars are under-forecast.",
    { dataPoint: biasRules(F.bias), subtitle: "Orange: forecast above actual. Blue: below." });
  return {
    name: p, displayName: "Forecast accuracy",
    visuals: [...header(p, "How accurate is the sales forecast?", "Daily forecast for the last 28 days of data, from 23 May 2016"),
      ...slicers(p), line, matrix, biasBar],
  };
}

function stockoutPage() {
  const p = "b72e9d1c4f6a4b0e9d33";
  z = 0;
  const cards = [
    card(p, "card_runs", { x: 16, y: 136, w: 232, h: 88 }, F.runs, "Suspected stock-outs", {
      units: "1",
      alt: "Number of suspected stock-out runs.",
    }),
    card(p, "card_lost", { x: 264, y: 136, w: 232, h: 88 }, F.lost, "Est. revenue lost", {
      valueColor: C.alert, units: "1000", precision: 0, alt: "Estimated revenue lost during suspected stock-outs.",
    }),
  ];
  const byCategory = barChart(p, "bar_lost_category", { x: 16, y: 240, w: 480, h: 464 }, F.category, F.lost, C.alert,
    "Estimated revenue lost by category",
    "Bar chart of estimated revenue lost to suspected stock-outs by category, largest first.",
    { labelUnits: "1000" });
  const table = container(p, "table_stockouts", { x: 512, y: 136, w: 752, h: 568 }, {
    visualType: "tableEx",
    query: {
      queryState: {
        Values: {
          projections: [
            { ...proj(F.soItem), displayName: "Item" },
            { ...proj(F.soStore), displayName: "Store" },
            { ...proj(F.soStart), displayName: "Start" },
            { ...proj(F.soDays), displayName: "Days" },
            { ...proj(F.lost), displayName: "Est. lost revenue" },
          ],
        },
      },
      sortDefinition: { sort: [{ field: F.lost, direction: "Descending" }], isDefaultSort: true },
    },
    objects: {
      columnHeaders: [{ properties: { columnAdjustment: str("growToFit"), autoSizeColumnWidth: bool(true) } }],
    },
    visualContainerObjects: chartVcos("Largest suspected stock-outs",
      "Table of suspected stock-outs by item and store with start date, length in days and estimated lost revenue, largest first.",
      "Sorted by estimated lost revenue"),
  });
  return {
    name: p, displayName: "Stock-outs",
    visuals: [...header(p, "Where do stock-outs cost the most?", "Suspected stock-outs found in daily item-store sales, 2011–2016"),
      ...slicers(p), ...cards, byCategory, table],
  };
}

// ---------- theme ----------
function theme(name) {
  const axis = { gridlineColor: { solid: { color: C.grid } }, labelColor: { solid: { color: C.muted } } };
  return {
    $schema: "https://raw.githubusercontent.com/microsoft/powerbi-desktop-samples/main/Report%20Theme%20JSON%20Schema/reportThemeSchema-2.153.json",
    name,
    dataColors: [C.blue, C.orange, C.green, C.alert, C.grey],
    good: C.green, neutral: C.grey, bad: C.alert,
    maximum: C.seqMax, center: "#79A6DD", minimum: C.seqMin, null: C.grey,
    foreground: C.text, foregroundNeutralSecondary: C.muted, foregroundNeutralTertiary: C.muted,
    background: C.card, backgroundLight: C.grid, backgroundNeutral: C.border, tableAccent: C.blue,
    textClasses: {
      callout: { fontSize: 20, fontFace: "Segoe UI Semibold", color: C.text },
      title: { fontSize: 12, fontFace: "Segoe UI Semibold", color: C.text },
      header: { fontSize: 12, fontFace: "Segoe UI Semibold", color: C.text },
      label: { fontSize: 10, fontFace: "Segoe UI", color: C.text },
    },
    visualStyles: {
      "*": {
        "*": {
          background: [{ show: true, color: { solid: { color: C.card } }, transparency: 0 }],
          border: [{ show: true, color: { solid: { color: C.border } }, radius: 6, width: 1 }],
          dropShadow: [{ show: false }],
          padding: [{ top: 8, bottom: 8, left: 8, right: 8 }],
          title: [{ show: true, fontFamily: "Segoe UI Semibold", fontSize: 12, fontColor: { solid: { color: C.text } } }],
          subTitle: [{ fontFamily: "Segoe UI", fontSize: 10, fontColor: { solid: { color: C.muted } } }],
          categoryAxis: [{ ...axis, gridlineStyle: "solid" }],
          valueAxis: [{ ...axis, gridlineStyle: "solid" }],
          legend: [{ labelColor: { solid: { color: C.muted } } }],
        },
      },
      textbox: { "*": { padding: [{ top: 0, bottom: 0, left: 0, right: 0 }], background: [{ show: false }], border: [{ show: false }] } },
      cardVisual: { "*": { value: [{ bold: true, $id: "default" }], label: [{ show: true, $id: "default" }], title: [{ show: false }] } },
      slicer: {
        "*": {
          header: [{ fontFamily: "Segoe UI Semibold", textSize: 10, fontColor: { solid: { color: C.text } }, outlineStyle: 0 }],
          items: [{ fontFamily: "Segoe UI", textSize: 10, fontColor: { solid: { color: C.text } }, outlineStyle: 0, padding: 2 }],
        },
      },
      tableEx: {
        "*": {
          columnHeaders: [{ autoSizeColumnWidth: true, columnAdjustment: "growToFit", backColor: { solid: { color: C.page } }, fontColor: { solid: { color: C.text } }, bold: true }],
          values: [{ backColorPrimary: { solid: { color: C.card } }, backColorSecondary: { solid: { color: "#FAFBFA" } }, fontColorPrimary: { solid: { color: C.text } }, fontColorSecondary: { solid: { color: C.text } } }],
        },
      },
      pivotTable: {
        "*": {
          columnHeaders: [{ autoSizeColumnWidth: true, columnAdjustment: "growToFit", backColor: { solid: { color: C.page } }, fontColor: { solid: { color: C.text } }, bold: true }],
          rowHeaders: [{ fontColor: { solid: { color: C.text } } }],
          values: [{ backColorPrimary: { solid: { color: C.card } }, backColorSecondary: { solid: { color: C.card } }, fontColorPrimary: { solid: { color: C.text } }, fontColorSecondary: { solid: { color: C.text } } }],
        },
      },
    },
  };
}

// ---------- write ----------
const write = (file, obj) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n");
};

const pages = [overview(), forecastPage(), stockoutPage()];
for (const page of pages) {
  const dir = path.join(DEF, "pages", page.name);
  fs.rmSync(path.join(dir, "visuals"), { recursive: true, force: true });
  write(path.join(dir, "page.json"), {
    $schema: PAGE_SCHEMA,
    name: page.name,
    displayName: page.displayName,
    displayOption: "FitToPage",
    height: 720,
    width: 1280,
    objects: {
      background: [{ properties: { color: fill(C.page), transparency: num(0) } }],
      outspace: [{ properties: { color: fill(C.page), transparency: num(0) } }],
    },
  });
  for (const v of page.visuals) write(path.join(dir, "visuals", v.name, "visual.json"), v);
}

const pagesJsonPath = path.join(DEF, "pages", "pages.json");
const pagesJson = JSON.parse(fs.readFileSync(pagesJsonPath, "utf8"));
pagesJson.pageOrder = pages.map((p) => p.name);
pagesJson.activePageName = pages[0].name;
write(pagesJsonPath, pagesJson);

// Theme: rotate the file name on every run so Desktop does not serve a cached copy.
const regDir = path.join(REPORT, "StaticResources", "RegisteredResources");
fs.mkdirSync(regDir, { recursive: true });
for (const f of fs.readdirSync(regDir)) if (/^M5Retail-[0-9a-f]+\.json$/.test(f)) fs.rmSync(path.join(regDir, f));
const themeName = `M5Retail-${crypto.randomBytes(4).toString("hex")}.json`;
write(path.join(regDir, themeName), theme(themeName));

const reportPath = path.join(DEF, "report.json");
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
report.themeCollection.customTheme = {
  name: themeName,
  reportVersionAtImport: report.themeCollection.baseTheme.reportVersionAtImport,
  type: "RegisteredResources",
};
report.resourcePackages = report.resourcePackages.filter((r) => r.type !== "RegisteredResources");
report.resourcePackages.push({
  name: "RegisteredResources",
  type: "RegisteredResources",
  items: [{ name: themeName, path: themeName, type: "CustomTheme" }],
});
write(reportPath, report);

console.log(`Wrote ${pages.length} pages, ${pages.reduce((n, p) => n + p.visuals.length, 0)} visuals, theme ${themeName}`);
