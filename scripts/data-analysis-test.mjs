import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const app = await readFile("assets/js/app.js", "utf8");
const parseStart = app.indexOf("  function parseCsvRecords(source, delimiter) {");
const parseEnd = app.indexOf("  function formatDataNumber(value) {", parseStart);
const histogramStart = app.indexOf("  function buildDataHistogram(values, binCount = 8) {");
const histogramEnd = app.indexOf("  function renderDataHistogram(values) {", histogramStart);

assert.ok(parseStart >= 0 && parseEnd > parseStart, "CSV parser functions were not found.");
assert.ok(histogramStart >= 0 && histogramEnd > histogramStart, "Histogram function was not found.");

const parserSource = app.slice(parseStart, parseEnd);
const histogramSource = app.slice(histogramStart, histogramEnd);
const api = vm.runInNewContext(
  parserSource + "\n" + histogramSource +
  "\n({ detectCsvDelimiter, parseCsvRecords, analyzeCsvRecords, buildDataHistogram, parseDataNumber })",
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

const bins = api.buildDataHistogram([1, 2, 3, 4, 5, 6, 7, 8, 9]);
assert.equal(bins.length, 8);
assert.equal(bins.reduce((sum, bin) => sum + bin.count, 0), 9);
assert.equal(api.buildDataHistogram([4, 4, 4])[0].count, 3);
assert.equal(api.parseDataNumber("1,25", ";"), 1.25);
assert.equal(api.parseDataNumber("1,25", ","), null);

assert.throws(() => api.parseCsvRecords('Name,Score\n"Ada,10', ","), /kutip/);
const tooManyRows = [["Name"], ...Array.from({ length: 10001 }, (_, index) => ["row-" + index])];
assert.throws(() => api.analyzeCsvRecords(tooManyRows, ","), /10.000/);

console.log("Data Analyst unit checks passed: quoted CSV, multiline fields, decimal comma, missing values, duplicate rows, numeric profiling, histogram, malformed quotes, and row limit.");
