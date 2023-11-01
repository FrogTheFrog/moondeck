import { DialogBody, DialogControlsSection, DialogControlsSectionHeader, Field, Focusable } from "decky-frontend-lib";
import { HostAppSelectionDropdown, LabelWithIcon, NumericTextInput, ToggleField } from "../shared";
import { ModifyListButton, RemoveListEntryButton } from "../shared/indexedlist";
import { HostOff } from "../icons";
import { ModifyHostAppModal } from "./modifyhostappmodal";
import { SettingsManager } from "../../lib";
import { VFC } from "react";
import { useCurrentHostSettings } from "../../hooks";

interface Props {
  settingsManager: SettingsManager;
}

export const HostSettingsView: VFC<Props> = ({ settingsManager }) => {
  const hostSettings = useCurrentHostSettings(settingsManager);
  if (hostSettings === null) {
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
        <Field label="MoonDeck client ID" focusable={true}>
          {hostSettings.clientId}
        </Field>
        <Field label="GameStream client ID" focusable={true}>
          {hostSettings.currentHostId}
        </Field>
        <Field label="Hostname" focusable={true}>
          {hostSettings.hostName}
        </Field>
        <Field label="MAC address" focusable={true}>
          {hostSettings.mac}
        </Field>
        <Field label="Address" focusable={true}>
          {hostSettings.address}
        </Field>
        <Field label="Address type" focusable={true}>
          {hostSettings.staticAddress ? "Static" : "Dynamic"}
        </Field>
        <Field label="Host info port" focusable={true}>
          {hostSettings.hostInfoPort}
        </Field>
        <Field label="Buddy port" childrenContainerWidth="fixed">
          <NumericTextInput
            min={1}
            max={65535}
            value={hostSettings.buddyPort}
            setValue={(value) => { settingsManager.updateHost((hostSettings) => { hostSettings.buddyPort = value; }); }}
          />
        </Field>
        <ToggleField
          label="Automatically close Steam on host when gaming session ends"
          description={
            <>
              <div>If disabled, Steam will remain open in bigpicture mode (no way to leave bigpicture without closing Steam without using the UI).</div>
              <br />
              <div>Note: Nvidia Gamestream somehow closes the OLD bigpicture mode. Seems to be a bug.</div>
            </>
          }
          value={hostSettings.closeSteamOnceSessionEnds}
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.closeSteamOnceSessionEnds = value; })}
        />
      </DialogControlsSection>
      <DialogControlsSection>
        <DialogControlsSectionHeader>Gamestream App</DialogControlsSectionHeader>
        <Field
          description={
            <>
              <div>This is the app that will be used by MoonDeck when starting gamestream.</div>
              <br />
              <div>Can be customized to have some specific "do/undo" logic on the host.</div>
              <br />
              <div>If the list is empty, the MoonDeckStream name is used by default.</div>
            </>
          }
          focusable={true}
        />
        <Field
          label="Selected app name"
          childrenContainerWidth="fixed"
          bottomSeparator="none"
        >
          <HostAppSelectionDropdown
            currentIndex={hostSettings.hostApp.selectedAppIndex}
            currentList={hostSettings.hostApp.apps}
            setIndex={(value) => { settingsManager.updateHost((hostSettings) => { hostSettings.hostApp.selectedAppIndex = value; }); }}
          />
        </Field>
        <Field
          childrenContainerWidth="fixed"
          childrenLayout="below"
        >
          <Focusable style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <ModifyListButton
              modal={ModifyHostAppModal}
              currentList={hostSettings.hostApp.apps}
              currentIndex={null}
              updateList={(list, index) => {
                settingsManager.updateHost((hostSettings) => {
                  hostSettings.hostApp.apps = list;
                  hostSettings.hostApp.selectedAppIndex = index;
                });
              }}
            />
            <ModifyListButton
              modal={ModifyHostAppModal}
              currentList={hostSettings.hostApp.apps}
              currentIndex={hostSettings.hostApp.selectedAppIndex}
              updateList={(list, index) => {
                settingsManager.updateHost((hostSettings) => {
                  hostSettings.hostApp.apps = list;
                  hostSettings.hostApp.selectedAppIndex = index;
                });
              }}
            />
            <RemoveListEntryButton
              currentList={hostSettings.hostApp.apps}
              currentIndex={hostSettings.hostApp.selectedAppIndex}
              updateList={(list, index) => {
                settingsManager.updateHost((hostSettings) => {
                  hostSettings.hostApp.apps = list;
                  hostSettings.hostApp.selectedAppIndex = index;
                });
              }}
            />
          </Focusable>
        </Field>
      </DialogControlsSection>
    </DialogBody>
  );
};
