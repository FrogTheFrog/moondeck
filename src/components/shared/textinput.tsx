import { ReactElement, useEffect, useState } from "react";
import { TextField } from "decky-frontend-lib";

interface Props<T> {
  disabled?: boolean;
  value: string;
  setValue: (value: T) => void;
  convert: (value: string) => { value: T; success: true } | { success: false; error: string };
  setIsValid?: (value: boolean) => void;
}

export const TextInput: <T>(props: Props<T>) => ReactElement<Props<T>> = ({ disabled, value, setValue, convert, setIsValid }) => {
  const [cachedValue, setCachedValue] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  const handleChange = (newValue: string, fromOutside: boolean): void => {
    // First error message suppressed on purpose
    const firstChange = cachedValue === null;
    const converted = convert(newValue);

    setCachedValue(newValue);
    setError(converted.success || firstChange ? "" : converted.error);
    setIsValid?.(converted.success);

    if (converted.success && !fromOutside) {
      setValue(converted.value);
    }
  };

  useEffect(() => handleChange(value, true), [value]);

  return (
    <>
      <TextField
        disabled={disabled}
        value={cachedValue ?? ""}
        onChange={(event) => handleChange(event.target.value, false)}
      />
      {error && <div>{error}</div>}
    </>
  );
};
