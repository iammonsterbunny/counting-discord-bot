const { SlashCommandBuilder } = require('discord.js');

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

async function handleMcChatCommand(interaction, db) {
    try {
        const channel = interaction.options.getChannel('channel');
        const ip = interaction.options.getString('ip');
        const port = interaction.options.getInteger('port');
        const edition = interaction.options.getString('edition');

        await db.collection('settings').updateOne(
            { guildId: interaction.guildId },
            {
                $set: {
                    mcChatEnabled: true,
                    mcChatChannel: channel.id,
                    mcServerIP: ip,
                    mcServerPort: port,
                    mcEdition: edition
                }
            },
            { upsert: true }
        );

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

        // Format the message for Minecraft
        const formattedMessage = `Discord Chat [${message.author.username}]: ${message.content}`;
        
        // Here you would integrate with your Minecraft server
        // This is a placeholder - you'll need to implement the actual server communication
        console.log('Sending to Minecraft:', formattedMessage);

        // Example pseudocode for sending to Minecraft server:
        // if (settings.mcEdition === 'java') {
        //     sendToJavaServer(settings.mcServerIP, settings.mcServerPort, formattedMessage);
        // } else {
        //     sendToBedrockServer(settings.mcServerIP, settings.mcServerPort, formattedMessage);
        // }
    } catch (error) {
        console.error('Error sending message to Minecraft:', error);
    }
}

module.exports = {
    createMcChatCommand,
    handleMcChatCommand,
    handleDiscordMessage
};
