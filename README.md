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
