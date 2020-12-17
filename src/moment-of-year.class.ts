import * as assert from 'assert';
import { months } from './constants';
import { formatNumber } from './utils';

export class MomentOfYear {
  constructor(
    public minute: number,
    public hour: number,
    public day: number,
    public month: number,
  ) {
    console.log(month);
    assert.ok(
      0 <= minute && minute < 60,
      'Le numéro de minute doit être compris entre 0 et 59',
    );
    assert.ok(
      0 <= hour && hour < 24,
      "Le numéro d'heure doit être compris entre 0 et 23",
    );
    assert.ok(
      1 <= month && month <= 12,
      'Le numéro de mois doit être compris entre 1 et 12',
    );
    const daysInMonth = months[month - 1].days;
    assert.ok(
      1 <= day && day <= daysInMonth,
      `Le numéro de jour doit être compris entre 1 et ${daysInMonth}`,
    );
  }

  get asCron(): string {
    return `${this.minute} ${this.hour} ${this.day} ${this.month} *`;
  }

  get asHuman(): string {
    return `${this.day} ${months[this.month - 1].name} à ${formatNumber(
      this.hour,
      2,
    )}h${formatNumber(this.minute, 2)}`;
  }

  public toJSON(): Object {
    return {
      minute: this.minute,
      hour: this.hour,
      day: this.day,
      month: this.month,
    };
  }
}
