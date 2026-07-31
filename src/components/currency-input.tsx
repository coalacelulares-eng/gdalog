import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  value: number | "";
  onChange: (value: number | "") => void;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    // Formata o número (ex: 12345 -> "123,45" ou 1234567 -> "12.345,67")
    const formatValue = (val: number | ""): string => {
      if (val === "" || val === undefined || isNaN(Number(val))) return "";
      const num = Number(val);
      // Mantém em centavos internamente
      const cents = Math.round(num * 100);
      const str = cents.toString();
      
      if (str.length === 1) return `0,0${str}`;
      if (str.length === 2) return `0,${str}`;

      const integerPart = str.slice(0, -2);
      const decimalPart = str.slice(-2);

      // Adiciona separador de milhar (.)
      const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

      return `${formattedInteger},${decimalPart}`;
    };

    const [displayValue, setDisplayValue] = React.useState<string>(formatValue(value));

    React.useEffect(() => {
      setDisplayValue(formatValue(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "");
      if (!raw) {
        onChange("");
        setDisplayValue("");
        return;
      }

      const numericValue = Number(raw) / 100;
      onChange(numericValue);
      setDisplayValue(formatValue(numericValue));
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        className={cn(className)}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";