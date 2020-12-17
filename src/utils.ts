import nodeCrontab from 'crontab';
import { promisify } from 'util';

export const loadCrontab = promisify(nodeCrontab.load);

export const formatNumber = (number: number, digits: number): string =>
  '0'.repeat(digits - number.toString().length) + number;

export const titleCase = (str: string): string =>
  str[0].toUpperCase() + str.slice(1);
