import { MinusIcon, PlusIcon } from 'lucide-react'
import type { Attribute } from 'keycloakify/login/KcContext'
import {
  getButtonToDisplayForMultivaluedAttributeField,
  type FormAction,
  type FormFieldError,
  useUserProfileForm,
} from 'keycloakify/login/lib/useUserProfileForm'
import type { UserProfileFormFieldsProps } from 'keycloakify/login/UserProfileFormFieldsProps'
import { type Dispatch, Fragment, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { I18n } from '../i18n'
import type { KcContext } from '../KcContext'
import { FieldError, PasswordInput, TextInput } from './kc-ui'

type Props = Pick<UserProfileFormFieldsProps<KcContext, I18n>, 'kcContext' | 'i18n' | 'onIsFormSubmittableValueChange' | 'doMakeUserConfirmPassword'>

const HALF_WIDTH = new Set(['firstName', 'lastName'])

/**
 * Renders Keycloak's declarative user profile (register, update profile, update email, IdP review) with the
 * SuperApp design system. Every attribute configured in Keycloak (incl. custom ones, validators, annotations,
 * groups, multi-values) is supported, so new sign-up fields need no frontend change.
 */
export default function UserProfileFormFields({ kcContext, i18n, onIsFormSubmittableValueChange, doMakeUserConfirmPassword }: Props) {
  const { advancedMsg } = i18n
  const {
    formState: { formFieldStates, isFormSubmittable },
    dispatchFormAction,
  } = useUserProfileForm({ kcContext, i18n, doMakeUserConfirmPassword })

  useEffect(() => {
    onIsFormSubmittableValueChange(isFormSubmittable)
  }, [isFormSubmittable, onIsFormSubmittableValueChange])

  // A group header is shown above the first attribute of each group.
  const startsGroup = formFieldStates.map(({ attribute }, i) => !!attribute.group && attribute.group.name !== formFieldStates[i - 1]?.attribute.group?.name)

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-4">
      {formFieldStates.map(({ attribute, displayableErrors, valueOrValues }, index) => {
        const hidden =
          attribute.annotations.inputType === 'hidden' || (attribute.name === 'password-confirm' && !doMakeUserConfirmPassword)
        const groupChanged = startsGroup[index]
        const errors = displayableErrors.filter((e) => e.fieldIndex === undefined)

        return (
          <Fragment key={attribute.name}>
            {groupChanged && attribute.group && (
              <div className="col-span-2 space-y-1 border-t pt-4 first:border-t-0 first:pt-0">
                <p className="text-sm font-semibold">{advancedMsg(attribute.group.displayHeader || attribute.group.name)}</p>
                {attribute.group.displayDescription && (
                  <p className="text-muted-foreground text-xs">{advancedMsg(attribute.group.displayDescription)}</p>
                )}
              </div>
            )}
            <div className={cn('grid gap-2', HALF_WIDTH.has(attribute.name) ? 'col-span-2 sm:col-span-1' : 'col-span-2', hidden && 'hidden')}>
              {attribute.annotations.inputType !== 'hidden' && (
                <Label htmlFor={attribute.name} className="text-sm font-medium">
                  {advancedMsg(attribute.displayName ?? attribute.name)}
                  {attribute.required && <span className="text-destructive">*</span>}
                </Label>
              )}
              {attribute.annotations.inputHelperTextBefore && (
                <p className="text-muted-foreground text-xs">{advancedMsg(attribute.annotations.inputHelperTextBefore)}</p>
              )}
              <FieldControl
                attribute={attribute}
                valueOrValues={valueOrValues}
                displayableErrors={displayableErrors}
                dispatchFormAction={dispatchFormAction}
                i18n={i18n}
              />
              {errors.length > 0 && (
                <FieldError id={`input-error-${attribute.name}`} html={errors.map((e) => e.errorMessageStr).join('<br>')} />
              )}
              {attribute.annotations.inputHelperTextAfter && (
                <p className="text-muted-foreground text-xs">{advancedMsg(attribute.annotations.inputHelperTextAfter)}</p>
              )}
            </div>
          </Fragment>
        )
      })}
    </div>
  )
}

