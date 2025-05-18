// === Batch 1: Setup & Globals ===
require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');
const axios = require('axios');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// === Global Game State ===
let gauntletEntrants = [];
let gauntletActive = false;
let joinTimeout = null;
let gauntletChannel = null;
let gauntletMessage = null;
let currentDelay = 0;
let remaining = [];
let eliminatedPlayers = [];
let activeBoons = {};
let activeCurses = {};
let roundImmunity = {};
let mutationDefenseClicks = new Set();
let fateRolls = {};
let tauntTargets = {};
let dodgeAttempts = {};
let hideAttempts = {};
let rematchClicks = 0;
let lastGameEntrantCount = 0;
let rematchesThisHour = 0;
let rematchLimitResetTime = Date.now();
let completedGames = 0;
let isTrialMode = false;
let previousRemaining = 0;

const trialNames = [
  "Trial of the Screaming Mire", "The Eldritch Scramble", "Trial of the Shattered Bones",
  "The Maw's Hunger", "Dance of the Ugly Reflection", "Trial of the Crooked Path",
  "Storm of the Severed Sky", "Gauntlet of Broken Dreams", "The Echoing Crawl", "The Wretched Spiral"
];

const eliminationEvents = [
  "was dragged into the swamp by unseen claws.",
  "tried to pet a malformed dog. It bit back... with ten mouths.",
  "got yeeted off the platform by a sentient fart cloud.",
  "exploded after lighting a fart too close to a rune circle.",
  "was judged too handsome and instantly vaporized.",
  "spoke in rhymes one too many times.",
  "was too ugly. Even for the Malformed.",
  "turned into a rubber duck and floated away.",
  "got tangled in the Lore Scrolls and suffocated.",
  "joined the wrong Discord and disappeared forever.",
  "ate the wrong mushroom and became sentient wallpaper.",
  "laughed at the wrong joke and got obliterated by cringe.",
  "tripped over an imaginary rock and fell into the void.",
  "summoned their own shadow. It won the duel.",
  "took a selfie during the ritual. The flash was fatal.",
  "got banned by the council of malformed ethics.",
  "forgot the safe word during a summoning.",
  "got memed into another dimension.",
  "mislabeled an artifact as ‘mid’. The artifact retaliated.",
  "tried to floss dance during a summoning and evaporated from shame.",
  "failed a captcha from the underworld and got IP banned.",
  "attempted to roast the Malformed… and got cooked instead.",
  "challenged the void to a staring contest. Lost instantly.",
  "mistook a cursed artifact for a burrito. Their last bite.",
  "said “trust me bro” before casting a spell. Big mistake.",
  "unplugged the simulation to save energy. Got deleted.",
  "touched grass... and it bit back.",
  "tried to pet the Lore Keeper. Now part of the lore.",
  "left a one-star Yelp review of the Gauntlet. Was promptly removed.",
  "activated voice chat mid-ritual. Was drowned out by screams.",
  "wore Crocs to the final trial. It was too disrespectful.",
  "sneezed during a stealth mission and got obliterated.",
  "typed “/dance” at the wrong moment. Was breakdanced out of existence.",
  "cast Summon Uber and got taken away. Permanently.",
  "tried to hotwire a cursed wagon. It exploded.",
  "failed a vibe check from the Gauntlet Spirits.",
  "opened an ancient book backwards. Instant regret.",
  "spilled Monster energy drink on the summoning circle. RIP.",
  "used “literally me” too many times. Became nobody.",
  "mistook a lava pit for a jacuzzi.",
  "flexed their NFTs. The gods rugged them.",
  "brought AI to the ritual. The timeline folded.",
  "minted a cursed token and vanished during gas fees.",
  "yelled “YOLO” during the Rite of Shadows. They did not.",
  "asked for WiFi mid-quest. Got throttled into the afterlife.",
  "was caught multitasking. The Gauntlet demands full attention.",
  "opened a lootbox labeled “DO NOT OPEN.”",
  "hit reply-all in the underworld newsletter. Got banned."
];


const specialEliminations = [
  "was sacrificed to the ancient hairball under the couch.",
  "rolled a 1 and summoned their ex instead.",
  "flexed too hard and imploded with style.",
  "said ‘GM’ too late and was banished to Shadow Realm.",
  "was cursed by a malformed meme and vaporized in shame.",
  "drew a red card. From a black deck. Gone.",
  "used Comic Sans in a summoning circle.",
  "forgot to use dark mode and burned alive.",
  "glitched into another chain. Nobody followed.",
  "was outed as an undercover Handsome and disqualified.",
  "summoned an influencer. Was vlogged into the void.",
  "forgot to charge their soul. Battery critical.",
  "wore flip-flops to the apocalypse. Slipped into oblivion.",
  "tried to cast “Fireball” with autocorrect on. “Furball” was less effective.",
  "got ghosted… by an actual ghost.",
  "called the Gauntlet “mid.” The Gauntlet responded.",
  "took a bathroom break and came back erased.",
  "equipped the Cloak of Invisibility. It worked a little *too* well.",
  "tweeted something cringe. The spirits canceled them.",
  "rolled a d20 and summoned their inner child. It panicked and ran."
];


