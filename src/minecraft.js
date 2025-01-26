const { SlashCommandBuilder } = require('discord.js');
const mc = require('minecraft-protocol');
const bedrock = require('bedrock-protocol');  // Updated import

let javaClients = new Map();
let bedrockClients = new Map();

function createMcChatCommand() {
    return new SlashCommandBuilder()
        .setName('setmcchat')
        .setDescription('Setup Minecraft server chat integration')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send Minecraft chat messages')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('ip')
                .setDescription('Minecraft server IP address')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('port')
                .setDescription('Minecraft server port')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('edition')
                .setDescription('Minecraft edition (Java/Bedrock)')
                .setRequired(true)
                .addChoices(
                    { name: 'Java', value: 'java' },
                    { name: 'Bedrock', value: 'bedrock' }
                )
        );
}

async function connectToServer(settings, client, channel) {
    const guildId = settings.guildId;
    
    if (settings.mcEdition === 'java') {
        if (javaClients.has(guildId)) {
            javaClients.get(guildId).end();
        }

        const mcClient = mc.createClient({
            host: settings.mcServerIP,
            port: settings.mcServerPort,
            username: 'Discord_Bot',
            auth: 'offline'
        });

        mcClient.on('chat', (packet) => {
            const message = packet.message;
            if (message.includes('Discord Chat')) return; // Prevent feedback loop
            
            try {
                channel.send(`Minecraft: ${message}`);
            } catch (error) {
                console.error('Error sending message to Discord:', error);
            }
        });

        mcClient.on('error', (error) => {
            console.error('Minecraft client error:', error);
            channel.send('Lost connection to Minecraft server. Reconnecting...');
            setTimeout(() => connectToServer(settings, client, channel), 5000);
        });

        javaClients.set(guildId, mcClient);
    } else {
        if (bedrockClients.has(guildId)) {
            bedrockClients.get(guildId).close();
        }

        const bedrockClient = bedrock.createClient({
            host: settings.mcServerIP,
            port: settings.mcServerPort,
            username: 'Discord_Bot',
            version: '1.19.70', // You can adjust the version as needed
            offline: true
        });

        bedrockClient.on('text', (packet) => {
            if (packet.message.includes('Discord Chat')) return;
            
            try {
                channel.send(`Minecraft: ${packet.message}`);
            } catch (error) {
                console.error('Error sending message to Discord:', error);
            }
        });

        bedrockClient.on('error', (error) => {
            console.error('Bedrock client error:', error);
            channel.send('Lost connection to Minecraft server. Reconnecting...');
            setTimeout(() => connectToServer(settings, client, channel), 5000);
        });

        bedrockClients.set(guildId, bedrockClient);
    }
}

async function handleMcChatCommand(interaction, db) {
    try {
        const channel = interaction.options.getChannel('channel');
        const ip = interaction.options.getString('ip');
        const port = interaction.options.getInteger('port');
        const edition = interaction.options.getString('edition');

        const settings = {
            guildId: interaction.guildId,
            mcChatEnabled: true,
            mcChatChannel: channel.id,
            mcServerIP: ip,
            mcServerPort: port,
            mcEdition: edition
        };

        await db.collection('settings').updateOne(
            { guildId: interaction.guildId },
            { $set: settings },
            { upsert: true }
        );

        await connectToServer(settings, interaction.client, channel);

        await interaction.reply({
            content: `Minecraft chat integration configured!\nServer: ${ip}:${port}\nEdition: ${edition}\nChat Channel: ${channel}`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error in handleMcChatCommand:', error);
        await interaction.reply({
            content: 'Failed to configure Minecraft chat integration.',
            ephemeral: true
        });
    }
}

async function handleDiscordMessage(message, db) {
    try {
        const settings = await db.collection('settings').findOne({ guildId: message.guild.id });
        if (!settings?.mcChatEnabled || message.channel.id !== settings.mcChatChannel) return;

        const formattedMessage = `Discord Chat [${message.author.username}]: ${message.content}`;
        
        if (settings.mcEdition === 'java') {
            const client = javaClients.get(settings.guildId);
            if (client?.write) {
                client.write('chat', { message: formattedMessage });
            }
        } else {
            const client = bedrockClients.get(settings.guildId);
            if (client?.queue) {
                client.queue('text', {
                    type: 'chat',
                    needsTranslation: false,
                    message: formattedMessage,
                    source: 'Discord_Bot'
                });
            }
        }
    } catch (error) {
        console.error('Error sending message to Minecraft:', error);
    }
}

module.exports = {
    createMcChatCommand,
    handleMcChatCommand,
    handleDiscordMessage
};
