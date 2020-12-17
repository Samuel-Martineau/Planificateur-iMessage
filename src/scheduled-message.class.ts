import { MomentOfYear } from './moment-of-year.class';
import { EventEmitter } from 'events';
import { appId } from './constants';
import { v4 as uuidv4 } from 'uuid';

export declare interface ScheduledMessage {
  on(event: 'remove', listener: () => void): this;
  on(event: 'update', listener: () => void): this;
  on(event: string, listener: Function): this;
}

export class ScheduledMessage extends EventEmitter {
  public listItem: HTMLLIElement;

  constructor(
    public message: string,
    public targetType: 'buddy' | 'chat',
    public target: string,
    public momentOfYear: MomentOfYear,
    public uuid: string = uuidv4(),
  ) {
    super();
    this.listItem = this.generateListItem();
  }

  get crontabCommand(): string {
    const targetString =
      this.targetType === 'buddy'
        ? `1st participants whose full name is "${this.target}"`
        : `1st chats whose name is "${this.target}"`;
    return `osascript -e 'tell application "Messages" to send "${this.message}" to ${targetString}'`;
  }

  get crontabComment(): string {
    return `${appId}-${JSON.stringify(this)}`;
  }

  private remove(): void {
    this.emit('remove');
  }

  private update(): void {
    this.emit('update');
  }

  public generateListItem(): HTMLLIElement {
    const listItem = document.createElement('li');

    const text1 = document.createTextNode('Envoyer le message ');
    listItem.appendChild(text1);

    const message = document.createElement('b');
    message.textContent = this.message;
    listItem.appendChild(message);

    const text2 = document.createTextNode(
      this.targetType === 'buddy' ? ' à ' : ' au groupe ',
    );
    listItem.appendChild(text2);

    const target = document.createElement('b');
    target.textContent = this.target;
    listItem.appendChild(target);

    const text3 = document.createTextNode(' chaque ');
    listItem.appendChild(text3);

    const moment = document.createElement('b');
    moment.textContent = this.momentOfYear.asHuman;
    listItem.appendChild(moment);

    const lineBreak = document.createElement('br');
    listItem.appendChild(lineBreak);

    const editButton = document.createElement('button');
    editButton.textContent = 'Modifier';
    listItem.appendChild(editButton);
    editButton.addEventListener('click', this.update.bind(this));

    const spaceText2 = document.createTextNode(' ');
    listItem.appendChild(spaceText2);

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Supprimer';
    listItem.appendChild(deleteButton);
    deleteButton.addEventListener('click', this.remove.bind(this));

    return listItem;
  }

  public toJSON(): Object {
    return {
      message: this.message,
      targetType: this.targetType,
      target: this.target,
      momentOfYear: this.momentOfYear,
      uuid: this.uuid,
    };
  }
}
