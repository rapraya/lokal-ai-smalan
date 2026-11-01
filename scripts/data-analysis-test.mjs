import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const app = await readFile("assets/js/app.js", "utf8");
const parseStart = app.indexOf("  function parseCsvRecords(source, delimiter) {");
const parseEnd = app.indexOf("  function formatDataNumber(value) {", parseStart);
const histogramStart = app.indexOf("  function buildDataHistogram(values, binCount = 8) {");
const histogramEnd = app.indexOf("  function renderDataHistogram(values) {", histogramStart);
const explorerStart = app.indexOf("  function filterSortDataRows(");
const explorerEnd = app.indexOf("  function renderDataExplorer() {", explorerStart);

assert.ok(parseStart >= 0 && parseEnd > parseStart, "CSV parser functions were not found.");
assert.ok(histogramStart >= 0 && histogramEnd > histogramStart, "Histogram function was not found.");
assert.ok(explorerStart >= 0 && explorerEnd > explorerStart, "Data Explorer analysis helpers were not found.");

const parserSource = app.slice(parseStart, parseEnd);
const histogramSource = app.slice(histogramStart, histogramEnd);
const api = vm.runInNewContext(
  parserSource + "\n" + histogramSource + app.slice(explorerStart, explorerEnd) +
  "\n({ detectCsvDelimiter, parseCsvRecords, analyzeCsvRecords, buildDataHistogram, parseDataNumber, filterSortDataRows, buildGroupedSummary, buildPivotSummary, parseDataDate, buildDateTrendSummary, summarizeTrendHighlights })",
  vm.createContext({})
);

const commaCsv = [
  '"Name","Score","Notes"',
  '"Ada",10,"hello, world"',
  '"Budi",20,"line one',
  'line two"',
  '"Citra",,"has ""quoted"" text"'
].join("\r\n");

assert.equal(api.detectCsvDelimiter(commaCsv), ",");
const commaRecords = api.parseCsvRecords(commaCsv, ",");
assert.equal(commaRecords.length, 4);
assert.equal(commaRecords[2][2], "line one\nline two");
assert.equal(commaRecords[3][2], 'has "quoted" text');

const commaAnalysis = api.analyzeCsvRecords(commaRecords, ",");
assert.equal(commaAnalysis.rows.length, 3);
assert.equal(commaAnalysis.headers.length, 3);
assert.equal(commaAnalysis.numericColumns.length, 1);
assert.deepEqual(Array.from(commaAnalysis.numericColumns[0].numericValues), [10, 20, null]);
assert.equal(commaAnalysis.profiles[1].missing, 1);

const semicolonCsv = "Nama;Nilai;Status\nA;1,5;Lulus\nB;2,5;Lulus\nB;2,5;Lulus";
assert.equal(api.detectCsvDelimiter(semicolonCsv), ";");
const semicolonAnalysis = api.analyzeCsvRecords(api.parseCsvRecords(semicolonCsv, ";"), ";");
assert.deepEqual(Array.from(semicolonAnalysis.numericColumns[0].numericValues), [1.5, 2.5, 2.5]);
assert.equal(semicolonAnalysis.duplicateRows, 1);
assert.equal(semicolonAnalysis.profiles[2].unique, 1);

const explorerRows = [["Citra", "10", "Lulus"], ["Budi", "2", "Lulus"], ["Ada", "30", "Tidak"]];
assert.deepEqual(
  Array.from(api.filterSortDataRows(explorerRows, "lu", 1, "asc", ",").map((item) => item.row[0])),
  ["Budi", "Citra"]
);
assert.deepEqual(
  Array.from(api.filterSortDataRows(explorerRows, "", 1, "desc", ",").map((item) => item.row[0])),
  ["Ada", "Citra", "Budi"]
);
assert.deepEqual(
  Array.from(api.filterSortDataRows(explorerRows, "", -1, "asc", ",", { index: 2, text: "lulus" }).map((item) => item.row[0])),
  ["Citra", "Budi"]
);
assert.deepEqual(
  Array.from(api.filterSortDataRows(explorerRows, "", -1, "asc", ",", { index: 1, min: "5", max: "20" }).map((item) => item.row[0])),
  ["Citra"]
);
assert.deepEqual(
  Array.from(api.filterSortDataRows(explorerRows, "lulus", -1, "asc", ",", { index: 1, min: "2", max: "10" }).map((item) => item.row[0])),
  ["Citra", "Budi"]
);
const grouped = api.buildGroupedSummary(explorerRows, 2, 1, "average", ",");
assert.equal(grouped[0].name, "Lulus");
assert.equal(grouped[0].count, 2);
assert.equal(grouped[0].value, 6);
assert.equal(grouped[1].value, 30);
const groupedCount = api.buildGroupedSummary(explorerRows, 2, -1, "count", ",");
assert.equal(groupedCount.reduce((sum, item) => sum + item.value, 0), 3);
const pivotCount = api.buildPivotSummary(explorerRows, 2, 0, -1, "count", ",");
assert.deepEqual(Array.from(pivotCount.rowKeys), ["Lulus", "Tidak"]);
assert.deepEqual(Array.from(pivotCount.columnKeys), ["Ada", "Budi", "Citra"]);
assert.deepEqual(Array.from(pivotCount.values[0].cells), [0, 1, 1]);
assert.equal(pivotCount.grandTotal, 3);
const pivotAverage = api.buildPivotSummary(explorerRows, 2, 0, 1, "average", ",");
assert.deepEqual(Array.from(pivotAverage.values[0].cells), [null, 2, 10]);
assert.deepEqual(Array.from(pivotAverage.columnTotals), [30, 2, 10]);
assert.equal(pivotAverage.grandTotal, 14);
const pivotSum = api.buildPivotSummary(explorerRows, 2, 0, 1, "sum", ",");
assert.deepEqual(Array.from(pivotSum.columnTotals), [30, 2, 10]);
assert.equal(pivotSum.grandTotal, 42);


