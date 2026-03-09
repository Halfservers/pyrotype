import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useFieldContext } from "@/lib/form-context"

interface TextFieldProps {
  label?: string
  type?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  autoComplete?: string
}

export function TextField({
  label,
  type = "text",
  placeholder,
  disabled,
  className,
  autoComplete,
}: TextFieldProps) {
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
      <Input
        id={field.name}
        name={field.name}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        value={field.state.value ?? ""}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        className={cn(hasError && "border-destructive")}
      />
      {hasError && (
        <p className="text-sm text-destructive">
          {errors.map(String).join(", ")}
        </p>
      )}
    </div>
  )
}
