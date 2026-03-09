import { createFormHook } from "@tanstack/react-form"
import { fieldContext, formContext } from "@/lib/form-context"
import { TextField } from "@/components/form/TextField"
import { TextareaField } from "@/components/form/TextareaField"
import { SelectField } from "@/components/form/SelectField"
import { CheckboxField } from "@/components/form/CheckboxField"
import { SubmitButton } from "@/components/form/SubmitButton"

export const { useAppForm, withForm } = createFormHook({
  fieldComponents: {
    TextField,
    TextareaField,
    SelectField,
    CheckboxField,
  },
  formComponents: {
    SubmitButton,
  },
  fieldContext,
  formContext,
})
