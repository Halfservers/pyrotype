import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useFieldContext } from "@/lib/form-context"

interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps {
  label?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  options: SelectOption[]
}

export function SelectField({
  label,
  placeholder,
  disabled,
  className,
  options,
}: SelectFieldProps) {
  const field = useFieldContext<string>()
  const errors = field.state.meta.errors
  const hasError = errors.length > 0

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label
          htmlFor={field.name}
          className={cn(hasError && "text-destructive")}
        >
          {label}
        </Label>
      )}
      <Select
        value={field.state.value ?? ""}
        onValueChange={(value) => field.handleChange(value)}
        disabled={disabled}
      >
        <SelectTrigger
          id={field.name}
          className={cn("w-full", hasError && "border-destructive")}
          onBlur={field.handleBlur}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasError && (
        <p className="text-sm text-destructive">
          {errors.map(String).join(", ")}
        </p>
      )}
    </div>
  )
}
