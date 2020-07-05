Incremental discord archiver. It saves the raw json data into a folder structured like: channel-id/YYYY/MM/YYYYMMDD.json. Progress for every channel is saved in a session.json file.

#### Install

```bash
git clone https://github.com/m4eba/discord-archiver
cd discord-archiver
npm install
npm run compile
```

#### Usage

```bash
node build/index.js <folder>
```

Inside the folder you need a config.json file like:

```json
{
  "token": "<user token>",
  "bot": false,
  "channel": ["<channel id>"],
  "guild": "<guild id",
  "exclude": ["<channel id>"],
  "history": true,
  "historyUntil": "20200101"
}
```

Minimal config is token and either channel or guild.

- token: bot token or user token, open devtools then to go Application tab and find the token in Local Storage
- bot: boolean, defaults to false, token is a bot token
- channel: array of channel ids to archive, enable the developer mode in the discord app and right click on a channel and copy id
- guild: id of server, archives all channels
- exclude: optional, array of channel ids to exclude if using guild option
- history: boolean, defaults to true, archive older messages
- historyUntil: optional, only go back to this date, format is YYYYMMDD

#### TODO

- api ratelimit???
- ~~proper console output~~
