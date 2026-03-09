import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useFieldContext } from "@/lib/form-context"

interface CheckboxFieldProps {
  label?: string
  disabled?: boolean
  className?: string
}

export function CheckboxField({
  label,
  disabled,
  className,
}: CheckboxFieldProps) {
  const field = useFieldContext<boolean>()
  const errors = field.state.meta.errors
  const hasError = errors.length > 0

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Checkbox
          id={field.name}
          disabled={disabled}
          checked={field.state.value ?? false}
          onCheckedChange={(checked) => field.handleChange(checked === true)}
          onBlur={field.handleBlur}
          className={cn(hasError && "border-destructive")}
        />
        {label && (
          <Label
            htmlFor={field.name}
            className={cn(
              "cursor-pointer",
              hasError && "text-destructive",
            )}
          >
            {label}
          </Label>
        )}
      </div>
      {hasError && (
        <p className="text-sm text-destructive">
          {errors.map(String).join(", ")}
        </p>
      )}
    </div>
  )
}
