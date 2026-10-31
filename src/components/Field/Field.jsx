// Labelled input/select with an inline, announced error.
export default function Field({ id, label, error, required = false, as = 'input', children, className = '', ...props }) {
  const Control = as;
  const errorId = `${id}-error`;
  return (
    <div className={`field ${error ? 'has-error' : ''} ${className}`}>
      <label htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : <span className="field-optional"> (optional)</span>}
      </label>
      <Control
        id={id}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      >
        {children}
      </Control>
      {error && <p id={errorId} className="field-error" role="alert">{error}</p>}
    </div>
  );
}
