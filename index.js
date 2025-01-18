require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { MongoClient } = require('mongodb');
const { createWelcomeCommand, handleWelcomeCommand, handleNewMember } = require('./src/welcome');
const { createLevelCommands, handleRankCommand, handleLeaderboard, handleXpGain, handleLevelSetup } = require('./src/level');
const { createCountCommand, handleCountCommand, handleCount } = require('./src/count');
const { startWebServer } = require('./web/server'); // Fixed import path
const { 
    createAntiSpamCommand, 
    createAntiBadWordsCommand,
    handleAntiSpamCommand, 
    handleAntiBadWordsCommand,
    checkMessage 
} = require('./src/antispam');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.User],
});

let db;
const mongoClient = new MongoClient(process.env.MONGO_URI);

async function initializeDatabase() {
  await mongoClient.connect();
  db = mongoClient.db('countingDB');
  console.log('Connected to MongoDB');
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await initializeDatabase();
  client.user.setStatus(process.env.BOT_STATUS);

  try {
    // Start web server with error handling
    if (process.env.ENABLE_WEBSITE !== 'false') {
      await startWebServer(client, db);
    }

    // Register commands
    const countCommand = createCountCommand();
    const welcomeCommand = createWelcomeCommand();
    const antiSpamCommand = createAntiSpamCommand();
    const antiBadWordsCommand = createAntiBadWordsCommand();

    await client.application.commands.create(countCommand);
    await client.application.commands.create(welcomeCommand);
    await client.application.commands.create(antiSpamCommand);
    await client.application.commands.create(antiBadWordsCommand);

    const levelCommands = createLevelCommands();
    for (const command of levelCommands) {
      await client.application.commands.create(command);
    }
  } catch (error) {
    console.error('Error during initialization:', error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  try {
    const { commandName } = interaction;
    switch(commandName) {
      case 'setcount':
        await handleCountCommand(interaction, db);
        break;
      case 'setwelcome':
        await handleWelcomeCommand(interaction, db);
        break;
      case 'rank':
        await handleRankCommand(interaction, db);
        break;
      case 'leaderboard':
        await handleLeaderboard(interaction, db);
        break;
      case 'levelsetup':
        await handleLevelSetup(interaction, db);
        break;
      case 'setantispam':
        await handleAntiSpamCommand(interaction, db);
        break;
      case 'setantibadwords':
        await handleAntiBadWordsCommand(interaction, db);
        break;
    }
  } catch (error) {
    console.error('Error handling command:', error);
    await interaction.reply({
      content: 'An error occurred while processing the command.',
      flags: 64
    }).catch(console.error);
  }
});

client.on('guildMemberAdd', async member => {
  await handleNewMember(member, db);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  try {
    await checkMessage(message, db);
    await handleXpGain(message, db);
    await handleCount(message, db);
  } catch (error) {
    console.error('Error handling message:', error);
  }
});

client.login(process.env.DISCORD_TOKEN);