const revivalEvents = [
  "was too ugly to stay dead and clawed their way back!",
  "refused to die and bribed fate with $CHARM.",
  "possessed their own corpse. Classic.",
  "used their Uno Reverse card at the perfect time.",
  "glitched through the floor, then glitched back.",
  "slapped a demon and respawned out of spite.",
  "screamed so loud the timeline flinched.",
  "burned their death certificate in a candle made of shame.",
  "found a continue screen hidden in the clouds.",
  "got revived by a lonely necromancer for company.",
  "played a revival song on a bone flute they found in their ribcage.",
  "bartered with the void using expired coupons. Somehow worked.",
  "ragequit so hard it reversed their death.",
  "got DM’ed by fate with a “you up?” and said yes.",
  "climbed out of the grave just to finish a bit.",
  "glitched while dying and reloaded checkpoint.",
  "fake cried until the spirits gave in.",
  "convinced the Reaper it was a prank.",
  "used the wrong pronoun in a curse, causing a reset.",
  "was resurrected as a meme, and that counts."
];


const reviveFailLines = [
  "🦶 You wiggle in the dirt… but you're still dead.",
  "👁️ The malformed forces laugh and turn away.",
  "☠️ You reached out… and got ghosted.",
  "🧠 You whispered your name backward. Nothing happened.",
  "📉 Your odds dropped further just for trying.",
  "🙈 You faked your death. The Gauntlet unfaked it.",
  "🙃 Your resurrection email bounced.",
  "📵 The ritual hotline is currently down. Try never.",
  "💅 You died fashionably. Unfortunately, still dead.",
  "🥴 You whispered “please?” into the void. It cringed.",
  "📦 The afterlife returned your soul… damaged.",
  "🦴 Your bones attempted to reassemble. They unionized instead.",
  "🐌 Your request was too slow. Death already moved on.",
  "🤡 Your revival was reviewed… and laughed at.",
  "🪤 You triggered a trap trying to live. Good effort though."
];


