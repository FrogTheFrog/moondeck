import { ChangeEvent, ReactElement, useEffect, useState } from "react";
import { TextField } from "decky-frontend-lib";

interface Props<T> {
  disabled?: boolean;
  value: string;
  setValue: (value: T) => void;
  convert: (value: string) => { value: T; success: true } | { success: false; error: string };
  setIsValid?: (value: boolean) => void;
}

export const TextInput: <T>(props: Props<T>) => ReactElement<Props<T>> = ({ disabled, value, setValue, convert, setIsValid }) => {
  const [cachedValue, setCachedValue] = useState<string>(value);
  const [error, setError] = useState<string>("");

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setCachedValue(event.target.value);

    const converted = convert(event.target.value);
    if (converted.success) {
      setValue(converted.value);
      setError("");
    } else {
      setError(converted.error);
    }
    setIsValid?.(converted.success);
  };

  useEffect(() => {
    const converted = convert(value);
    if (!converted.success) {
      // First error message suppressed on purpose
      if (value !== "") {
        setError(converted.error);
      }
      setIsValid?.(false);
    } else {
      setIsValid?.(true);
    }
  }, []);

  return (
    <>
      <TextField
        disabled={disabled}
        value={cachedValue}
        onChange={handleChange}
      />
      { error && <div>{error}</div> }
    </>
  );
};
