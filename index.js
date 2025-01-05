require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, SlashCommandBuilder } = require('discord.js');
const { MongoClient } = require('mongodb');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
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

  const setupCommand = new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Setup the counting channel')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('Channel where counting will take place')
        .setRequired(true)
    );

  await client.application.commands.create(setupCommand);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, options } = interaction;
  if (commandName === 'setup') {
    const channel = options.getChannel('channel');

    await db.collection('settings').updateOne(
      { guildId: interaction.guildId },
      { $set: { countChannel: channel.id, lastNumber: 0, lastUser: null } },
      { upsert: true }
    );

    await interaction.reply(`Counting channel set to ${channel}. Start counting from 1!`);
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const settings = await db.collection('settings').findOne({ guildId: message.guild.id });
  if (!settings || message.channel.id !== settings.countChannel) return;

  const number = parseInt(message.content);
  if (isNaN(number)) {
    await message.delete();
    await message.author.send(`Only numbers are allowed in ${message.channel}. Please enter the correct number.`);
    return;
  }

  const lastNumber = settings.lastNumber || 0;
  const lastUser = settings.lastUser || null;

  if (number === lastNumber + 1) {
    if (message.author.id === lastUser) {
      await message.delete();
      await message.author.send(`Wait for someone else to send the next number before you can continue counting!`);
    } else {
      await db.collection('settings').updateOne(
        { guildId: message.guild.id },
        { $set: { lastNumber: number, lastUser: message.author.id } }
      );
    }
  } else {
    await message.delete();
    await message.author.send(`Oops! You entered the wrong number in ${message.channel}. Please try again with the correct number.`);
  }
});

client.login(process.env.DISCORD_TOKEN);
