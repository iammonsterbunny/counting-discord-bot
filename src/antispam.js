const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Spam detection settings
const SPAM_THRESHOLD = 4; // Changed from 3 to 4 messages
const SPAM_TIME_WINDOW = 5000; // 5 seconds window
const userMessages = new Map(); // Store recent messages per user

// Load bad words from file
function loadBadWords() {
    try {
        const filePath = path.join(__dirname, 'data', 'badwords.txt');
        const content = fs.readFileSync(filePath, 'utf8');
        return content.split(',').map(word => word.trim().toLowerCase());
    } catch (error) {
        console.error('Error loading bad words:', error);
        return ['badword1', 'badword2']; // Fallback default words
    }
}

const DEFAULT_BAD_WORDS = loadBadWords();

function createAntiSpamCommand() {
    return new SlashCommandBuilder()
        .setName('setantispam')
        .setDescription('Configure anti-spam settings')
        .addChannelOption(option =>
            option.setName('log_channel')
                .setDescription('Channel to log spam incidents')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option.setName('immune_role')
                .setDescription('Role that is immune to spam detection')
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName('timeout')
                .setDescription('Timeout duration in minutes (default: 2)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(60)
        );
}

function createAntiBadWordsCommand() {
    return new SlashCommandBuilder()
        .setName('setantibadwords')
        .setDescription('Configure bad words filter')
        .addChannelOption(option =>
            option.setName('log_channel')
                .setDescription('Channel to log bad word usage')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option.setName('immune_role')
                .setDescription('Role that is immune to the filter')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('custom_words')
                .setDescription('Additional bad words (comma-separated)')
                .setRequired(false)
        );
}

async function handleAntiSpamCommand(interaction, db) {
    try {
        const logChannel = interaction.options.getChannel('log_channel');
        const immuneRole = interaction.options.getRole('immune_role');
        const timeout = interaction.options.getInteger('timeout') || 2; // Changed default to 2

        await db.collection('settings').updateOne(
            { guildId: interaction.guildId },
            {
                $set: {
                    antiSpamEnabled: true,
                    spamLogChannel: logChannel.id,
                    spamImmuneRole: immuneRole?.id,
                    spamTimeout: timeout
                }
            },
            { upsert: true }
        );

        await interaction.reply({
            content: `Anti-spam system configured! Logs will be sent to ${logChannel}`,
            flags: 64
        });
    } catch (error) {
        console.error('Error in handleAntiSpamCommand:', error);
        await interaction.reply({
            content: 'Failed to configure anti-spam settings.',
            flags: 64
        });
    }
}

async function handleAntiBadWordsCommand(interaction, db) {
    try {
        const logChannel = interaction.options.getChannel('log_channel');
        const immuneRole = interaction.options.getRole('immune_role');
        const customWords = interaction.options.getString('custom_words');

        const badWordsList = [...DEFAULT_BAD_WORDS];
        if (customWords) {
            // Add custom words and save them to the file
            const newWords = customWords.split(',').map(word => word.trim().toLowerCase());
            badWordsList.push(...newWords);
            
            try {
                const filePath = path.join(__dirname, 'data', 'badwords.txt');
                const uniqueWords = [...new Set([...DEFAULT_BAD_WORDS, ...newWords])];
                fs.writeFileSync(filePath, uniqueWords.join(','));
            } catch (error) {
                console.error('Error saving bad words:', error);
            }
        }

        await db.collection('settings').updateOne(
            { guildId: interaction.guildId },
            {
                $set: {
                    badWordsEnabled: true,
                    badWordsLogChannel: logChannel.id,
                    badWordsImmuneRole: immuneRole?.id,
                    badWordsList: badWordsList
                }
            },
            { upsert: true }
        );

        await interaction.reply({
            content: `Bad words filter configured! Violations will be logged in ${logChannel}`,
            flags: 64
        });
    } catch (error) {
        console.error('Error in handleAntiBadWordsCommand:', error);
        await interaction.reply({
            content: 'Failed to configure bad words filter.',
            flags: 64
        });
    }
}

async function checkMessage(message, db) {
    try {
        // First check for spam
        await checkSpam(message, db);

        // Then check for bad words
        const settings = await db.collection('settings').findOne({ guildId: message.guild.id });
        if (!settings?.badWordsEnabled) return;

        // Check for immune role
        if (settings.badWordsImmuneRole && message.member.roles.cache.has(settings.badWordsImmuneRole)) {
            return;
        }

        const content = message.content.toLowerCase();
        const foundBadWords = settings.badWordsList?.filter(word => content.includes(word.toLowerCase()));

        if (foundBadWords?.length > 0) {
            await handleBadWordDetected(message, foundBadWords, settings);
        }

    } catch (error) {
        console.error('Error checking message:', error);
    }
}

async function checkSpam(message, db) {
    try {
        const settings = await db.collection('settings').findOne({ guildId: message.guild.id });
        if (!settings?.antiSpamEnabled) return;

        // Check for immune role
        if (settings.spamImmuneRole && message.member.roles.cache.has(settings.spamImmuneRole)) {
            return;
        }

        const userId = message.author.id;
        const currentTime = Date.now();

        // Get or create user's message history
        if (!userMessages.has(userId)) {
            userMessages.set(userId, []);
        }

        const userHistory = userMessages.get(userId);
        
        // Remove old messages outside time window
        const recentMessages = userHistory.filter(msg => 
            currentTime - msg.timestamp < SPAM_TIME_WINDOW
        );

        // Add current message
        recentMessages.push({
            content: message.content,
            timestamp: currentTime
        });

        userMessages.set(userId, recentMessages);

        // Check for spam patterns
        const isSpam = checkSpamPatterns(recentMessages);

        if (isSpam) {
            await handleSpamDetected(message, settings, db);
        }

    } catch (error) {
        console.error('Error in checkSpam:', error);
    }
}

function checkSpamPatterns(messages) {
    // Check total number of messages in time window
    if (messages.length >= SPAM_THRESHOLD) {
        return true;
    }

    // Check for repeated messages (keeping existing logic as fallback)
    const lastMessage = messages[messages.length - 1].content;
    const repeatedCount = messages.filter(msg => msg.content === lastMessage).length;

    // Check for emoji spam
    const emojiPattern = /<a?:.+?:\d+>|[\u{1F300}-\u{1F9FF}]/gu;
    const emojiCount = (lastMessage.match(emojiPattern) || []).length;

    return repeatedCount >= SPAM_THRESHOLD || emojiCount >= SPAM_THRESHOLD;
}

async function handleSpamDetected(message, settings, db) {
    try {
        // Delete spam messages
        const userMessages = await message.channel.messages.fetch({ 
            limit: SPAM_THRESHOLD + 2, // Increased limit to catch more spam messages
            author: message.author.id 
        });
        await message.channel.bulkDelete(userMessages);

        // Add warning message in chat
        await message.channel.send({
            content: `⚠️ ${message.author}, please avoid sending too many messages too quickly.`,
            flags: 64
        }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000)); // Auto-delete after 5s

        // Timeout user
        await message.member.timeout(settings.spamTimeout * 60 * 1000, 'Spam detected');

        // Log incident
        const logChannel = message.guild.channels.cache.get(settings.spamLogChannel);
        if (logChannel) {
            await logChannel.send({
                embeds: [{
                    title: '🚫 Spam Detected',
                    description: `User: ${message.author.toString()}\nChannel: ${message.channel.toString()}\nAction: Timeout for ${settings.spamTimeout} minutes`,
                    color: 0xFF0000
                }]
            });
        }

        // Clear user's message history
        userMessages.delete(message.author.id);

    } catch (error) {
        console.error('Error handling spam:', error);
    }
}

async function handleBadWordDetected(message, badWords, settings) {
    try {
        // Delete the message
        await message.delete();

        // Notify the user
        try {
            await message.author.send(`Your message was deleted because it contained prohibited words.`);
        } catch (dmError) {
            console.log('Could not DM user:', dmError.message);
        }

        // Log the incident
        const logChannel = message.guild.channels.cache.get(settings.badWordsLogChannel);
        if (logChannel) {
            await logChannel.send({
                embeds: [{
                    title: '⚠️ Bad Word Detected',
                    description: `User: ${message.author.toString()}\nChannel: ${message.channel.toString()}\nAction: Message deleted`,
                    fields: [
                        {
                            name: 'Message Content',
                            value: message.content.substring(0, 1000) // Discord limit
                        }
                    ],
                    color: 0xFFA500,
                    timestamp: new Date()
                }]
            });
        }
    } catch (error) {
        console.error('Error handling bad word:', error);
    }
}

module.exports = {
    createAntiSpamCommand,
    createAntiBadWordsCommand,
    handleAntiSpamCommand,
    handleAntiBadWordsCommand,
    checkMessage,  // Replace checkSpam with checkMessage in exports
};