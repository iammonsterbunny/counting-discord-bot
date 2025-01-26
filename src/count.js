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
                ephemeral: true,
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
            ephemeral: true,
        });
    } catch (error) {
        console.error('Error in handleCountCommand:', error);
        await interaction.reply({
            content: 'An error occurred while setting up the counting channel. Please try again later.',
            ephemeral: true,
        }).catch(console.error);
    }
}

async function handleCount(message, db) {
    try {
        const settings = await db.collection('settings').findOne({ guildId: message.guild.id });
        if (!settings || message.channel.id !== settings.countChannel) return;

        const number = parseInt(message.content);
        if (isNaN(number)) {
            return await handleInvalidMessage(message, 'Only numbers are allowed in this channel.');
        }

        const lastNumber = settings.lastNumber || 0;
        const lastUser = settings.lastUser || null;

        if (number === lastNumber + 1) {
            if (message.author.id === lastUser) {
                return await handleInvalidMessage(message, 'Wait for someone else to send the next number before you can continue counting!');
            }

            // Update the database first
            await db.collection('settings').updateOne(
                { guildId: message.guild.id },
                { $set: { lastNumber: number, lastUser: message.author.id } }
            );

            // Add reactions
            await handleReactions(message, number);
        } else {
            return await handleInvalidMessage(message, `Oops! You entered the wrong number. The next number should be ${lastNumber + 1}.`);
        }
    } catch (error) {
        console.error('Error in handleCount:', error);
    }
}

// Helper function to handle invalid messages
async function handleInvalidMessage(message, reason) {
    try {
        await message.delete();
        await message.author.send(`${reason} Please follow the rules in ${message.channel}.`).catch(err => 
            console.log('Could not DM user:', err.message)
        );
    } catch (deleteError) {
        console.log('Could not delete message:', deleteError.message);
    }
}

// Helper function to handle reactions
async function handleReactions(message, number) {
    try {
        if (number % 100 === 0) {
            await Promise.all([
                message.react('🎉'),
                message.react('💯')
            ]);
        } else if (number % 50 === 0) {
            await message.react('⭐');
        } else if (number % 25 === 0) {
            await message.react('✨');
        } else {
            await message.react('✅');
        }
    } catch (reactError) {
        console.log('Could not add reaction:', reactError.message);
    }
}

module.exports = {
    createCountCommand,
    handleCountCommand,
    handleCount,
};