# SEAF-Combat-Report
SEAF-Combat-Report discordBot

This is a Discord bot that sends an embedded message with the top 5 highest player count planets in Helldivers 2 to a Discord channel.

It hits the "https://helldivers-2.fly.dev/api" API endpoint, and extracts the current "Season" warIDs.

It then uses these extracted WarIDs to hit the "https://helldivers-2.fly.dev/api/${warId}/status" endpoint. This API response returns with all relevant information to the warIDs, including current GlobalEvents, Planets, PlanetHealth, PlaerCount, etc.

It then takes the Planet Names, Player Counts, and Liberation values from the /status endpoint and formats them into an embed message that sends to a Discord channel every hour from 9pm-12am EST, or whenever the '!update' command is sent in the Discord.

Relevant links:

https://github.com/dealloc/helldivers2-api?tab=readme-ov-file

https://helldivers-2.fly.dev/api/swaggerui
