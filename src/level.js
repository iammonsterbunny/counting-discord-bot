const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');

// XP calculation constants
const BASE_XP = 15;
const XP_PER_LEVEL = 100;
const XP_COOLDOWN = 60000; // 1 minute cooldown
const xpCooldowns = new Map();

function calculateLevel(xp) {
    return Math.floor(Math.sqrt(xp / XP_PER_LEVEL));
}

function calculateXpForLevel(level) {
    return level * level * XP_PER_LEVEL;
}

function createLevelCommands() {
    const rankCommand = new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Check your or someone else\'s rank')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check rank for')
                .setRequired(false)
        );

    const leaderboardCommand = new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Show server leaderboard');

    const levelSetupCommand = new SlashCommandBuilder()
        .setName('levelsetup')
        .setDescription('Setup level-up notifications')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel for level-up notifications')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Level-up message (use {@user} and {@level} as placeholders)')
                .setRequired(true)
        );

    return [rankCommand, leaderboardCommand, levelSetupCommand];
}

async function createRankCard(user, userData) {
    const canvas = Canvas.createCanvas(700, 250);
    const ctx = canvas.getContext('2d');

    // Add background
    ctx.fillStyle = '#2f3136';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add user avatar
    const avatar = await Canvas.loadImage(user.displayAvatarURL({ extension: 'png' }));
    ctx.drawImage(avatar, 25, 25, 200, 200);

    // Function to add text shadow
    const drawTextWithShadow = (text, x, y, fontSize) => {
        ctx.font = `${fontSize}px "Arial Black", sans-serif`;
        // Add shadow
        ctx.fillStyle = '#000000';
        ctx.fillText(text, x + 2, y + 2);
        // Add main text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, x, y);
    };

    // Add username with shadow
    drawTextWithShadow(user.username, 250, 70, 40);

    // Add level and XP info with shadow
    const level = calculateLevel(userData.xp);
    const currentLevelXp = calculateXpForLevel(level);
    const nextLevelXp = calculateXpForLevel(level + 1);
    const xpProgress = userData.xp - currentLevelXp;
    const xpNeeded = nextLevelXp - currentLevelXp;

    drawTextWithShadow(`Level: ${level}`, 250, 120, 30);
    drawTextWithShadow(`XP: ${userData.xp}/${nextLevelXp}`, 250, 160, 30);

    // Draw XP bar with improved visibility
    const barWidth = 400;
    const barHeight = 30;
    const progress = (xpProgress / xpNeeded) * barWidth;

    // Draw bar background with border
    ctx.fillStyle = '#1a1a1a';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.fillRect(250, 180, barWidth, barHeight);
    ctx.strokeRect(250, 180, barWidth, barHeight);

    // Draw progress bar with gradient
    const gradient = ctx.createLinearGradient(250, 180, 250 + progress, 180 + barHeight);
    gradient.addColorStop(0, '#7289da');
    gradient.addColorStop(1, '#5b6eae');
    ctx.fillStyle = gradient;
    ctx.fillRect(250, 180, progress, barHeight);

    return new AttachmentBuilder(canvas.toBuffer(), { name: 'rank.png' });
}

async function handleRankCommand(interaction, db) {
    const target = interaction.options.getUser('user') || interaction.user;
    const userData = await db.collection('users').findOne({
        guildId: interaction.guildId,
        userId: target.id
    }) || { xp: 0 };

    const rankCard = await createRankCard(target, userData);
    await interaction.reply({ files: [rankCard] });
}

async function handleLeaderboard(interaction, db) {
    const topUsers = await db.collection('users')
        .find({ guildId: interaction.guildId })
        .sort({ xp: -1 })
        .limit(10)
        .toArray();

    if (!topUsers || topUsers.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle('🏆 Server Leaderboard')
            .setColor('#7289da')
            .setDescription('No users found in the leaderboard yet!');
        
        await interaction.reply({ embeds: [embed] });
        return;
    }

    const leaderboardText = await Promise.all(
        topUsers.map(async (user, index) => {
            try {
                const member = await interaction.guild.members.fetch(user.userId);
                const level = calculateLevel(user.xp);
                return `${index + 1}. ${member.user.username} - Level ${level} (${user.xp} XP)`;
            } catch (error) {
                return `${index + 1}. Unknown User - Level ${calculateLevel(user.xp)} (${user.xp} XP)`;
            }
        })
    );

    const embed = new EmbedBuilder()
        .setTitle('🏆 Server Leaderboard')
        .setColor('#7289da')
        .setDescription(leaderboardText.join('\n') || 'No users found in the leaderboard yet!');

    await interaction.reply({ embeds: [embed] });
}

async function handleXpGain(message, db) {
    if (xpCooldowns.has(message.author.id)) return;

    const xpGain = Math.floor(Math.random() * 10) + BASE_XP;
    
    // First get the current user data
    const currentData = await db.collection('users').findOne({
        guildId: message.guild.id,
        userId: message.author.id
    }) || { xp: 0 };

    const oldLevel = calculateLevel(currentData.xp);

    // Update the user's XP
    const result = await db.collection('users').findOneAndUpdate(
        {
            guildId: message.guild.id,
            userId: message.author.id
        },
        {
            $inc: { xp: xpGain },
            $setOnInsert: { username: message.author.username }
        },
        { 
            upsert: true, 
            returnDocument: 'after'
        }
    );

    const newUserData = result.value;
    if (!newUserData) {
        console.error('Failed to retrieve updated user data.');
        return;
    }

    const newLevel = calculateLevel(newUserData.xp);

    xpCooldowns.set(message.author.id, true);
    setTimeout(() => xpCooldowns.delete(message.author.id), XP_COOLDOWN);

    if (newLevel > oldLevel) {
        const settings = await db.collection('settings').findOne({ guildId: message.guild.id });
        if (settings?.levelChannel) {
            const channel = message.guild.channels.cache.get(settings.levelChannel);
            if (channel) {
                const levelMessage = settings.levelMessage
                    .replace('{@user}', message.author.toString())
                    .replace('{@level}', newLevel.toString());
                await channel.send(levelMessage);
            }
        }
    }
}

async function handleLevelSetup(interaction, db) {
    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message');

    await db.collection('settings').updateOne(
        { guildId: interaction.guildId },
        {
            $set: {
                levelChannel: channel.id,
                levelMessage: message
            }
        },
        { upsert: true }
    );

    await interaction.reply(`Level-up notifications will be sent to ${channel}`);
}

module.exports = {
    createLevelCommands,
    handleRankCommand,
    handleLeaderboard,
    handleXpGain,
    handleLevelSetup
};
