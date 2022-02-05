# Nova Bot

![nova-bot](https://img.shields.io/npm/v/nova-bot?label=nova-bot&style=for-the-badge) ![License](https://img.shields.io/github/license/zS1L3NT/.github?style=for-the-badge) ![Languages](https://img.shields.io/github/languages/count/zS1L3NT/ts-npm-nova-bot?style=for-the-badge) ![Top Language](https://img.shields.io/github/languages/top/zS1L3NT/ts-npm-nova-bot?style=for-the-badge) ![Commit Activity](https://img.shields.io/github/commit-activity/y/zS1L3NT/ts-npm-nova-bot?style=for-the-badge) ![Last commit](https://img.shields.io/github/last-commit/zS1L3NT/ts-npm-nova-bot?style=for-the-badge)

Nova Bot is a Discord Bot framework built mainly to make it easier for me to maintain all my discord bots. It provides very limited flexibility but allows building powerful and bug-free Discord bots very quickly.

## Motivation

I built this Discord Framework because when I built many different Discord bots, I used the same template code across all the frameworks, and it became difficult tracking which bots have the latest changes to the template. So I decided to make this a framework so that I could maintain all my bots with much more ease.

## Features

-   Cache guild information in Firebase so that guild data doesn't reset everytime the bot is redeployed
-   Nova will read each command dynamically according to the filenames for each command.
    -   If you have a file `/slashs/play`, Nova will register a `/play` slash command and use the data in the file as the metadata and callback of the slash command
    -   Same works with
        -   `/buttons` for button interactions
        -   `/selectmenus` for select menu interactions
        -   `/messages` for message commands
        -   `/events` for discord events
-   A Bot-wide and Guild-wide caching system to store information about the Bot and individual Guilds.
-   Dynamic help command builder which reads from the `/slashs` and `/messages` folders to find out all the available commands to interact with the bot
-   Allow bot to constantly clean messages in one channel to make sure it is the only one with messages in the channel. This is useful for
    -   Music Queues as the only message in the channel
    -   Calendar bots to only show calendar related messages sent by the bot in the channel
-   Allows custom logging of events happening like
    -   Initialization of the bot
    -   Alerts, Warnings and Errors in the code
    -   A slash command being used
    -   A button interaction being used
    -   A select menu interaction being used
    -   A message command being used

## Usage

I don't intend to write any documentation for this framework since the framework was build primarily for my use, and not for public use.

## Built with
- TypeScript
    -   [![@types/luxon](https://img.shields.io/github/package-json/dependency-version/zS1L3NT/ts-npm-nova-bot/@types/luxon?style=flat-square)](https://npmjs.com/package/@types/luxon)
    -   [![@types/node](https://img.shields.io/github/package-json/dependency-version/zS1L3NT/ts-npm-nova-bot/@types/node?style=flat-square)](https://npmjs.com/package/@types/node)
    -   [![@types/node-fetch](https://img.shields.io/github/package-json/dependency-version/zS1L3NT/ts-npm-nova-bot/@types/node-fetch?style=flat-square)](https://npmjs.com/package/@types/node-fetch)
    -   [![discord-api-types](https://img.shields.io/github/package-json/dependency-version/zS1L3NT/ts-npm-nova-bot/discord-api-types?style=flat-square)](https://npmjs.com/package/discord-api-types)
    -   [![typescript](https://img.shields.io/github/package-json/dependency-version/zS1L3NT/ts-npm-nova-bot/typescript?style=flat-square)](https://npmjs.com/package/typescript)
- DiscordJS
    -   [![@discordjs/builders](https://img.shields.io/github/package-json/dependency-version/zS1L3NT/ts-npm-nova-bot/@discordjs/builders?style=flat-square)](https://npmjs.com/package/@discordjs/builders)
    -   [![@discordjs/rest](https://img.shields.io/github/package-json/dependency-version/zS1L3NT/ts-npm-nova-bot/@discordjs/rest?style=flat-square)](https://npmjs.com/package/@discordjs/rest)
    -   [![discord.js](https://img.shields.io/github/package-json/dependency-version/zS1L3NT/ts-npm-nova-bot/discord.js?style=flat-square)](https://npmjs.com/package/discord.js)
- Firebase
    -   [![firebase-admin](https://img.shields.io/github/package-json/dependency-version/zS1L3NT/ts-npm-nova-bot/firebase-admin?style=flat-square)](https://npmjs.com/package/firebase-admin)
- Miscellaneous
    -   [![after-every](https://img.shields.io/github/package-json/dependency-version/zS1L3NT/ts-npm-nova-bot/after-every?style=flat-square)](https://npmjs.com/package/after-every)
    -   [![luxon](https://img.shields.io/github/package-json/dependency-version/zS1L3NT/ts-npm-nova-bot/luxon?style=flat-square)](https://npmjs.com/package/luxon)
    -   [![no-try](https://img.shields.io/github/package-json/dependency-version/zS1L3NT/ts-npm-nova-bot/no-try?style=flat-square)](https://npmjs.com/package/no-try)
    -   [![node-fetch](https://img.shields.io/github/package-json/dependency-version/zS1L3NT/ts-npm-nova-bot/node-fetch?style=flat-square)](https://npmjs.com/package/node-fetch)
