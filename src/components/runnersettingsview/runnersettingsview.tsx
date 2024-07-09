import { DialogBody, DialogControlsSection, DialogControlsSectionHeader, Field } from "@decky/ui";
import { LabelWithIcon, NumericTextInput, ToggleField } from "../shared";
import { SettingsManager, appLaunchDefault, appLaunchStabilityDefault, appUpdateDefault, buddyRequestsDefault, initialConditionsDefault, servicePingDefault, streamEndDefault, streamReadinessDefault, wakeOnLanDefault } from "../../lib";
import { useCurrentHostSettings, useCurrentSettings } from "../../hooks";
import { HostOff } from "../icons";
import { VFC } from "react";

interface Props {
  settingsManager: SettingsManager;
}

export const RunnerSettingsView: VFC<Props> = ({ settingsManager }) => {
  const userSettings = useCurrentSettings(settingsManager);
  const hostSettings = useCurrentHostSettings(settingsManager);
  if (userSettings === null || hostSettings === null) {
    return (
      <DialogBody>
        <DialogControlsSection>
          <Field
            label={<LabelWithIcon icon={HostOff} label="HOST IS NOT SELECTED" />}
            description="Go to host selection page to select host"
            bottomSeparator="none" />
        </DialogControlsSection>
      </DialogBody>
    );
  }

  return (
    <DialogBody>
      <DialogControlsSection>
        <DialogControlsSectionHeader>General</DialogControlsSectionHeader>
        <ToggleField
          label="Debug logs"
          value={userSettings.runnerDebugLogs}
          setValue={(value) => settingsManager.update((userSettings) => { userSettings.runnerDebugLogs = value; })}
        />
      </DialogControlsSection>
      <DialogControlsSection>
        <DialogControlsSectionHeader>Timeouts</DialogControlsSectionHeader>
        <Field
          description="Warning! Changing anything here to anything than the default values could easily break the runner!"
          focusable={true}
        />
        <Field
          label={`buddyRequests (default: ${buddyRequestsDefault})`}
          description="HTTP/HTTPS request(s) to Buddy timeouts."
          childrenContainerWidth="fixed"
        >
          <NumericTextInput
            min={1}
            value={hostSettings.runnerTimeouts.buddyRequests}
            setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.runnerTimeouts.buddyRequests = value; })}
          />
        </Field>
        <Field
          label={`servicePing (default: ${servicePingDefault})`}
          description="GameStream service initial ping timeout."
          childrenContainerWidth="fixed"
        >
          <NumericTextInput
            min={1}
            value={hostSettings.runnerTimeouts.servicePing}
            setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.runnerTimeouts.servicePing = value; })}
          />
        </Field>
        <Field
          label={`initialConditions (default: ${initialConditionsDefault})`}
          description="Required initial host conditions for streaming timeout."
          childrenContainerWidth="fixed"
        >
          <NumericTextInput
            min={1}
            value={hostSettings.runnerTimeouts.initialConditions}
            setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.runnerTimeouts.initialConditions = value; })}
          />
        </Field>
        <Field
          label={`streamReadiness (default: ${streamReadinessDefault})`}
          description="MoonDeckStream-related readiness timeout."
          childrenContainerWidth="fixed"
        >
          <NumericTextInput
            min={1}
            value={hostSettings.runnerTimeouts.streamReadiness}
            setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.runnerTimeouts.streamReadiness = value; })}
          />
        </Field>
        <Field
          label={`appLaunch (default: ${appLaunchDefault})`}
          description="App launch on host timeout."
          childrenContainerWidth="fixed"
        >
          <NumericTextInput
            min={1}
            value={hostSettings.runnerTimeouts.appLaunch}
            setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.runnerTimeouts.appLaunch = value; })}
          />
        </Field>
        <Field
          label={`appLaunchStability (default: ${appLaunchStabilityDefault})`}
          description="Additional app launch timeout to deal with game launchers."
          childrenContainerWidth="fixed"
        >
          <NumericTextInput
            min={1}
            value={hostSettings.runnerTimeouts.appLaunchStability}
            setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.runnerTimeouts.appLaunchStability = value; })}
          />
        </Field>
        <Field
          label={`appUpdate (default: ${appUpdateDefault})`}
          description="Additional app launch timeout when app is updating."
          childrenContainerWidth="fixed"
        >
          <NumericTextInput
            min={1}
            value={hostSettings.runnerTimeouts.appUpdate}
            setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.runnerTimeouts.appUpdate = value; })}
          />
        </Field>
        <Field
          label={`streamEnd (default: ${streamEndDefault})`}
          description="Timeout for when we are waiting for stream to end after successful session."
          childrenContainerWidth="fixed"
        >
          <NumericTextInput
            min={0}
            value={hostSettings.runnerTimeouts.streamEnd}
            setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.runnerTimeouts.streamEnd = value; })}
          />
        </Field>
        <Field
          label={`wakeOnLan (default: ${wakeOnLanDefault})`}
          description="Timeout for how long to wait until host is available. Setting this to 0 disables the automatic WOL."
          childrenContainerWidth="fixed"
        >
          <NumericTextInput
            min={0}
            value={hostSettings.runnerTimeouts.wakeOnLan}
            setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.runnerTimeouts.wakeOnLan = value; })}
          />
        </Field>
      </DialogControlsSection>
    </DialogBody>
  );
};
