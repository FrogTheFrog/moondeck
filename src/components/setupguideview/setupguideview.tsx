import { BuddyStatusField, SettingsLoadingField } from "../shared";
import { DialogBody, DialogButton, DialogControlsSection, DialogControlsSectionHeader, Field, Navigation } from "decky-frontend-lib";
import { MoonDeckLaunchButtonShell } from "../moondecklaunchbutton";
import { SettingsManager } from "../../lib";
import { VFC } from "react";
import { useCurrentSettings } from "../../hooks";

const moondeckBuddyLink = "https://github.com/FrogTheFrog/moondeck-buddy";
const moondeckWikiLink = "https://github.com/FrogTheFrog/moondeck/wiki";

interface Props {
  settingsManager: SettingsManager;
}

export const SetupGuideView: VFC<Props> = ({ settingsManager }) => {
  const settings = useCurrentSettings(settingsManager);
  if (settings === null) {
    return <SettingsLoadingField />;
  }

  return (
    <DialogBody>
      <DialogControlsSection>
        <DialogControlsSectionHeader>How to get this plugin working?</DialogControlsSectionHeader>
        <Field
          label="Step 1 - Configure Moonlight client to work with Sunshine"
          description="Download the flatpak version (via Desktop) of the Moonlight client and make sure it is configured."
          focusable={true} />
        <Field
          label="Step 2 - Download and setup Buddy on host PC"
          description="Requires Buddy v1.5.0 or above."
        >
          <DialogButton onClick={() => { Navigation.NavigateToExternalWeb(moondeckBuddyLink); }}>Click me!</DialogButton>
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
          <MoonDeckLaunchButtonShell buttonStyle={settings.buttonStyle} />
        </Field>
      </DialogControlsSection>
      <DialogControlsSection>
        <DialogControlsSectionHeader>Troubleshooting</DialogControlsSectionHeader>
        <Field label="If you encounter any issues, be sure to check this!">
          <DialogButton onClick={() => { Navigation.NavigateToExternalWeb(moondeckWikiLink); }}>Click me!</DialogButton>
        </Field>
      </DialogControlsSection>
    </DialogBody>
  );
};
