import { AnyTextInput, ListDropdown, SettingsLoadingField, ToggleField } from "../shared";
import { DialogBody, DialogControlsSection, DialogControlsSectionHeader, Field } from "@decky/ui";
import { SettingsManager, UserSettings, buttonStyles, horizontalAlignmentValues, verticalAlignmentValues } from "../../lib";
import { VFC } from "react";
import { useCurrentSettings } from "../../hooks";

interface Props {
  settingsManager: SettingsManager;
}

export const ButtonStyleView: VFC<Props> = ({ settingsManager }) => {
  const settings = useCurrentSettings(settingsManager);
  if (settings === null) {
    return <SettingsLoadingField />;
  }

  return (
    <DialogBody>
      <DialogControlsSection>
        <Field
          label="Select theme for MoonDeck button"
          childrenContainerWidth="fixed"
        >
          <ListDropdown<UserSettings["buttonStyle"]["theme"]>
            optionList={buttonStyles}
            label="Select theme"
            value={settings.buttonStyle.theme}
            setValue={(value) => settingsManager.update((settings) => { settings.buttonStyle.theme = value; })}
          />
        </Field>
        <ToggleField
          label="Show focus ring around the button"
          value={settings.buttonStyle.showFocusRing}
          setValue={(value) => settingsManager.update((settings) => { settings.buttonStyle.showFocusRing = value; })}
        />
      </DialogControlsSection>
      <DialogControlsSection>
        <DialogControlsSectionHeader>Position</DialogControlsSectionHeader>
        <Field
          label="Horizontal alignment"
          childrenContainerWidth="fixed"
        >
          <ListDropdown<UserSettings["buttonPosition"]["horizontalAlignment"]>
            optionList={horizontalAlignmentValues}
            label="Select side"
            value={settings.buttonPosition.horizontalAlignment}
            setValue={(value) => settingsManager.update((settings) => { settings.buttonPosition.horizontalAlignment = value; })}
          />
        </Field>
        <Field
          label="Vertical alignment"
          childrenContainerWidth="fixed"
        >
          <ListDropdown<UserSettings["buttonPosition"]["verticalAlignment"]>
            optionList={verticalAlignmentValues}
            label="Select side"
            value={settings.buttonPosition.verticalAlignment}
            setValue={(value) => settingsManager.update((settings) => { settings.buttonPosition.verticalAlignment = value; })}
          />
        </Field>
        <ToggleField
          label="HLTB offset for Clean style"
          description="Apply default offset so that the HLTB and MoonDeck button don't overlap"
          value={settings.buttonPosition.offsetForHltb}
          setValue={(value) => settingsManager.update((settings) => { settings.buttonPosition.offsetForHltb = value; })}
        />
        <Field
          label="X position offset"
          description="CSS style (2px, 3vw, etc.) string that will be used when calculating X position."
          childrenContainerWidth="fixed"
        >
          <AnyTextInput
            value={settings.buttonPosition.offsetX}
            setValue={(value) => settingsManager.update((settings) => { settings.buttonPosition.offsetX = value; })}
          />
        </Field>
        <Field
          label="Y position offset"
          description="CSS style (2px, 3vw, etc.) string that will be used when calculating Y position."
          childrenContainerWidth="fixed"
        >
          <AnyTextInput
            value={settings.buttonPosition.offsetY}
            setValue={(value) => settingsManager.update((settings) => { settings.buttonPosition.offsetY = value; })}
          />
        </Field>
        <Field
          label="Z-Index"
          description="CSS style string that will be used to set z-index."
          childrenContainerWidth="fixed"
        >
          <AnyTextInput
            value={settings.buttonPosition.zIndex}
            setValue={(value) => settingsManager.update((settings) => { settings.buttonPosition.zIndex = value; })}
          />
        </Field>
      </DialogControlsSection>
    </DialogBody>
  );
};
