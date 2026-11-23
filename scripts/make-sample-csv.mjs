// Writes scripts/AssuranceLearningCalendar.sample.csv from the local sample list,
// using the same column headers as the Excel export, so it can be imported with
// Provision-AssuranceLearningCalendarList.ps1.
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const outFile = join(tmpdir(), `alc-courses-${Date.now()}.mjs`);

await build({
  entryPoints: [join(here, '../src/webparts/assuranceLearningCalendar/data/localCourses.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: outFile,
  logLevel: 'silent'
});

const { LOCAL_COURSES } = await import(pathToFileURL(outFile).href);

const toDdMmYyyy = (iso) => iso.split('-').reverse().join('-');
const withZone = (t, z) => (z ? `${t} (${z})` : t);
const quote = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

const headers = [
  'eventName', 'startDateString', 'endDateString', 'startTime', 'endTime', 'CPECredits', 'Tduration',
  'trainingType', 'timeZone', 'RegistrationLink', 'AboutCourse', 'Objectives', 'recordedLink', 'offering', 'Region'
];

const rows = LOCAL_COURSES.map((c) => [
  c.title, toDdMmYyyy(c.startDate), toDdMmYyyy(c.endDate), withZone(c.startTime, c.timeZone),
  withZone(c.endTime, c.timeZone), c.cpeCredits, c.duration, c.trainingType, c.timeZone,
  c.registrationLink, c.aboutCourse, c.objectives, c.recordedLink || 'NA', c.offering, c.region
]);

const csv = [headers, ...rows].map((r) => r.map(quote).join(',')).join('\r\n');
const target = join(here, 'AssuranceLearningCalendar.sample.csv');
writeFileSync(target, '﻿' + csv, 'utf8');
console.log(`Wrote ${rows.length} rows to ${target}`);
