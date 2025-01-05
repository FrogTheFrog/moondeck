import { FC } from "react";
import { TextInput } from "./textinput";

interface CommonProps {
  disabled?: boolean;
  min?: number;
  max?: number;
  value: number | null;
  setIsValid?: (value: boolean) => void;
}

interface NonOptionalProps extends CommonProps {
  optional?: false;
  setValue: (value: number) => void;
}

interface OptionalProps extends CommonProps {
  optional: true;
  setValue: (value: number | null) => void;
}

type Props = NonOptionalProps | OptionalProps;

export const NumericTextInput: FC<Props> = ({ disabled, min, max, optional, value, setValue, setIsValid }) => {
  return (
    <TextInput<number | null>
      disabled={disabled}
      value={`${value ?? ""}`}
      setValue={setValue as OptionalProps["setValue"]}
      convert={(value) => {
        const convertedValue = Number(value);
        const isEmptyValue = value === "";
        if (isNaN(convertedValue) || isEmptyValue) {
          if (isEmptyValue && optional === true) {
            return { success: true, value: null };
          }
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
