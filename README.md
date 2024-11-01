<a href="https://dsc.gg/EchoScriptors">
    <img src="https://img.shields.io/discord/811542332678996008?color=7289DA&label=Support&logo=discord&style=for-the-badge" alt="Discord">
</a>

--
# Counting Discord Bot

A Discord bot for a fun counting game in your server! This bot deletes incorrect numbers, notifies users of mistakes, and ensures each number is sent by a different user. Uses MongoDB to store game progress and includes a `/setup` command to set the counting channel.

## Features

- Allows users to count in sequence.
- Deletes messages with incorrect numbers and notifies the user.
- Ensures each user can only contribute one number at a time.
- Stores progress in MongoDB for easy data persistence.
- Easy setup with a `/setup` command to define the counting channel.

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

3. Create a `.env` file and add your Discord bot token and MongoDB URI:

   ```env
   DISCORD_TOKEN=your_discord_token
   MONGO_URI=your_mongodb_uri
   ```

4. Start the bot:

   ```bash
   node index.js
   ```

## Usage

1. **Set up the counting channel**:
   Use the `/setup` command in your Discord server and specify the channel where the counting game should take place.

2. **Start Counting**:
   Begin counting from `1` in the specified channel. Each user must send the next consecutive number. If a user sends the wrong number, the bot deletes the message and notifies them.

3. **Rules**:
   - Each user can only send one number at a time.
   - If a user sends two consecutive numbers, the bot will delete the second message and remind them to wait for another user.

## Commands

- `/setup [channel]` - Set the counting channel.

## Example `.env` file

```env
DISCORD_TOKEN=your_discord_token_here
MONGO_URI=your_mongodb_connection_string
```

## Dependencies

- [discord.js](https://discord.js.org/) - Library for interacting with the Discord API.
- [mongodb](https://www.mongodb.com/) - MongoDB Node.js driver for data persistence.

## License

This project is licensed under the MIT License.

---

Enjoy counting with your community!
