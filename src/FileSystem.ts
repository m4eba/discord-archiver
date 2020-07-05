import fs from 'fs';
import path from 'path';
import moment from 'moment';
import Debug from 'debug';
import { Message } from './Channel';
import { Group, groupMessages } from './Group';
import {
  timestampToDate,
  dateToFilePath,
  fileExists,
  timestampToFilePath,
} from './utils';

const debug = Debug('FileSystem');

type CompareFunction = (a: string, b: string) => number;

export interface Session {
  newest: SessionFile;
  oldest: SessionFile | null;
}

export interface SessionFile {
  id: string;
  timestamp: string;
  date: string;
  filePath: string;
}

export class FileSystem {
  private channel: string;
  private out: string;
  private root: string;
  private session: Session;
  private sessionFilename: string;
  // group that is not saved yet
  private newestGroupToSave: Group | null = null;
  // group that is not saved yet
  private oldestGroupToSave: Group | null = null;

  constructor(channel: string, out: string) {
    this.channel = channel;
    this.out = out;
    this.root = path.join(out, channel);
    this.sessionFilename = path.join(out, `${this.channel}-session.json`);
    this.session = {
      newest: {
        id: '',
        timestamp: '',
        date: '',
        filePath: '',
      },
      oldest: null,
    };
  }

  public static async open(channel: string, out: string): Promise<FileSystem> {
    const f = new FileSystem(channel, out);
    await fs.promises.mkdir(f.root, { recursive: true });
    const exists = await fileExists(f.sessionFilename);
    if (!exists) {
      await f.generateSession();
    } else {
      try {
        const content = await fs.promises.readFile(f.sessionFilename, {
          encoding: 'utf8',
        });
        f.session = JSON.parse(content);
        debug('load session from file %o', f.session);
      } catch (e) {
        throw new Error('unable to open session ' + e);
      }
    }
    return f;
  }

  public newestMessage(): Message {
    return {
      id: this.session.newest.id,
      timestamp: this.session.newest.timestamp,
    };
  }

  public oldestMessage(): Message | null {
    if (this.session.oldest === null) return null;
    return {
      id: this.session.oldest.id,
      timestamp: this.session.oldest.timestamp,
    };
  }

  private async generateSession() {
    debug('generateSession');
    const newest = await this.newestFile();
    if (newest.length === 0) return;
    debug('load newest file %s', newest);
    const messages = JSON.parse(
      await fs.promises.readFile(path.join(this.root, newest), {
        encoding: 'utf8',
      })
    );
    if (messages.length === 0) {
      throw new Error('messages file empty');
    }
    const m = messages[messages.length - 1];
    this.session.newest = {
      id: m.id,
      timestamp: m.timestamp,
      date: timestampToDate(m.timestamp),
      filePath: newest,
    };
    debug('newests session %o', this.session.newest);

    const oldest = await this.oldestFile();
    if (oldest.length > 0) {
      debug('load oldest file %s', oldest);
      const messages = JSON.parse(
        await fs.promises.readFile(path.join(this.root, oldest), {
          encoding: 'utf8',
        })
      );
      if (messages.length > 0) {
        this.session.oldest = {
          id: messages[0].id,
          timestamp: messages[0].timestamp,
          date: timestampToDate(messages[0].timestamp),
          filePath: oldest,
        };
        debug('oldest session %o', this.session.oldest);
      }
    }
  }

  public async oldestFile(): Promise<string> {
    return this.findFile((a, b) => {
      return a.localeCompare(b);
    });
  }

  public async newestFile(): Promise<string> {
    return this.findFile((a, b) => {
      return b.localeCompare(a);
    });
  }

  public async initMessages(messages: Array<Message>) {
    debug('initMessages');
    this.session.oldest = {
      id: messages[0].id,
      timestamp: messages[0].timestamp,
      date: timestampToDate(messages[0].timestamp),
      filePath: timestampToFilePath(messages[0].timestamp),
    };
    await this.appendMessages(messages);
    debug('sesssion %o', this.session);
  }

  public async prependMessages(messages: Array<Message>) {
    if (messages.length === 0) {
      await this.flushOldest();
      debug('set session oldest to null');
      this.session.oldest = null;
      await this.saveSession();
      return;
    }
    debug('prependMessages %d', messages.length);
    const groups = groupMessages(messages);
    // reverse order, save the newest first
    for (let i = groups.length - 1; i >= 0; --i) {
      const g = groups[i];
      debug('processing group %d %d/%d', g.date, i, groups.length);

      if (this.oldestGroupToSave != null) {
        const ng = this.oldestGroupToSave;
        if (ng.date === g.date) {
          debug('prepend to GroupToSave');
          // same date, prepend messages
          ng.messages = g.messages.concat(ng.messages);
          continue;
        } else {
          // save group
          const filepath = dateToFilePath(ng.date);
          debug('save GroupToSave to %s', filepath);
          await this.saveMessages(path.join(this.root, filepath), ng.messages);
          this.session.oldest = {
            id: ng.messages[0].id,
            timestamp: ng.messages[0].timestamp,
            date: ng.date,
            filePath: filepath,
          };
          this.oldestGroupToSave = null;
          await this.saveSession();
        }
      }

      const filepath = dateToFilePath(g.date);
      const exists = await fileExists(filepath);
      if (exists) {
        debug('file already exists');
        const content = await fs.promises.readFile(filepath, {
          encoding: 'utf8',
        });
        const messages = JSON.parse(content);
        // test if first message timestamp is after last message of group
        // should be the case
        const mfile = moment(messages[0].timestamp);
        const mgroup = moment(g.messages[g.messages.length - 1].timestamp);
        if (mgroup.isAfter(mfile)) {
          throw new Error('inconsistent timestamp!');
          // TODO make a merge function
        }
        g.messages = g.messages.concat(messages);
        this.oldestGroupToSave = g;
      } else {
        this.oldestGroupToSave = g;
      }
    }
  }

