import { appId, months } from './constants';
import Swal from 'sweetalert2';
import { MomentOfYear } from './moment-of-year.class';
import { ScheduledMessage } from './scheduled-message.class';
import { formatNumber, loadCrontab, titleCase } from './utils';

import './index.css';

const addButton = document.querySelector('#add-btn') as HTMLButtonElement;
const removeAllButton = document.querySelector(
  '#delete-all-btn',
) as HTMLButtonElement;
const list = document.querySelector('ul');

const crontabCommentRegexp = new RegExp(`^${appId}-(.+)$`);

(async function () {
  const crontab = await loadCrontab();

  const jobs = crontab.jobs({ comment: crontabCommentRegexp });

  const scheduledMessages: ScheduledMessage[] = jobs.map((job) => {
    const [, json] = job.comment().match(crontabCommentRegexp);
    const {
      message,
      targetType,
      target,
      momentOfYear: { minute, hour, day, month },
      uuid,
    } = JSON.parse(json);
    const scheduledMessage = new ScheduledMessage(
      message,
      targetType,
      target,
      new MomentOfYear(minute, hour, day, month),
      uuid,
    );
    renderScheduledMessage(scheduledMessage);
    return scheduledMessage;
  });

  addButton.addEventListener('click', async () => {
    const result = await showPromptsForNewScheduledMessage();
    if (!result) return;
    const { message, targetType, target, month, day, hour, minute } = result;

    const scheduledMessage = new ScheduledMessage(
      message,
      targetType,
      target,
      new MomentOfYear(minute, hour, day, month),
    );
    scheduledMessages.push(scheduledMessage);
    crontab.create(
      scheduledMessage.crontabCommand,
      scheduledMessage.momentOfYear.asCron,
      scheduledMessage.crontabComment,
    );
    crontab.save();
    renderScheduledMessage(scheduledMessage);
  });

  removeAllButton.addEventListener('click', () => {
    scheduledMessages.forEach(removeScheduledMessage);
  });

  function renderScheduledMessage(scheduledMessage: ScheduledMessage) {
    list.appendChild(scheduledMessage.listItem);
    scheduledMessage.on('update', async () => {
      const result = await showPromptsForNewScheduledMessage(
        scheduledMessage.message,
        scheduledMessage.targetType,
        scheduledMessage.target,
        scheduledMessage.momentOfYear.month,
        scheduledMessage.momentOfYear.day,
        scheduledMessage.momentOfYear.hour,
        scheduledMessage.momentOfYear.minute,
      );
      if (!result) return;
      const { message, targetType, target, month, day, hour, minute } = result;

      const oldCrontabComment = scheduledMessage.crontabComment;

      scheduledMessage.message = message;
      scheduledMessage.targetType = targetType;
      scheduledMessage.target = target;
      scheduledMessage.momentOfYear.month = month;
      scheduledMessage.momentOfYear.day = day;
      scheduledMessage.momentOfYear.hour = hour;
      scheduledMessage.momentOfYear.minute = minute;

      const newListElement = scheduledMessage.generateListItem();
      list.replaceChild(newListElement, scheduledMessage.listItem);
      scheduledMessage.listItem = newListElement;

      crontab.remove({ comment: oldCrontabComment });
      crontab.create(
        scheduledMessage.crontabCommand,
        scheduledMessage.momentOfYear.asCron,
        scheduledMessage.crontabComment,
      );
      crontab.save();
    });
    scheduledMessage.on(
      'remove',
      removeScheduledMessage.bind(null, scheduledMessage),
    );
  }

  function removeScheduledMessage(scheduledMessage: ScheduledMessage) {
    scheduledMessage.listItem.remove();
    crontab.remove({ comment: scheduledMessage.crontabComment });
    crontab.save();
  }

  async function showPromptsForNewScheduledMessage(
    prevMessage?: string,
    prevTargetType?: 'buddy' | 'chat',
    prevTarget?: string,
    prevMonth?: number,
    prevDay?: number,
    prevHour?: number,
    prevMinute?: number,
  ) {
    const mixin = Swal.mixin({
      showCancelButton: true,
      cancelButtonText: 'Annuler',
      confirmButtonText: 'Suivant &rarr;',
    });
    const messageResponse = await mixin.fire({
      title: 'Message',
      text: 'Quel message voulez-vous planifier?',
      input: 'text',
      inputPlaceholder: 'Allo!',
      inputValue: prevMessage,
      inputValidator(input) {
        return input === '' && 'Veuillez inscrire un message';
      },
    });
    if (messageResponse.isDismissed) return false;
    const message = messageResponse.value;

    const targetTypeResponse = await mixin.fire({
      title: 'Type de cible',
      text: 'Voulez-vous envoyer ce message à un individu ou à un groupe?',
      input: 'select',
      inputValue: prevTargetType,
      inputOptions: { buddy: 'Individu', chat: 'Groupe' },
    });
    if (targetTypeResponse.isDismissed) return false;
    const targetType = targetTypeResponse.value;

    const targetResponse = await mixin.fire({
      title: 'Cible',
      text: 'À qui voulez-vous envoyer un message (nom complet et exact)?',
      input: 'text',
      inputValue: prevTarget,
      inputValidator(input) {
        return input === '' && 'Veuillez inscrire une cible';
      },
    });
    if (targetResponse.isDismissed) return false;
    const target = targetResponse.value;

    const monthResponse = await mixin.fire({
      title: 'Date - Mois',
      text: "Pendant quel mois de l'année voulez-vous envoyer ce message?",
      input: 'select',
      inputValue: months[prevMonth - 1]?.name,
      inputOptions: Object.fromEntries(
        months.map((m) => [m.name, titleCase(m.name)]),
      ),
    });
    if (monthResponse.isDismissed) return false;
    const month = months.find((m) => m.name === monthResponse.value);

    const dayResponse = await mixin.fire({
      title: 'Date - Jour',
      text: `Pendant que jour du mois de ${monthResponse.value} voulez-vous envoyer ce message?`,
      input: 'number',
      inputValue: prevDay
        ? prevDay <= month.days
          ? prevDay
          : month.days
        : undefined,
      inputAttributes: {
        min: (1).toString(),
        max: (month.days + 1).toString(),
      },
      inputValidator(input) {
        return (
          (input === '' ||
            !(0 < parseInt(input) && parseInt(input) <= month.days)) &&
          `Ce jour-là n'existe pas en ${monthResponse.value} (le moi de ${month.name} a ${month.days} jours)`
        );
      },
    });
    if (dayResponse.isDismissed) return false;
    const day = dayResponse.value;

    const timeResponse = await mixin.fire({
      title: 'Date - Heure',
      text: `À quel moment du ${dayResponse.value} ${monthResponse.value} voulez-vous envoyer ce message?`,
      html: `<input type="time" id="swal-input" class="swal2-input" ${
        prevHour && prevMinute
          ? `value="${formatNumber(prevHour, 2)}:${formatNumber(
              prevMinute,
              2,
            )}"`
          : ''
      }>`,
      preConfirm: () => {
        const { value } = document.getElementById(
          'swal-input',
        ) as HTMLInputElement;
        if (value) return value;
        Swal.showValidationMessage(`Veuillez indiquer une heure de la journée`);
      },
    });
    if (timeResponse.isDismissed) return false;
    const [, hour, minute] = timeResponse.value
      .match(/(\d{2}):(\d{2})/)
      .map((v) => parseInt(v));

    return {
      message,
      targetType,
      target,
      month: months.indexOf(month) + 1,
      day,
      hour,
      minute,
    };
  }
})();
