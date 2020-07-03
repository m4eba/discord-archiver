import moment from 'moment';
import path from 'path';
import fs from 'fs';

export function timestampToDate(timestamp: string): string {
  return moment(timestamp).format('YYYYMMDD');
}

export function timestampToPath(timestamp: string): string {
  const m = moment(timestamp);
  return path.join(m.format('YYYY'), m.format('MM'));
}

export function timestampToFilePath(timestamp: string): string {
  const m = moment(timestamp);
  return path.join(
    m.format('YYYY'),
    m.format('MM'),
    `${m.format('YYYYMMDD')}.json`
  );
}

// filepath from a date string in the format YYYYMMDD
const DREG = /^(\d\d\d\d)(\d\d)(\d\d)$/;
export function dateToFilePath(date: string): string {
  const result = DREG.exec(date);
  if (!result) throw new Error('invalid date format');
  return path.join(result[1], result[2], `${date}.json`);
}

export function fileExists(filepath: string): Promise<boolean> {
  return new Promise((resolve) => {
    fs.access(filepath, fs.constants.F_OK, (error) => {
      resolve(!error);
    });
  });
}
