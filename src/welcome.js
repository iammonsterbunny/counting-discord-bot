const { SlashCommandBuilder } = require('discord.js');

function createWelcomeCommand() {
    return new SlashCommandBuilder()
        .setName('setwelcome')
        .setDescription('Setup welcome message')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send welcome messages')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Welcome message (use {@user} to mention)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('imagelink')
                .setDescription('Welcome image URL')
                .setRequired(false)
        );
}

async function handleWelcomeCommand(interaction, db) {
    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message');
    const imageLink = interaction.options.getString('imagelink');

    await db.collection('settings').updateOne(
        { guildId: interaction.guildId },
        {
            $set: {
                welcomeChannel: channel.id,
                welcomeMessage: message,
                welcomeImage: imageLink
            }
        },
        { upsert: true }
    );

    await interaction.reply(`Welcome message setup complete in ${channel}`);
}

async function handleNewMember(member, db) {
    const settings = await db.collection('settings').findOne({ guildId: member.guild.id });
    if (!settings || !settings.welcomeChannel) return;

    const channel = member.guild.channels.cache.get(settings.welcomeChannel);
    if (!channel) return;

    const welcomeMessage = settings.welcomeMessage.replace('{@user}', member.toString());
    
    if (settings.welcomeImage) {
        await channel.send({
            content: welcomeMessage,
            files: [settings.welcomeImage]
        });
    } else {
        await channel.send(welcomeMessage);
    }
}

module.exports = {
    createWelcomeCommand,
    handleWelcomeCommand,
    handleNewMember
};
