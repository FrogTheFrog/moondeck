# MoonDeck ![Status](https://github.com/FrogTheFrog/moondeck/actions/workflows/build.yaml/badge.svg) [![Chat](https://img.shields.io/badge/Chat-on%20discord-7289da.svg)](https://discord.com/invite/U88fbeHyzt)

A plugin that lets you play any of your Steam games via Moonlight without needing to add them to Sunshine first, providing a similar experience to GeForce GameStream or Steam Remote Play.

![quicksettings](.github/assets/quickmenu.png)

## What is it really?

MoonDeck is an automation tool that will simplify launching your Steam games via the Moonlight client for streaming.

It requires an additional lightweight app to be installed on the host PC - [MoonDeck Buddy](https://github.com/FrogTheFrog/moondeck-buddy). Additional one-time setup instructions can be found within the settings page of the plugin itself.

## Building

To build and deploy the plugin package first copy `.env.example` to `.env` and update any relevant settings. Then either:

* Run `pnpm` commands `pnpm run setup` and `pnpm run build:plugin` and `pnpm run deploy`.
* Run VSCode tasks Ctrl+Shift+P or Cmd+Shift+P and run: `Tasks: Run Task` and choose the task to run.

## Internal data

This plugin stores data in the following directories:

* Settings - `/home/$USER/.config/moondeck/settings.json`
* Backend logs - `/tmp/moondeck.log`
* Runner logs - `/tmp/moondeck-runner.log`
* Moonlight logs - `/tmp/moondeck-runner-moonlight.log`

Additional frontend logs are written to the `web console`.

## License

This is licensed under GNU GPLv3.
