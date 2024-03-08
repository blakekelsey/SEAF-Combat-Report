require('dotenv').config({ path: './bot.env' }); //Load environment variables from .env file

const { Client, ActivityType } = require("discord.js");
const axios = require("axios");

const bot = new Client({ intents: 35329 });

const prefix = "!";

let previousLiberations = []; //Store the liberation percentage and text from the previous requests

bot.once("ready", async () => {
  console.log("Bot is ready!");
  bot.user.setActivity("Spreading the Sweet Seed of Democracy", { type: ActivityType.Playing });
  //Schedule hourly updates from 9pm to 12am
  scheduleHourlyUpdates();
});

bot.on("messageCreate", async (msg) => {
  console.log(`Received message: ${msg.content}`);
  console.log("Message author:", msg.author.username);
  console.log("Message channel:", msg.channel.name);

  if (!msg.content.startsWith(prefix)) {
    return;
  }

  const args = msg.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "update") {
    try {
      await updateWarStatuses(msg.channel);
    } catch (error) {
      console.error("Error:", error.message);
    }
  }
});

async function updateWarStatuses(channel) {
  try {
    const warIdsResponse = await axios.get("https://helldivers-2.fly.dev/api");
    const warIds = warIdsResponse.data.seasons;
    console.log("warIds:", warIds); // Check the value and type of warIds
    const allWarStatuses = await getAllWarStatuses(warIds);

    const embed = createEmbed(allWarStatuses, previousLiberations);

    channel.send({ embeds: [embed] });

    // Store the liberation percentages and text from the current request for future comparison
    previousLiberations = allWarStatuses.map((status) => ({
      name: status.name,
      liberation: status.liberation,
      liberationText: status.liberationText,
    }));
  } catch (error) {
    if (error.response && error.response.status === 429) {
      // Handle 429 (Too Many Requests) response
      console.error("Error: Request failed with status code 429 (Too many requests), try again in 5 minutes");
      channel.send("Error: Request failed with status code 429 (Too many requests), try again in 5 minutes");
    } else {
      console.error("Error:", error.message);
      channel.send("An error occurred while fetching war status. Please try again later.");
    }
  }
}

async function getAllWarStatuses(warIds) {
  const allWarStatuses = [];

  for (const warId of warIds) {
    try {
      console.log(`Requesting war status for War ID: ${warId}`);

      const response = await axios.get(
        `https://helldivers-2.fly.dev/api/${warId}/status`,
      );
      console.log(`War Status for War ID ${warId}:`, response.data);

      const planetStatuses = response.data.planet_status.map((planet) => ({
        name: planet.planet.name,
        players: planet.players,
        liberation: parseFloat(planet.liberation.toFixed(2)),
        liberationText: "",
      }));

      allWarStatuses.push(...planetStatuses);
    } catch (error) {
      console.error(`Error fetching war status for War ID ${warId}:`, error);
    }
  }

  return allWarStatuses;
}

function createEmbed(allWarStatuses, previousLiberations = []) {
  const exampleEmbed = {
    color: 0x00eaff,
    title: "SEAF Combat Report",
    fields: [],
    timestamp: new Date().toISOString(),
    footer: {
      text: "All reports verified directly by General Brasch",
    },
  };

  //Sort the array of war statuses by player count
  const sortedPlanets = allWarStatuses.sort((a, b) => b.players - a.players);

  //Select the top 5 planets
  const top5Planets = sortedPlanets.slice(0, 5);

  //Calculate the total player count of other planets
  const otherPlanetsPlayerCount = sortedPlanets
    .slice(5)
    .reduce((total, planet) => total + planet.players, 0);

  //Function to format player count
  const formatPlayerCount = (count) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  //Add the top 5 planets to the embed
  top5Planets.forEach((planet, index) => {
    //Find the previous liberation status for this planet
    const previousLiberation = previousLiberations.find(
      (prev) => prev.name === planet.name,
    );

    //Determine the liberation text
    let liberationText = "";
    if (planet.liberation === 0) {
      liberationText =
        "*This planet has yet to see democracy, give it hell, divers!*";
    } else if (planet.liberation === 100) {
      liberationText = "*Super Earth has taken control, good work Helldivers!*";
    } else if (previousLiberation) {
      const liberationChange =
        planet.liberation - previousLiberation.liberation;
      if (liberationChange > 0) {
        liberationText = "*Liberation efforts are ongoing.*";
      } else if (liberationChange < 0) {
        if (liberationChange < -3) {
          liberationText =
            "*Helldivers suffering extreme casualties. Requests for reinforcements have been sent.*";
        } else {
          liberationText =
            "*Defense is failing, Helldivers being overrun! Need reinforcements!*";
        }
      } else {
        liberationText = previousLiberation.liberationText; //Use previous liberation text if liberation percentage remains unchanged
      }
    }

    //Append the planet information with liberation text to the embed
    exampleEmbed.fields.push({
      name: `${planet.name}`,
      value: `${formatPlayerCount(planet.players)} Helldivers, ${
        planet.liberation
      }% liberated. ${liberationText}`,
    });

    //Store or update the liberation text for this planet
    const indexInPrevious = previousLiberations.findIndex(
      (prev) => prev.name === planet.name,
    );
    if (indexInPrevious !== -1) {
      previousLiberations[indexInPrevious].liberationText = liberationText;
      previousLiberations[indexInPrevious].liberation = planet.liberation;
    } else {
      previousLiberations.push({
        name: planet.name,
        liberation: planet.liberation,
        liberationText,
      });
    }
  });

  //Format the player count of other planets
  const formattedOtherPlayerCount = formatPlayerCount(otherPlanetsPlayerCount);

  //Add the total player count of other planets
  exampleEmbed.fields.push({
    name: "Other Planets*",
    value: `${formattedOtherPlayerCount} Helldivers taking on various missions across varied sectors.`,
  });

  return exampleEmbed;
}

function scheduleHourlyUpdates() {
  const now = new Date();
  const currentHour = now.getUTCHours();

  //Check if the current hour is between 9pm (21) and 12am (0)
  if (currentHour >= 21 || currentHour === 0) {
    //Calculate the delay until the next hour
    const nextHour = currentHour === 0 ? 1 : currentHour + 1;
    const delayToNextHour = (nextHour - currentHour) * 60 * 60 * 1000;

    //Schedule hourly updates starting from the next hour
    setTimeout(() => {
      updateWarStatuses(
        bot.channels.cache.find((channel) => channel.name === "galactic-war-effort"),
      );
      setInterval(
        () => {
          updateWarStatuses(
            bot.channels.cache.find((channel) => channel.name === "galactic-war-effort"),
          );
        },
        60 * 60 * 1000,
      );
    }, delayToNextHour);
  }
}

bot.login(process.env.TOKEN);