// === Server Configs ===
let serverConfigs = {};
const CONFIG_FILE = './serverConfigs.json';
if (fs.existsSync(CONFIG_FILE)) {
  serverConfigs = JSON.parse(fs.readFileSync(CONFIG_FILE));
}
// === Batch 2: Interaction Handlers & Join Button ===
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  // === Join Button Logic ===
  if (interaction.customId === 'join_gauntlet' && gauntletActive) {
    const alreadyJoined = gauntletEntrants.find(e => e.id === interaction.user.id);
    if (!alreadyJoined) {
      gauntletEntrants.push({ id: interaction.user.id, username: interaction.user.username });

      await interaction.reply({ content: 'You have joined the Ugly Gauntlet! Prepare yourself…', ephemeral: true });

      if (gauntletMessage && gauntletMessage.editable) {
        const embed = EmbedBuilder.from(gauntletMessage.embeds[0])
          .setDescription(`Click to enter. 🧟 Entrants so far: ${gauntletEntrants.length}`);
        await gauntletMessage.edit({ embeds: [embed] });
      }
    } else {
      await interaction.reply({ content: 'You have already joined this round!', ephemeral: true });
    }
  }

  // === Resurrection Button ===
  if (interaction.customId === 'resurrection_click') {
    if (!eliminatedPlayers.find(p => p.id === interaction.user.id)) {
      return interaction.reply({ content: '👻 You aren’t even dead. Nice try.', ephemeral: true });
    }
    resurrectionSet.add(interaction.user.id);
    return interaction.reply({ content: '💫 The totem accepts your touch...', ephemeral: true });
  }

  // === Resist Mutation Button ===
  if (interaction.customId === 'resist_mutation') {
    if (!remaining.find(p => p.id === interaction.user.id)) {
      return interaction.reply({ content: '🛑 Only live players may resist.', ephemeral: true });
    }
    mutationDefenseClicks.add(interaction.user.id);
    return interaction.reply({ content: '🧬 Your resistance is noted.', ephemeral: true });
  }

  // === Survival Trap Button ===
  if (interaction.customId === 'survival_click') {
    if (survivorsThisRound >= 3 || !remaining.find(p => p.id === interaction.user.id)) {
      return interaction.reply({ content: '⛔ Too late — the rope has already saved 3!', ephemeral: true });
    }
    roundImmunity[interaction.user.id] = true;
    survivorsThisRound++;
    return interaction.reply({ content: '🛡️ You grabbed the rope and are protected!', ephemeral: true });
  }

  // === Rematch Button ===
  if (interaction.customId === 'rematch_gauntlet') {
    if (rematchVoters.has(interaction.user.id)) {
      return interaction.reply({ content: '⛔ You’ve already voted for a rematch.', ephemeral: true });
    }
    rematchVoters.add(interaction.user.id);
    rematchClicks++;

    await interaction.reply({ content: '🩸 Your vote has been cast.', ephemeral: true });

    await rematchMsg.edit({
      content: `The blood is still warm... **${neededRematchVotes} souls** must choose to rematch...`,
      components: [buildRematchButton()]
    });

    if (rematchClicks >= neededRematchVotes) {
      rematchesThisHour++;
      await gauntletChannel.send(`🔁 The Gauntlet begins again — summoned by ${rematchClicks} brave souls!`);
      setTimeout(() => startGauntlet(gauntletChannel, 3), 2000);
      rematchCollector.stop();
    }
  }

  // === Audience Curse Vote ===
  if (interaction.customId.startsWith('vote_')) {
    if (audienceAlreadyVoted.has(interaction.user.id)) {
      return interaction.reply({ content: '🛑 You already voted.', ephemeral: true });
    }
    audienceAlreadyVoted.add(interaction.user.id);

    const targetId = interaction.customId.split('_')[1];
    audienceVoteCounts[targetId] = (audienceVoteCounts[targetId] || 0) + 1;
    return interaction.reply({ content: '✅ Your vote has been cast.', ephemeral: true });
  }

  // === Boss Vote ===
  if (interaction.customId.startsWith('boss_vote_')) {
    if (bossAlreadyVoted.has(interaction.user.id)) {
      return interaction.reply({ content: '❌ You already voted for the Ugly Boss.', ephemeral: true });
    }
    bossAlreadyVoted.add(interaction.user.id);

    const selectedId = interaction.customId.replace('boss_vote_', '');
    bossVoteCounts[selectedId] = (bossVoteCounts[selectedId] || 0) + 1;
    return interaction.reply({ content: `✅ Your vote has been cast.`, ephemeral: true });
  }
});
// === Batch 2: Interaction Handlers & Join Button ===
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  // Join Button Logic
  if (interaction.customId === 'join_gauntlet' && gauntletActive) {
    const alreadyJoined = gauntletEntrants.find(e => e.id === interaction.user.id);
    if (!alreadyJoined) {
      gauntletEntrants.push({ id: interaction.user.id, username: interaction.user.username });

      await interaction.reply({ content: 'You have joined the Ugly Gauntlet! Prepare yourself…', ephemeral: true });

      if (gauntletMessage && gauntletMessage.editable) {
        const embed = EmbedBuilder.from(gauntletMessage.embeds[0])
          .setDescription(`Click to enter. 🧟 Entrants so far: ${gauntletEntrants.length}`);
        await gauntletMessage.edit({ embeds: [embed] });
      }
    } else {
      await interaction.reply({ content: 'You have already joined this round!', ephemeral: true });
    }
  }
});
// === Batch 3: Mass Revival Totem Event ===
async function massRevivalEvent(channel) {
  const eligible = [...eliminatedPlayers];
  if (eligible.length === 0) return;

  const resurrectionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('resurrection_click')
      .setLabel('💀 Touch the Totem')
      .setStyle(ButtonStyle.Danger)
  );

  const prompt = await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle('☠️ The Totem of Lost Souls Appears...')
      .setDescription('A twisted totem hums with malformed energy. Click below for a **50/50** shot at resurrection.\n\nYou have **4 seconds**. Touch it... or stay forgotten.')
      .setColor(0x910000)
    ],
    components: [resurrectionRow]
  });

  const collector = prompt.createMessageComponentCollector({ time: 4000 });
  const braveFools = new Set();

  collector.on('collect', async i => {
    if (!eliminatedPlayers.find(p => p.id === i.user.id)) {
      return i.reply({ content: '👻 You aren’t even dead. Nice try.', ephemeral: true });
    }
    braveFools.add(i.user.id);
    i.reply({ content: '💫 The totem accepts your touch...', ephemeral: true });
  });

  collector.on('end', async () => {
    await prompt.edit({ components: [] }); // disable the button

    if (braveFools.size === 0) {
      await channel.send('🪦 No souls were bold enough to risk the totem.');
      return;
    }

    // List participants
    const names = [...braveFools].map(id => `<@${id}>`).join('\n');
    await channel.send({
      embeds: [new EmbedBuilder()
        .setTitle('⏳ The Totem Judged Them...')
        .setDescription(`The following souls reached for resurrection:\n\n${names}\n\nWill they return... or be mocked for eternity?`)
        .setColor(0xffcc00)
      ]
    });

    // Countdown
    await channel.send('🕒 3...');
    await new Promise(r => setTimeout(r, 1000));
    await channel.send('🕒 2...');
    await new Promise(r => setTimeout(r, 1000));
    await channel.send('🕒 1...');
    await new Promise(r => setTimeout(r, 1000));

    const success = Math.random() < 0.5;

    if (success) {
      for (const id of braveFools) {
        const player = eliminatedPlayers.find(p => p.id === id);
        if (player) {
          remaining.push(player);
          eliminatedPlayers = eliminatedPlayers.filter(p => p.id !== id);
        }
      }

      await channel.send({
        embeds: [new EmbedBuilder()
          .setTitle('💥 They Returned!')
          .setDescription(`Against all odds, the totem roared with approval.\n${[...braveFools].map(id => `<@${id}>`).join('\n')} **have re-entered The Gauntlet!**`)
          .setColor(0x00cc66)
        ]
      });
    } else {
      await channel.send({
        embeds: [new EmbedBuilder()
          .setTitle('🤣 The Totem Laughed...')
          .setDescription(`Not a single soul was accepted.\nInstead, the totem belched out a fart cloud and vanished.\nBetter luck next undeath.`)
          .setColor(0xbb0000)
        ]
      });
    }
  });
}
// === Batch 4: Start Gauntlet & Join Countdown ===
async function startGauntlet(channel, delay) {
  if (gauntletActive) return;
  isTrialMode = false;

  gauntletEntrants = [];
  gauntletActive = true;
  eliminatedPlayers = [];
  remaining = [];
  activeBoons = {};
  activeCurses = {};
  roundImmunity = {};
  fateRolls = {};
  tauntTargets = {};
  dodgeAttempts = {};
  hideAttempts = {};
  mutationDefenseClicks = new Set();
  rematchClicks = 0;

  gauntletChannel = channel;
  currentDelay = delay;

  const joinButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('join_gauntlet')
      .setLabel('Join the Ugly Gauntlet')
      .setStyle(ButtonStyle.Primary)
  );

  gauntletMessage = await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle('🏁 The Ugly Gauntlet Has Begun!')
      .setDescription(`Click to enter. You have ${delay} minutes.\n🧟 Entrants so far: 0`)
      .setColor(0x6e40c9)
    ],
    components: [joinButton]
  });

  const totalMs = delay * 60 * 1000;
  joinTimeout = setTimeout(async () => {
    if (gauntletEntrants.length < 1) {
      await channel.send('Not enough entrants joined. Try again later.');
      gauntletActive = false;
    } else {
      await runGauntlet(channel);
    }
  }, totalMs);

  const intervalMs = totalMs / 3;

  setTimeout(() => {
    channel.send(`⏳ One third of the time has passed. **${Math.round((delay * 2) / 3)} minutes left** to join the Gauntlet...`);
  }, intervalMs);

  setTimeout(() => {
    channel.send(`⚠️ Two thirds of the countdown are gone. Only **${Math.round(delay / 3)} minutes** remain to join!`);
  }, intervalMs * 2);

  setTimeout(() => {
    channel.send(`🕰️ Final moment! The Gauntlet will begin **any second now...**`);
  }, totalMs - 5000);
}
// === Batch 5: runGauntlet — Setup, Boss Vote, and Round Loop ===
async function runGauntlet(channel) {
  gauntletActive = false;
  remaining = [...gauntletEntrants];
  let roundCounter = 1;
  let audienceVoteCount = 0;
  const maxVotesPerGame = 2;
  let previousRemaining = remaining.length;

  // === Boss Vote (NEW) ===
  const bossCandidates = [...remaining].sort(() => 0.5 - Math.random()).slice(0, 5);
  const bossVoteRow = new ActionRowBuilder().addComponents(
    ...bossCandidates.map((p) =>
      new ButtonBuilder()
        .setCustomId(`boss_vote_${p.id}`)
        .setLabel(`Vote ${p.username}`)
        .setStyle(ButtonStyle.Secondary)
    )
  );

  const voteCounts = {};
  const alreadyVoted = new Set();

  const voteMsg = await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle("👑 Who Should Be the UGLY BOSS?")
      .setDescription("Vote for who you think should be this game's Ugly Boss.\nThe winner earns **double $CHARM** if they survive to the podium.\n\n🗳️ Voting ends in **15 seconds**. Choose wisely.")
      .setColor(0x9932cc)
    ],
    components: [bossVoteRow]
  });

  const bossVoteCollector = voteMsg.createMessageComponentCollector({ time: 15000 });

  bossVoteCollector.on('collect', async interaction => {
    if (alreadyVoted.has(interaction.user.id)) {
      return interaction.reply({ content: '❌ You already voted for the Ugly Boss.', ephemeral: true });
    }
    alreadyVoted.add(interaction.user.id);
    const selectedId = interaction.customId.replace('boss_vote_', '');
    voteCounts[selectedId] = (voteCounts[selectedId] || 0) + 1;
    await interaction.reply({ content: `✅ Your vote has been cast.`, ephemeral: true });
  });

  await new Promise(r => setTimeout(r, 15000));
  await voteMsg.edit({ components: [] });

  const maxVotes = Math.max(...Object.values(voteCounts), 0);
  const topCandidates = Object.entries(voteCounts)
    .filter(([_, count]) => count === maxVotes)
    .map(([id]) => id);

  const bossId = topCandidates.length
    ? topCandidates[Math.floor(Math.random() * topCandidates.length)]
    : bossCandidates[Math.floor(Math.random() * bossCandidates.length)].id;

  const boss = remaining.find(p => p.id === bossId);
  await channel.send(`👹 A foul stench rises... <@${boss.id}> has been chosen as the **UGLY BOSS**! If they make it to the podium, they earn **double $CHARM**...`);

  // === Begin Rounds ===
  while (remaining.length > 3) {
    const eliminations = Math.min(2, remaining.length - 3);
    const eliminated = [];
    roundImmunity = {};
    activeBoons = {};
    activeCurses = {};
    mutationDefenseClicks.clear();

    if (remaining.length === previousRemaining) {
      await channel.send(`⚠️ No eliminations this round. Skipping to avoid softlock.`);
      break;
    }
    previousRemaining = remaining.length;

    // Mutation, traps, resurrection, boons, curses, eliminations...
    // ⏩ Proceed to Batch 6 (event logic and round resolution)
  }
}
    // === Mutation Defense (20% chance) ===
    if (Math.random() < 0.2) {
      const mutateRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('resist_mutation')
          .setLabel('🧬 Resist Mutation')
          .setStyle(ButtonStyle.Danger)
      );

      const mutateMsg = await channel.send({
        embeds: [new EmbedBuilder()
          .setTitle("🧬 Mutation Threat Detected!")
          .setDescription("Click below to resist mutation. If 3+ resist, it's suppressed.")
          .setColor(0xff4500)
        ],
        components: [mutateRow]
      });

      const mutateCollector = mutateMsg.createMessageComponentCollector({ time: 15000 });

      mutateCollector.on('collect', async interaction => {
        if (!remaining.find(p => p.id === interaction.user.id)) {
          return interaction.reply({ content: '🛑 Only live players may resist.', ephemeral: true });
        }
        mutationDefenseClicks.add(interaction.user.id);
        await interaction.reply({ content: '🧬 Your resistance is noted.', ephemeral: true });
      });

      await new Promise(r => setTimeout(r, 15000));
      await mutateMsg.edit({ components: [] });

      const suppressed = mutationDefenseClicks.size >= 3;
      await channel.send(suppressed
        ? '🧬 Enough resistance! The mutation has been suppressed.'
        : '💥 Not enough resistance. The mutation begins...');
    }

    // === Survival Trap (15% chance) ===
    if (Math.random() < 0.15) {
      const survivalRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('survival_click')
          .setLabel('🪢 Grab the Rope!')
          .setStyle(ButtonStyle.Success)
      );

      const trapMsg = await channel.send({
        content: '⏳ A trap is triggered! First 3 to grab the rope will survive this round.',
        components: [survivalRow]
      });

      const survivalCollector = trapMsg.createMessageComponentCollector({ time: 10000 });
      let saved = 0;

      survivalCollector.on('collect', async i => {
        if (saved < 3 && remaining.find(p => p.id === i.user.id)) {
          roundImmunity[i.user.id] = true;
          saved++;
          await i.reply({ content: '🛡️ You grabbed the rope and are protected!', ephemeral: true });
        } else {
          await i.reply({ content: '⛔ Too late — the rope has already saved 3!', ephemeral: true });
        }
      });
    }

    // === Mass Resurrection if 50% eliminated ===
    const percentEliminated = eliminatedPlayers.length / gauntletEntrants.length;
    if (percentEliminated >= 0.5) {
      await massRevivalEvent(channel);
    }

    // === Random Boons & Curses (15% chance) ===
    if (Math.random() < 0.15 && remaining.length > 2) {
      const shuffled = [...remaining].sort(() => 0.5 - Math.random());
      const affectedPlayers = shuffled.slice(0, Math.floor(Math.random() * 2) + 1);
      const fateLines = [];

      for (const player of affectedPlayers) {
        const fate = Math.random();
        if (fate < 0.5) {
          activeCurses[player.id] = true;
          fateLines.push(`👿 <@${player.id}> has been **cursed** by malformed forces.`);
        } else {
          activeBoons[player.id] = true;
          fateLines.push(`🕊️ <@${player.id}> has been **blessed** with strange protection.`);
        }
      }

      await channel.send({
        embeds: [new EmbedBuilder()
          .setTitle("🔮 Twisted Fates Unfold...")
          .setDescription(fateLines.join('\n'))
          .setColor(0x6a0dad)
        ]
      });
    }

    // ⏭️ Continue to Batch 7: Audience Curse Vote
    // === Audience Curse Vote (up to 2–3 per game) ===
    let cursedPlayerId = null;

    if (audienceVoteCount < maxVotesPerGame && remaining.length >= 3) {
      audienceVoteCount++;

      const pollPlayers = [...remaining].sort(() => 0.5 - Math.random()).slice(0, 3);
      const playerList = pollPlayers.map(p => `- <@${p.id}>`).join('\n');

      await channel.send({
        embeds: [new EmbedBuilder()
          .setTitle(`👁️ Audience Vote #${audienceVoteCount}`)
          .setDescription(`Three players are up for a potential CURSE:\n\n${playerList}`)
          .setColor(0xff6666)
        ]
      });

      await channel.send(`🗣️ Discuss who to curse... you have **20 seconds**.`);
      await new Promise(r => setTimeout(r, 10000));
      await channel.send(`⏳ 10 seconds remaining...`);
      await new Promise(r => setTimeout(r, 10000));

      const voteRow = new ActionRowBuilder().addComponents(
        ...pollPlayers.map((p) =>
          new ButtonBuilder()
            .setCustomId(`vote_${p.id}`)
            .setLabel(`Curse ${p.username}`)
            .setStyle(ButtonStyle.Secondary)
        )
      );

      const voteMsg = await channel.send({
        embeds: [new EmbedBuilder()
          .setTitle('🗳️ Cast Your Curse')
          .setDescription('Click a button below to vote. You have **10 seconds**. The player with the most votes will be cursed.')
          .setColor(0x880808)
        ],
        components: [voteRow]
      });

      const voteCounts = {};
      const alreadyVoted = new Set();

      const voteCollector = voteMsg.createMessageComponentCollector({ time: 10000 });

      voteCollector.on('collect', interaction => {
        if (alreadyVoted.has(interaction.user.id)) {
          return interaction.reply({ content: '🛑 You already voted.', ephemeral: true });
        }
        alreadyVoted.add(interaction.user.id);
        const targetId = interaction.customId.split('_')[1];
        voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
        interaction.reply({ content: '✅ Your vote has been cast.', ephemeral: true });
      });

      await new Promise(r => setTimeout(r, 10000));
      await voteMsg.edit({ components: [] });

      const maxVotes = Math.max(...Object.values(voteCounts), 0);
      const cursedIds = Object.entries(voteCounts)
        .filter(([_, count]) => count === maxVotes)
        .map(([id]) => id);
      cursedPlayerId = cursedIds.length
        ? cursedIds[Math.floor(Math.random() * cursedIds.length)]
        : null;

      if (cursedPlayerId) {
        activeCurses[cursedPlayerId] = true;
        await channel.send(`😨 The audience has spoken. <@${cursedPlayerId}> is **cursed**!`);
      } else {
        await channel.send(`👻 No votes were cast. The malformed crowd stays silent.`);
      }
    }

    // ⏭️ Continue to Batch 8: Elimination Logic
    const trial = trialNames[Math.floor(Math.random() * trialNames.length)];
    let eliminationDescriptions = [];

    for (let i = 0; i < eliminations; i++) {
      let player;

      // Force cursed player to be eliminated first
      if (i === 0 && cursedPlayerId) {
        player = remaining.find(p => p.id === cursedPlayerId);
        if (player) {
          remaining = remaining.filter(p => p.id !== cursedPlayerId);
        }
      }

      if (!player) {
        player = remaining.splice(Math.floor(Math.random() * remaining.length), 1)[0];
      }

      // Immunities, Boons, and Boss protections
      if (roundImmunity[player.id]) {
        eliminationDescriptions.push(`🛡️ <@${player.id}> avoided elimination with quick reflexes!`);
        continue;
      }

      if (activeBoons[player.id]) {
        eliminationDescriptions.push(`✨ <@${player.id}> was protected by a boon and dodged elimination!`);
        continue;
      }

      if (activeCurses[player.id]) {
        eliminationDescriptions.push(`💀 <@${player.id}> succumbed to their curse!`);
      }

      if (player.id === boss.id && Math.random() < 0.5) {
        eliminationDescriptions.push(`🛑 <@${player.id}> is the Boss — and shrugged off the attack!`);
        remaining.push(player);
        continue;
      }

      eliminated.push(player);
      eliminatedPlayers.push(player);

      const useSpecial = Math.random() < 0.15;
      const reason = useSpecial
        ? specialEliminations[Math.floor(Math.random() * specialEliminations.length)]
        : eliminationEvents[Math.floor(Math.random() * eliminationEvents.length)];

      const style = Math.floor(Math.random() * 3);
      if (useSpecial) {
        if (style === 0) {
          eliminationDescriptions.push(`━━━━━━━━━━ 👁‍🗨 THE MALFORMED STRIKE 👁‍🗨 ━━━━━━━━━━\n❌ <@${player.id}> ${reason}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        } else if (style === 1) {
          eliminationDescriptions.push(`⚠️💀⚠️ SPECIAL FATE ⚠️💀⚠️\n❌ <@${player.id}> ${reason}\n🩸🧟‍♂️😈👁🔥👣🪦🧠👃`);
        } else {
          eliminationDescriptions.push(`**💥 Cursed Spotlight: <@${player.id}> 💥**\n_${reason}_`);
        }
      } else {
        eliminationDescriptions.push(`❌ <@${player.id}> ${reason}`);
      }
    }

    // 💫 Rare Resurrection (15% chance)
    if (eliminated.length && Math.random() < 0.15) {
      const reviveIndex = Math.floor(Math.random() * eliminated.length);
      const revived = eliminated.splice(reviveIndex, 1)[0];
      if (revived) {
        remaining.push(revived);
        const reviveMsg = revivalEvents[Math.floor(Math.random() * revivalEvents.length)];
        eliminationDescriptions.push(`💫 <@${revived.id}> ${reviveMsg}`);
      }
    }

    // 🎨 Embed with Random Ugly NFT + Player Count
    const tokenId = Math.floor(Math.random() * 574) + 1;
    const nftImage = `https://ipfs.io/ipfs/bafybeie5o7afc4yxyv3xx4jhfjzqugjwl25wuauwn3554jrp26mlcmprhe/${tokenId}.jpg`;

    const totalPlayers = gauntletEntrants.length;
    const survivors = remaining.length;

    await channel.send({
      embeds: [new EmbedBuilder()
        .setTitle(`⚔️ Round ${roundCounter} — ${trial}`)
        .setDescription([
          ...eliminationDescriptions,
          `\n👥 **Players Remaining:** ${survivors} / ${totalPlayers}`
        ].join('\n'))
        .setColor(0x8b0000)
        .setImage(nftImage)
      ]
    });

    roundCounter++;
    await new Promise(r => setTimeout(r, 10000));

    // Check if it's time for Totem (50% players eliminated)
    if (eliminatedPlayers.length >= Math.floor(totalPlayers / 2)) {
      await massRevivalEvent(channel);
    }
  if (remaining.length <= 3) {
    const [first, second, third] = remaining;
    let firstReward = 50;
    let secondReward = 25;
    let thirdReward = 10;

    if (first?.id === boss?.id) firstReward *= 2;
    if (second?.id === boss?.id) secondReward *= 2;
    if (third?.id === boss?.id) thirdReward *= 2;

    await sendCharmToUser(first.id, firstReward, channel);
    await sendCharmToUser(second.id, secondReward, channel);
    await sendCharmToUser(third.id, thirdReward, channel);

    if ([first.id, second.id, third.id].includes(boss.id)) {
      await channel.send(`👑 The **Ugly Boss** <@${boss.id}> survived to the end. Their reward is **doubled**!`);
    }

    await channel.send({
      embeds: [new EmbedBuilder()
        .setTitle('🏆 Champions of the Ugly Gauntlet!')
        .setDescription([
          `**1st Place:** <@${first.id}> — **${firstReward} $CHARM**`,
          `**2nd Place:** <@${second.id}> — **${secondReward} $CHARM**`,
          `**3rd Place:** <@${third.id}> — **${thirdReward} $CHARM**`,
          ``,
          `The Gauntlet has spoken. Well fought, Champions!`
        ].join('\n'))
        .setColor(0xdaa520)
      ]
    });

    await triggerRematchPrompt(channel);

    // 🎁 Rare Mint Incentive
    completedGames++;
    if (completedGames >= 50) {
      completedGames = 0;

      const incentives = [
        {
          title: "⚡ First to Mint an Ugly gets 500 $CHARM!",
          desc: "⏳ You have **5 minutes**. Post proof in <#1334345680461762671>!",
        },
        {
          title: "🧵 First to Tweet their Ugly or Monster + tag @Charm_Ugly gets 100 $CHARM!",
          desc: "Drop proof in <#1334345680461762671> and the team will verify. GO!",
        },
        {
          title: "💥 Mint 3, Get 1 Free (must open ticket)",
          desc: "⏳ You have **15 minutes** to mint 3 — and we’ll airdrop 1 more. #UglyLuck",
        },
        {
          title: "👑 Mint 3, Get a FREE MONSTER",
          desc: "⏳ You have **15 minutes**. Prove it in a ticket and a Monster is yours.",
        },
        {
          title: "🎁 All mints in the next 10 minutes earn +150 $CHARM",
          desc: "Yes, all. Go go go.",
        },
        {
          title: "🃏 Every mint = 1 raffle entry",
          desc: "**Next prize:** 1,000 $CHARM! All mints from now to the next milestone are eligible.",
        },
        {
          title: "📸 Lore Challenge Activated!",
          desc: "Post your Ugly in <#💬┆general-chat> with a 1-liner backstory. Best lore gets 250 $CHARM in 24h.",
        },
        {
          title: "📦 SECRET BOUNTY ⚠️",
          desc: "One of the next 10 mints will receive... something special. We won't say what.",
        }
      ];

      const selected = incentives[Math.floor(Math.random() * incentives.length)];
      const tokenId = Math.floor(Math.random() * 574) + 1;
      const nftImage = `https://ipfs.io/ipfs/bafybeie5o7afc4yxyv3xx4jhfjzqugjwl25wuauwn3554jrp26mlcmprhe/${tokenId}.jpg`;

      await channel.send({
        embeds: [new EmbedBuilder()
          .setTitle(`🎉 RARE MINT INCENTIVE UNLOCKED!`)
          .setDescription(`**${selected.title}**\n\n${selected.desc}`)
          .setColor(0xffd700)
          .setImage(nftImage)
        ]
      });
    }
  } // ✅ End if (remaining.length <= 3)
// === Batch 10: Rematch Vote Logic ===
async function triggerRematchPrompt(channel) {
  lastGameEntrantCount = gauntletEntrants.length;

  // Reset rematch limit if an hour has passed
  if (Date.now() - rematchLimitResetTime > 60 * 60 * 1000) {
    rematchesThisHour = 0;
    rematchLimitResetTime = Date.now();
  }

  if (rematchesThisHour >= 3) {
    await channel.send(`🚫 Max of 3 rematches reached this hour. The Gauntlet rests... for now.`);
    return;
  }

  rematchClicks = 0;
  const neededClicks = lastGameEntrantCount + 1;
  const rematchVoters = new Set();

  const buildRematchButton = () =>
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rematch_gauntlet')
        .setLabel(`🔁 Rematch? (${rematchClicks}/${neededClicks})`)
        .setStyle(ButtonStyle.Primary)
    );

  const rematchMsg = await channel.send({
    content: `The blood is still warm... **${neededClicks} souls** must choose to rematch...`,
    components: [buildRematchButton()]
  });

  await channel.send(`🕐 You have **1 minute** to vote for a rematch.`);

  const rematchCollector = rematchMsg.createMessageComponentCollector({ time: 60000 });

  rematchCollector.on('collect', async interaction => {
    if (rematchVoters.has(interaction.user.id)) {
      return interaction.reply({ content: '⛔ You’ve already voted for a rematch.', ephemeral: true });
    }

    rematchVoters.add(interaction.user.id);
    rematchClicks++;

    await interaction.reply({ content: '🩸 Your vote has been cast.', ephemeral: true });

    await rematchMsg.edit({
      content: `The blood is still warm... **${neededClicks} souls** must choose to rematch...`,
      components: [buildRematchButton()]
    });

    if (rematchClicks >= neededClicks) {
      rematchesThisHour++;
      await channel.send(`🔁 The Gauntlet begins again — summoned by ${rematchClicks} brave souls!`);
      setTimeout(() => startGauntlet(channel, 3), 2000);
      rematchCollector.stop();
    }
  });

  rematchCollector.on('end', async () => {
    if (rematchClicks < neededClicks) {
      await channel.send(`☠️ Not enough players voted for a rematch. The Gauntlet sleeps... for now.`);
    }
  });
}
// === Batch 11: Message Commands ===
client.on('messageCreate', async message => {
  console.log(`[MSG] ${message.author.username}: ${message.content}`);
  if (message.author.bot) return;

  const content = message.content.trim().toLowerCase();
  const userId = message.author.id;

  // 🔁 Try to revive
  if (content === '!revive') {
    const isAlive = remaining.find(p => p.id === userId);
    if (isAlive) return message.channel.send(`🧟 <@${userId}> You're already among the living.`);

    const wasEliminated = eliminatedPlayers.find(p => p.id === userId);
    if (!wasEliminated) return message.channel.send(`👻 <@${userId}> You haven’t been eliminated yet.`);

    if (wasEliminated.attemptedRevive) {
      return message.channel.send(`🔁 <@${userId}> already tried to cheat death. Fate isn’t amused.`);
    }

    wasEliminated.attemptedRevive = true;

    if (Math.random() < 0.01) {
      remaining.push(wasEliminated);
      const reviveMsg = revivalEvents[Math.floor(Math.random() * revivalEvents.length)];
      return message.channel.send(`💫 <@${userId}> ${reviveMsg}`);
    } else {
      const failMsg = reviveFailLines[Math.floor(Math.random() * reviveFailLines.length)];
      return message.channel.send(`${failMsg} <@${userId}> remains dead.`);
    }
  }

  // ⏱ Start Gauntlet (custom delay)
  if (content.startsWith('!gauntlet ')) {
    const delay = parseInt(content.split(' ')[1], 10);
    return startGauntlet(message.channel, isNaN(delay) ? 10 : delay);
  }

  // 🟢 Start Gauntlet (default 10min)
  if (content === '!gauntlet') {
    return startGauntlet(message.channel, 10);
  }

  // 🧨 Force start early
  if (content === '!startg') {
    if (gauntletActive) {
      clearTimeout(joinTimeout);
      runGauntlet(message.channel);
    } else {
      message.channel.send('No Gauntlet is currently running. Use !gauntlet to begin one.');
    }
    return;
  }

  // 🧪 Trial mode (mock 20 players)
  if (content === '!gauntlettrial') {
    if (gauntletActive) return message.channel.send('A Gauntlet is already running.');
    isTrialMode = true; // enable trial mode
    gauntletEntrants = Array.from({ length: 20 }, (_, i) => ({
      id: `MockUser${i + 1}`,
      username: `MockPlayer${i + 1}`
    }));
    remaining = [...gauntletEntrants];
    eliminatedPlayers = [];
    gauntletActive = true;
    gauntletChannel = message.channel;
    await message.channel.send('🧪 Trial Mode Activated — 20 mock players have entered. Starting...');
    return runGauntlet(message.channel);
  }
});
// === Batch 12: Send DRIP $CHARM Token Rewards ===
async function sendCharmToUser(discordUserId, amount, channel = null) {
  const DRIP_API_TOKEN = process.env.DRIP_API_TOKEN;
  const DRIP_ACCOUNT_ID = '676d81ee502cd15c9c983d81'; // Replace with your DRIP account ID
  const CURRENCY_ID = '1047256251320520705'; // Replace with your DRIP currency ID

  const headers = {
    Authorization: `Bearer ${DRIP_API_TOKEN}`,
    'Content-Type': 'application/json'
  };

  const data = {
    recipient: {
      id: discordUserId,
      id_type: "discord_id"
    },
    amount: amount,
    reason: "Victory in The Gauntlet",
    currency_id: CURRENCY_ID,
    account_id: DRIP_ACCOUNT_ID
  };

  try {
    await axios.post(`https://api.drip.re/v2/send`, data, { headers });
    console.log(`✅ Sent ${amount} $CHARM to ${discordUserId}`);
    if (channel) {
      await channel.send(`🪙 <@${discordUserId}> received **${amount} $CHARM** from the Malformed Vault.`);
    }
  } catch (error) {
    console.error(`❌ Failed to send $CHARM to ${discordUserId}`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    if (channel) {
      await channel.send(`⚠️ Could not send $CHARM to <@${discordUserId}>. Please contact the team.`);
    }
  }
}
// === Batch 13: Bot Ready & Login ===
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN); // ✅ FINAL LINE