const dmyTrendRows = [["01/01/2026", "10"], ["15/01/2026", "20"], ["01/02/2026", "30"], ["31/02/2026", "99"], ["", "5"]];
const monthlyTrend = api.buildDateTrendSummary(dmyTrendRows, 0, 1, "sum", "dmy", "month", ",");
assert.equal(monthlyTrend.validDates, 3);
assert.equal(monthlyTrend.invalidDates, 2);
assert.deepEqual(Array.from(monthlyTrend.periods.map((item) => item.period)), ["2026-01", "2026-02"]);
assert.deepEqual(Array.from(monthlyTrend.periods.map((item) => item.value)), [30, 30]);
assert.equal(monthlyTrend.periods[1].change, 0);
assert.equal(monthlyTrend.periods[1].changePercent, 0);
assert.equal(api.parseDataDate("2026-02-29", "iso"), null);
assert.equal(api.parseDataDate("29/02/2024", "dmy").toISOString(), "2024-02-29T00:00:00.000Z");
assert.equal(api.parseDataDate("03/04/2026", "dmy").getUTCMonth(), 3);
assert.equal(api.parseDataDate("03/04/2026", "mdy").getUTCMonth(), 2);
const dailyTrend = api.buildDateTrendSummary([["2025-01-01", "4"], ["2026-01-01", "8"]], 0, 1, "average", "iso", "year", ",");
assert.deepEqual(Array.from(dailyTrend.periods.map((item) => item.value)), [4, 8]);
assert.equal(dailyTrend.periods[1].changePercent, 100);


const trendHighlights = api.summarizeTrendHighlights(monthlyTrend.periods);
assert.equal(trendHighlights.latest.period, "2026-02");
assert.equal(trendHighlights.highest.value, 30);
assert.equal(trendHighlights.lowest.value, 30);
assert.equal(trendHighlights.netChange, 0);
assert.equal(trendHighlights.direction, "stable");
assert.equal(api.summarizeTrendHighlights([]).direction, "unavailable");
assert.equal(api.summarizeTrendHighlights([{ period: "2026-01", value: 12 }]).direction, "single");
const risingHighlights = api.summarizeTrendHighlights([{ period: "A", value: 5 }, { period: "B", value: 9 }]);
assert.equal(risingHighlights.netChange, 4);
assert.equal(risingHighlights.direction, "up");

const bins = api.buildDataHistogram([1, 2, 3, 4, 5, 6, 7, 8, 9]);
assert.equal(bins.length, 8);
assert.equal(bins.reduce((sum, bin) => sum + bin.count, 0), 9);
assert.equal(api.buildDataHistogram([4, 4, 4])[0].count, 3);
assert.equal(api.parseDataNumber("1,25", ";"), 1.25);
assert.equal(api.parseDataNumber("1,25", ","), null);

assert.throws(() => api.parseCsvRecords('Name,Score\n"Ada,10', ","), /kutip/);
const tooManyRows = [["Name"], ...Array.from({ length: 10001 }, (_, index) => ["row-" + index])];
assert.throws(() => api.analyzeCsvRecords(tooManyRows, ","), /10.000/);

console.log("Data Analyst unit checks passed: quoted CSV, multiline fields, decimal comma, missing values, duplicate rows, numeric profiling, histogram, global/column filters, numeric ranges, sorting, grouped count/average, pivot count/average and totals, explicit date formats, monthly/yearly trends, trend highlights, malformed quotes, and row limit.");