  public async appendMessages(messages: Array<Message>) {
    if (messages.length === 0) {
      await this.flushNewest();
      await this.saveSession();
      return;
    }
    debug('appendMessages %d', messages.length);
    const groups = groupMessages(messages);
    for (let i = 0; i < groups.length; ++i) {
      const g = groups[i];
      debug('processing group %d %d/%d', g.date, i, groups.length);

      if (this.newestGroupToSave != null) {
        const ng = this.newestGroupToSave;
        if (ng.date === g.date) {
          debug('append to GroupToSave');
          // same date, append messages
          ng.messages = ng.messages.concat(g.messages);
          continue;
        } else {
          // save group
          const filepath = dateToFilePath(ng.date);
          debug('save GroupToSave to %s', filepath);
          await this.saveMessages(path.join(this.root, filepath), ng.messages);
          this.session.newest = {
            id: ng.messages[ng.messages.length - 1].id,
            timestamp: ng.messages[ng.messages.length - 1].timestamp,
            date: ng.date,
            filePath: filepath,
          };
          this.newestGroupToSave = null;
          await this.saveSession();
        }
      }

      const filepath = dateToFilePath(g.date);
      const exists = await fileExists(filepath);
      if (exists) {
        debug('file already exists');
        const content = await fs.promises.readFile(filepath, {
          encoding: 'utf8',
        });
        const messages = JSON.parse(content);
        // test if last message timestamp is before first message of group
        // should be the case
        const mfile = moment(messages[messages.length - 1].timestamp);
        const mgroup = moment(g.messages[0].timestamp);
        if (mgroup.isBefore(mfile)) {
          throw new Error('inconsistent timestamp!');
          // TODO make a merge function
        }
        g.messages = messages.concat(g.messages);
        this.newestGroupToSave = g;
      } else {
        this.newestGroupToSave = g;
      }
    }
  }

  public async flush() {
    await this.flushNewest();
    await this.flushOldest();
    await this.saveSession();
  }

  private async flushNewest() {
    if (this.newestGroupToSave !== null) {
      const g = this.newestGroupToSave;
      const filename = path.join(this.root, dateToFilePath(g.date));
      await this.saveMessages(filename, g.messages);
      this.session.newest = {
        id: g.messages[g.messages.length - 1].id,
        timestamp: g.messages[g.messages.length - 1].timestamp,
        date: g.date,
        filePath: dateToFilePath(g.date),
      };
      this.newestGroupToSave = null;
    }
  }

  private async flushOldest() {
    if (this.oldestGroupToSave !== null) {
      const g = this.oldestGroupToSave;
      const filename = path.join(this.root, dateToFilePath(g.date));
      await this.saveMessages(filename, g.messages);
      this.session.oldest = {
        id: g.messages[0].id,
        timestamp: g.messages[0].timestamp,
        date: g.date,
        filePath: dateToFilePath(g.date),
      };
      this.oldestGroupToSave = null;
    }
  }

  // this assumes the file doesn't exist already
  private async saveMessages(filename: string, messages: Array<Message>) {
    const p = filename.substr(
      0,
      filename.length - path.basename(filename).length
    );
    await fs.promises.mkdir(p, { recursive: true });
    const content = JSON.stringify(messages, null, ' ');
    await fs.promises.writeFile(filename, content);
  }

  private async saveSession() {
    debug('save session %o', this.session);
    await fs.promises.writeFile(
      this.sessionFilename,
      JSON.stringify(this.session, null, ' ')
    );
  }

  private async findFile(fn: CompareFunction): Promise<string> {
    async function part(dir: string, filter: RegExp): Promise<string[]> {
      const files = await fs.promises.readdir(dir);
      return files.filter((f) => f.match(filter)).sort(fn);
    }
    const years = await part(this.root, /^\d\d\d\d$/);
    if (years.length === 0) return '';
    const months = await part(path.join(this.root, years[0]), /^\d\d$/);
    if (months.length === 0) return '';
    const files = await part(
      path.join(this.root, years[0], months[0]),
      /^\d\d\d\d\d\d\d\d\.json$/
    );
    if (files.length === 0) return '';
    return path.join(years[0], months[0], files[0]);
  }
}
