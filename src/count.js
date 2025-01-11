const { SlashCommandBuilder, ChannelType } = require('discord.js');

function createCountCommand() {
    console.log('Creating count command...');
    return new SlashCommandBuilder()
        .setName('setcount')
        .setDescription('Setup the counting channel')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('Channel where counting will take place')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        );
}

async function handleCountCommand(interaction, db) {
    console.log('Handling count command...');
    if (!interaction || !db) {
        console.error('Missing interaction or db object');
        return;
    }

    try {
        const channel = interaction.options.getChannel('channel');
        console.log('Selected channel:', channel?.name);
        
        if (!channel || !channel.isTextBased()) {
            return await interaction.reply({
                content: 'Please select a valid text channel!',
                flags: 64
            });
        }

        await db.collection('settings').updateOne(
            { guildId: interaction.guildId },
            { 
                $set: { 
                    countChannel: channel.id, 
                    lastNumber: 0, 
                    lastUser: null 
                } 
            },
            { upsert: true }
        );

        console.log('Count channel set successfully');
        await interaction.reply({
            content: `Successfully set ${channel} as the counting channel! Start counting from 1.`,
            flags: 64
        });
    } catch (error) {
        console.error('Error in handleCountCommand:', error);
        await interaction.reply({
            content: 'An error occurred while setting up the counting channel.',
            flags: 64
        }).catch(console.error);
    }
}

async function handleCount(message, db) {
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
            
            // Add reaction for correct number
            try {
                // Use different emojis based on number milestones
                if (number % 100 === 0) {
                    await message.react('🎉');
                    await message.react('💯');
                } else if (number % 50 === 0) {
                    await message.react('⭐');
                } else if (number % 25 === 0) { // Fixed condition
                    await message.react('✨');
                } else {
                    await message.react('✅');
                }
            } catch (error) {
                console.error('Error adding reaction:', error);
            }
        }
    } else {
        await message.delete();
        await message.author.send(`Oops! You entered the wrong number in ${message.channel}. Please try again with the correct number.`);
    }
}

module.exports = {
    createCountCommand,
    handleCountCommand,
    handleCount
};
