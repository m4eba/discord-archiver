import { Message } from './Channel';
import { timestampToDate } from './utils';

export interface Group {
  date: string;
  messages: Array<Message>;
}

export function groupMessages(messages: Array<Message>): Array<Group> {
  let result: Array<Group> = [];
  let date = '';
  for (let i = 0; i < messages.length; ++i) {
    const m = messages[i];
    const d = timestampToDate(m.timestamp);
    if (d !== date) {
      const g: Group = {
        date: d,
        messages: [],
      };
      result.push(g);
      date = d;
    }
    result[result.length - 1].messages.push(m);
  }
  return result;
}
