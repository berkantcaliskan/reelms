export function FormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
  rightSlot,
  autoFocus = false,
  inputMode,
  onKeyDown
}) {
  return (
    <label className="reelms-form-field" htmlFor={id}>
      <span className="reelms-form-label">{label}</span>
      <span className="reelms-form-control-wrap">
        <input
          id={id}
          className="reelms-form-control"
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          inputMode={inputMode}
          onKeyDown={onKeyDown}
        />
        {rightSlot ? <span className="reelms-form-right-slot">{rightSlot}</span> : null}
      </span>
      {error ? <span className="reelms-form-error">{error}</span> : null}
    </label>
  )
}
