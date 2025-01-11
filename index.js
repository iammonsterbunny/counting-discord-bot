require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { MongoClient } = require('mongodb');
const { createWelcomeCommand, handleWelcomeCommand, handleNewMember } = require('./src/welcome');
const { createLevelCommands, handleRankCommand, handleLeaderboard, handleXpGain, handleLevelSetup } = require('./src/level');
const { createCountCommand, handleCountCommand, handleCount } = require('./src/count');
const { startWebServer } = require('./web/server');

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

  // Start web server
  startWebServer(client, db);

  const countCommand = createCountCommand();
  const welcomeCommand = createWelcomeCommand();

  await client.application.commands.create(countCommand);
  await client.application.commands.create(welcomeCommand);

  const levelCommands = createLevelCommands();
  for (const command of levelCommands) {
    await client.application.commands.create(command);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

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
  }
});

client.on('guildMemberAdd', async member => {
  await handleNewMember(member, db);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // Handle XP gain
  await handleXpGain(message, db);
  await handleCount(message, db);
});

client.login(process.env.DISCORD_TOKEN);
