import { Button, type buttonVariants } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useFormContext } from "@/lib/form-context"
import type { VariantProps } from "class-variance-authority"

interface SubmitButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function SubmitButton({
  children,
  disabled,
  ...props
}: SubmitButtonProps) {
  const form = useFormContext()
  const isSubmitting = form.state.isSubmitting

  return (
    <Button type="submit" disabled={disabled || isSubmitting} {...props}>
      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  )
}
