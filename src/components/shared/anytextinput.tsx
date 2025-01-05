import { FC } from "react";
import { TextInput } from "./textinput";

interface Props {
  disabled?: boolean;
  value: string;
  setValue: (value: string) => void;
}

export const AnyTextInput: FC<Props> = ({ disabled, value, setValue }) => {
  return (
    <TextInput<string>
      disabled={disabled}
      value={value}
      setValue={setValue}
      convert={(value) => { return { value, success: true }; }}
    />
  );
};
