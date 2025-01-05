import { FC } from "react";
import { TextInput } from "./textinput";

interface Props {
  disabled?: boolean;
  value: string;
  setValue: (value: string) => void;
  setIsValid?: (value: boolean) => void;
}

export const NonEmptyTextInput: FC<Props> = ({ disabled, value, setValue, setIsValid }) => {
  return (
    <TextInput<string>
      disabled={disabled}
      value={value}
      setValue={setValue}
      convert={(value) => {
        if (value.length === 0) {
          return { success: false, error: "Input must not be a empty!" };
        }

        return { success: true, value };
      }}
      setIsValid={setIsValid}
    />
  );
};
