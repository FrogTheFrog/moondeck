import { DialogBody, DialogControlsSection, Field } from "@decky/ui";
import { SettingsLoadingField, ToggleField } from "../shared";
import { SettingsManager } from "../../lib";
import { VFC } from "react";
import { useCurrentSettings } from "../../hooks";

interface Props {
  settingsManager: SettingsManager;
}

export const GameSessionView: VFC<Props> = ({ settingsManager }) => {
  const settings = useCurrentSettings(settingsManager);
  if (settings === null) {
    return <SettingsLoadingField />;
  }

  return (
    <DialogBody>
      <Field description="Contains configurable settings that are applied for the game sessions. Additional settings can be found in the quick access menu when the game is running." />
      <DialogControlsSection>
        <ToggleField
          label="Automatic title switch to AppId"
          description={
            <>
              <div>Switch the game title to AppId after it launches. This will give access to community layouts for the controller and the friends will see what you're playing (you can also switch midgame from right panel and with some finesse export the layouts that way).</div>
              <br />
              <div>The game might lose controller focus when opening side panels, which comes back automatically or when you start clicking stuff.</div>
              <br />
              <div>While the AppId is set, you can't close the game via left panel's exit button. Use the right panel instead to stop streaming abruptly.</div>
            </>
          }
          value={settings.gameSession.autoApplyAppId}
          setValue={(value) => settingsManager.update((settings) => { settings.gameSession.autoApplyAppId = value; })}
        />
        <ToggleField
          label="Resume game session after system suspension"
          description={
            <>
              <div>Will try to automatically relaunch the gamestream session once the system resumes from suspension.</div>
              <br />
              <div>If the internet connection is not restored within 5 seconds, the session will not be resumed.</div>
            </>
          }
          value={settings.gameSession.resumeAfterSuspend}
          setValue={(value) => settingsManager.update((settings) => { settings.gameSession.resumeAfterSuspend = value; })}
        />
      </DialogControlsSection>
    </DialogBody>
  );
};
