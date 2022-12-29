import { DialogBody, DialogControlsSection, Field } from "decky-frontend-lib";
import { VFC } from "react";

export const ChangelogView: VFC<unknown> = () => {
  return (
    <DialogBody>
      <DialogControlsSection>
        <Field
          label="1.4.0"
          description={
            <>
              <div>&bull; Changed the underlying communication protocol with Buddy to HTTPS (should have no user impact).</div>
              <div>&bull; Invalidated SSL keys to force update to the new Buddy version, since the legacy version check will not work.</div>
            </>
          }
          focusable={true}
        />
        <Field
          label="1.3.0"
          description={
            <>
              <div>&bull; Added this changelog page.</div>
              <div>&bull; Discontinued support for NVidia's Gamestream service.</div>
              <div>&bull; Added support for Sunshine's Gamestream service.</div>
            </>
          }
          focusable={true}
        />
        <Field
          label="1.2.0"
          description={
            <>
              <div>&bull; Added option to manually enter host IP address.</div>
              <div>&bull; Fixed broken modals by updating DFL.</div>
            </>
          }
          focusable={true}
        />
        <Field
          label="1.1.0"
          description={
            <>
              <div>&bull; Added resolution options per host.</div>
              <div>&bull; Fixed issues with with plugin not initalizing in beta.</div>
            </>
          }
          focusable={true}
        />
        <Field
          label="1.0.0"
          description="Initial release."
          focusable={true}
        />
      </DialogControlsSection>
    </DialogBody>
  );
};
