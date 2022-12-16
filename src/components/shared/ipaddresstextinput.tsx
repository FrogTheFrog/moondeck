import { TextInput } from "./textinput";
import { VFC } from "react";
import ipRegex from "ip-regex";

interface Props {
  disabled?: boolean;
  value: string;
  setValue: (value: string) => void;
  setIsValid?: (value: boolean) => void;
}

export const IpAddressTextInput: VFC<Props> = ({ disabled, value, setValue, setIsValid }) => {
  return (
    <TextInput<string>
      disabled={disabled}
      value={value}
      setValue={setValue}
      convert={(value) => {
        if (!ipRegex.v4({ exact: true }).test(value)) {
          return { success: false, error: "Must be a valid IPv4 address!" };
        }

        return { success: true, value };
      }}
      setIsValid={setIsValid}
    />
  );
};
