import moment from 'moment';
import Debug from 'debug';
import { ListrTask, ListrTaskWrapper } from 'listr2';
import { Config } from './Config';
import { FileSystem } from './FileSystem';
import { request } from './Api';

const debug = Debug('Channel');

export interface Message {
  id: string;
  timestamp: string;
}

export class Channel implements ListrTask<any, any> {
  private channel: string;
  private out: string;
  private config: Config;
  private fileSystem: FileSystem;
  private newest: Message = { id: '', timestamp: '' };
  private oldest: Message | null = null;
  private taskWrapper: ListrTaskWrapper<any, any> | null = null;

  get title() {
    return this.channel;
  }

  get task(): (ctx: any, task: ListrTaskWrapper<any, any>) => Promise<void> {
    // eslint-disable-next-line no-unused-vars
    return async (ctx: any, task: ListrTaskWrapper<any, any>) => {
      this.taskWrapper = task;
      await this.start();
      await this.fileSystem.flush();
    };
  }

  private update(msg: string) {
    if (this.taskWrapper === null) return;
    this.taskWrapper.output = msg;
  }

  constructor(
    out: string,
    channel: string,
    fileSystem: FileSystem,
    config: Config
  ) {
    this.channel = channel;
    this.out = out;
    this.config = config;
    this.fileSystem = fileSystem;
    this.newest = fileSystem.newestMessage();
    this.oldest = fileSystem.oldestMessage();
    debug('newestId from filesystem %s', this.newest.id);
    debug('oldsetId from filesystem %s', this.oldest ? this.oldest.id : null);
  }

  public async start() {
    if (this.newest.id === '') {
      await this.init();
    } else {
      await this.fetchNewest();
    }
    if (this.config.history) {
      await this.fetchOldest();
    }
  }

  private async init() {
    debug('init');
    this.update('init message call');
    const messages = await this.getMessages('', '');
    if (messages.length === 0) return;
    await this.fileSystem.initMessages(messages);
    this.newest = messages[messages.length - 1];
    this.oldest = messages[0];
    debug('newestId %s', this.newest.id);
    debug('oldestId %s', this.oldest.id);
  }

  private async fetchNewest() {
    debug('fetchNewest');
    for (;;) {
      this.update(
        `${moment(this.newest.timestamp).format('YYYYMMDD')} - ${
          this.newest.id
        }`
      );
      const messages = await this.getMessages('', this.newest.id);
      if (messages.length === 0) break;
      await this.fileSystem.appendMessages(messages);
      this.newest = messages[messages.length - 1];
      debug('newestId %s', this.newest.id);
    }
  }

  private async fetchOldest() {
    debug('fetchOldest');
    if (this.oldest === null) return;
    let until: moment.Moment | null = null;
    if (this.config.historyUntil.length > 0) {
      until = moment(this.config.historyUntil);
      debug('fetch until %s', until.utc().toISOString());
    }
    for (;;) {
      this.update(
        `${moment(this.oldest.timestamp).format('YYYYMMDD')} - ${
          this.oldest.id
        }`
      );
      const messages: Message[] = await this.getMessages(this.oldest.id, '');
      if (messages.length === 0) {
        await this.fileSystem.prependMessages(messages);
        this.oldest = null;
        break;
      }
      await this.fileSystem.prependMessages(messages);
      this.oldest = messages[0];
      debug('oldestId %s', this.oldest.id);

      if (until !== null) {
        if (until.isAfter(moment(messages[0].timestamp))) {
          debug('stopping at %s', messages[0].timestamp);
          await this.fileSystem.prependMessages([]);
          this.oldest = null;
          break;
        }
      }
    }
  }

  private async getMessages(
    before: string,
    after: string
  ): Promise<Array<Message>> {
    let param = '';
    if (before.length > 0) {
      param = `&before=${before}`;
    } else {
      if (after.length > 0) {
        param = `&after=${after}`;
      }
    }
    const url = `channels/${this.channel}/messages?limit=100${param}`;
    const obj = await request(this.config, url);
    const messages = obj as Array<Message>;
    debug('result size %d', messages.length);
    return messages.reverse();
  }
}

export default Channel;
