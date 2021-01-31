import { Listr, ListrBaseClassOptions } from 'listr2';
// @ts-ignore
import VerboseRender from 'listr-verbose-renderer';
import { Config, load, defaultConfig } from './Config';
import Channel from './Channel';
import { FileSystem } from './FileSystem';
import { request } from './Api';

interface ApiChannel {
  id: string;
  type: number;
}
interface Ctx {}

export class Archiver {
  private out: string;
  private config: Config = defaultConfig;

  constructor(out: string) {
    this.out = out;
  }

  public async start() {
    this.config = await load(this.out);

    let opt: ListrBaseClassOptions = { concurrent: this.config.concurrent };
    if (process.env['DEBUG'] !== undefined) {
      opt.renderer = VerboseRender;
    }

    let channels = this.config.channel;
    if (this.config.guild.length > 0) {
      const tasks = new Listr<Ctx>(
        [
          {
            title: 'get channels',
            task: async (): Promise<void> => {
              channels = await this.guild(this.config.guild);
            },
          },
        ],
        opt
      );
      await tasks.run({});
    }

    let tasks: Array<Channel> = [];
    for (let i = 0; i < channels.length; ++i) {
      let c = channels[i];
      const fsys = await FileSystem.open(c, this.out);
      const channel = new Channel(this.out, c, fsys, this.config);
      tasks.push(channel);
    }
    const listr = new Listr<Ctx>(tasks, opt);
    await listr.run();
  }

  private async guild(id: string): Promise<Array<string>> {
    const obj = await request(this.config, `/guilds/${id}/channels`);
    const channels = obj as Array<ApiChannel>;
    let result: Array<string> = [];
    channels.forEach((c) => {
      if (c.type != 0) return;
      if (this.config.exclude.indexOf(c.id) > -1) return;
      result.push(c.id);
    });
    return result;
  }
}

export default Archiver;
