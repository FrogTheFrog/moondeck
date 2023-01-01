import { TextInput } from "./textinput";
import { VFC } from "react";

interface Props {
  disabled?: boolean;
  min?: number;
  max?: number;
  value: number | null;
  setValue: (value: number) => void;
  setIsValid?: (value: boolean) => void;
}

export const NumericTextInput: VFC<Props> = ({ disabled, min, max, value, setValue, setIsValid }) => {
  return (
    <TextInput<number>
      disabled={disabled}
      value={`${value ?? ""}`}
      setValue={setValue}
      convert={(value) => {
        const convertedValue = Number(value);
        if (isNaN(convertedValue) || value === "") {
          return { success: false, error: "Input must be a number!" };
        }

        const isMinSet = typeof min === "number";
        const isMaxSet = typeof max === "number";

        if ((isMinSet && convertedValue < min) || (isMaxSet && convertedValue > max)) {
          if (isMinSet && isMaxSet) {
            return { success: false, error: `Must be within range of [${min}; ${max}]!` };
          } else if (isMinSet) {
            return { success: false, error: `Must be >= ${min}!` };
          } else if (isMaxSet) {
            return { success: false, error: `Must be <= ${max}!` };
          }
        }

        return { success: true, value: convertedValue };
      }}
      setIsValid={setIsValid}
    />
  );
};
