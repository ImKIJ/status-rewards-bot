const { Client, ApplicationCommandOptionType } = require("discord.js");
const { guildId } = require("./config.json");
/**
 *
 * @param {Client} client
 */
module.exports = async (client) => {
  await client.application.commands.create(
    {
      name: "add-status-reward",
      description: "Adds a new status reward",
      defaultMemberPermissions: ["ManageRoles"],
      options: [
        {
          name: "status",
          type: ApplicationCommandOptionType.String,
          description: "The status for the reward",
          required: true,
        },
        {
          name: "role",
          type: ApplicationCommandOptionType.Role,
          description: "The role to be rewarded",
          required: true,
        },
      ],
    },
    guildId
  );

  await client.application.commands.create(
    {
      name: "remove-status-reward",
      description: "Removes a status reward",
      defaultMemberPermissions: ["ManageRoles"],
      options: [
        {
          name: "status",
          type: ApplicationCommandOptionType.String,
          description: "The status of the reward to remove",
          required: true,
        },
      ],
    },
    guildId
  );

  await client.application.commands.create(
    {
      name: "list-status-rewards",
      description: "Lists all status rewards",
      defaultMemberPermissions: ["ManageRoles"],
    },
    guildId
  );

  console.log("Commands registered!");
};
