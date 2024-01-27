require("dotenv").config();
const { Client, EmbedBuilder } = require("discord.js");
const { logChannelId, guildId } = require("./config.json");

const registerCmds = require("./registerCmds");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./db.sqlite");

db.run("CREATE TABLE IF NOT EXISTS statuses(status TEXT, roleId TEXT)");

const client = new Client({
  intents: ["GuildPresences", "GuildMembers", "Guilds"],
});

let validStatuses = [];

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  try {
    registerCmds(client);
    validStatuses = await getStatuses();
  } catch (error) {
    console.error("Error during bot setup:", error);
  }
});

async function log(message) {
  const logChannel = client.channels.cache.get(logChannelId);
  if (!logChannel) return;
  try {
    await logChannel.send(message);
  } catch (error) {
    console.error("Error sending log message:", error);
  }
}

async function updateRole(member, status, action) {
  try {
    const statusData = await getStatus(status.state);
    if (statusData) {
      if (action === "add" && !member.roles.cache.has(statusData.roleId)) {
        await member.roles.add(statusData.roleId);
        console.log(`Added role ${statusData.roleId} to ${member.user.tag}`);
        await log(`Added role <@&${statusData.roleId}> to ${member}`);
      } else if (
        action === "remove" &&
        member.roles.cache.has(statusData.roleId)
      ) {
        await member.roles.remove(statusData.roleId);
        console.log(
          `Removed role ${statusData.roleId} from ${member.user.tag}`
        );
        await log(`Removed role <@&${statusData.roleId}> from ${member}`);
      }
    }
  } catch (error) {
    console.error("Error updating role:", error);
  }
}

client.on("presenceUpdate", async (oldPres, newPres) => {
  if (oldPres.guild.id !== guildId) return;
  try {
    let oldStatus = oldPres.activities.find(activity => activity.type === 4);
    let newStatus = newPres.activities.find(activity => activity.type === 4);
    const member =
      oldPres.guild.members.cache.get(oldPres.userId) ||
      (await oldPres.guild.members.fetch(oldPres.userId));
    if (!member) return;
    if (
      oldStatus?.state !== newStatus?.state &&
      validStatuses.find(s => s.status === newStatus?.state.toLowerCase())
    ) {
      await updateRole(member, newStatus, "add");
    }
    if (
      oldStatus?.state !== newStatus?.state &&
      validStatuses.find(s => s.status === oldStatus?.state.toLowerCase())
    ) {
      await updateRole(member, oldStatus, "remove");
    }
  } catch (error) {
    console.error("Error during presence update:", error);
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isCommand()) return;
  const { commandName } = interaction;
  if (commandName === "add-status-reward") {
    const status = interaction.options.getString("status");
    const role = interaction.options.getRole("role");
    if (validStatuses.find(s => s.status === status.toLowerCase())) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setTitle(":x: Error")
            .setDescription("This status is already in use!")
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
    await addStatus(status, role.id);
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x6a71f3)
          .setTitle("✅ Reward Added!")
          .setDescription(
            `> **Trigger status**: \`${status}\`\n> **Role**: ${role}`
          )
          .setTimestamp(),
      ],
    });
  } else if (commandName === "remove-status-reward") {
    const status = interaction.options.getString("status");
    if (!validStatuses.find(s => s.status === status.toLowerCase())) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setTitle(":x: Error")
            .setDescription("This status is not registered for a reward!")
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
    await removeStatus(status);

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("DarkRed")
          .setTitle("✅ Reward Removed!")
          .setDescription(`> **Trigger status**: \`${status}\``)
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  } else if (commandName === "list-status-rewards") {
    const statuses = await getStatuses();
    const embed = new EmbedBuilder()
      .setColor(0x6a71f3)
      .setTitle("📃 Status Rewards")
      .setTimestamp()
      .setFooter({ text: `Requested by @${interaction.user.username}` });

    if (statuses.length === 0) {
      return interaction.reply({
        embeds: [
          embed.setDescription("There are no status rewards set up yet!"),
        ],
      });
    }
    let desc = "";

    for (const status of statuses) {
      const role = interaction.guild.roles.cache.get(status.roleId);
      if (!role) {
        removeStatus(status.status);
        continue;
      }
      desc += `> **Status**: \`${status.status}\` \| **Reward**: ${role}\n`;
    }
    return interaction.reply({
      embeds: [embed.setDescription(desc)],
    });
  }
});

const getStatuses = () =>
  new Promise((resolve, reject) => {
    db.all("SELECT * FROM statuses", (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });

const addStatus = async (status, roleId) => {
  db.run("INSERT INTO statuses(status, roleId) VALUES(?, ?)", [
    status.toLowerCase(),
    roleId,
  ]);
  updateValidStatuses();
};

const removeStatus = async status => {
  db.run("DELETE FROM statuses WHERE status = ?", [status.toLowerCase()]);
  updateValidStatuses();
};

const updateValidStatuses = async () => {
  let statuses = await getStatuses();
  return (validStatuses = statuses);
};

const getStatus = async status => {
  return validStatuses.find(s => s.status === status.toLowerCase());
};

client.login(process.env.BOT_TOKEN);
