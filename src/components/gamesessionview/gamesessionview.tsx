import { DialogBody, DialogControlsSection, Field } from "@decky/ui";
import { FC, useContext } from "react";
import { ListDropdown, SettingsLoadingField, ToggleField } from "../shared";
import { UserSettings, getControllerConfigDropdownValues } from "../../lib";
import { MoonDeckContext } from "../../contexts";
import { useCurrentSettings } from "../../hooks";

export const GameSessionView: FC = () => {
  const { settingsManager } = useContext(MoonDeckContext);
  const settings = useCurrentSettings();
  if (settings === null) {
    return <SettingsLoadingField />;
  }

  return (
    <DialogBody>
      <Field
        description="Contains configurable settings that are applied for the game sessions. Additional settings can be found in the quick access menu when the game is running."
        focusable={true}
      />
      <DialogControlsSection>
        <Field
          label="Selected Steam Input option"
          childrenContainerWidth="fixed"
          bottomSeparator="none"
        >
          <ListDropdown<UserSettings["gameSession"]["controllerConfig"]>
            optionList={getControllerConfigDropdownValues()}
            label="Loading..."
            value={settings.gameSession.controllerConfig}
            setValue={(value) => settingsManager.update((settings) => { settings.gameSession.controllerConfig = value; })}
          />
        </Field>
        <Field
          description={
            <>
              <div>Choose how to configure Steam Input before the game is launched for the external controllers.</div>
              <br />
              <div>Disabling Steam Input is preferable in most cases as the Moonlight can then see the actual controller instead of a generic XBox one that Steam exposes.</div>
              <br />
              <div>This means that the motion data becomes available for PS4/Dualsense controllers and the rumble works better in most cases.</div>
            </>
          }
          focusable={true}
        />
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
