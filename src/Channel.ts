import fetch from 'node-fetch';
import moment from 'moment';
import Debug from 'debug';
import { Config } from './Config';
import { FileSystem } from './FileSystem';
import { request } from './Api';

const debug = Debug('Channel');

export interface Message {
  id: string;
  timestamp: string;
}

export class Channel {
  private channel: string;
  private out: string;
  private config: Config;
  private fileSystem: FileSystem;
  private newestId: string = '';
  private oldestId: string | null = '';

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
    this.newestId = fileSystem.newestMessageId();
    this.oldestId = fileSystem.oldestMessageId();
    debug('newestId from filesystem %s', this.newestId);
    debug('oldsetId from filesystem %s', this.oldestId);
  }

  public async start() {
    if (this.newestId === '') {
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
    const messages = await this.getMessages('', '');
    if (messages.length === 0) return;
    await this.fileSystem.initMessages(messages);
    this.newestId = messages[messages.length - 1].id;
    this.oldestId = messages[0].id;
    debug('newestId %s', this.newestId);
    debug('oldestId %s', this.oldestId);
  }

  private async fetchNewest() {
    debug('fetchNewest');
    for (;;) {
      const messages = await this.getMessages('', this.newestId);
      if (messages.length === 0) break;
      await this.fileSystem.appendMessages(messages);
      this.newestId = messages[messages.length - 1].id;
      debug('newestId %s', this.newestId);
    }
  }

  private async fetchOldest() {
    debug('fetchOldest');
    if (this.oldestId === null) return;
    let until: moment.Moment | null = null;
    if (this.config.historyUntil.length > 0) {
      until = moment(this.config.historyUntil);
      debug('fetch until %s', until.utc().toISOString());
    }
    for (;;) {
      const messages: Message[] = await this.getMessages(this.oldestId, '');
      if (messages.length === 0) {
        await this.fileSystem.prependMessages(messages);
        this.oldestId = null;
        break;
      }
      await this.fileSystem.prependMessages(messages);
      this.oldestId = messages[0].id;
      debug('oldestId %s', this.oldestId);

      if (until !== null) {
        if (until.isAfter(moment(messages[0].timestamp))) {
          debug('stopping at %s', messages[0].timestamp);
          await this.fileSystem.prependMessages([]);
          this.oldestId = null;
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
