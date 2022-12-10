import { ChangeEvent, ReactElement, useEffect, useState } from "react";
import { TextField } from "decky-frontend-lib";

interface Props<T> {
  disabled?: boolean;
  value: string;
  setValue: (value: T) => void;
  convert: (value: string) => { value: T; success: true } | { success: false; error: string };
}

export const TextInput: <T>(props: Props<T>) => ReactElement<Props<T>> = ({ disabled, value, setValue, convert }) => {
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
  };

  useEffect(() => {
    const converted = convert(value);
    if (!converted.success) {
      setError(converted.error);
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