type ControlProps = {
  attribute: Attribute
  valueOrValues: string | string[]
  displayableErrors: FormFieldError[]
  dispatchFormAction: Dispatch<FormAction>
  i18n: I18n
}

function FieldControl(props: ControlProps) {
  const { attribute, valueOrValues } = props
  switch (attribute.annotations.inputType) {
    case 'hidden':
      return <input type="hidden" name={attribute.name} value={valueOrValues} />
    case 'textarea':
      return <TextareaControl {...props} />
    case 'select':
    case 'multiselect':
      return <SelectControl {...props} />
    case 'select-radiobuttons':
    case 'multiselect-checkboxes':
      return <ChoiceControl {...props} />
    default:
      if (Array.isArray(valueOrValues)) {
        return (
          <div className="grid gap-2">
            {valueOrValues.map((_, i) => (
              <InputControl key={i} {...props} fieldIndex={i} />
            ))}
          </div>
        )
      }
      return <InputControl {...props} fieldIndex={undefined} />
  }
}

function options(attribute: Attribute): string[] {
  const fromValidation = attribute.annotations.inputOptionsFromValidation
  if (fromValidation) {
    const validator = (attribute.validators as Record<string, { options?: string[] }>)[fromValidation]
    if (validator?.options) return validator.options
  }
  return attribute.validators.options?.options ?? []
}

function optionLabel(i18n: I18n, attribute: Attribute, option: string) {
  const { inputOptionLabels, inputOptionLabelsI18nPrefix } = attribute.annotations
  if (inputOptionLabels) return i18n.advancedMsg(inputOptionLabels[option] ?? option)
  if (inputOptionLabelsI18nPrefix) return i18n.advancedMsg(`${inputOptionLabelsI18nPrefix}.${option}`)
  return option
}

function InputControl({ attribute, valueOrValues, displayableErrors, dispatchFormAction, i18n, fieldIndex }: ControlProps & { fieldIndex: number | undefined }) {
  const value = fieldIndex === undefined ? (valueOrValues as string) : (valueOrValues as string[])[fieldIndex]
  const invalid = displayableErrors.some((e) => e.fieldIndex === fieldIndex)
  const a = attribute.annotations
  const type = a.inputType?.startsWith('html5-') ? a.inputType.slice(6) : (a.inputType ?? 'text')
  const numberOrUndefined = (v: unknown) => (v === undefined ? undefined : Number.parseInt(`${v}`, 10))

  const common = {
    id: attribute.name,
    name: attribute.name,
    value,
    invalid,
    disabled: attribute.readOnly,
    autoComplete: attribute.autocomplete,
    placeholder: a.inputTypePlaceholder ? i18n.advancedMsgStr(a.inputTypePlaceholder) : undefined,
    pattern: a.inputTypePattern,
    maxLength: numberOrUndefined(a.inputTypeMaxlength),
    minLength: numberOrUndefined(a.inputTypeMinlength),
    max: a.inputTypeMax,
    min: a.inputTypeMin,
    step: a.inputTypeStep,
    ...Object.fromEntries(Object.entries(attribute.html5DataAnnotations ?? {}).map(([k, v]) => [`data-${k}`, v])),
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      dispatchFormAction({
        action: 'update',
        name: attribute.name,
        valueOrValues:
          fieldIndex === undefined
            ? event.target.value
            : (valueOrValues as string[]).map((v, i) => (i === fieldIndex ? event.target.value : v)),
      }),
    onBlur: () => dispatchFormAction({ action: 'focus lost', name: attribute.name, fieldIndex }),
  }

  const input =
    attribute.name === 'password' || attribute.name === 'password-confirm' ? (
      <PasswordInput {...common} id={attribute.name} i18n={i18n} />
    ) : (
      <TextInput type={type} {...common} />
    )

  if (fieldIndex === undefined) return input

  const values = valueOrValues as string[]
  const { hasAdd, hasRemove } = getButtonToDisplayForMultivaluedAttributeField({ attribute, values, fieldIndex })
  const fieldErrors = displayableErrors.filter((e) => e.fieldIndex === fieldIndex)
  return (
    <div className="grid gap-1.5">
      <div className="flex gap-2">
        <div className="flex-1">{input}</div>
        {hasRemove && (
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label={i18n.msgStr('remove')}
            onClick={() => dispatchFormAction({ action: 'update', name: attribute.name, valueOrValues: values.filter((_, i) => i !== fieldIndex) })}
          >
            <MinusIcon />
          </Button>
        )}
        {hasAdd && (
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label={i18n.msgStr('addValue')}
            onClick={() => dispatchFormAction({ action: 'update', name: attribute.name, valueOrValues: [...values, ''] })}
          >
            <PlusIcon />
          </Button>
        )}
      </div>
      {fieldErrors.length > 0 && <FieldError html={fieldErrors.map((e) => e.errorMessageStr).join('<br>')} />}
    </div>
  )
}

