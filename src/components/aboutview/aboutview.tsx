import { DialogBody, DialogControlsSection, DialogControlsSectionHeader, Field } from "decky-frontend-lib";
import { VFC } from "react";

export const AboutView: VFC<unknown> = () => {
  return (
    <DialogBody>
      <DialogControlsSection>
        <DialogControlsSectionHeader>Questions & Answers that no one asked for!</DialogControlsSectionHeader>
        <Field
          label="What is MoonDeck?"
          description="It's an automation tool for Moonlight gamestream client. The goal is to get to the streamable game with as little manual steps as possible."
          focusable={true} />
        <Field
          label="So, does it work?"
          description="Yes. It's not perfect, but most of the time you can get into the game with the same amount of clicks you need to launch actual game on SteamDeck!"
          focusable={true} />
        <Field
          label="Was it worth it saving a few clicks?"
          description="I wasted wasted A LOT of time on this plugin, so it better be!"
          focusable={true} />
        <Field
          label="How does Buddy work?"
          description="It's not that simple really to just summarize it as &quot;it monitors steam&quot;. All you need to know is it provides info about: &quot;which game is running?&quot;, &quot;is the game updating?&quot; and &quot;is the steam even running?&quot; MoonDeck then does the rest. It also helps to restart, shutdown the PC."
          focusable={true} />
        <Field
          label="Is the Buddy secure?"
          description="Yes. It does not send any info about the PC. The worst that could happen if someone tapped into the connection or found out the MoonDeck's client it, is to restart/shutdown your PC. However, since MoonDeck uses SSL (self-signed and publicly available though), the &quot;tapping in&quot; scenario is unlikely."
          focusable={true} />
        <Field
          label="So, using the info from Buddy, MoonDeck knows everything about Steam?"
          description="No, all the MoonDeck does is a rather sophisticated guess-work. It will tell Buddy when to ask Steam to launch the game. Sometimes Steam will not launch it as expected due to random reasons and MoonDeck will try a little harder, but if it's outside expections MoonDeck will just bail."
          focusable={true} />
        <Field
          label="What happens when SteamDeck goes to sleep or offline?"
          description="MoonDeck will just bail and leave the mess for you to cleanup."
          focusable={true} />
        <Field
          label="Okay, so what happens when MoonDeck bails?"
          description="Usually when the game exists on the host PC, MoonDeck will ask Buddy to close the Steam (because the gamestream fails to do that for some reason). If MoonDeck bails, it will simply not ask to close Steam and the game that is potentially still running."
          focusable={true} />
        <Field
          label="How do I close or continue playing the game that is still running after MoonDeck bails?"
          description="Simply launch the game again via MoonDeck and the game session will continue."
          focusable={true}>
        </Field>
      </DialogControlsSection>
    </DialogBody>
  );
};
