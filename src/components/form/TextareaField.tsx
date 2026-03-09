import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useFieldContext } from "@/lib/form-context"

interface TextareaFieldProps {
  label?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  rows?: number
}

export function TextareaField({
  label,
  placeholder,
  disabled,
  className,
  rows,
}: TextareaFieldProps) {
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
      <Textarea
        id={field.name}
        name={field.name}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
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
