import {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";

import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel]
});

import express from "express";
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running!");
});

// Render يعطيك PORT تلقائياً
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});


// ============ تحميل panel_settings.json ============
const SETTINGS_FILE = "panel_settings.json";
let panel_settings = {
  title:
    "Please submit a ticket for any questions or concerns you may have.",
  description:
    "Do Not Open Multiple Tickets.\n\nList your issue with full details.",
  image: ""
};

if (fs.existsSync(SETTINGS_FILE)) {
  panel_settings = JSON.parse(
    fs.readFileSync(SETTINGS_FILE, "utf8")
  );
} else {
  fs.writeFileSync(
    SETTINGS_FILE,
    JSON.stringify(panel_settings, null, 2)
  );
}

// ============= عند تشغيل البوت =============
client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ============= فتح لوحة التذاكر =============
client.on("messageCreate", async (msg) => {
  if (!msg.content.startsWith("!")) return;

  const cmd = msg.content.toLowerCase();

  // --- إرسال لوحة التذاكر ---
  if (cmd === "!ticket") {
    const embed = new EmbedBuilder()
      .setTitle(panel_settings.title)
      .setDescription(panel_settings.description)
      .setColor("#36fff8")
      .setImage(panel_settings.image);

    const menu = new StringSelectMenuBuilder()
      .setCustomId("ticket_type")
      .setPlaceholder("Choose your ticket type")
      .addOptions(
        {
          label: "Support",
          value: "support"
        },
        {
          label: "HWID Reset",
          value: "hwid-reset"
        },
        {
          label: "Purchase",
          value: "purchase"
        },
        {
          label: "Media",
          value: "media"
        }
      );

    const row = new ActionRowBuilder().addComponents(menu);

    return msg.channel.send({ embeds: [embed], components: [row] });
  }

  // ========== PANEL Commands ==========
  if (cmd.startsWith("!panel set_title")) {
    const title = msg.content.replace("!panel set_title", "").trim();
    panel_settings.title = title;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(panel_settings, null, 2));
    return msg.reply("✔ Title updated.");
  }

  if (cmd.startsWith("!panel set_description")) {
    const desc = msg.content.replace("!panel set_description", "").trim();
    panel_settings.description = desc;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(panel_settings, null, 2));
    return msg.reply("✔ Description updated.");
  }

  if (cmd.startsWith("!panel set_image")) {
    const url = msg.content.replace("!panel set_image", "").trim();
    panel_settings.image = url;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(panel_settings, null, 2));
    return msg.reply("✔ Image updated.");
  }

  if (cmd === "!panel show") {
    const embed = new EmbedBuilder()
      .setTitle(panel_settings.title)
      .setDescription(panel_settings.description)
      .setColor("#36fff8")
      .setImage(panel_settings.image);

    return msg.channel.send({ embeds: [embed] });
  }

  // ============= دفع ApplePay ============
  if (cmd === "!applepay") {
    return msg.reply(
      "**Apple Pay Info:**\nSend to: `your-applepay-address`"
    );
  }

  // ============= دفع Crypto ============
  if (cmd === "!crypto") {
    return msg.reply(
      "**Crypto Info:**\nBTC: `111`\nLTC: `222`\nETH: `333`"
    );
  }
});

// ============= عند اختيار نوع التذكرة =============
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== "ticket_type") return;

  const type = interaction.values[0];

  // ============= Modal سبب المشكلة =============
  const modal = new ModalBuilder()
    .setCustomId(`modal_${type}`)
    .setTitle("Ticket Reason");

  const reason = new TextInputBuilder()
    .setCustomId("reason")
    .setLabel("Describe your issue")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(reason));

  await interaction.showModal(modal);
});

// ============= إنشاء قناة التذكرة بعد الـ Modal =============
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  const type = interaction.customId.replace("modal_", "");
  const reason = interaction.fields.getTextInputValue("reason");
  const guild = interaction.guild;

  const categoryMap = {
    support: 1438169784213831691,
    "hwid-reset": 1438179752220426240,
    purchase: 1438182132400001227,
    media: 1438182084765028432
  };

  const category = guild.channels.cache.get(categoryMap[type]);

  const channel = await guild.channels.create({
    name: `${type}-ticket-${interaction.user.username}`,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: [
      {
        id: guild.roles.everyone,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages
        ]
      },
      {
        id: "1438169622204645501",
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages
        ]
      }
    ]
  });

  const embed = new EmbedBuilder()
    .setTitle("New Ticket Created")
    .setDescription(`**Type:** ${type}\n**Reason:** ${reason}`)
    .setColor("#36fff8");

  const claim = new ButtonBuilder()
    .setCustomId("claim")
    .setLabel("Claim")
    .setStyle(ButtonStyle.Success);

  const unclaim = new ButtonBuilder()
    .setCustomId("unclaim")
    .setLabel("Unclaim")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const close = new ButtonBuilder()
    .setCustomId("close_ticket")
    .setLabel("Close")
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(claim, unclaim, close);

  await channel.send({
    content: `Hello ${interaction.user}!`,
    embeds: [embed],
    components: [row]
  });

  await interaction.reply({
    content: `Your ticket has been created: ${channel}`,
    ephemeral: true
  });
});

// ============= Claim / Unclaim / Close =============
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const channel = interaction.channel;

  // --- Claim ---
  if (interaction.customId === "claim") {
    await channel.send(
      `This ticket has been claimed by ${interaction.user}.`
    );
    interaction.message.components[0].components[0].setDisabled(true);
    interaction.message.components[0].components[1].setDisabled(false);
    return interaction.update({
      components: interaction.message.components
    });
  }

  // --- Unclaim ---
  if (interaction.customId === "unclaim") {
    await channel.send("Ticket is no longer claimed.");
    interaction.message.components[0].components[0].setDisabled(false);
    interaction.message.components[0].components[1].setDisabled(true);
    return interaction.update({
      components: interaction.message.components
    });
  }

  // --- Close Ticket ---
  if (interaction.customId === "close_ticket") {
    await channel.send("Ticket will be closed in 3 seconds...");
    setTimeout(async () => {
      await channel.delete().catch(() => {});
    }, 3000);

    return interaction.reply({
      content: "Ticket closed.",
      ephemeral: true
    });
  }
});

// ============= تشغيل البوت =============
client.login(process.env.TOKEN);

