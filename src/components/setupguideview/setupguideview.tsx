import { DialogBody, DialogButton, DialogControlsSection, DialogControlsSectionHeader, Field, Router } from "decky-frontend-lib";
import { BuddyStatusField } from "../shared";
import { MoonDeckLaunchButtonShell } from "../moondecklaunchbutton";
import { VFC } from "react";

const moondeckBuddyLink = "https://github.com/FrogTheFrog/moondeck-buddy";

export const SetupGuideView: VFC<unknown> = () => {
  return (
    <DialogBody>
      <DialogControlsSection>
        <DialogControlsSectionHeader>How to get this plugin working?</DialogControlsSectionHeader>
        <Field
          label="Step 1 - Configure Moonlight client"
          description="Download the flatpak version (via Desktop) of the Moonlight client and make sure you can launch Steam from it."
          focusable={true} />
        <Field label="Step 2 - Download and setup Buddy on host PC">
          <DialogButton onClick={() => { Router.NavigateToExternalWeb(moondeckBuddyLink); }}>Click me!</DialogButton>
        </Field>
        <Field
          label="Step 3 - Scan for the host PC on the local network"
          description="On the left navigation panel go to &quot;Host Selection&quot;, click scan button and select your host PC."
          focusable={true} />
        <Field
          label="Step 4 - Pair the MoonDeck with Buddy"
          description="In the &quot;Host Selection&quot; you should see that the Buddy is waiting to be paired (see example above). Simply click the &quot;Pair&quot; button and enter the PIN key on the host PC (if you see some other status indicator, check the &quot;Status Indicators&quot; page on the left)."
          childrenLayout="below"
          spacingBetweenLabelAndChild="none"
          focusable={true}
        >
          <BuddyStatusField label="Status" status={"NotPaired"} isRefreshing={false} noSeparator={true} />
        </Field>
        <Field
          label="Step 5 - Verify that the pairing was successful"
          description='If the pairing was successful, you will see the previous panel change to this ^. Otherwise try again.'
          childrenLayout="below"
          spacingBetweenLabelAndChild="none"
          focusable={true}
        >
          <BuddyStatusField label="Status" status={"Online"} isRefreshing={false} noSeparator={true} />
        </Field>
        <Field
          label="Step 6 - Launch the game via MoonDeck"
          description="Go to any of your owned games and click the button with the MoonDeck icon!"
          focusable={true}
        >
          <MoonDeckLaunchButtonShell />
        </Field>
      </DialogControlsSection>
    </DialogBody>
  );
};
