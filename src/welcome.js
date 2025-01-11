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
    
    try {
        if (settings.welcomeImage) {
            // Validate image URL
            const isValidUrl = url => {
                try {
                    new URL(url);
                    return url.match(/\.(jpg|jpeg|png|gif|webp)$/i) != null;
                } catch {
                    return false;
                }
            };

            if (isValidUrl(settings.welcomeImage)) {
                await channel.send({
                    content: welcomeMessage,
                    files: [{
                        attachment: settings.welcomeImage,
                        name: 'welcome.jpg'
                    }]
                });
            } else {
                // Fallback to text-only if image URL is invalid
                await channel.send(welcomeMessage);
                console.error(`Invalid image URL for guild ${member.guild.id}: ${settings.welcomeImage}`);
            }
        } else {
            await channel.send(welcomeMessage);
        }
    } catch (error) {
        console.error(`Error sending welcome message in guild ${member.guild.id}:`, error);
        // Attempt to send text-only message as fallback
        try {
            await channel.send(welcomeMessage);
        } catch (e) {
            console.error('Failed to send fallback welcome message:', e);
        }
    }
}

module.exports = {
    createWelcomeCommand,
    handleWelcomeCommand,
    handleNewMember
};