function TextareaControl({ attribute, valueOrValues, displayableErrors, dispatchFormAction }: ControlProps) {
  const a = attribute.annotations
  return (
    <Textarea
      id={attribute.name}
      name={attribute.name}
      aria-invalid={displayableErrors.length > 0 || undefined}
      disabled={attribute.readOnly}
      rows={a.inputTypeRows ? Number.parseInt(`${a.inputTypeRows}`, 10) : 3}
      maxLength={a.inputTypeMaxlength ? Number.parseInt(`${a.inputTypeMaxlength}`, 10) : undefined}
      value={valueOrValues as string}
      onChange={(e) => dispatchFormAction({ action: 'update', name: attribute.name, valueOrValues: e.target.value })}
      onBlur={() => dispatchFormAction({ action: 'focus lost', name: attribute.name, fieldIndex: undefined })}
    />
  )
}

function SelectControl({ attribute, valueOrValues, displayableErrors, dispatchFormAction, i18n }: ControlProps) {
  const multiple = attribute.annotations.inputType === 'multiselect'
  return (
    <select
      id={attribute.name}
      name={attribute.name}
      multiple={multiple}
      aria-invalid={displayableErrors.length > 0 || undefined}
      disabled={attribute.readOnly}
      value={valueOrValues}
      className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-10 w-full rounded-lg border px-3 text-[0.95rem] outline-none focus-visible:ring-3 dark:bg-input/30"
      onChange={(e) =>
        dispatchFormAction({
          action: 'update',
          name: attribute.name,
          valueOrValues: multiple ? Array.from(e.target.selectedOptions).map((o) => o.value) : e.target.value,
        })
      }
      onBlur={() => dispatchFormAction({ action: 'focus lost', name: attribute.name, fieldIndex: undefined })}
    >
      {!multiple && <option value="" />}
      {options(attribute).map((option) => (
        <option key={option} value={option}>
          {optionLabel(i18n, attribute, option)}
        </option>
      ))}
    </select>
  )
}

function ChoiceControl({ attribute, valueOrValues, displayableErrors, dispatchFormAction, i18n }: ControlProps) {
  const radio = attribute.annotations.inputType === 'select-radiobuttons'
  return (
    <div className="grid gap-2">
      {options(attribute).map((option) => {
        const checked = Array.isArray(valueOrValues) ? valueOrValues.includes(option) : valueOrValues === option
        return (
          <label key={option} htmlFor={`${attribute.name}-${option}`} className="hover:bg-muted/50 flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm">
            <input
              type={radio ? 'radio' : 'checkbox'}
              id={`${attribute.name}-${option}`}
              name={attribute.name}
              value={option}
              checked={checked}
              disabled={attribute.readOnly}
              aria-invalid={displayableErrors.length > 0 || undefined}
              className="accent-primary size-4"
              onChange={(e) => {
                const next = Array.isArray(valueOrValues)
                  ? e.target.checked
                    ? [...valueOrValues, option]
                    : valueOrValues.filter((v) => v !== option)
                  : e.target.checked
                    ? option
                    : ''
                dispatchFormAction({ action: 'update', name: attribute.name, valueOrValues: next })
              }}
              onBlur={() => dispatchFormAction({ action: 'focus lost', name: attribute.name, fieldIndex: undefined })}
            />
            {optionLabel(i18n, attribute, option)}
          </label>
        )
      })}
    </div>
  )
}
