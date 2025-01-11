<a href="https://dsc.gg/EchoScriptors">
    <img src="https://img.shields.io/discord/811542332678996008?color=7289DA&label=Support&logo=discord&style=for-the-badge" alt="Discord">
</a>

--
# Advanced Discord Bot

A feature-rich Discord bot combining counting game, welcome messages, and leveling system! Uses MongoDB for data persistence and includes easy setup commands for all features.

## Features

### Counting System
- Allows users to count in sequence
- Deletes incorrect numbers and notifies users
- Prevents consecutive counting by the same user
- Stores progress in MongoDB

### Welcome System
- Customizable welcome messages for new members
- Support for welcome images
- Uses placeholders for dynamic mentions
- Configurable welcome channel

### Leveling System
- Experience (XP) gain from chat activity
- Level-up notifications with custom messages
- Beautiful rank cards showing progress
- Server-wide leaderboard
- Anti-spam cooldown system
- Custom level-up channel

## Prerequisites

- Node.js
- MongoDB database
- Discord Bot Token

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/iammonsterbunny/counting-discord-bot.git
   cd counting-discord-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your `.env` file:
   ```env
   DISCORD_TOKEN=your_discord_token
   MONGO_URI=your_mongodb_uri
   BOT_STATUS=idle
   ```

4. Start the bot:
   ```bash
   node index.js
   ```

## Commands

### Setup Commands
- `/setup [channel]` - Set the counting channel
- `/setwelcome [channel] [message] [imagelink?]` - Configure welcome messages
- `/levelsetup [channel] [message]` - Set up level-up notifications

### User Commands
- `/rank [user?]` - Check your or someone else's rank
- `/leaderboard` - View server XP leaderboard

## Placeholders
- Welcome Messages: `{@user}` - Mentions the new member
- Level-up Messages: `{@user}` and `{@level}` - Mentions user and shows new level

## Dependencies

- [discord.js](https://discord.js.org/) - Discord API library
- [mongodb](https://www.mongodb.com/) - Database driver
- [canvas](https://www.npmjs.com/package/canvas) - Rank card generation

## Examples

### Welcome Message Setup
```
/setwelcome channel:#welcome message:"Welcome {@user} to our server!" imagelink:https://example.com/welcome.png
```

### Level-up Notification Setup
```
/levelsetup channel:#level-ups message:"🎉 {@user} has reached level {@level}!"
```

## License

This project is licensed under the MIT License.

---

Made with ❤️ by Monster Bunny
