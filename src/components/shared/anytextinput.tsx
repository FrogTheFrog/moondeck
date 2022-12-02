import { TextInput } from "./textinput";
import { VFC } from "react";

interface Props {
  disabled?: boolean;
  value: string;
  setValue: (value: string) => void;
}

export const AnyTextInput: VFC<Props> = ({ disabled, value, setValue }) => {
  return (
    <TextInput<string>
      disabled={disabled}
      value={value}
      setValue={setValue}
      convert={(value) => { return { value, success: true }; }}
    />
  );
};
