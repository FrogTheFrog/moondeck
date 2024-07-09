import { BuddyStatus, ServerStatus } from "../../lib";
import { DialogBody, DialogControlsSection, DialogControlsSectionHeader, Field } from "@decky/ui";
import { VFC } from "react";
import { stringifyStatus } from "../shared";

function stringifyServerStatus(value: ServerStatus): string {
  return stringifyStatus(value);
}

function stringifyBuddyStatus(value: BuddyStatus): string {
  return stringifyStatus(value);
}

export const StatusIndicatorsView: VFC<unknown> = () => {
  return (
    <DialogBody>
      <DialogControlsSection>
        <DialogControlsSectionHeader>GameStream Service</DialogControlsSectionHeader>
        <Field
          label={stringifyServerStatus("Offline")}
          description="The PC is offline or the gamestream service is unreachable on the host PC."
          focusable={true} />
        <Field
          label={stringifyServerStatus("Online")}
          description="Everything is OK and ready to roll."
          focusable={true} />
      </DialogControlsSection>
      <DialogControlsSection>
        <DialogControlsSectionHeader>MoonDeck Buddy</DialogControlsSectionHeader>
        <Field
          label={stringifyBuddyStatus("Exception")}
          description="An exception has been raised in the backend. Need to check the logs!"
          focusable={true} />
        <Field
          label={stringifyBuddyStatus("NoClientId")}
          description="Trying to establish connection without client id. This should never happen! Need to create an issue in this case."
          focusable={true} />
        <Field
          label={stringifyBuddyStatus("NotPaired")}
          description="Connection is established, but MoonDeck and Buddy needs to be paired."
          focusable={true} />
        <Field
          label={stringifyBuddyStatus("Offline")}
          description="Could not establish connection to Buddy. If this is not expected, enable the verbose logging for Buddy on the host PC and check what's happening there."
          focusable={true} />
        <Field
          label={stringifyBuddyStatus("Online")}
          description="Everything if OK and Buddy is ready to serve."
          focusable={true} />
        <Field
          label={stringifyBuddyStatus("Pairing")}
          description="Buddy is currently pairing with the MoonDeck."
          focusable={true} />
        <Field
          label={stringifyBuddyStatus("Restarting")}
          description="Buddy has issued the command for the host PC to restart and is now waiting for it to happen."
          focusable={true} />
        <Field
          label={stringifyBuddyStatus("ShuttingDown")}
          description="Buddy has issued the command for the host PC to shutdown and is now waiting for it to happen."
          focusable={true} />
        <Field
          label={stringifyBuddyStatus("SslVerificationFailed")}
          description="SSL certification could not be verified. Maybe a 100 years has already elapsed since this plugin was written or either Buddy or MoonDeck needs to be updated to the latest version."
          focusable={true} />
        <Field
          label={stringifyBuddyStatus("VersionMismatch")}
          description="Buddy or MoonDeck needs to be updated to the latest version."
          focusable={true} />
      </DialogControlsSection>
    </DialogBody>
  );
};
