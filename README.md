# MoonDeck ![Status](https://github.com/FrogTheFrog/moondeck/actions/workflows/build.yaml/badge.svg) [![Chat](https://img.shields.io/badge/chat-on%20discord-7289da.svg)](https://discord.gg/ZU74G2NJzk)

A plugin that makes it easier to manage your gamestream sessions from the SteamDeck.

![quicksettings](.github/assets/quickmenu.png)

## What is it really?

MoonDeck is an automation tool that will simplify launching your Steam games via the Moonlight client for streaming.

It requires an additional lightweight app to be installed on the host PC - [MoonDeck Buddy](https://github.com/FrogTheFrog/moondeck-buddy). Additional one-time setup instructions can be found within the settings page of the plugin itself.

## Building

1. Clone this repo to the `~/homebrew/plugins`.
2. Install pnpm via npm `npm install --global pnpm`.
3. Run `pnpm install` in the cloned repo directory.
4. Build using `pnpm run build-dev` for local build.

## Internal data

This plugin stores data in the following directories:

* Settings - `/home/$USER/.config/moondeck/settings.json`
* Backend logs - `/tmp/moondeck.log`
* Runner logs - `/tmp/moondeck-runner.log`
* Moonlight logs - `/tmp/moondeck-runner-moonlight.log`

Additional frontend logs are written to the `web console`.

## License

This is licensed under GNU GPLv3.